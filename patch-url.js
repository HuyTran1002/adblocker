// Xử lý chung cho cả nút thường và nút URL
$(document).on("click", ".btn-episode, .btn-url-direct", function() {
    var slug = $("body").attr("data-slug");
    var ep = $(this).attr("data-ep");
    var sv = $(this).attr("data-sv");
    var serverName = $(this).attr("data-server-name");
    
    // Đánh dấu đã xem
    if (typeof markEpisodeWatched === "function") {
        markEpisodeWatched(slug, sv + "-" + ep);
    }
    
    // Cập nhật tên server hiển thị
    if (typeof updateServerName === "function" && serverName) {
        updateServerName(serverName);
    }
    
    // Nếu là nút URL, chỉ cần đổi trạng thái active, trình duyệt sẽ tự mở link
    if ($(this).hasClass("btn-url-direct")) {
        $(".btn-episode, .btn-url-direct").removeClass("active").find(".playon").hide();
        $(this).addClass("active").find(".playon").show();
    }
});
