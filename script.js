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
                showNotification('Errore nell\'invio del messaggio. Riprova più tardi oppure scrivimi su WhatsApp.', 'error');
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
    const widget = document.querySelector('.calendly-embed');
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
            .catch(() => showNotification('Il calendario non si è caricato. Riprova o scrivimi su WhatsApp.', 'error'));
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
                Impostazioni cookie
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
// Page helpers
// ========================================
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

// Bring a section into view, e.g. after a link to /contatti/#messaggio
function scrollToHash(hash, smooth = false) {
    const el = hash && hash.length > 1 && document.getElementById(decodeURIComponent(hash.slice(1)));
    if (!el || !el.closest('main')) return;
    el.scrollIntoView({ block: 'start', behavior: smooth && !prefersReducedMotion() ? 'smooth' : 'auto' });
}

function initPage(hash) {
    scrollToHash(hash);
    initMapGate();
    initContactForm();
    initCalendly();
    initPrimoPasso();
    document.querySelectorAll('.current-year').forEach(el => { el.textContent = new Date().getFullYear(); });
}

// ========================================
// Mobile menu: the header button opens and closes the page list
// ========================================
function initNavToggle() {
    const btn = document.querySelector('.nav-toggle');
    const header = document.querySelector('.site-header');
    if (!btn || !header) return;
    const close = () => {
        header.classList.remove('nav-open');
        btn.setAttribute('aria-expanded', 'false');
    };
    btn.addEventListener('click', () => {
        const open = header.classList.toggle('nav-open');
        btn.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    document.addEventListener('click', e => { if (!header.contains(e.target)) close(); });
}

// ========================================
// Il primo passo: one question at a time, answers never leave the page
// until the visitor opens WhatsApp themselves
// ========================================
const WHATSAPP_NUMBER = '393403531992';

function initPrimoPasso() {
    const form = document.getElementById('primoPasso');
    if (!form || form.dataset.ready) return;
    form.dataset.ready = 'true';

    const q = name => form.querySelector('[data-pp="' + name + '"]');
    const intro = form.querySelector('[data-step="intro"]');
    const summary = form.querySelector('[data-step="summary"]');
    const steps = Array.from(form.querySelectorAll('.pp-step'));
    const controls = q('controls');
    const nextBtn = q('next');
    let current = -1; // -1 intro, steps.length summary

    function answerOf(step) {
        const fields = Array.from(step.querySelectorAll('input, textarea'));
        if (fields.some(f => f.type === 'radio' || f.type === 'checkbox')) {
            return fields.filter(f => f.checked).map(f => f.value).join(', ');
        }
        return fields.map(f => f.value.trim()).filter(Boolean).join(' ');
    }

    function buildMessage() {
        const lines = ['Buongiorno Dott.ssa Di Pasquale, le scrivo dal sito dopo aver risposto al "primo passo".', ''];
        steps.forEach(step => {
            const answer = answerOf(step);
            if (answer) lines.push(step.querySelector('legend').textContent.trim(), answer, '');
        });
        return lines.join('\n').trim();
    }

    function renderSummary() {
        const list = q('answers');
        list.replaceChildren();
        steps.forEach((step, i) => {
            const dt = document.createElement('dt');
            dt.textContent = step.querySelector('legend').textContent.trim();
            const dd = document.createElement('dd');
            const text = document.createElement('span');
            const answer = answerOf(step);
            text.textContent = answer || 'Nessuna risposta';
            if (!answer) text.className = 'pp-empty';
            const edit = document.createElement('button');
            edit.type = 'button';
            edit.className = 'btn-text pp-edit';
            edit.textContent = 'Modifica';
            edit.setAttribute('aria-label', 'Modifica: ' + step.dataset.label);
            edit.addEventListener('click', () => show(i));
            dd.append(text, edit);
            list.append(dt, dd);
        });
        const name = form.querySelector('[name="nome"]').value.trim();
        q('name').textContent = name ? ', ' + name : '';
        q('whatsapp').href = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(buildMessage());
    }

    function show(index) {
        current = index;
        intro.hidden = index !== -1;
        summary.hidden = index !== steps.length;
        steps.forEach((step, i) => { step.hidden = i !== index; });
        controls.hidden = index < 0 || index >= steps.length;
        q('progress').hidden = controls.hidden;
        form.closest('.page').classList.toggle('pp-started', index >= 0);

        if (index >= 0 && index < steps.length) {
            q('count').textContent = 'Domanda ' + (index + 1) + ' di ' + steps.length;
            q('bar').style.width = ((index + 1) / steps.length * 100) + '%';
            nextBtn.innerHTML = (index === steps.length - 1 ? 'Rivedi le risposte' : 'Avanti') + ' <i class="ph ph-arrow-right" aria-hidden="true"></i>';
            const step = steps[index];
            const field = step.querySelector('input:checked, input[type="text"], textarea') || step.querySelector('input');
            if (field) field.focus({ preventScroll: true });
        } else if (index === steps.length) {
            renderSummary();
            form.querySelector('.pp-summary-title').focus({ preventScroll: true });
        }
        const page = form.closest('.page');
        if (page && index !== -1) page.scrollIntoView({ block: 'start' });
    }

    q('start').addEventListener('click', () => show(0));
    nextBtn.addEventListener('click', () => show(current + 1));
    q('back').addEventListener('click', () => show(current - 1));
    q('reset').addEventListener('click', () => {
        form.reset();
        show(-1);
    });
    q('whatsapp').addEventListener('click', () => {
        if (typeof gtag !== 'undefined') gtag('event', 'primo_passo_whatsapp', { event_category: 'contact' });
    });

    // Enter in a one-line field moves on instead of submitting the form
    form.addEventListener('submit', e => e.preventDefault());
    form.addEventListener('keydown', e => {
        if (e.key === 'Enter' && e.target.matches('input[type="text"]')) {
            e.preventDefault();
            show(current + 1);
        }
    });

    form.classList.add('pp-ready');
    show(-1);
}

// ========================================
// Init
// ========================================
document.addEventListener('DOMContentLoaded', function () {
    initPage(location.hash);
    showCookieConsent();
    initNavToggle();

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
