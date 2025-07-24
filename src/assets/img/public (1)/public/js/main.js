$(document).ready(function () {
    AOS.init();
})
$(window).scroll(function () {
    var scroll = $(window).scrollTop();
    if (scroll >= 300) {
        $(".ct_header").addClass("ct_sticky_menu");
    } else {
        $(".ct_header").removeClass("ct_sticky_menu");
    }
});