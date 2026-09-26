/**
 * i18n.js
 *
 * Kleine, afhankelijkheidsvrije vertaal-helper die door alle pagina's van deze
 * site wordt gedeeld. Detecteert de taal (opgeslagen voorkeur of browsertaal),
 * past statische teksten toe via `data-i18n`-attributen en toont een taal-
 * keuzeknop (NL/EN). Dynamische teksten die door pagina-specifieke scripts
 * worden gegenereerd, gebruiken de `t()`-functie die `init()` teruggeeft.
 */
(function (global) {
    const STORAGE_KEY = 'preferred-language';
    const SUPPORTED = ['nl', 'en'];
    const DEFAULT_LANG = 'en';

    function detectLanguage() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored && SUPPORTED.includes(stored)) return stored;
        } catch (e) {
            // localStorage kan onbeschikbaar zijn (bv. privémodus); negeer dit.
        }

        const browserLangs = (navigator.languages && navigator.languages.length)
            ? navigator.languages
            : [navigator.language || DEFAULT_LANG];

        for (const lang of browserLangs) {
            const short = String(lang).slice(0, 2).toLowerCase();
            if (SUPPORTED.includes(short)) return short;
        }
        return DEFAULT_LANG;
    }

    function setLanguage(lang) {
        if (!SUPPORTED.includes(lang)) return;
        try {
            localStorage.setItem(STORAGE_KEY, lang);
        } catch (e) {
            // Negeer opslagfouten; taal wordt dan enkel voor deze paginaweergave gebruikt.
        }
        global.location.reload();
    }

    function lookup(dict, lang, key) {
        const parts = key.split('.');
        let node = dict[lang];
        for (const part of parts) {
            if (node == null) break;
            node = node[part];
        }
        if (node == null && lang !== DEFAULT_LANG) {
            node = dict[DEFAULT_LANG];
            for (const part of parts) {
                if (node == null) break;
                node = node[part];
            }
        }
        return node;
    }

    function makeTranslator(dict, lang) {
        return function t(key, vars) {
            let value = lookup(dict, lang, key);
            if (value == null) return key;
            if (vars) {
                Object.keys(vars).forEach((name) => {
                    value = value.replace(new RegExp(`{{${name}}}`, 'g'), vars[name]);
                });
            }
            return value;
        };
    }

    function applyStatic(dict, lang) {
        document.documentElement.lang = lang;

        document.querySelectorAll('[data-i18n]').forEach((el) => {
            const value = lookup(dict, lang, el.getAttribute('data-i18n'));
            if (value != null) el.textContent = value;
        });

        document.querySelectorAll('[data-i18n-html]').forEach((el) => {
            const value = lookup(dict, lang, el.getAttribute('data-i18n-html'));
            if (value != null) el.innerHTML = value;
        });

        document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
            el.getAttribute('data-i18n-attr').split(',').forEach((pair) => {
                const [attr, key] = pair.split(':').map((part) => part.trim());
                const value = lookup(dict, lang, key);
                if (attr && value != null) el.setAttribute(attr, value);
            });
        });

        const titleKey = document.body.getAttribute('data-i18n-title');
        if (titleKey) {
            const value = lookup(dict, lang, titleKey);
            if (value != null) document.title = value;
        }
    }

    function createSwitcher(lang) {
        const wrapper = document.createElement('div');
        wrapper.className = 'lang-switcher';
        wrapper.setAttribute('role', 'group');
        wrapper.setAttribute('aria-label', 'Language / Taal');

        SUPPORTED.forEach((code) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'lang-btn' + (code === lang ? ' active' : '');
            button.textContent = code.toUpperCase();
            button.setAttribute('aria-pressed', code === lang ? 'true' : 'false');
            button.addEventListener('click', () => {
                if (code !== lang) setLanguage(code);
            });
            wrapper.appendChild(button);
        });

        return wrapper;
    }

    function init(dict, options) {
        const opts = options || {};
        const lang = detectLanguage();

        applyStatic(dict, lang);

        const target = opts.switcherTarget || document.querySelector('header');
        if (target && !opts.noSwitcher) {
            const switcher = createSwitcher(lang);
            if (opts.switcherPrepend) target.insertBefore(switcher, target.firstChild);
            else target.appendChild(switcher);
        }

        return { lang, t: makeTranslator(dict, lang) };
    }

    global.I18N = { detectLanguage, setLanguage, init };
})(window);
