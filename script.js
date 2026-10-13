// ========================================
// Notifications
// ========================================
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.setAttribute('role', type === 'error' ? 'alert' : 'status');
    notification.textContent = message;
    document.body.appendChild(notification);

    requestAnimationFrame(() => notification.classList.add('is-shown'));

    setTimeout(() => {
        notification.classList.remove('is-shown');
        setTimeout(() => notification.remove(), 400);
    }, 4500);
}

// The privacy policy link has no dedicated page yet: keep the click harmless
function showPrivacyPolicy(event) {
    if (event) event.preventDefault();
    showNotification('La Privacy Policy è in preparazione. Per informazioni sul trattamento dei dati scrivi a lorenadipasqualepsicologa@gmail.com.', 'info');
}

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ========================================
// Sub-tabs inside a page (Profilo, Formazione, ...)
// ========================================
function selectTab(tab, { updateHash = true, focus = false } = {}) {
    const tablist = tab.closest('[role="tablist"]');
    const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));

    tabs.forEach(t => {
        const selected = t === tab;
        t.setAttribute('aria-selected', String(selected));
        t.tabIndex = selected ? 0 : -1;
        const panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !selected;
    });

    if (focus) tab.focus();
    if (updateHash) {
        const slug = tab.dataset.slug;
        const isFirst = tabs[0] === tab;
        history.replaceState(history.state, '', location.pathname + (isFirst ? '' : '#' + slug));
    }

    // The map and the calendar only render correctly once visible
    const panel = document.getElementById(tab.getAttribute('aria-controls'));
    if (panel && panel.querySelector('.calendly-inline-widget')) initCalendly();
}

function initTabs(hash) {
    const tablist = document.querySelector('main [role="tablist"]');
    if (!tablist) return;
    const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
    const fromHash = hash ? tabs.find(t => '#' + t.dataset.slug === hash) : null;
    selectTab(fromHash || tabs[0], { updateHash: false });

    tablist.addEventListener('click', e => {
        const tab = e.target.closest('[role="tab"]');
        if (tab) selectTab(tab);
    });

    tablist.addEventListener('keydown', e => {
        const i = tabs.indexOf(document.activeElement);
        if (i < 0) return;
        let next = null;
        if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
        if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
        if (e.key === 'Home') next = tabs[0];
        if (e.key === 'End') next = tabs[tabs.length - 1];
        if (next) {
            e.preventDefault();
            selectTab(next, { focus: true });
        }
    });
}

// ========================================
// Contact form (Formspree)
// ========================================
function initContactForm() {
    const contactForm = document.getElementById('contactForm');
    if (!contactForm || contactForm.dataset.ready) return;
    contactForm.dataset.ready = 'true';

    const successMessage = document.createElement('div');
    successMessage.className = 'success-message';
    successMessage.setAttribute('role', 'status');
    successMessage.hidden = true;
    successMessage.innerHTML = '<i class="ph ph-check-circle" aria-hidden="true"></i><span>Grazie! Il tuo messaggio è stato inviato con successo. Ti risponderò presto.</span>';
    contactForm.prepend(successMessage);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const rules = {
        contactName: el => el.value.trim() ? '' : 'Inserisci il tuo nome.',
        contactEmail: el => !el.value.trim()
            ? 'Inserisci la tua email.'
            : (emailRegex.test(el.value.trim()) ? '' : 'Controlla l\'indirizzo email, sembra incompleto.'),
        contactMessage: el => el.value.trim() ? '' : 'Scrivi un breve messaggio.',
        contactPrivacy: el => el.checked ? '' : 'Per inviare il messaggio è necessario accettare la Privacy Policy.'
    };

    function validateField(id) {
        const el = document.getElementById(id);
        const errorEl = document.getElementById(id + '-error');
        const message = rules[id](el);
        el.setAttribute('aria-invalid', message ? 'true' : 'false');
        if (errorEl) errorEl.textContent = message;
        return !message;
    }

    Object.keys(rules).forEach(id => {
        const el = document.getElementById(id);
        const evt = el.type === 'checkbox' ? 'change' : 'blur';
        el.addEventListener(evt, () => {
            if (el.getAttribute('aria-invalid') === 'true' || evt === 'change') validateField(id);
        });
        el.addEventListener('input', () => {
            if (el.getAttribute('aria-invalid') === 'true') validateField(id);
        });
    });

    contactForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const invalid = Object.keys(rules).filter(id => !validateField(id));
        if (invalid.length) {
            document.getElementById(invalid[0]).focus();
            return;
        }

        const formData = new FormData(contactForm);
        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Invio in corso...';
        submitBtn.disabled = true;
        contactForm.classList.add('loading');
        successMessage.hidden = true;

        fetch(contactForm.action, {
            method: 'POST',
            body: formData,
            headers: { 'Accept': 'application/json' }
        })
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
                contactForm.reset();
                Object.keys(rules).forEach(id => document.getElementById(id).removeAttribute('aria-invalid'));
                successMessage.hidden = false;
                if (typeof trackFormSubmission === 'function') trackFormSubmission('contact_form');
            })
            .catch(() => {
                showNotification('Errore nell\'invio del messaggio. Riprova più tardi oppure scrivimi su Whatsapp.', 'error');
            })
            .finally(() => {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
                contactForm.classList.remove('loading');
            });
    });
}

// ========================================
// Calendly: loaded only after consent
// ========================================
let calendlyScript = null;

function loadCalendlyScript() {
    if (window.Calendly) return Promise.resolve();
    if (calendlyScript) return calendlyScript;
    calendlyScript = new Promise((resolve, reject) => {
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = 'https://assets.calendly.com/assets/external/widget.css';
        document.head.appendChild(css);

        const js = document.createElement('script');
        js.src = 'https://assets.calendly.com/assets/external/widget.js';
        js.async = true;
        js.onload = resolve;
        js.onerror = reject;
        document.head.appendChild(js);
    });
    return calendlyScript;
}

function initCalendly() {
    const widget = document.querySelector('.calendly-inline-widget');
    if (!widget) return;
    const bookingMain = widget.closest('.booking-main');
    const message = bookingMain && bookingMain.querySelector('.cookie-message');

    if (localStorage.getItem('calendlyCookies') === 'true') {
        if (message) message.remove();
        widget.hidden = false;
        if (widget.querySelector('iframe')) return;
        loadCalendlyScript()
            .then(() => {
                if (!widget.querySelector('iframe') && window.Calendly) {
                    Calendly.initInlineWidget({ url: widget.dataset.calendlyUrl, parentElement: widget });
                }
            })
            .catch(() => showNotification('Il calendario non si è caricato. Riprova o scrivimi su Whatsapp.', 'error'));
        return;
    }

    widget.hidden = true;
    if (bookingMain && !message) {
        const box = document.createElement('div');
        box.className = 'cookie-message';
        box.innerHTML = `
            <span class="cookie-message-icon" aria-hidden="true"><i class="ph ph-calendar-blank"></i></span>
            <p>Per prenotare un appuntamento, è necessario abilitare i cookie Calendly.</p>
            <button type="button" onclick="enableCalendlyCookies()" class="btn btn-primary">
                Abilita Calendly
            </button>
            <button type="button" onclick="showCookieSettings()" class="btn btn-secondary btn-sm">
                Impostazioni Cookie
            </button>
        `;
        bookingMain.appendChild(box);
    }
}

function enableCalendlyCookies() {
    const currentConsent = localStorage.getItem('cookieConsent') || 'custom';
    localStorage.setItem('cookieConsent', currentConsent === 'essential' ? 'custom' : currentConsent);
    localStorage.setItem('calendlyCookies', 'true');
    hideCookieConsent();
    loadCookiePreferences();
    showNotification('Calendly abilitato! Il calendario è ora disponibile.', 'success');
}

window.enableCalendlyCookies = enableCalendlyCookies;

// ========================================
// Cookie management
// ========================================
function showCookieConsent() {
    if (!localStorage.getItem('cookieConsent')) {
        document.getElementById('cookieConsent').hidden = false;
    }
    loadCookiePreferences();
}

function hideCookieConsent() {
    document.getElementById('cookieConsent').hidden = true;
}

function acceptAllCookies() {
    localStorage.setItem('cookieConsent', 'all');
    localStorage.setItem('analyticsCookies', 'true');
    localStorage.setItem('calendlyCookies', 'true');
    hideCookieConsent();
    loadCookiePreferences();
}

function acceptEssentialCookies() {
    localStorage.setItem('cookieConsent', 'essential');
    localStorage.setItem('analyticsCookies', 'false');
    localStorage.setItem('calendlyCookies', 'false');
    hideCookieConsent();
    loadCookiePreferences();
}

let lastFocusBeforeModal = null;

function showCookieSettings() {
    const modal = document.getElementById('cookieSettings');
    lastFocusBeforeModal = document.activeElement;
    modal.hidden = false;
    loadCurrentCookieSettings();
    const firstInput = modal.querySelector('#analyticsCookies');
    if (firstInput) firstInput.focus();
}

function closeCookieSettings() {
    document.getElementById('cookieSettings').hidden = true;
    if (lastFocusBeforeModal && typeof lastFocusBeforeModal.focus === 'function') {
        lastFocusBeforeModal.focus();
    }
}

function saveCookieSettings() {
    localStorage.setItem('cookieConsent', 'custom');
    localStorage.setItem('analyticsCookies', document.getElementById('analyticsCookies').checked.toString());
    localStorage.setItem('calendlyCookies', document.getElementById('calendlyCookies').checked.toString());
    hideCookieConsent();
    closeCookieSettings();
    loadCookiePreferences();
}

function loadCurrentCookieSettings() {
    document.getElementById('analyticsCookies').checked = localStorage.getItem('analyticsCookies') === 'true';
    document.getElementById('calendlyCookies').checked = localStorage.getItem('calendlyCookies') === 'true';
}

function loadCookiePreferences() {
    if (localStorage.getItem('analyticsCookies') === 'true' && typeof gtag !== 'undefined') {
        gtag('consent', 'update', { 'analytics_storage': 'granted' });
    }
    initCalendly();
}

// ========================================
// In-place navigation: header and footer stay, only <main> changes.
// Every URL is still a complete page, so links work without JS and for search engines.
// ========================================
const SHELL_PAGES = ['/', '/chi-sono/', '/trattamenti/', '/prenota/', '/contatti/'];
const pageCache = new Map();
let renderedPath = location.pathname;

function updateNavState(pathname) {
    document.querySelectorAll('.main-nav a, .tabbar a, .brand').forEach(a => {
        if (new URL(a.href).pathname === pathname) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
    });
}

function initMapGate() {
    const btn = document.querySelector('main [data-load-map]');
    if (!btn) return;
    btn.addEventListener('click', () => {
        const map = btn.closest('.contact-map');
        const iframe = map.querySelector('iframe[data-src]');
        iframe.src = iframe.dataset.src;
        iframe.hidden = false;
        map.querySelector('.map-gate').remove();
    });
}

function initPage(hash) {
    initTabs(hash);
    initMapGate();
    initContactForm();
    initCalendly();
    document.querySelectorAll('.current-year').forEach(el => { el.textContent = new Date().getFullYear(); });
}

async function fetchPage(pathname) {
    if (pageCache.has(pathname)) return pageCache.get(pathname);
    const res = await fetch(pathname, { headers: { 'Accept': 'text/html' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const html = await res.text();
    pageCache.set(pathname, html);
    return html;
}

async function navigate(url, { push = true } = {}) {
    const target = new URL(url, location.href);

    // Same page already on screen: only switch the sub-tab
    if (target.pathname === renderedPath) {
        const tab = (target.hash && document.querySelector(`main [role="tab"][data-slug="${target.hash.slice(1)}"]`))
            || (!push && document.querySelector('main [role="tab"]'));
        if (tab) selectTab(tab, { updateHash: push });
        return;
    }

    let doc;
    try {
        doc = new DOMParser().parseFromString(await fetchPage(target.pathname), 'text/html');
    } catch (err) {
        location.href = target.href;
        return;
    }
    const newMain = doc.querySelector('main');
    if (!newMain) {
        location.href = target.href;
        return;
    }

    const swap = () => {
        document.querySelector('main').replaceWith(document.importNode(newMain, true));
        document.title = doc.title;
        [['meta[name="description"]', 'content'], ['link[rel="canonical"]', 'href'],
            ['meta[property="og:url"]', 'content'], ['meta[property="og:title"]', 'content'],
            ['meta[property="og:description"]', 'content']].forEach(([sel, attr]) => {
            const current = document.querySelector(sel);
            const next = doc.querySelector(sel);
            if (current && next) current.setAttribute(attr, next.getAttribute(attr));
        });
        if (push) history.pushState({ shell: true }, '', target.pathname + target.hash);
        renderedPath = target.pathname;
        updateNavState(target.pathname);
        initPage(target.hash);
    };

    if (document.startViewTransition && !prefersReducedMotion()) {
        await document.startViewTransition(swap).updateCallbackDone;
    } else {
        swap();
        if (!prefersReducedMotion()) document.querySelector('main').classList.add('content-enter');
    }

    const main = document.querySelector('main');
    main.focus({ preventScroll: true });

    if (typeof gtag !== 'undefined') {
        gtag('event', 'page_view', { page_title: document.title, page_location: location.href, page_path: location.pathname });
    }
}

function initShellNavigation() {
    document.addEventListener('click', e => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const link = e.target.closest('a[href]');
        if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
        const url = new URL(link.href, location.href);
        if (url.origin !== location.origin || !SHELL_PAGES.includes(url.pathname)) return;
        e.preventDefault();
        navigate(url.href);
    });

    window.addEventListener('popstate', () => navigate(location.href, { push: false }));

    // Warm the cache so switching pages is instant
    const prefetch = () => SHELL_PAGES.filter(p => p !== location.pathname).forEach(p => fetchPage(p).catch(() => {}));
    if ('requestIdleCallback' in window) requestIdleCallback(prefetch);
    else setTimeout(prefetch, 1500);
}

// ========================================
// Light / dark theme toggle (follows the device until the visitor chooses)
// ========================================
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

function currentTheme() {
    return document.documentElement.dataset.theme || (systemDark.matches ? 'dark' : 'light');
}

function updateThemeToggle() {
    const btn = document.querySelector('.theme-toggle');
    if (!btn) return;
    const dark = currentTheme() === 'dark';
    btn.setAttribute('aria-label', dark ? 'Passa al tema chiaro' : 'Passa al tema scuro');
    btn.querySelector('i').className = 'ph ' + (dark ? 'ph-sun' : 'ph-moon');
}

function initThemeToggle() {
    const btn = document.querySelector('.theme-toggle');
    if (!btn) return;
    updateThemeToggle();
    btn.addEventListener('click', () => {
        const next = currentTheme() === 'dark' ? 'light' : 'dark';
        document.documentElement.dataset.theme = next;
        try { localStorage.setItem('theme', next); } catch (e) { /* storage unavailable: theme lasts for this visit */ }
        updateThemeToggle();
    });
    systemDark.addEventListener('change', updateThemeToggle);
}

// ========================================
// Init
// ========================================
document.addEventListener('DOMContentLoaded', function () {
    initThemeToggle();
    initPage(location.hash);
    showCookieConsent();
    initShellNavigation();

    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        const modal = document.getElementById('cookieSettings');
        if (modal && !modal.hidden) closeCookieSettings();
    });

    const cookieModal = document.getElementById('cookieSettings');
    if (cookieModal) {
        cookieModal.addEventListener('click', e => {
            if (e.target === cookieModal) closeCookieSettings();
        });
    }
});
