$(document).ready(function () {
  $(".ct_hamburger").click(function () {
    $(".ct_middle_navbar ul:not(.ct_dropdown_items ol) ").addClass("show");
  });
  $(".ct_close_bar").click(function () {
    $(".ct_middle_navbar ul:not(.ct_dropdown_items ol) ").removeClass("show");
  });

  function applyOwlAriaLabels($carousel) {
    const $prev = $carousel.find(".owl-nav .owl-prev");
    const $next = $carousel.find(".owl-nav .owl-next");

    if ($prev.length) {
      $prev.attr("aria-label", "Previous slide");
    }
    if ($next.length) {
      $next.attr("aria-label", "Next slide");
    }

    const $dots = $carousel.find(".owl-dots .owl-dot");
    if ($dots.length) {
      $dots.each(function (index) {
        $(this).attr("aria-label", "Go to slide " + (index + 1));
      });
      $dots.removeAttr("aria-current");
      $dots.filter(".active").attr("aria-current", "true");
    }
  }

  $(document).on(
    "initialized.owl.carousel changed.owl.carousel refreshed.owl.carousel",
    ".owl-carousel",
    function () {
      applyOwlAriaLabels($(this));
    },
  );

  $(".et_toggle_bar").click(function () {
    $(".et_dashbaord_main").toggleClass("et_dash_show");
  });

  // $(".ct_recent_work_slider").owlCarousel({
  //   loop: true,
  //   margin: 10,
  //   nav: true,
  //   center: true,
  //   autoWidth: true,
  //   responsive: {
  //     0: {
  //       items: 1,
  //     },
  //     600: {
  //       items: 1,
  //     },
  //     1000: {
  //       items: 4,
  //     },
  //   },
  // });

  $(".ct_featured_slider").owlCarousel({
    loop: true,
    margin: 10,
    autoplay: true,
    autoplayTimeout: 2000,
    autoplaySpeed: 1000,
    smartSpeed: 1000,
    nav: false,
    responsive: {
      0: {
        items: 2,
      },
      600: {
        items: 3,
      },
      1000: {
        items: 6,
      },
    },
  });

  $(".ct_testimonial_slider").owlCarousel({
    loop: true,
    margin: 15,
    nav: true,
    autoHeight: true,
    responsive: {
      0: {
        items: 1,
      },
      575: {
        items: 1,
      },
      767: {
        items: 2,
      },
      1000: {
        items: 3,
      },
    },
  });

  $(".ct_pricing_works")
    .on("initialized.owl.carousel changed.owl.carousel", function (e) {
      if (!e.namespace) {
        return;
      }
      $("#counter").text(
        e.relatedTarget.relative(e.item.index) + 1 + " of " + e.item.count,
      );
    })
    .owlCarousel({
      loop: true,
      margin: 10,
      nav: true,
      responsive: {
        0: {
          items: 1,
        },
        600: {
          items: 1,
        },
        1000: {
          items: 1,
        },
      },
    });

  // $("#ct_builder_studio_slider").owlCarousel({
  //   loop: true,
  //   margin: 100,
  //   nav: true,
  //   center: true,
  //   autoPlay: true,
  //   slideSpeed: 1000,
  //   smartSpeed: 1000,
  //   autoplayTimeout: 2000,
  //   autoplaySpeed: 3000,
  //   responsive: {
  //     0: {
  //       items: 1,
  //     },
  //     600: {
  //       items: 2,
  //     },
  //     1000: {
  //       items: 3,
  //     },
  //   },
  // });
  $(".ct_team_slider_1").owlCarousel({
    loop: true,
    center: true,
    nav: false,
    margin: 20,
    autoplay: true,
    slideTransition: "linear",
    autoplaySpeed: 6000,
    smartSpeed: 6000,
    // autoplayTimeout: 6000,
    autoplayHoverPause: false,
    responsive: {
      0: {
        items: 1,
      },
      600: {
        items: 2,
      },
      1000: {
        items: 4,
      },
    },
  });
  $(".ct_client_branding_slider_1").owlCarousel({
    loop: true,
    center: true,
    nav: false,
    dots: false,
    autoWidth: true,

    margin: 20,
    autoplay: true,
    slideTransition: "linear",
    autoplaySpeed: 6000,
    smartSpeed: 6000,
    // autoplayTimeout: 6000,
    autoplayHoverPause: false,
    responsive: {
      0: {
        items: 1,
      },
      600: {
        items: 2,
      },
      1000: {
        items: 7,
      },
    },
  });
  $("#ct_retaial_app_slider").owlCarousel({
    loop: true,
    margin: 50,
    nav: true,
    autoPlay: true,
    slideSpeed: 1000,
    smartSpeed: 1000,
    autoplayTimeout: 2000,
    autoplaySpeed: 3000,
    responsive: {
      0: {
        items: 1,
      },
      600: {
        items: 1,
      },
      1000: {
        items: 3,
      },
    },
  });
  // $(".ct_latest_project_slider").owlCarousel({
  //   loop: true,
  //   margin: 100,
  //   nav: true,
  //   center: true,
  //   autoPlay: true,
  //   slideSpeed: 1000,
  //   smartSpeed: 1000,
  //   autoplayTimeout: 2000,
  //   autoplaySpeed: 3000,
  //   responsive: {
  //     0: {
  //       items: 1,
  //     },
  //     600: {
  //       items: 3,
  //     },
  //     1000: {
  //       items: 5,
  //     },
  //   },
  // });

  // Latesh Project Slider E

  // Related Article Slider Js S
  $(".ct_related_article").owlCarousel({
    loop: true,
    margin: 30,
    nav: true,
    responsive: {
      0: {
        items: 1,
      },
      600: {
        items: 2,
      },
      1000: {
        items: 3,
      },
    },
  });
  // Related Article Slider Js E

  // Promisses Slider S
  $(".ct_promisses_slider").owlCarousel({
    loop: true,
    margin: 30,
    nav: true,
    center: true,
    autoPlay: true,
    slideSpeed: 1000,
    smartSpeed: 1000,
    autoplayTimeout: 2000,
    autoplaySpeed: 3000,
    responsive: {
      0: {
        items: 1,
      },
      600: {
        items: 3,
      },
      1000: {
        items: 5,
      },
    },
  });
  // Promisses Slider E

  // Happy Customer Slider S
  // $(".ct_happy_customer_slider").owlCarousel({
  //   loop: false,
  //   margin: 30,
  //   nav: false,
  //   responsive: {
  //     0: {
  //       items: 1,
  //     },
  //     600: {
  //       items: 2,
  //     },
  //     1000: {
  //       items: 3,
  //     },
  //   },
  // });
  // Happy Customer Slider E

  // Social Slider S
  $(".ct_social_slider").owlCarousel({
    loop: true,
    margin: 0,
    nav: false,
    responsive: {
      0: {
        items: 1,
      },
      600: {
        items: 1,
      },
      1000: {
        items: 1,
      },
    },
  });
  // Social Slider E
  // Trusted Brand Slider S
  // $(".ct_trusted_brand").owlCarousel({
  //   loop: true,
  //   margin: 0,
  //   nav: false,
  //   responsive: {
  //     0: {
  //       items: 2,
  //     },
  //     600: {
  //       items: 3,
  //     },
  //     1000: {
  //       items: 5,
  //     },
  //   },
  // });

  function initSwipers() {
    new Swiper(".ct_home_slider_main", {
      loop: true,
      speed: 1000,
      autoplay: false,

      navigation: {
        nextEl: ".swiper-button-next",
        prevEl: ".swiper-button-prev",
      },

      pagination: {
        el: ".swiper-pagination",
        clickable: true,
      },
    });

    new Swiper(".ct_home_slider_inner", {
      loop: true,
      slidesPerView: "auto",
      spaceBetween: 10,
      autoplay: {
        delay: 0,
      },
      speed: 4000,
      freeMode: true,
    });
  }
  // $(".ct_home_slider_main").owlCarousel({
  //   loop: true,
  //   margin: 20,
  //   nav: true,
  //   navText: [
  //     '<i class="fa-solid fa-angle-left"></i>',
  //     '<i class="fa-solid fa-angle-right"></i>',
  //   ],
  //   animateOut: "fadeOut",
  //   responsive: {
  //     0: {
  //       items: 1,
  //     },
  //     600: {
  //       items: 1,
  //     },
  //     1000: {
  //       items: 1,
  //     },
  //   },
  // });
  // $(".ct_home_slider_inner").owlCarousel({
  //   loop: true,
  //   margin: 10,
  //   nav: false,
  //   dots: false,

  //   autoplay: true,
  //   autoplayTimeout: 4000,
  //   autoplaySpeed: 4000,
  //   slideTransition: "linear",
  //   smartSpeed: 4000,
  //   autoWidth: true,

  //   responsive: {
  //     0: {
  //       items: 1,
  //     },
  //     600: {
  //       items: 1,
  //     },
  //     1000: {
  //       items: 1,
  //     },
  //   },
  // });
  // Trusted Brand Slider E
  $(window).on("load", function () {
    if (window.requestAnimationFrame) {
      window.requestAnimationFrame(initSwipers);
    } else {
      setTimeout(initSwipers, 0);
    }
    AOS.init();
    $(".ct_loader_main").fadeOut("slow");
  });

  var counted = 0;
  $(window).scroll(function () {
    var oTop = $("#counter").offset()?.top - window.innerHeight;
    if (counted == 0 && $(window).scrollTop() > oTop) {
      $(".count").each(function () {
        var $this = $(this),
          countTo = $this.attr("data-count");
        $({
          countNum: $this.text(),
        }).animate(
          {
            countNum: countTo,
          },

          {
            duration: 200,
            easing: "swing",
            step: function () {
              $this.text(Math.floor(this.countNum));
            },
            complete: function () {
              $this.text(this.countNum);
              //alert('finished');
            },
          },
        );
      });
      counted = 1;
    }
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
});

$(window).scroll(function () {
  var scroll = $(window).scrollTop();

  //>=, not <=
  if (scroll >= 300) {
    //clearHeader, not clearheader - caps H
    $(".ct_header_main").addClass("ct_sticky_menu");
  } else {
    $(".ct_header_main").removeClass("ct_sticky_menu");
  }
}); //missing );


// var options = {
//   chart: {
//     type: "area",
//     height: 140,
//     toolbar: { show: false },
//   },
//   series: [
//     {
//       name: "GHG Emissions",
//       data: [10, 25, 18, 30, 22, 35],
//     },
//   ],
//   xaxis: {
//     categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
//     axisBorder: { show: false },
//     axisTicks: { show: false },
//     labels: { show: false },
//   },
//   yaxis: {
//     show: false,
//   },
//   stroke: {
//     curve: "smooth",
//     width: 2,
//   },
//   fill: {
//     type: "gradient",
//     gradient: {
//       shade: "light",
//       type: "vertical",
//       gradientToColors: ["#007bff"],
//       stops: [0, 100],
//     },
//   },
//   colors: ["#007bff"],
//   grid: { show: false },
//   tooltip: { enabled: false },
// };


// var options = {
//   series: [
//     {
//       data: [44, 55, 41],
//     },
//   ],
//   chart: {
//     type: "bar",
//     height: 180,
//     colors: ["#7CCBFA"],
//   },
//   plotOptions: {
//     bar: {
//       horizontal: true,
//       borderRadius: 10, // Rounded bar corners
//       dataLabels: {
//         position: "top",
//       },
//     },
//   },
//   dataLabels: {
//     enabled: false, // Hide data labels
//   },
//   stroke: {
//     show: false,
//     width: 0,
//     colors: ["#fff"],
//   },
//   tooltip: {
//     shared: true,
//     intersect: false,
//   },
//   xaxis: {
//     labels: {
//       show: true, // Hides vertical (y-axis) labels
//     },
//   },
//   yaxis: {
//     categories: ["Nov 2021", "Dec 2021", "Jan 2022"], // Horizontal labels // Hides vertical axis labels
//     labels: {
//       show: true, // Hide horizontal (x-axis) labels
//     },
//   },
// };

$(document).ready(function () {
  $(".et_buildcard_collapse_icon").click(function () {
    $("#ct_collapse_build_first").addClass("d-none");
    $("#ct_collapse_build").removeClass("d-none");
  });
  $(".et_buildcard_collapse_close_icon").click(function () {
    $("#ct_collapse_build").addClass("d-none");
    $("#ct_collapse_build_first").removeClass("d-none");
  });
});

// Range Slider js S
// var inputLeft = document.getElementById("et-input-left");
// var inputRight = document.getElementById("et-input-right");

// var thumbLeft = document.querySelector(".et-slider > .et-thumb.et-left");
// var thumbRight = document.querySelector(".et-slider > .et-thumb.et-right");
// var range = document.querySelector(".et-slider > .et-range");


// var ml4 = {};
// ml4.opacityIn = [0, 1];
// ml4.scaleIn = [0.2, 1];
// ml4.scaleOut = 3;
// ml4.durationIn = 800;
// ml4.durationOut = 600;
// ml4.delay = 500;

// anime
//   .timeline({ loop: true })
//   .add({
//     targets: ".ml4 .letters-1",
//     opacity: ml4.opacityIn,
//     scale: ml4.scaleIn,
//     duration: ml4.durationIn,
//   })
//   .add({
//     targets: ".ml4 .letters-1",
//     opacity: 0,
//     scale: ml4.scaleOut,
//     duration: ml4.durationOut,
//     easing: "easeInExpo",
//     delay: ml4.delay,
//   })
//   .add({
//     targets: ".ml4 .letters-2",
//     opacity: ml4.opacityIn,
//     scale: ml4.scaleIn,
//     duration: ml4.durationIn,
//   })
//   .add({
//     targets: ".ml4 .letters-2",
//     opacity: 0,
//     scale: ml4.scaleOut,
//     duration: ml4.durationOut,
//     easing: "easeInExpo",
//     delay: ml4.delay,
//   })
//   .add({
//     targets: ".ml4 .letters-3",
//     opacity: ml4.opacityIn,
//     scale: ml4.scaleIn,
//     duration: ml4.durationIn,
//   })
//   .add({
//     targets: ".ml4 .letters-3",
//     opacity: 0,
//     scale: ml4.scaleOut,
//     duration: ml4.durationOut,
//     easing: "easeInExpo",
//     delay: ml4.delay,
//   })
//   .add({
//     targets: ".ml4",
//     opacity: 0,
//     duration: 500,
//     delay: 500,
//   });
