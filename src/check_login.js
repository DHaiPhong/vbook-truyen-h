load('config.js');

function execute() {
    let response = apiFetch("/api/me");
    if (response.status === 401 && usePastedSession()) {
        Log.log("Phiên trong vBook không dùng được, thử cookie đã dán trong cài đặt");
        response = apiFetch("/api/me");
    }
    if (response.status === 401) {
        if (pastedSession()) return Response.error("Cookie đã dán không hợp lệ hoặc đã hết hạn, hãy đăng nhập lại và lấy cookie truyenh_session mới.");
        if (LOGIN_COOKIE) return Response.error("Không tìm thấy truyenh_session trong chuỗi đã dán. Hãy dán cả chuỗi Cookie hoặc chỉ giá trị truyenh_session.");
        return Response.error("Chưa đăng nhập. Hãy dán cookie truyenh_session vào cài đặt extension.");
    }
    if (!response.ok) return Response.error("HTTP " + response.status);

    let user = response.json().user || {};
    let name = user.username || user.displayName || "";
    return Response.success("Đã đăng nhập" + (name ? ": " + name : ""));
}
