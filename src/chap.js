load('config.js');

function execute(url) {
    url = normalizeUrl(url);
    let storyId = getParam(url, "story");
    let chapterId = getParam(url, "cid");
    if (!storyId) return Response.error("Link chương không hợp lệ: " + url);

    // Link copy từ web chỉ có số chương, phải tra id chương trong danh sách.
    if (!chapterId) {
        let number = getParam(url, "chapter");
        let list = fetchChapters(storyId) || [];
        for (let i = 0; i < list.length; i++) {
            if (String(list[i].number) === number) {
                chapterId = list[i].id;
                break;
            }
        }
        if (!chapterId) return Response.error("Không tìm thấy chương " + number);
    }

    let path = "/api/stories/" + encodeURIComponent(storyId) + "/chapters/" + encodeURIComponent(chapterId);
    let response = apiFetch(path);
    let code = errorCode(response);
    if (code === "40" && usePastedSession()) {
        response = apiFetch(path);
        code = errorCode(response);
    }
    if (!response.ok) {
        // code 21: IP/thiết bị chưa qua xác minh Cloudflare Turnstile; code 40: hết lượt đọc miễn phí của khách.
        if (code === "21") {
            return Response.error("truyen-h.com yêu cầu xác minh bảo mật. Hãy mở truyện này bằng trình duyệt trong vBook, đọc 1 chương trên web cho qua bước xác minh, rồi quay lại tải chương.");
        }
        if (code === "40") {
            if (pastedSession()) {
                return Response.error("Phiên đăng nhập đã hết hạn hoặc đã đăng xuất. Hãy đăng nhập lại truyen-h.com trên trình duyệt, lấy cookie truyenh_session mới và dán vào cài đặt extension.");
            }
            return Response.error("Khách chỉ đọc được vài chương. Hãy đăng nhập truyen-h.com trên trình duyệt, lấy cookie truyenh_session rồi dán vào mục \"Cookie đăng nhập\" trong cài đặt extension.");
        }
        return Response.error("HTTP " + response.status);
    }

    let chapter = response.json();
    let content = String(chapter.content || "");
    if (!content) return Response.error("Chương không có nội dung");

    let lines = content.split("\n");
    let html = "";
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (line) html += "<p>" + escapeHtml(line) + "</p>";
    }
    // Không trả tiêu đề ở data2: title của API chương đôi khi là cả một câu văn, giữ tên chương từ mục lục.
    return Response.success(html, "");
}

function errorCode(response) {
    if (response.ok) return "";
    try {
        return String(JSON.parse(response.text()).code);
    } catch (error) {
        return "";
    }
}
