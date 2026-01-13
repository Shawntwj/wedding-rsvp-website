// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
    GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzjmeZ7ZyHqZtNagSVHZf0iDacGUTZMPRTrCuby2sPST49eoTTfZidtOljEc14RUARo/exec',
    CAROUSEL_INTERVAL: 5000, // 5 seconds
    CAROUSEL_IMAGES_PATH: 'resources/img/',
    // The number of images to try loading (adjust this based on how many images you have)
    MAX_IMAGE_COUNT: 50,
    MUSIC_PATH: 'resources/music/',
    // Maximum number of music files to try discovering
    MAX_MUSIC_COUNT: 20
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
        const musicExtensions = ['mp3', 'wav', 'ogg', 'm4a'];
        const discoveredMusic = [];
        let consecutiveMisses = 0;

        // Try to load music files sequentially
        for (let i = 1; i <= CONFIG.MAX_MUSIC_COUNT; i++) {
            let found = false;
            for (const ext of musicExtensions) {
                const filename = `music${i}.${ext}`;
                const exists = await this.checkMusicExists(filename);

                if (exists) {
                    discoveredMusic.push(filename);
                    found = true;
                    consecutiveMisses = 0;
                    break;
                }
            }

            if (!found) {
                consecutiveMisses++;
                // Stop if we've missed 5 consecutive files and have found at least one
                if (consecutiveMisses >= 5 && discoveredMusic.length > 0) {
                    break;
                }
            }
        }

        // Also try common music file names
        const commonNames = [
            'Apink - LUV.mp3',
            'Lauv - Steal The Show.mp3',
            'Sasablue - 最後一頁.mp3'
        ];

        for (const filename of commonNames) {
            const exists = await this.checkMusicExists(filename);
            if (exists && !discoveredMusic.includes(filename)) {
                discoveredMusic.push(filename);
            }
        }

        console.log(`Discovered ${discoveredMusic.length} music files:`, discoveredMusic);
        return discoveredMusic;
    },

    checkMusicExists(filename) {
        return new Promise((resolve) => {
            const audio = new Audio();
            audio.oncanplaythrough = () => resolve(true);
            audio.onerror = () => resolve(false);
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
            const dot = document.createElement('div');
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

// ============================================
// FORM MODULE
// ============================================
const RSVPForm = {
    currentStep: 1,
    totalSteps: 3,

    init() {
        this.form = document.getElementById('rsvpForm');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.submitBtn = document.getElementById('submitBtn');
        this.plusOneCard = document.getElementById('plusOneCard');

        this.setupEventListeners();
        this.setupOptionCards();
        this.setupEventCheckboxes();
        this.initPlusOneCard();
    },

    initPlusOneCard() {
        this.plusOneCard.style.display = 'none';
        document.getElementById('guestsGrid').classList.add('solo');
    },

    setupEventListeners() {
        this.nextBtn.addEventListener('click', () => this.handleNext());
        this.prevBtn.addEventListener('click', () => this.handlePrev());
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));

        document.getElementById('plusOneName').addEventListener('input', (e) => {
            const title = document.getElementById('plusOneCardTitle');
            title.textContent = e.target.value.trim() || 'Your +1';
        });
    },

    setupOptionCards() {
        document.querySelectorAll('.option-card').forEach(card => {
            card.addEventListener('click', () => {
                const input = card.querySelector('input');
                const name = input.name;

                // Remove selected from siblings
                document.querySelectorAll(`input[name="${name}"]`).forEach(inp => {
                    inp.closest('.option-card').classList.remove('selected');
                });

                // Add selected to current
                card.classList.add('selected');
                input.checked = true;

                // Handle +1 selection
                if (name === 'plusOne') {
                    this.handlePlusOneSelection(input.value);
                }
            });
        });
    },

    handlePlusOneSelection(value) {
        const plusOneNameSection = document.getElementById('plusOneNameSection');
        const guestsGrid = document.getElementById('guestsGrid');

        if (value === 'Yes') {
            plusOneNameSection.style.display = 'block';
            this.plusOneCard.classList.remove('disabled');
            this.plusOneCard.style.display = 'block';
            guestsGrid.classList.remove('solo');
        } else {
            plusOneNameSection.style.display = 'none';
            this.plusOneCard.classList.add('disabled');
            this.plusOneCard.style.display = 'none';
            guestsGrid.classList.add('solo');
            document.getElementById('plusOneName').value = '';

            // Clear +1 event selections
            document.querySelectorAll('#plusOneCard input[type="checkbox"]').forEach(cb => {
                cb.checked = false;
                cb.dispatchEvent(new Event('change'));
            });
        }
    },

    setupEventCheckboxes() {
        const checkboxes = [
            { checkbox: 'yourChurch', card: 'yourChurchCard', options: 'yourChurchOptions' },
            { checkbox: 'yourReception', card: 'yourReceptionCard', options: 'yourReceptionOptions' },
            { checkbox: 'plusOneChurch', card: 'plusOneChurchCard', options: 'plusOneChurchOptions' },
            { checkbox: 'plusOneReception', card: 'plusOneReceptionCard', options: 'plusOneReceptionOptions' }
        ];

        checkboxes.forEach(({ checkbox, card, options }) => {
            this.setupEventCheckbox(checkbox, card, options);
        });
    },

    setupEventCheckbox(checkboxId, cardId, optionsId) {
        const checkbox = document.getElementById(checkboxId);
        const card = document.getElementById(cardId);
        const options = document.getElementById(optionsId);

        checkbox.addEventListener('change', function() {
            if (this.checked) {
                card.classList.add('selected');
                options.classList.add('show');
            } else {
                card.classList.remove('selected');
                options.classList.remove('show');
            }
        });

        // Make card clickable
        card.addEventListener('click', function(e) {
            if (!e.target.closest('input, textarea, label')) {
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change'));
            }
        });
    },

    showStep(step) {
        // Hide all steps
        document.querySelectorAll('.form-step').forEach(s => s.style.display = 'none');

        // Show current step
        document.querySelector(`.form-step[data-step="${step}"]`).style.display = 'block';

        // Update step indicators
        document.querySelectorAll('.step').forEach((s, i) => {
            s.classList.remove('active', 'completed');
            if (i + 1 < step) s.classList.add('completed');
            if (i + 1 === step) s.classList.add('active');
        });

        // Update buttons
        this.prevBtn.style.display = step > 1 ? 'block' : 'none';
        this.nextBtn.style.display = step < this.totalSteps ? 'block' : 'none';
        this.submitBtn.style.display = step === this.totalSteps ? 'block' : 'none';

        this.currentStep = step;
    },

    validateStep(step) {
        const errors = [];

        if (step === 1) {
            errors.push(...this.validateStepOne());
        }

        if (step === 2) {
            errors.push(...this.validateStepTwo());
        }

        return errors.length === 0;
    },

    validateStepOne() {
        const errors = [];
        const name = document.getElementById('fullName').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const friendOf = document.querySelector('input[name="friendOf"]:checked');
        const plusOne = document.querySelector('input[name="plusOne"]:checked');

        if (!name) {
            errors.push('name');
            this.showError('nameError', 'fullName');
        } else {
            this.hideError('nameError', 'fullName');
        }

        if (!phone) {
            errors.push('phone');
            this.showError('phoneError', 'phone');
        } else {
            this.hideError('phoneError', 'phone');
        }

        if (!friendOf || !plusOne) {
            errors.push('selection');
        }

        // Validate +1 name if bringing a +1
        if (plusOne && plusOne.value === 'Yes') {
            const plusOneName = document.getElementById('plusOneName').value.trim();
            if (!plusOneName) {
                errors.push('plusOneName');
                this.showError('plusOneNameError', 'plusOneName');
            } else {
                this.hideError('plusOneNameError', 'plusOneName');
            }
        }

        return errors;
    },

    validateStepTwo() {
        const errors = [];
        const yourChurch = document.getElementById('yourChurch').checked;
        const yourReception = document.getElementById('yourReception').checked;
        const hasPlusOne = document.querySelector('input[name="plusOne"]:checked')?.value === 'Yes';

        if (!yourChurch && !yourReception) {
            errors.push('events');
            document.getElementById('eventsError').classList.add('show');
        } else {
            document.getElementById('eventsError').classList.remove('show');
        }

        if (hasPlusOne) {
            const plusOneChurch = document.getElementById('plusOneChurch').checked;
            const plusOneReception = document.getElementById('plusOneReception').checked;

            if (!plusOneChurch && !plusOneReception) {
                errors.push('plusone');
                alert('Please select at least one event for your +1');
            }
        }

        return errors;
    },

    showError(errorId, inputId) {
        document.getElementById(errorId).classList.add('show');
        document.getElementById(inputId).classList.add('error');
    },

    hideError(errorId, inputId) {
        document.getElementById(errorId).classList.remove('show');
        document.getElementById(inputId).classList.remove('error');
    },

    handleNext() {
        if (this.validateStep(this.currentStep)) {
            this.showStep(this.currentStep + 1);
        }
    },

    handlePrev() {
        this.showStep(this.currentStep - 1);
    },

    async handleSubmit(e) {
        e.preventDefault();

        if (!this.validateStep(this.currentStep)) return;

        // Check if Google Script URL is configured
        if (CONFIG.GOOGLE_SCRIPT_URL === 'YOUR_GOOGLE_SCRIPT_URL_HERE') {
            alert('Please configure your Google Apps Script URL first. Check the setup instructions.');
            return;
        }

        this.form.classList.add('loading');
        this.submitBtn.disabled = true;

        const formData = this.collectFormData();

        try {
            await this.submitToGoogleSheets(formData);

            setTimeout(() => {
                this.form.classList.remove('loading');
                this.submitBtn.disabled = false;
                this.showSuccessModal();
            }, 1000);

        } catch (error) {
            console.error('Error:', error);
            this.form.classList.remove('loading');
            this.submitBtn.disabled = false;
            alert('There was an error submitting your RSVP. Please try again or contact us directly.');
        }
    },

    collectFormData() {
        const hasPlusOne = document.querySelector('input[name="plusOne"]:checked').value === 'Yes';
        const yourChurch = document.getElementById('yourChurch').checked;
        const yourReception = document.getElementById('yourReception').checked;
        const plusOneChurch = hasPlusOne && document.getElementById('plusOneChurch').checked;
        const plusOneReception = hasPlusOne && document.getElementById('plusOneReception').checked;

        const churchCount = (yourChurch ? 1 : 0) + (plusOneChurch ? 1 : 0);
        const receptionCount = (yourReception ? 1 : 0) + (plusOneReception ? 1 : 0);

        return {
            timestamp: new Date().toISOString(),
            fullName: document.getElementById('fullName').value,
            phone: document.getElementById('phone').value,
            friendOf: document.querySelector('input[name="friendOf"]:checked').value,
            hasPlusOne: hasPlusOne ? 'Yes' : 'No',
            plusOneName: hasPlusOne ? document.getElementById('plusOneName').value : 'N/A',
            yourChurch: yourChurch ? 'Yes' : 'No',
            yourReception: yourReception ? 'Yes' : 'No',
            plusOneChurch: plusOneChurch ? 'Yes' : 'No',
            plusOneReception: plusOneReception ? 'Yes' : 'No',
            churchGuestCount: churchCount > 0 ? churchCount : 'N/A',
            receptionGuestCount: receptionCount > 0 ? receptionCount : 'N/A',
            yourLunchDietary: yourChurch ? (document.getElementById('yourLunchDietary').value || 'None') : 'N/A',
            plusOneLunchDietary: plusOneChurch ? (document.getElementById('plusOneLunchDietary').value || 'None') : 'N/A',
            yourDinnerDietary: yourReception ? (document.getElementById('yourDinnerDietary').value || 'None') : 'N/A',
            plusOneDinnerDietary: plusOneReception ? (document.getElementById('plusOneDinnerDietary').value || 'None') : 'N/A',
            song: document.getElementById('song').value || 'N/A',
            message: document.getElementById('message').value || 'N/A'
        };
    },

    async submitToGoogleSheets(formData) {
        const response = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        return response;
    },

    showSuccessModal() {
        document.getElementById('successModal').classList.add('show');
    },

    reset() {
        this.form.reset();
        document.querySelectorAll('.option-card').forEach(card => card.classList.remove('selected'));
        document.querySelectorAll('.event-checkbox').forEach(card => card.classList.remove('selected'));
        document.querySelectorAll('.event-options').forEach(opt => opt.classList.remove('show'));
        this.plusOneCard.classList.add('disabled');
        this.plusOneCard.style.display = 'none';
        document.getElementById('guestsGrid').classList.add('solo');
        document.getElementById('plusOneNameSection').style.display = 'none';
        document.getElementById('plusOneCardTitle').textContent = 'Your +1';
        this.showStep(1);
    }
};

// ============================================
// MODAL MODULE
// ============================================
function closeModal() {
    document.getElementById('successModal').classList.remove('show');
    RSVPForm.reset();
}

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    initMusic();
    await Carousel.init();
    RSVPForm.init();
});
