load('config.js');

function execute() {
    if (!LOGIN_COOKIE) return Response.error("Chưa dán Cookie đăng nhập trong cài đặt extension.");

    let response = apiFetch("/api/me");
    if (response.status === 401) return Response.error("Cookie không hợp lệ hoặc đã hết hạn, hãy đăng nhập lại và lấy Cookie mới.");
    if (!response.ok) return Response.error("HTTP " + response.status);

    let user = response.json().user || {};
    let name = user.username || user.name || user.displayName || user.id || "";
    return Response.success("Đã đăng nhập" + (name ? ": " + name : ""));
}
