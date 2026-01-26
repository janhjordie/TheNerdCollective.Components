// MudSwiper - Swiper.js integration for Blazor
// Loads Swiper from CDN and manages initialization

const SWIPER_CDN = {
    css: 'https://cdn.jsdelivr.net/npm/swiper@12/swiper-bundle.min.css',
    js: 'https://cdn.jsdelivr.net/npm/swiper@12/swiper-bundle.min.js'
};

let swiperInstances = new Map();

/**
 * Load Swiper CSS from CDN
 */
function loadSwiperCSS() {
    if (document.querySelector(`link[href="${SWIPER_CDN.css}"]`)) {
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = SWIPER_CDN.css;
        link.onload = resolve;
        link.onerror = reject;
        document.head.appendChild(link);
    });
}

/**
 * Load Swiper JS from CDN
 */
function loadSwiperJS() {
    if (window.Swiper) {
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = SWIPER_CDN.js;
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
    });
}

/**
 * Initialize Swiper on an element
 */
export async function initSwiper(element, options) {
    try {
        // Load Swiper dependencies
        await loadSwiperCSS();
        await loadSwiperJS();

        // Ensure we have Swiper available
        if (!window.Swiper) {
            throw new Error('Swiper library failed to load');
        }

        // Create a wrapper object for the Swiper instance
        const swiperOptions = {
            slidesPerView: options.slidesPerView || 1,
            spaceBetween: options.spaceBetween || 10,
            loop: options.loop || false,
            ...(options.keyboard && { keyboard: options.keyboard }),
            ...(options.mousewheel && { mousewheel: options.mousewheel }),
            ...(options.pagination && { pagination: options.pagination }),
            ...(options.navigation && { navigation: options.navigation }),
            ...(options.autoplay && { autoplay: options.autoplay }),
        };

        // Add event listeners if callback references are provided
        if (options.onSlideChange) {
            swiperOptions.on = {
                slideChange: function() {
                    options.onSlideChange.invokeMethodAsync('HandleSlideChange', this.activeIndex);
                }
            };
        }

        if (options.onReachEnd) {
            if (!swiperOptions.on) swiperOptions.on = {};
            swiperOptions.on.reachEnd = function() {
                options.onReachEnd.invokeMethodAsync('HandleReachEnd');
            };
        }

        if (options.onReachBeginning) {
            if (!swiperOptions.on) swiperOptions.on = {};
            swiperOptions.on.reachBeginning = function() {
                options.onReachBeginning.invokeMethodAsync('HandleReachBeginning');
            };
        }

        // Initialize Swiper
        const swiper = new window.Swiper(element, swiperOptions);

        // Store the instance for later reference
        const instanceId = Math.random().toString(36).substr(2, 9);
        swiperInstances.set(instanceId, swiper);

        // Create a proxy object that exposes necessary methods
        return {
            getActiveIndex: () => swiper.activeIndex,
            goToSlide: (index) => swiper.slideTo(index),
            slideNext: () => swiper.slideNext(),
            slidePrev: () => swiper.slidePrev(),
            destroy: () => {
                swiper.destroy();
                swiperInstances.delete(instanceId);
            }
        };
    } catch (error) {
        console.error('Error initializing MudSwiper:', error);
        throw error;
    }
}

/**
 * Destroy a Swiper instance
 */
export function destroySwiper(swiperInstance) {
    if (swiperInstance && typeof swiperInstance.destroy === 'function') {
        swiperInstance.destroy();
    }
}

/**
 * Add MudSwiper styles
 */
function injectSwiperStyles() {
    const styleId = 'mudswiper-styles';
    if (document.getElementById(styleId)) {
        return;
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        /* MudSwiper Container */
        .mud-swiper-container {
            position: relative;
            width: 100%;
        }

        /* Swiper Base Styles */
        .mud-swiper {
            position: relative;
            width: 100%;
            height: 100%;
            overflow: hidden;
            z-index: 1;
        }

        .mud-swiper-slide {
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            background: transparent;
            flex-shrink: 0;
            width: 100%;
            height: 100%;
        }

        /* Pagination Styling */
        .mud-swiper-pagination {
            position: absolute;
            text-align: center;
            transition: opacity 0.3s;
            transform: translate3d(0, 0, 0);
            z-index: 10;
            bottom: 10px;
            left: 0;
            right: 0;
        }

        .mud-swiper-pagination.swiper-pagination-bullets {
            bottom: 10px;
        }

        .mud-swiper-pagination .swiper-pagination-bullet {
            margin: 0 4px;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.5);
            opacity: 1;
            cursor: pointer;
            transition: background 0.3s;
        }

        .mud-swiper-pagination .swiper-pagination-bullet-active {
            background: rgba(255, 255, 255, 1);
        }

        /* Navigation Buttons */
        .mud-swiper-button-prev,
        .mud-swiper-button-next {
            position: absolute;
            top: 50%;
            width: 44px;
            height: 44px;
            margin-top: -22px;
            z-index: 10;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 4px;
            transition: background 0.3s;
            font-size: 20px;
            user-select: none;
        }

        .mud-swiper-button-prev:hover,
        .mud-swiper-button-next:hover {
            background: rgba(0, 0, 0, 0.5);
        }

        .mud-swiper-button-prev::before,
        .mud-swiper-button-next::before {
            font-size: 20px;
            color: white;
        }

        .mud-swiper-button-prev {
            left: 10px;
        }

        .mud-swiper-button-next {
            right: 10px;
        }

        .mud-swiper-button-prev::before {
            content: '❮';
        }

        .mud-swiper-button-next::before {
            content: '❯';
        }

        /* Touch and pointer styles */
        .mud-swiper-slide {
            touch-action: pan-y;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
            .mud-swiper-button-prev,
            .mud-swiper-button-next {
                width: 36px;
                height: 36px;
                margin-top: -18px;
                font-size: 16px;
            }

            .mud-swiper-pagination .swiper-pagination-bullet {
                width: 6px;
                height: 6px;
                margin: 0 3px;
            }
        }
    `;
    document.head.appendChild(style);
}

// Inject styles when module loads
injectSwiperStyles();
