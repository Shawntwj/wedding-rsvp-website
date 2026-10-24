const CONFIG = {
    CAROUSEL_INTERVAL: 8000,
    CAROUSEL_IMAGES_PATH: 'resources/img/',
    MAX_IMAGE_COUNT: 22,
};

const Carousel = {
    currentSlide: 0,
    totalSlides: 0,
    autoPlayTimer: null,
    interacted: false,
    request: 0,

    init() {
        this.track = document.getElementById('carouselTrack');
        this.counter = document.getElementById('carouselCounter');
        this.pauseButton = document.getElementById('carouselPause');
        this.container = document.querySelector('.carousel-container');
        this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        const filenames = Array.from({ length: CONFIG.MAX_IMAGE_COUNT }, (_, i) => `photo${i + 1}.jpg`);
        // Shuffle filenames without fetching every image first.
        for (let i = filenames.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [filenames[i], filenames[j]] = [filenames[j], filenames[i]];
        }
        this.slides = filenames.map((filename) => {
            const slide = document.createElement('div');
            slide.className = 'carousel-slide';
            slide.setAttribute('aria-hidden', 'true');
            const img = document.createElement('img');
            img.dataset.src = CONFIG.CAROUSEL_IMAGES_PATH + filename;
            img.alt = `Wendy and Shawn ? photo ${filename.match(/\d+/)[0]}`;
            img.decoding = 'async';
            img.draggable = false;
            slide.appendChild(img);
            this.track.appendChild(slide);
            return slide;
        });
        this.totalSlides = this.slides.length;
        this.loads = new Map();
        this.attachEventListeners();
        this.goToSlide(0).then(() => this.startAutoPlay());
    },

    loadSlide(index) {
        if (!this.loads.has(index)) {
            const img = this.slides[index].querySelector('img');
            this.loads.set(index, new Promise((resolve) => {
                img.onload = () => resolve(true);
                img.onerror = () => { this.loads.delete(index); resolve(false); };
                if (index === 0) img.fetchPriority = 'high';
                img.src = img.dataset.src;
            }));
        }
        return this.loads.get(index);
    },

    async goToSlide(index) {
        index = (index + this.totalSlides) % this.totalSlides;
        const request = ++this.request;
        if (!await this.loadSlide(index) || request !== this.request) return;
        this.slides.forEach((slide, i) => {
            slide.classList.toggle('active', i === index);
            slide.setAttribute('aria-hidden', String(i !== index));
        });
        this.currentSlide = index;
        this.counter.textContent = `${index + 1} / ${this.totalSlides}`;
        // Only preload the next image; all others wait until navigation.
        this.loadSlide((index + 1) % this.totalSlides);
    },

    stopAutoPlay() {
        clearInterval(this.autoPlayTimer);
        this.autoPlayTimer = null;
        this.pauseButton.dataset.playing = 'false';
        this.pauseButton.title = 'Play slideshow';
        this.pauseButton.setAttribute('aria-label', 'Play photo slideshow');
    },

    startAutoPlay() {
        this.stopAutoPlay();
        if (this.interacted || this.reducedMotion.matches || document.hidden) return;
        this.autoPlayTimer = setInterval(() => this.goToSlide(this.currentSlide + 1), CONFIG.CAROUSEL_INTERVAL);
        this.pauseButton.dataset.playing = 'true';
        this.pauseButton.title = 'Pause slideshow';
        this.pauseButton.setAttribute('aria-label', 'Pause photo slideshow');
    },

    navigate(direction) {
        this.interacted = true;
        this.stopAutoPlay();
        this.goToSlide(this.currentSlide + direction);
    },

    attachEventListeners() {
        document.getElementById('prevSlide').addEventListener('click', () => this.navigate(-1));
        document.getElementById('nextSlide').addEventListener('click', () => this.navigate(1));
        this.pauseButton.addEventListener('click', () => {
            if (this.autoPlayTimer) {
                this.interacted = true;
                this.stopAutoPlay();
            } else {
                this.interacted = false;
                this.startAutoPlay();
            }
        });
        this.container.addEventListener('keydown', (event) => {
            if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
            event.preventDefault();
            this.navigate(event.key === 'ArrowLeft' ? -1 : 1);
        });
        let touchStart = null;
        this.container.addEventListener('touchstart', (event) => {
            this.interacted = true;
            this.stopAutoPlay();
            touchStart = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
        }, { passive: true });
        this.container.addEventListener('touchend', (event) => {
            if (!touchStart) return;
            const dx = event.changedTouches[0].clientX - touchStart.x;
            const dy = event.changedTouches[0].clientY - touchStart.y;
            touchStart = null;
            if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) this.navigate(dx < 0 ? 1 : -1);
        }, { passive: true });
        this.container.addEventListener('touchcancel', () => { touchStart = null; });
        this.container.addEventListener('mouseenter', () => this.stopAutoPlay());
        this.container.addEventListener('mouseleave', () => this.startAutoPlay());
        this.container.addEventListener('focusin', () => { this.interacted = true; this.stopAutoPlay(); });
        document.addEventListener('visibilitychange', () => document.hidden ? this.stopAutoPlay() : this.startAutoPlay());
        this.reducedMotion.addEventListener('change', () => this.startAutoPlay());
    }
};

document.addEventListener('DOMContentLoaded', () => Carousel.init());

function revealFamilySection() {
    if (window.location.hash === '#family') {
        document.getElementById('family-details').open = true;
    }
}
revealFamilySection();
window.addEventListener('hashchange', revealFamilySection);

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
