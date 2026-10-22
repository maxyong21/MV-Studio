// MV Studio — shared site behaviour (homepage + project pages)
document.addEventListener('DOMContentLoaded', function () {
    initThemeToggle();
    initNavigation();
    initActiveLinks();
    initReveal();
    initCopyButtons();
    initPackageDialog();
    initFooterYear();
    initStudioContent();
    initPromo();
});

// Editable studio content is stored locally for this static prototype.
function initStudioContent() {
    let data;
    try { data = JSON.parse(localStorage.getItem('mvStudioContent') || 'null'); } catch (e) {}
    if (!data) return;
    (data.packages || []).forEach(item => {
        const card = Array.from(document.querySelectorAll('.price-card')).find(el => el.querySelector('.price-name')?.textContent.trim() === item.name);
        const amount = card?.querySelector('.price-now .amount');
        if (amount && item.price) amount.textContent = item.price;
    });
    if (Array.isArray(data.projects)) {
        const grid = document.querySelector('.projects-grid');
        if (grid && data.projects.length) {
            grid.replaceChildren(...data.projects.map((project, index) => {
                const card = document.createElement('article');
                card.className = 'project-card card';
                const content = document.createElement('div');
                content.className = 'card-content';
                const kicker = document.createElement('div');
                kicker.className = 'project-kicker';
                kicker.textContent = 'Featured project';
                const title = document.createElement('h3');
                title.className = 'project-title';
                const link = document.createElement('a');
                link.href = project.url || '#contact';
                link.textContent = project.name;
                title.append(link);
                const description = document.createElement('p');
                description.className = 'project-description';
                description.textContent = project.detail || 'A project by MV Studio.';
                const action = document.createElement('a');
                action.className = 'link-btn';
                action.href = project.url || '#contact';
                action.textContent = 'View project →';
                content.append(kicker, title, description, action);
                card.append(content);
                return card;
            }));
        }
    }
}

function initPromo() {
    const dialog = document.getElementById('promoDialog');
    if (!dialog) return;
    let config;
    try { config = JSON.parse(localStorage.getItem('mvStudioPromo') || 'null'); } catch (e) {}
    if (config?.enabled === false) return;
    if (config?.title) dialog.querySelector('#promoTitle').textContent = config.title;
    if (config?.copy) dialog.querySelector('[data-promo-copy]').textContent = config.copy;
    if (config?.link) dialog.querySelector('[data-promo-link]').href = config.link;
    const key = 'mvStudioPromoDismissedAt';
    let dismissedAt = 0;
    try { dismissedAt = Number(localStorage.getItem(key)) || 0; } catch (e) {}
    if (Date.now() - dismissedAt < 30 * 60 * 1000) return;
    const close = () => {
        try { localStorage.setItem(key, String(Date.now())); } catch (e) {}
        if (dialog.open) dialog.close();
    };
    dialog.querySelector('.dialog-close').addEventListener('click', close);
    dialog.addEventListener('click', e => { if (e.target === dialog) close(); });
    dialog.querySelector('[data-promo-link]').addEventListener('click', close);
    window.setTimeout(() => { if (!dialog.open) dialog.showModal(); }, 700);
}

// "Learn More" popup for the pricing packages
function initPackageDialog() {
    const dialog = document.getElementById('packageDialog');
    const buttons = document.querySelectorAll('[data-package]');
    if (!dialog || !buttons.length) return;

    const body = dialog.querySelector('.dialog-body');
    const waLink = dialog.querySelector('[data-wa]');
    const mailLink = dialog.querySelector('[data-mail]');
    let opener = null;

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const template = document.getElementById('pkg-' + btn.dataset.package);
            if (!template) return;

            const name = template.dataset.name;
            body.replaceChildren(template.content.cloneNode(true));
            waLink.href = 'https://wa.me/60162238196?text=' +
                encodeURIComponent("Hi MV Studio, I'm interested in the " + name + ' package.');
            mailLink.href = 'mailto:fengzhen221@gmail.com?subject=' +
                encodeURIComponent('Enquiry: ' + name + ' package');

            opener = btn;
            if (typeof dialog.showModal === 'function') {
                dialog.showModal();
            } else {
                dialog.setAttribute('open', '');
            }
            document.body.classList.add('no-scroll');
            dialog.querySelector('.dialog-close').focus();
        });
    });

    function close() {
        if (typeof dialog.close === 'function') dialog.close();
        else dialog.removeAttribute('open');
    }

    dialog.querySelector('.dialog-close').addEventListener('click', close);

    // Clicking the backdrop (outside .dialog-inner) closes it
    dialog.addEventListener('click', e => {
        if (e.target === dialog) close();
    });

    // Fires for Esc, the close button and backdrop clicks
    dialog.addEventListener('close', () => {
        document.body.classList.remove('no-scroll');
        if (opener) opener.focus();
    });
}

// Light / dark theme toggle (initial theme is set inline in <head>)
function initThemeToggle() {
    const root = document.documentElement;
    const toggles = document.querySelectorAll('.theme-toggle');

    function apply(theme) {
        root.setAttribute('data-theme', theme);
        toggles.forEach(btn => {
            btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
        });
    }

    apply(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');

    toggles.forEach(btn => {
        btn.addEventListener('click', function () {
            const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            apply(next);
            try { localStorage.setItem('theme', next); } catch (e) {}
        });
    });

    // Follow OS changes until the visitor picks a theme themselves
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
            let saved = null;
            try { saved = localStorage.getItem('theme'); } catch (err) {}
            if (!saved) apply(e.matches ? 'dark' : 'light');
        });
    }
}

// Sticky navbar state + mobile menu
function initNavigation() {
    const navbar = document.querySelector('.navbar');
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');

    if (navbar) {
        const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 10);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
    }

    if (!hamburger || !navMenu) return;

    function setOpen(open) {
        hamburger.classList.toggle('active', open);
        navMenu.classList.toggle('active', open);
        hamburger.setAttribute('aria-expanded', String(open));
        hamburger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }

    hamburger.addEventListener('click', () => setOpen(!navMenu.classList.contains('active')));

    navMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => setOpen(false));
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && navMenu.classList.contains('active')) {
            setOpen(false);
            hamburger.focus();
        }
    });

    document.addEventListener('click', e => {
        if (navMenu.classList.contains('active') && !navbar.contains(e.target)) setOpen(false);
    });
}

// Highlight the nav link of the section currently in view
function initActiveLinks() {
    const links = document.querySelectorAll('.nav-link[href^="#"]');
    if (!links.length || !('IntersectionObserver' in window)) return;

    const byId = {};
    links.forEach(link => { byId[link.getAttribute('href').slice(1)] = link; });

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            links.forEach(l => l.classList.remove('active'));
            const link = byId[entry.target.id];
            if (link) link.classList.add('active');
        });
    }, { rootMargin: '-45% 0px -50% 0px' });

    Object.keys(byId).forEach(id => {
        const section = document.getElementById(id);
        if (section) observer.observe(section);
    });
}

// Fade elements in as they scroll into view
function initReveal() {
    const items = document.querySelectorAll('.reveal');
    if (!items.length) return;

    if (!('IntersectionObserver' in window)) {
        items.forEach(el => el.classList.add('is-visible'));
        return;
    }

    // Stagger siblings that appear together (e.g. cards in a grid)
    items.forEach(el => {
        const siblings = Array.from(el.parentElement.children).filter(c => c.classList.contains('reveal'));
        const index = siblings.indexOf(el);
        if (index > 0) el.style.setProperty('--reveal-delay', (index * 0.08) + 's');
    });

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                el.classList.add('is-visible');
                observer.unobserve(el);
                // Once revealed, drop the classes so hover transforms work again
                const delay = parseFloat(el.style.getPropertyValue('--reveal-delay')) || 0;
                setTimeout(() => el.classList.remove('reveal', 'is-visible'), 900 + delay * 1000);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    items.forEach(el => observer.observe(el));
}

// "Copy email" buttons
function initCopyButtons() {
    document.querySelectorAll('[data-copy]').forEach(btn => {
        btn.addEventListener('click', () => {
            const text = btn.getAttribute('data-copy');
            const done = () => showToast('Copied ' + text);

            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
            } else {
                fallbackCopy(text, done);
            }
        });
    });
}

function fallbackCopy(text, done) {
    const input = document.createElement('textarea');
    input.value = text;
    input.setAttribute('readonly', '');
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    try { document.execCommand('copy'); done(); } catch (e) {}
    document.body.removeChild(input);
}

function showToast(message) {
    let toast = document.querySelector('.toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        document.body.appendChild(toast);
    }
    toast.innerHTML = '<i class="fas fa-circle-check"></i><span></span>';
    toast.querySelector('span').textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 2400);
}

function initFooterYear() {
    document.querySelectorAll('.year').forEach(el => { el.textContent = new Date().getFullYear(); });
}
