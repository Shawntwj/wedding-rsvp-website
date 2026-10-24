// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
    CAROUSEL_INTERVAL: 5000, // 5 seconds
    CAROUSEL_IMAGES_PATH: 'resources/img/',
    // The number of images to try loading (adjust this based on how many images you have)
    MAX_IMAGE_COUNT: 9,
};

// ============================================
// CAROUSEL MODULE
// ============================================
const Carousel = {
    currentSlide: 0,
    totalSlides: 0,
    autoPlayTimer: null,

    // Fisher-Yates shuffle algorithm to randomize array
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    },

    checkImageExists(filename) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = CONFIG.CAROUSEL_IMAGES_PATH + filename;
        });
    },

    async discoverImages() {
        const imageExtensions = ['jpeg', 'jpg', 'png', 'gif', 'webp'];
        const discoveredImages = [];
        let consecutiveMisses = 0;

        // Try to load images sequentially (sample1.jpeg, sample2.jpeg, etc.)
        for (let i = 1; i <= CONFIG.MAX_IMAGE_COUNT; i++) {
            // Try each extension
            let found = false;
            for (const ext of imageExtensions) {
                const filename = `sample${i}.${ext}`;
                const exists = await this.checkImageExists(filename);

                if (exists) {
                    discoveredImages.push(filename);
                    found = true;
                    consecutiveMisses = 0;
                    break; // Found this image, move to next number
                }
            }

            if (!found) {
                consecutiveMisses++;
                // Stop if we've missed 5 consecutive images and have found at least one
                if (consecutiveMisses >= 5 && discoveredImages.length > 0) {
                    break;
                }
            }
        }

        console.log(`Discovered ${discoveredImages.length} images:`, discoveredImages);
        return discoveredImages;
    },

    async loadImages() {
        // Discover images dynamically
        const images = await this.discoverImages();

        if (images.length === 0) {
            console.error('No images found in', CONFIG.CAROUSEL_IMAGES_PATH);
            return;
        }

        // Randomize the images array
        const randomizedImages = this.shuffleArray(images);
        console.log('Loading randomized images:', randomizedImages);

        // Create carousel slides for each image
        randomizedImages.forEach((filename, index) => {
            const slide = document.createElement('div');
            slide.classList.add('carousel-slide');

            const img = document.createElement('img');
            img.src = CONFIG.CAROUSEL_IMAGES_PATH + filename;
            img.alt = `Wendy and Shawn - Photo ${index + 1}`;

            slide.appendChild(img);
            this.track.appendChild(slide);
        });
    },

    async init() {
        this.track = document.getElementById('carouselTrack');
        this.dotsContainer = document.getElementById('carouselDots');

        // Load and randomize images first
        await this.loadImages();

        this.slides = document.querySelectorAll('.carousel-slide');
        this.totalSlides = this.slides.length;

        if (this.totalSlides === 0) {
            console.error('No carousel slides created');
            return;
        }

        this.createDots();
        this.attachEventListeners();
        this.startAutoPlay();
    },

    createDots() {
        this.slides.forEach((_, index) => {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.setAttribute('aria-label', `Show photo ${index + 1}`);
            dot.classList.add('carousel-dot');
            if (index === 0) dot.classList.add('active');
            dot.addEventListener('click', () => this.goToSlide(index));
            this.dotsContainer.appendChild(dot);
        });
    },

    updateDots() {
        const dots = document.querySelectorAll('.carousel-dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === this.currentSlide);
        });
    },

    goToSlide(index) {
        this.currentSlide = index;
        const slideWidth = this.track.parentElement.offsetWidth;
        const offset = -this.currentSlide * slideWidth;
        this.track.style.transform = `translateX(${offset}px)`;
        this.updateDots();
    },

    next() {
        this.currentSlide = (this.currentSlide + 1) % this.totalSlides;
        this.goToSlide(this.currentSlide);
    },

    prev() {
        this.currentSlide = (this.currentSlide - 1 + this.totalSlides) % this.totalSlides;
        this.goToSlide(this.currentSlide);
    },

    startAutoPlay() {
        this.autoPlayTimer = setInterval(() => this.next(), CONFIG.CAROUSEL_INTERVAL);
    },

    stopAutoPlay() {
        clearInterval(this.autoPlayTimer);
    },

    attachEventListeners() {
        document.getElementById('prevSlide').addEventListener('click', () => this.prev());
        document.getElementById('nextSlide').addEventListener('click', () => this.next());

        const container = document.querySelector('.carousel-container');
        container.addEventListener('mouseenter', () => this.stopAutoPlay());
        container.addEventListener('mouseleave', () => this.startAutoPlay());
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    await Carousel.init();
});

function revealFamilySection() {
    if (window.location.hash === '#family') {
        document.getElementById('family-details').open = true;
    }
}
revealFamilySection();
window.addEventListener('hashchange', revealFamilySection);
window.addEventListener('resize', () => {
    if (Carousel.totalSlides) Carousel.goToSlide(Carousel.currentSlide);
});

// The widget loader compares message origins with a URL containing /w.
// Accept its resize messages using the actual origin and mounted frame source.
window.addEventListener('message', (event) => {
    if (event.origin !== 'https://www.wedibox.com') return;
    const frame = document.querySelector('#wedibox-embed iframe');
    if (!frame || event.source !== frame.contentWindow) return;
    const data = event.data;
    if (!data || data.type !== 'WEDIBOX_WIDGET_RESIZE') return;
    const height = data.payload?.height;
    if (typeof height !== 'number' || !Number.isFinite(height) || height < 320) return;
    frame.style.height = `${Math.ceil(height)}px`;
});
