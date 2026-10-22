// MV Studio — project detail pages (runs after script.js)

// Project order, used for the previous / next links
const projects = [
    { id: 'apmoodle', title: 'APMoodle', file: 'APMoodle.html' },
    { id: 'hypertextedu', title: 'HyperText Edu', file: 'hypertextedu.html' },
    { id: 'psychology', title: 'Psychology Consultation Management System', file: 'PsychologyConsultationManagementSystem.html' },
    { id: 'supermathsbros', title: 'Super Maths Bros', file: 'SuperMathsBros.html' }
];

document.addEventListener('DOMContentLoaded', () => {
    initProjectNavigation();
    initImageGallery();
});

// Fill in previous / next project links (wrapping around the list)
function initProjectNavigation() {
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    if (!prevBtn || !nextBtn) return;

    const currentPage = decodeURIComponent(window.location.pathname.split('/').pop());
    const index = projects.findIndex(p => p.file === currentPage);
    if (index === -1) return;

    const prev = projects[(index - 1 + projects.length) % projects.length];
    const next = projects[(index + 1) % projects.length];

    prevBtn.href = prev.file;
    prevBtn.querySelector('strong').textContent = prev.title;
    nextBtn.href = next.file;
    nextBtn.querySelector('strong').textContent = next.title;
}

// Screenshot gallery with a keyboard-friendly lightbox
function initImageGallery() {
    const items = Array.from(document.querySelectorAll('.gallery-item'));
    if (!items.length) return;

    const slides = items.map(item => {
        const img = item.querySelector('img');
        const caption = item.querySelector('figcaption');
        return {
            src: img.getAttribute('src'),
            alt: img.getAttribute('alt') || '',
            title: caption && caption.querySelector('h4') ? caption.querySelector('h4').textContent : '',
            text: caption && caption.querySelector('p') ? caption.querySelector('p').textContent : ''
        };
    });

    items.forEach((item, i) => {
        const trigger = item.querySelector('.gallery-open');
        if (trigger) trigger.addEventListener('click', () => openLightbox(slides, i, trigger));
    });
}

function openLightbox(slides, startIndex, trigger) {
    let current = startIndex;

    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.setAttribute('aria-label', 'Screenshot viewer');
    lightbox.innerHTML = `
        <span class="lightbox-counter"></span>
        <button class="lightbox-btn lightbox-close" type="button" aria-label="Close"><i class="fas fa-xmark"></i></button>
        <button class="lightbox-btn lightbox-prev" type="button" aria-label="Previous screenshot"><i class="fas fa-chevron-left"></i></button>
        <figure>
            <img src="" alt="">
            <figcaption><h4></h4><p></p></figcaption>
        </figure>
        <button class="lightbox-btn lightbox-next" type="button" aria-label="Next screenshot"><i class="fas fa-chevron-right"></i></button>
    `;

    const img = lightbox.querySelector('img');
    const title = lightbox.querySelector('figcaption h4');
    const text = lightbox.querySelector('figcaption p');
    const counter = lightbox.querySelector('.lightbox-counter');
    const closeBtn = lightbox.querySelector('.lightbox-close');
    const prevBtn = lightbox.querySelector('.lightbox-prev');
    const nextBtn = lightbox.querySelector('.lightbox-next');

    if (slides.length < 2) {
        prevBtn.hidden = true;
        nextBtn.hidden = true;
    }

    function show(i) {
        current = (i + slides.length) % slides.length;
        const slide = slides[current];
        img.src = slide.src;
        img.alt = slide.alt;
        title.textContent = slide.title;
        text.textContent = slide.text;
        counter.textContent = (current + 1) + ' / ' + slides.length;
    }

    function close() {
        document.removeEventListener('keydown', onKey);
        lightbox.classList.remove('open');
        document.body.classList.remove('no-scroll');
        setTimeout(() => lightbox.remove(), 250);
        if (trigger) trigger.focus();
    }

    function onKey(e) {
        if (e.key === 'Escape') close();
        else if (e.key === 'ArrowLeft') show(current - 1);
        else if (e.key === 'ArrowRight') show(current + 1);
        else if (e.key === 'Tab') {
            // Keep focus inside the dialog
            const focusable = Array.from(lightbox.querySelectorAll('button:not([hidden])'));
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
    }

    closeBtn.addEventListener('click', close);
    prevBtn.addEventListener('click', () => show(current - 1));
    nextBtn.addEventListener('click', () => show(current + 1));
    lightbox.addEventListener('click', e => {
        if (e.target === lightbox || e.target.tagName === 'FIGURE') close();
    });

    // Basic swipe support on touch screens
    let touchX = null;
    lightbox.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
    lightbox.addEventListener('touchend', e => {
        if (touchX === null) return;
        const dx = e.changedTouches[0].clientX - touchX;
        if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
        touchX = null;
    });

    show(startIndex);
    document.body.appendChild(lightbox);
    document.body.classList.add('no-scroll');
    document.addEventListener('keydown', onKey);
    requestAnimationFrame(() => lightbox.classList.add('open'));
    closeBtn.focus();
}
