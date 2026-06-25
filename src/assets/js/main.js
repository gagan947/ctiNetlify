$(document).ready(function () {
  $(".ct_hamburger").click(function () {
    $(".ct_middle_navbar ul:not(.ct_dropdown_items ol) ").addClass("show");
  });
  $(".ct_close_bar").click(function () {
    $(".ct_middle_navbar ul:not(.ct_dropdown_items ol) ").removeClass("show");
  });

  $(".et_toggle_bar").click(function () {
    $(".et_dashbaord_main").toggleClass("et_dash_show");
  });

  $(".ct_dash_toggle_bar").click(function () {
    $(".ct_dash_board_main").toggleClass("ct_show_sidebar");
  });

  $(".ct_overlay_detail_icon_top").click(function () {
    $(this).hide();
    $(".ct_overlay_detail_icon_down").show();
    $(".ct_my_creative_project_overlay_main").addClass(
      "ct_project_show_section",
    );
  });
  $(".ct_overlay_detail_icon_down").click(function () {
    $(this).hide();
    $(".ct_overlay_detail_icon_top").show();
    $(".ct_my_creative_project_overlay_main").removeClass(
      "ct_project_show_section",
    );
  });

  $(".et_buildcard_collapse_icon").click(function () {
    $("#ct_collapse_build_first").addClass("d-none");
    $("#ct_collapse_build").removeClass("d-none");
  });
  $(".et_buildcard_collapse_close_icon").click(function () {
    $("#ct_collapse_build").addClass("d-none");
    $("#ct_collapse_build_first").removeClass("d-none");
  });
});

$(window).scroll(function () {
  var scroll = $(window).scrollTop();
  if (scroll >= 300) {
    $(".ct_header_main").addClass("ct_sticky_menu");
  } else {
    $(".ct_header_main").removeClass("ct_sticky_menu");
  }
});
