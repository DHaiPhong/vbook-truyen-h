function execute() {
    return Response.success([
        { title: "Mới cập nhật", input: "sort=updated", script: "list.js" },
        { title: "Xem nhiều", input: "sort=views", script: "list.js" }
    ]);
}
