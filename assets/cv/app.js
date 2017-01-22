(function ($) {
    $(function () {

        /***************************************************
         Hero Image Animation
         ***************************************************/

        $('.hero-image').addClass('hero_animate');

        $('.pos').animate({
            opacity: 1
        }, 900);

// hide #back-top / back to top link
        $("#back-top").hide();

// fade in #back-top / back to top link
        $(function () {
            $(window).scroll(function () {
                if ($(this).scrollTop() > 100) {
                    $('#back-top').fadeIn();
                } else {
                    $('#back-top').fadeOut();
                }
            });

            // scroll body to 0px on click
            $('#back-top a').click(function () {
                $('body,html').animate({
                    scrollTop: 0
                }, 800);
                return false;
            });
        });

        /***************************************************
         MAIN NAVIGATION
         ***************************************************/

        $('.main_nav li a, a.more').on('click', function (e) {
            var anchor = $(this);
            if (anchor.attr('href').indexOf("/") == -1) {
                e.preventDefault();

                //animate content scroll
                $('html, body').stop().animate({
                  scrollTop: $(anchor.attr('href')).offset().top
                }, 1000, 'easeInOutExpo');

                // $('html, body').stop().animate({
                //     scrollTop: $(anchor.attr('href')).offset().top
                // }, 1000);
            }
        });

        /***************************************************
         JQUERY ISOTOPE / PORTFOLIO FILTER
         ***************************************************/

        $.Isotope.prototype._getCenteredMasonryColumns = function () {
            this.width = this.element.width();
            var parentWidth = this.element.parent().width();
            // i.e. options.masonry && options.masonry.columnWidth
            var colW = this.options.masonry && this.options.masonry.columnWidth ||
                // or use the size of the first item
                this.$filteredAtoms.outerWidth(true) ||
                // if there's no items, use size of container
                parentWidth;
            var cols = Math.floor(parentWidth / colW);
            cols = Math.max(cols, 1);
            // i.e. this.masonry.cols = ....
            this.masonry.cols = cols;
            // i.e. this.masonry.columnWidth = ...
            this.masonry.columnWidth = colW;
        };

        $.Isotope.prototype._masonryReset = function () {
            // layout-specific props
            this.masonry = {};
            // FIXME shouldn't have to call this again
            this._getCenteredMasonryColumns();
            var i = this.masonry.cols;
            this.masonry.colYs = [];
            while (i--) {
                this.masonry.colYs.push(0);
            }
        };

        $.Isotope.prototype._masonryResizeChanged = function () {
            var prevColCount = this.masonry.cols;
            // get updated colCount
            this._getCenteredMasonryColumns();
            return (this.masonry.cols !== prevColCount);
        };

        $.Isotope.prototype._masonryGetContainerSize = function () {
            var unusedCols = 0,
                i = this.masonry.cols;
            // count unused columns
            while (--i) {
                if (this.masonry.colYs[i] !== 0) {
                    break;
                }
                unusedCols++;
            }
            return {
                height: Math.max.apply(Math, this.masonry.colYs),
                // fit container to columns that have been used;
                width: (this.masonry.cols - unusedCols) * this.masonry.columnWidth
            };
        };

        var $container = $('#portfolio_items'),
            $body = $('body'),
            colW = 0,
            columns = null;

        $container.isotope({
            masonry: {
                columnWidth: colW
            },
            animationEngine: 'jquery',
            animationOptions: {
                duration: 250,
                easing: 'linear',
                queue: false
            }
        });


// filter items when filter link is clicked
        $('#portfolio_filter a').click(function (e) {
            e.preventDefault();

            var selector = $(this).attr('data-filter');
            $container.isotope({filter: selector});

            $("#portfolio_filter li").removeClass("current");
            $(this).closest("li").addClass("current");

            return false;
        });


        /***************************************************
         JQUERY WAYPOINTS / CURRENT AREA ON PAGE
         ***************************************************/

        $('.content-wrapper').waypoint({offset: '75%'});

        $('body').delegate('.content-wrapper', 'waypoint.reached', function (event, direction) {
            var $active = $(this);

            if (direction === "up") {
                $active = $active.prev();
            }

            if (!$active.length) $active = $active.end();

            $('.section-active').removeClass('section-active');
            $active.addClass('section-active');

            $('.link-active').removeClass('link-active');
            $('.main_nav li a[href=#' + $active.attr('id') + ']').addClass('link-active');

        });


        /*-----------------------------------------------------------------------------------*/
        /*  LOAD SKILLS
         /*-----------------------------------------------------------------------------------*/
        function loadSkills() {
            $('.skill_set').each(function () {
                var skill = $(this);
                var skill_width = $(this).attr('data-skill');

                // skill.css('width', skill_width+'%');
                skill.animate({
                    width: skill_width + '%'
                }, 1000);

            });
        }

        /***************************************************
         JQUERY KNOB / AWESOMNESS LEVEL
         ***************************************************/
        $(".knob").knob().addClass('knob_box');

    });
})(jQuery);
