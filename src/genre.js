load('config.js');

function execute() {
    let response = apiFetch("/api/stories/meta");
    if (!response.ok) return Response.error("HTTP " + response.status);
    let counts = response.json().tagCounts || {};

    let names = Object.keys(counts);
    names.sort(function (a, b) { return counts[b] - counts[a]; });

    let genres = [];
    for (let i = 0; i < names.length; i++) {
        genres.push({
            title: names[i] + " (" + counts[names[i]] + ")",
            input: "tag=" + encodeURIComponent(names[i]),
            script: "list.js"
        });
    }
    return Response.success(genres);
}
