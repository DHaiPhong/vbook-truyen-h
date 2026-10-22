// Trang là SPA, mọi dữ liệu lấy qua JSON API cùng tên miền (/api/stories...).
let BASE_URL = "https://truyen-h.com";
try {
    if (DOMAIN) {
        BASE_URL = DOMAIN;
    }
} catch (error) {
}

// Trang chỉ cho khách đọc vài chương; đăng nhập phải qua Turnstile nên không làm được từ script.
// Người dùng đăng nhập trên trình duyệt rồi dán chuỗi Cookie vào cài đặt COOKIE.
let LOGIN_COOKIE = "";
try {
    if (COOKIE) {
        LOGIN_COOKIE = String(COOKIE).replace(/^\s*cookie\s*:/i, "").trim();
    }
} catch (error) {
}

const PAGE_SIZE = 20;

function normalizeUrl(url) {
    return url.replace(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/img, BASE_URL);
}

function getParam(url, name) {
    let m = new RegExp("[?&]" + name + "=([^&#]*)").exec(url);
    return m ? decodeURIComponent(m[1].replace(/\+/g, " ")) : "";
}

function apiFetch(path) {
    let headers = { "Accept": "application/json" };
    if (LOGIN_COOKIE) headers["Cookie"] = LOGIN_COOKIE;
    return fetch(BASE_URL + path, { headers: headers });
}

function escapeHtml(text) {
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function storyLink(id) {
    return "/story?id=" + encodeURIComponent(id);
}

// queryString là phần lọc đã encode sẵn, vd "sort=views", "tag=Ti%C3%AAn%20Hi%E1%BB%87p", "q=abc".
function listStories(queryString, page) {
    page = parseInt(page) || 1;
    let path = "/api/stories?page=" + page + "&limit=" + PAGE_SIZE;
    if (queryString) path += "&" + queryString;

    let response = apiFetch(path);
    if (!response.ok) return Response.error("HTTP " + response.status);
    let json = response.json();
    let stories = json.data || [];

    let items = [];
    for (let i = 0; i < stories.length; i++) {
        let s = stories[i];
        let info = [];
        if (s.author) info.push(s.author);
        if (s.total_chapters) info.push(s.total_chapters + " chương");
        items.push({
            name: s.title,
            cover: s.cover_image || "",
            link: storyLink(s.id),
            description: info.join(" · "),
            tag: s.status === "completed" ? "Hoàn thành" : "",
            host: BASE_URL
        });
    }

    let totalPages = json.pagination ? parseInt(json.pagination.totalPages) || 0 : 0;
    let next = page < totalPages ? String(page + 1) : "";
    return Response.success(items, next);
}

// Lấy toàn bộ danh sách chương; API trả tối đa 1000 chương mỗi lần nên phải lặp theo offset.
function fetchChapters(storyId) {
    let all = [];
    let batch = 1000;
    for (let offset = 0; offset < 100000; offset += batch) {
        let response = apiFetch("/api/stories/" + encodeURIComponent(storyId) + "/chapters?limit=" + batch + "&offset=" + offset);
        if (!response.ok) return null;
        let list = response.json() || [];
        for (let i = 0; i < list.length; i++) all.push(list[i]);
        if (list.length < batch) break;
    }
    return all;
}
