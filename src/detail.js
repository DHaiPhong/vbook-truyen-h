load('config.js');

function execute(url) {
    url = normalizeUrl(url);
    let id = getParam(url, "id");
    if (!id) return Response.error("Link truyện không hợp lệ: " + url);

    let response = apiFetch("/api/stories/" + encodeURIComponent(id));
    if (!response.ok) return Response.error("HTTP " + response.status);
    let s = response.json();

    let description = escapeHtml(String(s.description || "").replace(/﻿/g, "").trim()).replace(/\n/g, "<br>");

    let info = [];
    if (s.author) info.push("Tác giả: " + escapeHtml(s.author));
    if (s.original_title) info.push("Tên gốc: " + escapeHtml(s.original_title));
    info.push("Số chương: " + (s.total_chapters || 0));
    info.push("Trạng thái: " + (s.status === "completed" ? "Hoàn thành" : "Đang ra"));
    if (s.total_views) info.push("Lượt xem: " + s.total_views);

    let tags = [];
    let rawTags = s.tags || [];
    for (let i = 0; i < rawTags.length; i++) {
        tags.push({ title: String(rawTags[i]), input: "tag=" + encodeURIComponent(rawTags[i]), script: "list.js" });
    }

    let suggests = [];
    if (s.author && s.author !== "Chưa rõ") {
        suggests.push({ title: "Cùng tác giả", input: "author=" + encodeURIComponent(s.author), script: "list.js" });
    }

    return Response.success({
        name: s.title,
        author: s.author || "",
        cover: s.cover_image ? BASE_URL + s.cover_image : "",
        description: description,
        detail: info.join("<br>"),
        url: BASE_URL + storyLink(s.id),
        type: "novel",
        format: "novel",
        ongoing: s.status !== "completed",
        nsfw: true,
        locale: "vi",
        tags: tags,
        genres: tags.length > 0 ? [{ title: "Cùng thể loại", input: tags[0].input, script: "list.js" }] : [],
        suggests: suggests
    });
}
