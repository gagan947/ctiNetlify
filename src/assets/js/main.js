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

  // ct_recent_work_slider Brand Slider S
  $(".ct_recent_work_slider").owlCarousel({
    loop: true,
    margin: 10,
    nav: true,
    center: true,
    autoWidth: true,
    responsive: {
      0: {
        items: 1,
      },
      600: {
        items: 1,
      },
      1000: {
        items: 4,
      },
    },
  });
  // ct_recent_work_slider Brand Slider E

  // ct_featured_slider Brand Slider S
  $(".ct_featured_slider").owlCarousel({
    loop: true,
    margin: 10,
    nav: true,
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
  // ct_featured_slider Brand Slider J

  // ct_recent_work_slider Brand Slider S
  $(".ct_testimonial_slider").owlCarousel({
    loop: false,
    margin: 0,
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
  // ct_recent_work_slider Brand Slider E

  // Pricing Works Slider S
  $(".ct_pricing_works")
    .on("initialized.owl.carousel changed.owl.carousel", function (e) {
      if (!e.namespace) {
        return;
      }
      $("#counter").text(
        e.relatedTarget.relative(e.item.index) + 1 + " of " + e.item.count
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
  // Pricing Works Slider E

  // Latesh Project Slider S
  $("#ct_builder_studio_slider").owlCarousel({
    loop: true,
    margin: 100,
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
        items: 2,
      },
      1000: {
        items: 3,
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
  $(".ct_latest_project_slider").owlCarousel({
    loop: true,
    margin: 100,
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
  $(".ct_happy_customer_slider").owlCarousel({
    loop: false,
    margin: 30,
    nav: false,
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
  $(".ct_trusted_brand").owlCarousel({
    loop: true,
    margin: 0,
    nav: false,
    responsive: {
      0: {
        items: 2,
      },
      600: {
        items: 3,
      },
      1000: {
        items: 5,
      },
    },
  });
  // Trusted Brand Slider E
  AOS.init();
  $(window).on("load", function () {
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
            duration: 2000,
            easing: "swing",
            step: function () {
              $this.text(Math.floor(this.countNum));
            },
            complete: function () {
              $this.text(this.countNum);
              //alert('finished');
            },
          }
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
      "ct_project_show_section"
    );
  });
  $(".ct_overlay_detail_icon_down").click(function () {
    $(this).hide();
    $(".ct_overlay_detail_icon_top").show();
    $(".ct_my_creative_project_overlay_main").removeClass(
      "ct_project_show_section"
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

window.onload = function () {
  var amount = document.getElementById("amount");
  var countUp = new CountUp(amount, 0, 450, 0, 2.5, {
    useEasing: true,
    useGrouping: true,
    separator: ",",
  });

  if (!countUp.error) {
    countUp.start();
  }

  // Append 'm+' after the count
  setTimeout(function () {
    document.getElementById("funding-counter").innerHTML =
      "$" + amount.innerHTML + "m+";
  }, 2500); // Match this with the count-up animation duration
};

var options = {
  chart: {
    type: "area",
    height: 140,
    toolbar: { show: false },
  },
  series: [
    {
      name: "GHG Emissions",
      data: [10, 25, 18, 30, 22, 35],
    },
  ],
  xaxis: {
    categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { show: false },
  },
  yaxis: {
    show: false,
  },
  stroke: {
    curve: "smooth",
    width: 2,
  },
  fill: {
    type: "gradient",
    gradient: {
      shade: "light",
      type: "vertical",
      gradientToColors: ["#007bff"],
      stops: [0, 100],
    },
  },
  colors: ["#007bff"],
  grid: { show: false },
  tooltip: { enabled: false },
};

var chart = new ApexCharts(document.querySelector("#et_linear_chart"), options);
chart.render();

var options = {
  series: [
    {
      data: [44, 55, 41],
    },
  ],
  chart: {
    type: "bar",
    height: 180,
    colors: ["#7CCBFA"],
  },
  plotOptions: {
    bar: {
      horizontal: true,
      borderRadius: 10, // Rounded bar corners
      dataLabels: {
        position: "top",
      },
    },
  },
  dataLabels: {
    enabled: false, // Hide data labels
  },
  stroke: {
    show: false,
    width: 0,
    colors: ["#fff"],
  },
  tooltip: {
    shared: true,
    intersect: false,
  },
  xaxis: {
    labels: {
      show: true, // Hides vertical (y-axis) labels
    },
  },
  yaxis: {
    categories: ["Nov 2021", "Dec 2021", "Jan 2022"], // Horizontal labels // Hides vertical axis labels
    labels: {
      show: true, // Hide horizontal (x-axis) labels
    },
  },
};

var chart = new ApexCharts(
  document.querySelector("#ghg-emission-bar"),
  options
);
chart.render();

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
var inputLeft = document.getElementById("et-input-left");
var inputRight = document.getElementById("et-input-right");

var thumbLeft = document.querySelector(".et-slider > .et-thumb.et-left");
var thumbRight = document.querySelector(".et-slider > .et-thumb.et-right");
var range = document.querySelector(".et-slider > .et-range");

function setLeftValue() {
  var _this = inputLeft,
    min = parseInt(_this.min),
    max = parseInt(_this.max);

  _this.value = Math.min(parseInt(_this.value), parseInt(inputRight.value) - 1);

  var percent = ((_this.value - min) / (max - min)) * 100;

  thumbLeft.style.left = percent + "%";
  range.style.left = percent + "%";
}
setLeftValue();

function setRightValue() {
  var _this = inputRight,
    min = parseInt(_this.min),
    max = parseInt(_this.max);

  _this.value = Math.max(parseInt(_this.value), parseInt(inputLeft.value) + 1);

  var percent = ((_this.value - min) / (max - min)) * 100;

  thumbRight.style.right = 100 - percent + "%";
  range.style.right = 100 - percent + "%";
}
setRightValue();

inputLeft.addEventListener("input", setLeftValue);
inputRight.addEventListener("input", setRightValue);

inputLeft.addEventListener("mouseover", function () {
  thumbLeft.classList.add("et-hover");
});
inputLeft.addEventListener("mouseout", function () {
  thumbLeft.classList.remove("et-hover");
});
inputLeft.addEventListener("mousedown", function () {
  thumbLeft.classList.add("et-active");
});
inputLeft.addEventListener("mouseup", function () {
  thumbLeft.classList.remove("et-active");
});

inputRight.addEventListener("mouseover", function () {
  thumbRight.classList.add("et-hover");
});
inputRight.addEventListener("mouseout", function () {
  thumbRight.classList.remove("et-hover");
});
inputRight.addEventListener("mousedown", function () {
  thumbRight.classList.add("et-active");
});
inputRight.addEventListener("mouseup", function () {
  thumbRight.classList.remove("et-active");
});

// Range Slider js E
