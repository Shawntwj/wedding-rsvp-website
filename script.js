// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
    CAROUSEL_INTERVAL: 5000, // 5 seconds
    CAROUSEL_IMAGES_PATH: 'resources/img/',
    // The number of images to try loading (adjust this based on how many images you have)
    MAX_IMAGE_COUNT: 9,
    MUSIC_PATH: 'resources/music/',
};

// ============================================
// MUSIC AUTOPLAY
// ============================================
const MusicControl = {
    bgMusic: null,
    controlBtn: null,
    statusText: null,
    volumeSlider: null,
    volumePercentage: null,
    volumeControl: null,
    wrapper: null,
    isPlaying: false,
    currentSongName: '',

    async discoverMusic() {
        // Hardcoded music files to avoid console errors from discovery
        const musicFiles = [
            'Lauv - Steal The Show.mp3'
        ];

        console.log(`Loaded ${musicFiles.length} music files:`, musicFiles);
        return musicFiles;
    },

    checkMusicExists(filename) {
        return new Promise((resolve) => {
            const audio = new Audio();
            const timeoutId = setTimeout(() => resolve(false), 1000);

            audio.oncanplaythrough = () => {
                clearTimeout(timeoutId);
                resolve(true);
            };

            audio.onerror = () => {
                clearTimeout(timeoutId);
                resolve(false);
            };

            // Preload metadata only to avoid unnecessary downloads
            audio.preload = 'metadata';
            audio.src = CONFIG.MUSIC_PATH + filename;
        });
    },

    getDisplayName(filename) {
        // Remove file extension and clean up the name
        return filename.replace(/\.[^/.]+$/, '');
    },

    async init() {
        this.bgMusic = document.getElementById('bgMusic');
        this.controlBtn = document.getElementById('musicControl');
        this.statusText = this.controlBtn.querySelector('.music-status');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.volumePercentage = document.getElementById('volumePercentage');
        this.volumeControl = document.getElementById('volumeControl');
        this.wrapper = document.querySelector('.music-control-wrapper');

        if (!this.bgMusic || !this.controlBtn) return;

        // Discover and randomly select music
        const musicFiles = await this.discoverMusic();
        if (musicFiles.length > 0) {
            const randomIndex = Math.floor(Math.random() * musicFiles.length);
            const selectedMusic = musicFiles[randomIndex];

            // Update audio source
            this.bgMusic.src = CONFIG.MUSIC_PATH + selectedMusic;
            this.currentSongName = this.getDisplayName(selectedMusic);

            // Update the music title in the UI
            const musicTitle = this.controlBtn.querySelector('.music-title');
            if (musicTitle) {
                musicTitle.textContent = this.currentSongName;
            }

            console.log(`Selected music: ${selectedMusic}`);
        }

        // Set initial volume
        const initialVolume = 0.5;
        this.bgMusic.volume = initialVolume;
        this.volumeSlider.value = initialVolume * 100;
        this.updateVolumeUI();

        // Try to autoplay
        this.bgMusic.play()
            .then(() => {
                this.isPlaying = true;
                this.updatePlaybackUI();
            })
            .catch(() => {
                // If autoplay fails, wait for user interaction
                this.isPlaying = false;
                this.updatePlaybackUI();
                document.addEventListener('click', () => this.play(), { once: true });
            });

        // Add click handler to toggle music
        this.controlBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        // Add volume slider handler
        this.volumeSlider.addEventListener('input', (e) => {
            const volume = e.target.value / 100;
            this.setVolume(volume);
        });

        // Mobile: toggle volume control visibility on tap
        if ('ontouchstart' in window) {
            this.controlBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.wrapper.classList.toggle('show-volume');
            });

            // Close volume control when tapping outside
            document.addEventListener('click', (e) => {
                if (!this.wrapper.contains(e.target)) {
                    this.wrapper.classList.remove('show-volume');
                }
            });
        }
    },

    play() {
        if (this.bgMusic && this.bgMusic.paused) {
            this.bgMusic.play();
            this.isPlaying = true;
            this.updatePlaybackUI();
        }
    },

    pause() {
        if (this.bgMusic && !this.bgMusic.paused) {
            this.bgMusic.pause();
            this.isPlaying = false;
            this.updatePlaybackUI();
        }
    },

    toggle() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    },

    setVolume(volume) {
        if (this.bgMusic) {
            this.bgMusic.volume = volume;
            this.updateVolumeUI();
        }
    },

    updatePlaybackUI() {
        if (this.isPlaying) {
            this.controlBtn.classList.remove('paused');
            this.statusText.textContent = 'Music Playing';
        } else {
            this.controlBtn.classList.add('paused');
            this.statusText.textContent = 'Music Paused';
        }
    },

    updateVolumeUI() {
        const volume = this.bgMusic.volume;
        const percentage = Math.round(volume * 100);

        // Update percentage display
        this.volumePercentage.textContent = `${percentage}%`;

        // Update slider gradient
        const gradientValue = percentage;
        this.volumeSlider.style.background = `linear-gradient(to right, var(--rose) 0%, var(--rose) ${gradientValue}%, var(--border) ${gradientValue}%, var(--border) 100%)`;

        // Toggle muted class
        if (percentage === 0) {
            this.volumeControl.classList.add('muted');
        } else {
            this.volumeControl.classList.remove('muted');
        }
    }
};

async function initMusic() {
    await MusicControl.init();
}

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
    initMusic();
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
