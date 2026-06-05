$(document).ready(function(){
  // Main slider
  $('.cst-slides').slick({
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: true,
    dots: false,
    infinite: false,
    lazyLoad: 'ondemand',
    asNavFor: '.slider-thumbnails',
    prevArrow: '<button class="slick-prev"><span class="arrow">&lt;</span></button>',
    nextArrow: '<button class="slick-next"><span class="arrow">&gt;</span></button>'
  });

  // Thumbnails slider
  $('.slider-thumbnails').slick({
    slidesToShow: 4,
    slidesToScroll: 1,
    asNavFor: '.slider',
    focusOnSelect: true,
    arrows: false,
    infinite: false,
    variableWidth: false,
    centerMode: false,
  });
});
