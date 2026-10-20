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

    let response = apiFetch("/api/stories/" + encodeURIComponent(storyId) + "/chapters/" + encodeURIComponent(chapterId));
    if (!response.ok) {
        let body = {};
        try {
            body = JSON.parse(response.text());
        } catch (error) {
        }
        // code 21: IP/thiết bị chưa qua xác minh Cloudflare Turnstile; code 40: hết lượt đọc miễn phí.
        if (String(body.code) === "21") {
            return Response.error("truyen-h.com yêu cầu xác minh bảo mật. Hãy mở truyện này bằng trình duyệt trong vBook, đọc 1 chương trên web cho qua bước xác minh, rồi quay lại tải chương.");
        }
        if (String(body.code) === "40") {
            return Response.error("Đã hết số chương đọc miễn phí. Hãy đăng nhập truyen-h.com bằng trình duyệt trong vBook rồi thử lại.");
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
    return Response.success(html, chapter.title || "");
}
