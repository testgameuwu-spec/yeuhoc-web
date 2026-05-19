// ===== A5K58 SLIDESHOW ENGINE =====
const slides = document.querySelectorAll('.slide');
const progressBar = document.getElementById('progressBar');
let currentSlide = 0;
let progressFills = [];
let slideTimer = null;
let progressInterval = null;
const CHAR_SPEED = 35;   // ms per character for typewriter

// ===== INITIALIZE TYPEWRITER TEXTS =====
document.querySelectorAll('.typewriter').forEach(el => {
    if (!el.dataset.textOriginal) {
        el.dataset.textOriginal = el.textContent.trim();
    }
    el.textContent = ''; // clear initial text
});

// Build progress bar
slides.forEach(() => {
    const seg = document.createElement('div');
    seg.className = 'progress-segment';
    const fill = document.createElement('div');
    fill.className = 'progress-fill';
    seg.appendChild(fill);
    progressBar.appendChild(seg);
    progressFills.push(fill);
});

// ===== TYPEWRITER =====
function typeWriter(el, text, delay, speed) {
    return new Promise(resolve => {
        setTimeout(() => {
            el.style.visibility = '';
            el.textContent = '';
            el.classList.add('typing');
            let i = 0;
            function type() {
                if (i < text.length) {
                    el.textContent += text.charAt(i);
                    i++;
                    setTimeout(type, speed);
                } else {
                    el.classList.remove('typing');
                    el.classList.add('done');
                    resolve();
                }
            }
            type();
        }, delay);
    });
}

// ===== CALCULATE SLIDE DURATION =====
function getSlideDuration(slide) {
    if (slide.dataset.manual === 'true') return 0;

    // Slide gallery súc vật con: cứng 20 giây
    if (slide.querySelector('.gallery-slideshow')) {
        return 20000;
    }
    
    // Credits
    if (slide.querySelector('.credits-scroll')) {
        return 25000;
    }

    let maxTime = 0;
    // Check anim elements
    slide.querySelectorAll('.anim').forEach(el => {
        const delay = parseInt(el.dataset.delay || '0');
        maxTime = Math.max(maxTime, delay + 900);
    });
    // Check typewriters
    slide.querySelectorAll('.typewriter').forEach(el => {
        const delay = parseInt(el.dataset.delay || '0');
        const text = el.dataset.textOriginal || '';
        const typeDur = text.length * CHAR_SPEED;
        maxTime = Math.max(maxTime, delay + typeDur);
    });

    let total = maxTime + 4000; // Nghỉ 4s sau khi anim cuối kết thúc
    if (total < 10000) return 10000;
    if (total > 15000 && maxTime <= 12000) return 15000; 
    return total;
}

// ===== SHOW ANIMATED ELEMENTS =====
function animateSlide(slide) {
    // Reset all anims
    slide.querySelectorAll('.anim').forEach(el => {
        el.classList.remove('show');
    });
    // Reset typewriters
    slide.querySelectorAll('.typewriter').forEach(el => {
        el.classList.remove('typing', 'done');
        el.textContent = '';
        el.style.visibility = '';
    });
    // Reset credits
    const credits = slide.querySelector('.credits-scroll');
    if (credits) {
        credits.style.animation = 'none';
        credits.offsetHeight; // reflow
        credits.style.animation = '';
    }

    // Trigger anims with delays
    slide.querySelectorAll('.anim').forEach(el => {
        const delay = parseInt(el.dataset.delay || '0');
        setTimeout(() => el.classList.add('show'), delay);
    });

    // Trigger typewriters
    slide.querySelectorAll('.typewriter').forEach(el => {
        const delay = parseInt(el.dataset.delay || '0');
        const text = el.dataset.textOriginal || '';
        typeWriter(el, text, delay, CHAR_SPEED);
    });

    // Trigger overlay image cycling
    const overlayContainer = slide.querySelector('.overlay-images');
    if (overlayContainer) {
        cycleOverlayImages(overlayContainer);
    }
}

// ===== OVERLAY IMAGE CYCLING =====
function cycleOverlayImages(container) {
    const images = container.querySelectorAll('.img-placeholder');
    let idx = 0;
    images.forEach(img => img.classList.remove('visible'));
    if (images.length === 0) return;

    function showNext() {
        images.forEach(img => img.classList.remove('visible'));
        images[idx].classList.add('visible');
        idx = (idx + 1) % images.length;
    }
    showNext();
    const interval = setInterval(() => {
        showNext();
        if (idx === 0 && container.dataset.cycled) {
            clearInterval(interval);
        }
        container.dataset.cycled = 'true';
    }, 2500);
    container._interval = interval;
}

// ===== PROGRESS BAR =====
function startProgress(duration) {
    let elapsed = 0;
    const step = 50;
    clearInterval(progressInterval);

    progressInterval = setInterval(() => {
        elapsed += step;
        const pct = Math.min((elapsed / duration) * 100, 100);
        progressFills[currentSlide].style.width = pct + '%';
        if (pct >= 100) {
            clearInterval(progressInterval);
        }
    }, step);
}

// ===== SHOW SLIDE =====
function showSlide(index) {
    clearTimeout(slideTimer);
    clearInterval(progressInterval);

    // Update progress fills
    for (let i = 0; i < slides.length; i++) {
        if (i < index) {
            progressFills[i].style.width = '100%';
        } else if (i > index) {
            progressFills[i].style.width = '0%';
        }
    }
    progressFills[index].style.width = '0%';

    // Activate slide
    slides.forEach(s => s.classList.remove('active'));
    slides[index].classList.add('active');

    // Animate content
    animateSlide(slides[index]);

    // Calculate timing
    const totalDuration = getSlideDuration(slides[index]);

    if (slides[index].dataset.manual === 'true') {
        progressFills[index].style.width = '0%';
        // No auto-advance
    } else {
        // Start progress
        startProgress(totalDuration);

        // Auto advance
        slideTimer = setTimeout(() => {
            if (currentSlide < slides.length - 1) {
                currentSlide++;
                showSlide(currentSlide);
            } else {
                clearInterval(progressInterval);
            }
        }, totalDuration);
    }
}

// ===== NAVIGATION =====
function nextSlide() {
    if (currentSlide < slides.length - 1) {
        currentSlide++;
        showSlide(currentSlide);
    }
}

function prevSlide() {
    if (currentSlide > 0) {
        currentSlide--;
        showSlide(currentSlide);
    }
}

// Keyboard nav
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ') nextSlide();
    if (e.key === 'ArrowLeft') prevSlide();
});

// Click nav (thay thế cho thẻ div chặn màn hình)
document.addEventListener('click', (e) => {
    // Nếu bấm vào khung ảnh thì KHÔNG chuyển slide
    if (e.target.closest('.img-placeholder')) return;
    
    const x = e.clientX;
    const width = window.innerWidth;
    if (x < width * 0.3) {
        prevSlide();
    } else {
        nextSlide();
    }
});

// ===== SEAMLESS GALLERY CLONE =====
document.querySelectorAll('.gallery-track').forEach(track => {
    track.innerHTML += track.innerHTML;
});

// ===== START =====
showSlide(0);

// ===== DRAG & DROP VÀ PASTE ẢNH (EDITOR MODE) =====
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => {
    e.preventDefault();
    const target = e.target.closest('.img-placeholder');
    if (!target) return;
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = target.querySelector('img');
            if (img) {
                img.src = event.target.result;
            } else {
                target.innerHTML = `<img src="${event.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:4px;">`;
            }
        };
        reader.readAsDataURL(file);
    }
});

let hoveredPlaceholder = null;
document.addEventListener('mouseover', e => {
    const target = e.target.closest('.img-placeholder');
    if (target) hoveredPlaceholder = target;
});
document.addEventListener('mouseout', e => {
    hoveredPlaceholder = null;
});

document.addEventListener('paste', e => {
    const file = (e.clipboardData || window.clipboardData).files[0];
    if (file && file.type.startsWith('image/')) {
        const target = hoveredPlaceholder || document.querySelector('.img-placeholder:not(:has(img))') || document.querySelector('.img-placeholder');
        if (!target) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = target.querySelector('img');
            if (img) {
                img.src = event.target.result;
            } else {
                target.innerHTML = `<img src="${event.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:4px;">`;
            }
        };
        reader.readAsDataURL(file);
    }
});
