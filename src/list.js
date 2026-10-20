load('config.js');

// Danh sách cho tab home/genre/tag; input là chuỗi lọc, vd "sort=views" hoặc "tag=...".
function execute(input, page) {
    return listStories(input || "", page);
}
