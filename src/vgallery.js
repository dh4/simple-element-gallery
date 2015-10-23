/***
 * Copyright (c) 2015, Dan Hasting
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the organization nor the names of its
 *    contributors may be used to endorse or promote products derived from
 *    this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 *
 ***/


/* exported vGallery */
/**
 * Creates a vGallery instance. Automatically calls vg.init.
 *
 * @example
 * var vg = new vGallery({
 *     gallery: '#gallery',
 *     images: [
 *         'path/to/image/one.jpg',
 *         'path/to/image/two.jpg',
 *     ],
 * });
 *
 * @class
 * @param {Object} config The configuration object. See the Github README for a description.
 * @see {@link https://github.com/dh4/vGallery.js}
 */
var vGallery = function(config) {
    var vg = this;

    /**
     * $ is a helper function to shorten document.querySelector.
     *
     * @param {string} e The selector of the element to fetch.
     * @returns {Object} The element if found or null.
     */
    var $ = function(e) {
        return document.querySelector(e);
    };

    /**
     * $$ is a helper function to create elements.
     *
     * @param {string} e The element to create. Usually 'div'.
     * @param {Object} attr An object of attributes to set on the element.
     * @returns {Object} The created element.
     */
    var $$ = function(e, attr) {
        var element = document.createElement(e);
        for (var a in attr) element.setAttribute(a, attr[a]);
        return element;
    };

    /**
     * Class constructor.
     *
     * @memberof vGallery
     */
    vg.init = function() {
        var defaults = {
            gallery: null,
            images: null,
            links: null,
            bg_color: '#FFF',
            auto: true,
            pause: true,
            delay: 5000,
            fade: 1000,
            contain: 'none',
            thumbnails: {
                element: null,
                images: null,
                captions: null,
                buttons: true,
                button_color: '#000',
                active_color: '#000',
            },
            indicators: {
                element: null,
                color: '#999',
                acolor: '#FFF',
                round: false,
                opacity: 1,
                image: null,
                aimage: null,
            },
            text: {
                element: null,
                items: null,
            },
            prev: {
                element: null,
                text: '&#10094;',
                image: null,
            },
            next: {
                element: null,
                text: '&#10095;',
                image: null,
            },
            counter: {
                element: null,
                separator: ' of ',
            },
            loading: {
                image: null,
                all: true,
            },
        };

        // Set default values
        for (var d in defaults) vg[d] = defaults[d];

        // Grab configuration values
        for (var c in config) {
            if (typeof config[c] != 'object' || config[c] instanceof Array)
                vg[c] = config[c];
            else if (vg[c]) {
                for (var a in config[c]) {
                    vg[c][a] = config[c][a];
                }
            }
        }

        // Rename thumbnails and indicators to save space
        vg.th = vg.thumbnails;
        vg.in = vg.indicators;

        // Show errors for missing required configuration options
        if (vg.gallery === null)    vg.log('gallery', 'missing');
        if (vg.images === null)     vg.log('images', 'missing');

        // Check that other configuration arrays have same length as images array
        if (vg.th.images && vg.images.length != vg.th.images.length)
            vg.log('thumbnails.images', 'count');
        if (vg.links && vg.images.length != vg.links.length)
            vg.log('links', 'count');
        if (vg.th.captions && vg.images.length != vg.th.captions.length)
            vg.log('thumbnails.captions', 'count');

        vg.active = vg.hover = false;
        vg.current = vg.images.length * 10000; // High number so we will never go below 0
        vg.preload = vg.ratios = [];
        vg.remaining = vg.delay;

        // Thumbnail navigator shows 5 images, so make sure we have enough in the rotation
        // that user never sees a blank thumbnail
        var iterations_array = {4:3, 3:4, 2:5, 1:10};
        if (iterations_array[vg.images.length])
            vg.th.iterations = iterations_array[vg.images.length];
        else
            vg.th.iterations = (vg.images.length > 10) ? 1 : 2;

        if (vg.th.element) vg.computeThumbSize();
        if (!vg.th.element && vg.in.element) vg.computeIndicatorSize();
    };

    /**
     * Calculates the size and position of thumbnails based on the thumbnail element.
     *
     * @memberof vGallery
     */
    vg.computeThumbSize = function() {
        var e = $(vg.th.element);

        // Calculate thumbnail size and padding based on how large the thumbnail element is
        vg.th.hpadding = Math.round(e.clientWidth * 0.015);
        vg.th.vpadding = Math.round(e.clientWidth * 0.01);

        vg.th.height = Math.round(e.clientHeight - (vg.th.vpadding * 2));

        // Calculate button size
        vg.button_size = (vg.th.height > 60) ? 30 : (vg.th.height > 50) ? 25 : 20;

        vg.th.wrapper_width = e.clientWidth - (vg.th.hpadding * 2);
        if (vg.th.buttons) vg.th.wrapper_width = vg.th.wrapper_width - vg.button_size * 2;
        vg.th.width = Math.round((vg.th.wrapper_width - (vg.th.hpadding * 4)) / 5);
        vg.th.wrapper_padding = (e.clientHeight - vg.th.height) / 2;

        // Calculate position of thumbnails
        vg.th.offset = vg.th.width + vg.th.hpadding;
        vg.th.most_left = 3 * vg.th.offset * -1;
        vg.th.most_right = (vg.images.length * vg.th.iterations - 3) * vg.th.offset;
        vg.th.wrap = Math.abs(vg.th.most_left) + vg.th.most_right;
    };

    /**
     * Calculates the size of indicators based on the indicator element.
     *
     * @memberof vGallery
     */
    vg.computeIndicatorSize = function() {
        var e = $(vg.in.element);

        // Calculate indicator size and padding based on how large the indicator element is
        vg.in.size = Math.round(e.clientHeight * 0.5);
        vg.in.hpadding = Math.round((e.clientHeight - vg.in.size) / 4);
        vg.in.vpadding = Math.round((e.clientHeight - vg.in.size) / 2);

        // Setup background variables
        vg.in.bg = (vg.in.image) ?
            'url("'+vg.in.image+'") no-repeat 50% 50%' : vg.in.color;
        vg.in.active_bg = (vg.in.aimage) ?
            'url("'+vg.in.aimage+'") no-repeat 50% 50%' : vg.in.acolor;
    };

    /**
     * Initializes the gallery and navigation elements and starts the rotation timer.
     *
     * @memberof vGallery
     */
    vg.start = function() {
        // Check that elements exist
        if ($(vg.gallery).length === 0) vg.log('gallery', 'exists');
        var elements = ['thumbnails', 'indicators', 'counter', 'prev', 'next', 'text'];
        for (var i = 0; i < elements.length; i++) {
            var e = elements[i];
            if (vg[e] && vg[e].element && $(vg[e].element).length === 0) vg.log(e+':exists');
        }

        // Check that gallery and thumbnail elements have a height and width greater than zero
        if ($(vg.gallery).clientHeight === 0 || $(vg.gallery).clientWidth === 0)
            vg.log('gallery', 'size');
        if (vg.th.element && ($(vg.th.element).clientHeight === 0 ||
            $(vg.th.element).clientWidth === 0)
           )
            vg.log('thumbnails', 'size');
        if (vg.in.element && ($(vg.in.element).clientHeight === 0))
            vg.log('indicators', 'size');

        // Don't allow user to interact until first image loads
        vg.active = true;

        // Setup everything
        vg.insertCSS();
        vg.createGallery();
        if (vg.th.element) vg.createThumbnailNavigator();
        if (!vg.th.element && vg.in.element) vg.createIndicatorNavigator();
        if (vg.prev.element) vg.createButton('prev', false);
        if (vg.next.element) vg.createButton('next', false);
        if (vg.text.items && vg.text.element) vg.createText();
        vg.updateCounter();

        // Wait for first image to load
        vg.loadImage(0, function() {
            vg.setGallery();
            vg.active = false;
            vg.startTimer();
            vg.loadImage(1);
        });

        // Listen for window resizing. Nav elements need to be adjusted after
        var resize_timeout = false;
        window.addEventListener('resize', function() {
            if (resize_timeout) clearTimeout(resize_timeout);
            resize_timeout = setTimeout(function() {
                vg.setBackground('#vg_animator');

                if (vg.th.element) {
                    vg.computeThumbSize();
                    $('#vg_th_nav_wrapper').remove();
                    vg.createThumbnailNavigator();
                }

                if (!vg.th.element && vg.in.element) {
                    vg.computeIndicatorSize();
                    $('#vg_indicator_wrapper').remove();
                    vg.createIndicatorNavigator();
                }

                if (vg.prev.element) {
                    $('#vg_prev').remove();
                    vg.createButton('prev', false);
                }

                if (vg.next.element) {
                    $('#vg_next').remove();
                    vg.createButton('next', false);
                }
            }, 50);
        });

        // Pause timeout if mouse enters gallery, and resume once mouse leaves
        if (vg.auto && vg.pause) {
            $(vg.gallery).addEventListener('mouseover', function() {
                vg.hover = true;
                vg.remaining -= new Date() - vg.timeoutStart;
                clearTimeout(vg.timeout);
            });
            $(vg.gallery).addEventListener('mouseout', function() {
                vg.hover = false;
                vg.startTimer(vg.remaining);
            });
        }
    };

    /**
     * Starts the countdown until the gallery rotates
     *
     * @memberof vGallery
     * @param {number} delay The time in milliseconds to count down.
     */
    vg.startTimer = function(delay) {
        if (vg.auto) {
            clearTimeout(vg.timeout);
            vg.timeoutStart = new Date();
            vg.timeout = setTimeout(function(){vg.changeImage(1);}, (delay) ? delay : vg.delay);
        }
    };

    /**
     * Displays a message to the Javascript console.
     *
     * @param {string} value Value to display in message.
     * @param {string} reason Reason for the message. 'missing', 'exists', 'count', or 'size'
     */
    vg.log = function(value, reason) {
        switch (reason) {
            case 'missing':
                console.error("vGallery.js: '%s' is missing from the configuration. "+
                              "Please add it.", value);
                break;
            case 'exists':
                console.error("vGallery.js: %s element does not exist. ", value);
                break;
            case 'count':
                console.warn("vGallery.js: Number of %s does not equal number of "+
                             "images. This will cause unintended consequences.", value);
                break;
            case 'size':
                console.warn("vGallery.js: %s element has a height or width of 0. "+
                             "This will cause nothing to show.", value);
                break;
        }
    };

    /**
     * Inserts the CSS rules into the DOM. This is so we don't have to
     * distribute a static CSS file.
     *
     * @memberof vGallery
     */
    vg.insertCSS = function() {
        var style = $$('style', {type: 'text/css'});
        style.innerHTML =
            "#vg_wrapper {position:relative;width:100%;height:100%;}"+
            "#vg_click {z-index:93;display:block;position:absolute;width:100%;height:100%;}"+
            "#vg_animator {z-index:95;position:absolute;width:100%;height:100%;}"+
            "#vg_background {z-index:94;position:absolute;width:100%;height:100%;}"+
            "#vg_loading {z-index:96;position:absolute;width:100%;height:100%;}"+
            ".vg_cover {background-size:cover !important;}"+
            ".vg_contain {background-size:contain !important;}"+
            "#vg_th_nav_wrapper {position:absolute;right:50%;}"+
            "#vg_thumbnails {z-index:97;position:relative;left:50%;}"+
            "#vg_prev, #vg_next {z-index:97;color:#FFF;}"+
            "#vg_th_nav_prev, #vg_th_nav_next {float:left;color:#000;}"+
            ".vg_button {position:relative;cursor:pointer;text-align:center;}"+
            ".vg_button > div {height:100%;width:100%;}"+
            "#vg_th_nav_thumbs {position:relative;float:left;overflow:hidden;}"+
            ".vg_th_nav_action {z-index:99;position:absolute;cursor:pointer;}"+
            ".vg_th_nav_thumb {z-index:98;position:absolute;top:0;overflow:hidden;}"+
            ".vg_thumb_transition {transition:left "+vg.fade+"ms;}"+
            ".vg_thumb_caption {z-index:98;position:absolute;bottom:0px;width:100%;color:#FFF;"+
                "font-weight:bold;background:#000;background:rgba(0,0,0,0.7);text-align:center;}"+
            ".vg_thumb_border {z-index:99;position:absolute;opacity:0;}"+
            "#vg_indicator_wrapper {z-index:97;position:relative;}"+
            ".vg_indicator {float:left;cursor:pointer;background-size:contain !important;}"+
            ".fadeIn {opacity:1 !important;transition:opacity "+vg.fade+"ms;}"+
            ".fadeOut {opacity:0 !important;transition:opacity "+vg.fade+"ms;}"+
            ".fadeInHalf {opacity:0.5 !important;transition:opacity "+vg.fade+"ms;}"+
            ".fadeInQuick {opacity:1 !important;transition:opacity "+(vg.fade / 2)+"ms;}"+
            ".fadeOutQuick {opacity:0 !important;transition:opacity "+(vg.fade / 2)+"ms;}";
        document.head.appendChild(style);
    };

    /**
     * Initializes the gallery element.
     *
     * @example <caption>DOM nodes:</caption>
     *  <(vg.gallery)>
     *      <div id="vg_wrapper">
     *          <a id="vg_click"></a>
     *          <div id="vg_animator"></div>
     *          <div id="vg_background"></div>
     *          <div id="vg_loading"></div>
     *      </div>
     *  </(vg.gallery)>
     *
     * @memberof vGallery
     */
    vg.createGallery = function() {
        var wrapper = $$('div', {id: 'vg_wrapper'});
        $(vg.gallery).appendChild(wrapper);
        wrapper.appendChild($$('a',   {id: 'vg_click'}));
        wrapper.appendChild($$('div', {id: 'vg_animator'}));
        wrapper.appendChild($$('div', {id: 'vg_background'}));

        $('#vg_background').style.background = vg.bg_color;

        if (vg.loading.image) {
            var loading = $$('div', {id: 'vg_loading'});
            loading.style.opacity = 0;
            loading.style.background = vg.bg_color+' url("'+vg.loading.image+'") no-repeat 50% 50%';
            setTimeout(function() {loading.classList.add('fadeIn');}, 1000);
            wrapper.appendChild(loading);
        }
    };

    /**
     * Preloads the first image.
     *
     * @memberof vGallery
     */
    vg.setGallery = function() {
        vg.setBackground('#vg_animator');
        vg.setBackground('#vg_background');
        if (vg.links) vg.setLink();
    };

    /**
     * Creates the initializes the text element.
     *
     * @example <caption>DOM nodes:</caption>
     *  <(vg.text.element)>
     *      <div id="vg_text_inner"></div>
     *  </(vg.text.element)>
     *
     * @memberof vGallery
     */
    vg.createText = function() {
        // Hide text element. We will display it when the first image loads.
        if (vg.loading.image) $(vg.text.element).style.visibility = 'hidden';

        $(vg.text.element).appendChild($$('div', {id: 'vg_text_inner'}));
        $('#vg_text_inner').innerHTML = vg.text.items[vg.current % vg.images.length];
    };

    /**
     * Initializes the thumbnail navigation element.
     *
     * @example <caption>DOM nodes:</caption>
     *  <(vg.th.element)>
     *      <div id="vg_thumbnails">
     *
     *          (if vg.th.buttons)
     *          <div id="vg_th_nav_prev" class="vg_button" ></div>
     *          (endif)
     *
     *          <div id="vg_th_nav_thumbs">
     *              <div class="vg_th_nav_action"></div>
     *              <div class="vg_th_nav_action"></div>
     *              <div id="vg_th_nav_current" class="vg_th_nav_action"></div>
     *              <div class="vg_th_nav_action"></div>
     *              <div class="vg_th_nav_action"></div>
     *
     *              (for vg.images.length * vg.th.iterations)
     *              <div id="vg_thumb_(number)" class="vg_th_nav_thumb">
     *                  <div class="vg_thumb_caption"></div>
     *                  <div class="vg_thumb_border></div>
     *                  <div class="vg_thumb_image"></div>
     *              </div>
     *              (endfor)
     *
     *          </div>
     *
     *          (if vg.th.buttons)
     *          <div id="vg_th_nav_prev" class="vg_button" ></div>
     *          (endif)
     *
     *      </div>
     *  </(vg.th.element)>
     *
     * @memberof vGallery
     */
    vg.createThumbnailNavigator = function() {
        $(vg.th.element).appendChild($$('div', {id: 'vg_th_nav_wrapper'}));
        var wrapper_style = 'height:'+vg.th.height+'px;'+
                            'width:'+$(vg.th.element).clientWidth+'px;'+
                            'padding:'+vg.th.wrapper_padding+'px 0;';
        $('#vg_th_nav_wrapper').appendChild($$('div', {id: 'vg_thumbnails', style: wrapper_style}));

        // Create previous button
        if (vg.th.buttons) vg.createButton('prev', true);

        var thumbs_style = 'height:'+$(vg.th.element).clientHeight+'px;'+
                           'width:'+vg.th.wrapper_width+'px;'+
                           'margin:0 '+vg.th.hpadding+'px;';
        $('#vg_thumbnails').appendChild($$('div', {id: 'vg_th_nav_thumbs', style: thumbs_style}));

        // Create clickable placeholders. The thumbnail images will move under these.
        var i, position, attr;
        for (i = -2; i <= 2; i++) {
            var width  = (i === 0) ? vg.th.width - 2  : vg.th.width;
            var height = (i === 0) ? vg.th.height - 2 : vg.th.height;

            position = vg.th.offset * (i + 2);
            attr = {
                class: 'vg_th_nav_action',
                'data-offset': i,
                style: 'left:'+position+'px;'+
                       'height:'+height+'px;'+
                       'width:'+width+'px;',
            };
            if (i === 0) attr.id = 'vg_th_nav_current';
            $('#vg_th_nav_thumbs').appendChild($$('div', attr));
        }

        [].forEach.call(document.querySelectorAll('.vg_th_nav_action'), function(e) {
            e.addEventListener('click', function() {
                vg.changeImage(e.getAttribute('data-offset'));
            });
        });

        // Create thumbnail images
        for (i = 0; i < vg.images.length * vg.th.iterations; i++) {
            // Need to account for the fact the first image is the 6th (including hidden)
            // shown in the thumbnail rotator
            var adjust = i - 5 + vg.current;

            position = vg.th.offset * (i - 3);
            attr = {
                id: 'vg_thumb_'+i,
                class: 'vg_th_nav_thumb',
                style: 'left:'+position+'px;'+
                       'height:'+vg.th.height+'px;'+
                       'width:'+vg.th.width+'px;',
            };
            $('#vg_th_nav_thumbs').appendChild($$('div', attr));

            if (vg.th.captions) {
                var caption_size  = (vg.th.height > 80) ? [18, 11] :
                                    (vg.th.height > 60) ? [15, 10] :
                                    (vg.th.height > 50) ? [12,  9] :
                                                          [10,  8] ;
                var caption_attr = {
                    class: 'vg_thumb_caption',
                    style: 'line-height:'+caption_size[0]+'px;'+
                           'font-size:'+caption_size[1]+'px;'
                };
                $('#vg_thumb_'+i).appendChild($$('div', caption_attr));
                var caption = vg.th.captions[adjust % vg.images.length];
                $('#vg_thumb_'+i+' .vg_thumb_caption').innerHTML = caption;
            }

            var border_style = 'height:'+(vg.th.height-2)+'px;'+
                               'width:'+(vg.th.width-2)+'px;'+
                               'border:1px solid '+vg.th.active_color+';';
            var border_class = 'vg_thumb_border';
            if (i == 5) border_class += ' fadeIn';
            $('#vg_thumb_'+i).appendChild($$('div', {class: border_class, style: border_style}));

            var thumb = vg.getThumbImage(adjust);
            var thumb_style = 'background: '+vg.bg_color+' url('+thumb+') no-repeat 50% 50%;'+
                              'background-size: cover;'+
                              'height:'+vg.th.height+'px;'+
                              'width:'+vg.th.width+'px;';
            $('#vg_thumb_'+i).appendChild($$('div', {class: 'vg_thumb_image', style: thumb_style}));
        }

        // Create next button
        if (vg.th.buttons) vg.createButton('next', true);
    };

    /**
     * Initializes the indicator navigation element.
     *
     * @example <caption>DOM nodes:</caption>
     *  <(vg.in.element)>
     *      <div id="vg_indicator_wrapper">
     *
     *          (for vg.images.length)
     *          <div id="vg_indicator_(number)" class="vg_indicator"></div>
     *          (endfor)
     *
     *      </div>
     *  </(vg.in.element)>
     *
     * @memberof vGallery
     */
    vg.createIndicatorNavigator = function() {
        $(vg.in.element).appendChild($$('div', {id: 'vg_indicator_wrapper'}));

        var handler = function() {
            vg.changeImage(this.getAttribute('data-image') - (vg.current % vg.images.length));
        };

        for (var i = 0; i < vg.images.length; i++) {
            var attr = {
                id: 'vg_indicator_'+i,
                class: 'vg_indicator',
                'data-image': i,
                style: 'width:'+vg.in.size+'px;'+
                       'height:'+vg.in.size+'px;'+
                       'margin:'+vg.in.vpadding+'px '+vg.in.hpadding+'px;'+
                       'background:'+vg.in.bg+';'+
                       'opacity:'+vg.in.opacity+';'
            };
            if (vg.in.round) attr.style += 'border-radius:'+vg.in.size+'px;';

            $('#vg_indicator_wrapper').appendChild($$('div', attr));

            $('#vg_indicator_'+i).addEventListener('click', handler);

            if (i == vg.current % vg.images.length) {
                $('#vg_indicator_'+i).style.background = vg.in.active_bg;
                $('#vg_indicator_'+i).style.opacity = 1;
            }
        }
    };

    /**
     * Creates the 'prev' and 'next' buttons.
     *
     * @example <caption>DOM nodes:</caption>
     *  <(vg.(button).element)>
     *      <div id="vg_(button)" class="vg_button"></div>
     *  </(vg.(button).element)>
     *
     * @memberof vGallery
     * @param {string} button The button to create: 'prev' or 'next'.
     * @param {boolean} nav Whether button appears in thumbnail nav or in free-standing element.
     */
    vg.createButton = function(button, nav) {
        var image = (button == 'prev') ? vg.prev.image : vg.next.image;
        var parent, element, button_style;

        if (nav) {
            parent = $('#vg_thumbnails');
            element = 'vg_th_nav_'+button;
            button_style = 'line-height:'+(vg.th.height-6)+'px;'+
                           'height:'+vg.th.height+'px;'+
                           'width:'+vg.button_size+'px;'+
                           'font-size:'+vg.button_size+'px;'+
                           'color:'+vg.th.button_color+';';
        } else {
            parent = $((button == 'prev') ? vg.prev.element : vg.next.element);
            element = 'vg_'+button;
            button_style = 'line-height:'+(parent.clientHeight-6)+'px;'+
                           'height:'+parent.clientHeight+'px;'+
                           'width:'+parent.clientWidth+'px;';
        }

        parent.appendChild($$('div', {id: element, class: 'vg_button', style: button_style}));

        if (image) {
            var button_img_style = 'background: url('+image+') no-repeat 50% 50%;'+
                                   'background-size: contain;';
            $('#'+element).appendChild($$('div', {style: button_img_style}));
        } else {
            $('#'+element).innerHTML = (button == 'prev') ? vg.prev.text : vg.next.text;
        }

        $('#'+element).addEventListener('click', function() {
            vg.changeImage((button == 'prev') ? -1 : 1);
        });
    };

    /**
     * Updates the counter element with the current position
     *
     * @memberof vGallery
     */
    vg.updateCounter = function() {
        if (vg.counter.element) {
            var text = (vg.current % vg.images.length + 1)+vg.counter.separator+vg.images.length;
            $(vg.counter.element).innerHTML = text;
        }
    };

    /**
     * Returns a given image from the image array.
     *
     * @memberof vGallery
     * @param {number} image Image to fetch, defaults to vg.current.
     * @returns {string} The path to the image.
     */
    vg.getImage = function(image) {
        if (!image) image = vg.current;
        return vg.images[image % vg.images.length];
    };

    /**
     * Returns a given thumbnail image if provided, or the full image.
     *
     * @memberof vGallery
     * @param {number} image Image to fetch, defaults to vg.current.
     * @returns {string} The path to the thumbnail image.
     */
    vg.getThumbImage = function(image) {
        if (!image) image = vg.current;
        if (vg.th.images)
            return vg.th.images[image % vg.images.length];
        else
            return vg.images[image % vg.images.length];
    };

    /**
     * Loads an image if it hasn't been loaded, then calls the onload function.
     *
     * @memberof vGallery
     * @param {number} offset The offset from the current image to preload.
     * @param {function} onload A function to call after image has loaded.
     */
    vg.loadImage = function(offset, onload) {
        var imgSrc = vg.getImage(vg.current + parseInt(offset));

        // function to hide '#vg_loading' and call onload()
        var hideLoading = function() {
            var loading = $('#vg_loading');
            if (loading) {
                loading.style['z-index'] = 0;
                loading.classList.remove('fadeIn');
            }
            if (onload) onload();
        };

        // Check if image has already been loaded
        if (vg.preload.indexOf(imgSrc) == -1) {
            var image = new Image();
            image.src = imgSrc;
            image.onload = function() {
                vg.preload.push(imgSrc);
                vg.ratios[vg.images.indexOf(imgSrc)] = this.width / this.height;
                if (vg.text.element) $(vg.text.element).style.visibility = 'visible';
                hideLoading();
            };
            image.onerror = function() {
                if (onload) onload();
                console.error("vGallery.js: '%s' not found.", imgSrc);
            };
        } else {
            hideLoading();
        }
    };

    /**
     * Sets the css background property and cover/contain class
     * for the given element.
     *
     * @memberof vGallery
     * @param {string} e The element to modify. '#vg_animator' or '#vg_background'.
     */
    vg.setBackground = function(e) {
        var background = vg.bg_color+' url('+vg.getImage()+') no-repeat 50% 50%';
        $(e).style.background = background;

        var ratio = vg.ratios[vg.current % vg.images.length];
        var parent_ratio = $(vg.gallery).clientWidth / $(vg.gallery).clientHeight;

        if (vg.contain == 'all' ||
            (vg.contain == 'landscape' && ratio > 1) ||
            (vg.contain == 'portrait' && ratio <= 1) ||
            (vg.contain == 'parent' && ratio > 1 && parent_ratio <= 1) ||
            (vg.contain == 'parent' && ratio <= 1 && parent_ratio > 1)
           ) {
            $(e).classList.remove('vg_cover');
            $(e).classList.add('vg_contain');
        } else {
            $(e).classList.remove('vg_contain');
            $(e).classList.add('vg_cover');
        }
    };

    /**
     * Attaches a URL to the '#vg_click' element above the image.
     *
     * @memberof vGallery
     */
    vg.setLink = function() {
        var click = $('#vg_click');
        var link = vg.links[vg.current % vg.images.length];
        if (link) {
            click.style.cursor = 'pointer';
            click.style['z-index'] = 96;
            click.href = link;
        } else {
            click.style.cursor = 'default';
            click.style['z-index'] = 93;
            click.href = '#';
        }
    };

    /**
     * Adjusts the position of thumbnails by the given offset.
     *
     * @memberof vGallery
     * @param {number} offset The offset to adjust the thumbnail elements by.
     */
    vg.adjustThumbs = function(offset) {
        [].forEach.call(document.querySelectorAll('.vg_th_nav_thumb'), function(e) {
            var origin = parseInt(e.style.left.replace('px', ''));
            var destination = origin + (vg.th.offset * offset * -1);
            var position;

            if (destination < vg.th.most_left) {
                position = destination + vg.th.wrap;
                e.classList.remove('vg_thumb_transition');
                e.style.left = position+'px';
            } else if (destination > vg.th.most_right) {
                position = destination - vg.th.wrap;
                e.classList.remove('vg_thumb_transition');
                e.style.left = position+'px';
            } else {
                e.classList.add('vg_thumb_transition');
                e.style.left = destination+'px';
            }

            var border = e.querySelector('.vg_thumb_border');
            if (destination == vg.th.offset * 2) {
                border.classList.remove('fadeOut');
                border.classList.add('fadeIn');
            } else if (origin == vg.th.offset * 2) {
                border.classList.remove('fadeIn');
                border.classList.add('fadeOut');
            }
        });
    };

    /**
     * Updates the indicator navigation
     *
     * @memberof vGallery
     */
    vg.updateIndicators = function() {
        [].forEach.call(document.querySelectorAll('.vg_indicator'), function(e) {
            e.style.background = vg.in.bg;
            e.style.opacity = vg.in.opacity;
        });
        var current = $('#vg_indicator_'+(vg.current % vg.images.length));
        current.style.background = vg.in.active_bg;
        current.style.opacity = 1;
    };

    /**
     * Where the real action occurs. This animates the transition.
     *
     * @memberof vGallery
     * @param {number} offset The image offset to adjust to. Positive for forward in the
     *            image array and negative for backwards.
     */
    vg.changeImage = function(offset) {
        offset = parseInt(offset);

        // Don't allow image to change if animation is occuring or no offset
        if (vg.active || offset === 0) return;

        vg.active = true;
        vg.current = vg.current + offset;

        if (vg.loading.image && vg.loading.all) {
            var loading = $('#vg_loading');
            loading.style['z-index'] = 96;
            loading.classList.remove('fadeInHalf');
            loading.classList.add('fadeInHalf');
        }

        vg.loadImage(0, function() {
            if (vg.auto) clearTimeout(vg.timeout);

            // Animate gallery
            vg.setBackground('#vg_background');
            $('#vg_animator').classList.add('fadeOut');
            setTimeout(function() {
                vg.setBackground('#vg_animator');
                $('#vg_animator').classList.remove('fadeOut');
                vg.updateCounter();
                if (vg.links) vg.setLink();
                vg.active = false;
                vg.remaining = vg.delay;
                if (!vg.hover) vg.startTimer();
                vg.loadImage(1);
            }, vg.fade + 100);

            // Update thumbnails and indicators if they are showing
            if (vg.th.element) vg.adjustThumbs(offset);
            if (!vg.th.element && vg.in.element) vg.updateIndicators();

            // Animate text
            if (vg.text.items && vg.text.element) {
                var text = $('#vg_text_inner');
                var animateText = function() {
                    text.innerHTML = vg.text.items[vg.current % vg.images.length];
                    text.classList.remove('fadeOutQuick');
                    text.classList.add('fadeInQuick');
                };
                text.classList.add('fadeOutQuick');
                setTimeout(animateText, vg.fade / 2);
            }
        });
    };

    vg.init();
};
