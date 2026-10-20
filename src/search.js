load('config.js');

function execute(query, page) {
    return listStories("q=" + encodeURIComponent(query || ""), page);
}
