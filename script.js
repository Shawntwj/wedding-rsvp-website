// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
    GOOGLE_SCRIPT_URL: 'YOUR_GOOGLE_SCRIPT_URL_HERE',
    CAROUSEL_INTERVAL: 5000, // 5 seconds
};

// ============================================
// MUSIC AUTOPLAY
// ============================================
function initMusic() {
    const bgMusic = document.getElementById('bgMusic');
    bgMusic.play().catch(() => {
        document.addEventListener('click', () => bgMusic.play(), { once: true });
    });
}

// ============================================
// CAROUSEL MODULE
// ============================================
const Carousel = {
    currentSlide: 0,
    totalSlides: 0,
    autoPlayTimer: null,

    init() {
        this.track = document.getElementById('carouselTrack');
        this.dotsContainer = document.getElementById('carouselDots');
        this.slides = document.querySelectorAll('.carousel-slide');
        this.totalSlides = this.slides.length;

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
        const offset = -this.currentSlide * 100;
        this.track.style.transform = `translateX(${offset}%)`;
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
document.addEventListener('DOMContentLoaded', () => {
    initMusic();
    Carousel.init();
    RSVPForm.init();
});
