load('config.js');

function execute(url) {
    url = normalizeUrl(url);
    let id = getParam(url, "id");
    if (!id) return Response.error("Link truyện không hợp lệ: " + url);

    let list = fetchChapters(id);
    if (list === null) return Response.error("Không tải được danh sách chương");

    let chapters = [];
    for (let i = 0; i < list.length; i++) {
        let c = list[i];
        chapters.push({
            name: c.title,
            // Giữ dạng link đọc của trang (story + chapter), thêm cid để chap.js gọi thẳng API.
            url: "/reader?story=" + encodeURIComponent(id) + "&chapter=" + c.number + "&cid=" + encodeURIComponent(c.id),
            host: BASE_URL
        });
    }
    return Response.success(chapters);
}
