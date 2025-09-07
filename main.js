// Global variables for data (as per existing structure, not splitting files)
// These will be populated by DataManager.fetchAllData()
let newsData, researchData, teamData, alumniData, gamesData, outreachTalksData, outreachNewsData, academicPresentationsData;

// Centralized DOM Elements
const DOMElements = {
    newsCarouselTrack: document.getElementById('news-carousel-track'),
    newsList: document.getElementById('news-list'),
    teamGrid: document.getElementById('team-grid'),
    alumniGrid: document.getElementById('alumni-grid'),
    modalContainer: document.getElementById('modal-container'),
    gamesGrid: document.getElementById('games-grid'),
    gameFiltersContainer: document.getElementById('game-filters'),
    researchContentGrid: document.getElementById('research-content-grid'),
    privacyNoticeContent: document.getElementById('privacy-notice-content'),
    gdprConsentBanner: document.getElementById('gdpr-consent-banner'),
    acceptCookiesBtn: document.getElementById('accept-cookies-btn'),
    outreachTalksGrid: document.getElementById('outreach-talks-grid'),
    academicPresentationsGrid: document.getElementById('academic-presentations-grid'),
    outreachNewsList: document.getElementById('outreach-news-list'),
    carouselPrevBtn: document.getElementById('carousel-prev'),
    carouselNextBtn: document.getElementById('carousel-next'),
    carouselDotsContainer: document.getElementById('carousel-dots'), // New carousel dots container
    scrollToTopBtn: document.getElementById('scroll-to-top-btn'),

    // Loading spinners
    researchLoading: document.querySelector('#research-page .loader'),
    teamLoading: document.querySelector('#team-grid .loader'),
    alumniLoading: document.querySelector('#alumni-grid .loader'),
    newsListLoading: document.querySelector('#news-list .loader'),
    newsCarouselLoading: document.querySelector('#news-carousel-track .loader'),
    gamesLoading: document.querySelector('#games-grid .loader'),
    outreachTalksLoading: document.querySelector('#outreach-talks-grid .loader'),
    academicPresentationsLoading: document.querySelector('#academic-presentations-grid .loader'),
    outreachNewsLoading: document.querySelector('#outreach-news-list .loader'),

    // Modals and their elements (pre-defined for easier access)
    researchDescriptionModal: document.getElementById('research-description-modal'),
    researchModalTitle: document.getElementById('research-modal-title'),
    researchModalDescription: document.getElementById('research-modal-description'),
    researchModalTeamMembers: document.getElementById('research-modal-team-members'),
    researchModalMedia: document.getElementById('research-modal-media'),
    researchModalCaption: document.getElementById('research-modal-caption'),
    researchModalCredit: document.getElementById('research-modal-credit'),

    newsDescriptionModal: document.getElementById('news-description-modal'),
    newsModalTitle: document.getElementById('news-modal-title'),
    newsModalDate: document.getElementById('news-modal-date'),
    newsModalDescription: document.getElementById('news-modal-description'),
    newsModalImage: document.getElementById('news-modal-image'),

    outreachTalkDescriptionModal: document.getElementById('outreach-talk-description-modal'),
    outreachTalkModalTitle: document.getElementById('outreach-talk-modal-title'),
    outreachTalkModalDate: document.getElementById('outreach-talk-modal-date'),
    outreachTalkModalDescription: document.getElementById('outreach-talk-modal-description'),
    outreachTalkModalMedia: document.getElementById('outreach-talk-modal-media'),
    outreachTalkModalSpeakers: document.getElementById('outreach-talk-modal-speakers'),
    outreachTalkModalLink: document.getElementById('outreach-talk-modal-link'),

    academicPresentationDescriptionModal: document.getElementById('academic-presentation-description-modal'),
    academicPresentationModalTitle: document.getElementById('academic-presentation-modal-title'),
    academicPresentationModalDate: document.getElementById('academic-presentation-modal-date'),
    academicPresentationModalDescription: document.getElementById('academic-presentation-modal-description'),
    academicPresentationModalMedia: document.getElementById('academic-presentation-modal-media'),
    academicPresentationModalSpeakers: document.getElementById('academic-presentation-modal-speakers'),
    academicPresentationModalLink: document.getElementById('academic-presentation-modal-link'),

    navLinks: document.querySelectorAll('.nav-link'),
    pageSections: document.querySelectorAll('.page-section'),
    mobileMenu: document.getElementById('mobile-menu'),
    mobileMenuButton: document.getElementById('mobile-menu-button'),
    navLinkHeader: document.querySelector('.nav-link-header'),
    yearSpan: document.getElementById('year')
};

/**
 * Utility functions for common tasks like loading indicators and text truncation.
 */
/**
 * Utility functions for common tasks like loading indicators and text truncation.
 */
const Utils = (() => {
  function escapeHTML(str){
    const s = String(str ?? '');
    return s.replace(/[&<>"'`]/g, (c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c]));
  }

  function isSafeUrl(url) {
    try {
      const u = new URL(String(url), window.location.origin);
      if (!['http:', 'https:'].includes(u.protocol)) return false;
      // Block javascript:, data:, vbscript:, file:, etc via protocol check above.
      return true;
    } catch { return false; }
  }
  function sanitizeUrl(url, fallback = '#') {
    return isSafeUrl(url) ? String(url) : fallback;
  }
  function Utils.createEl(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null) continue;
      if (k === 'text') { el.textContent = String(v); continue; }
      if (k === 'html') { el.innerHTML = String(v); continue; } // for strictly static templates only
      if (k === 'dataset' && typeof v === 'object') {
        for (const [dk, dv] of Object.entries(v)) { el.dataset[dk] = String(dv); }
        continue;
      }
      if (k in el) { try { el[k] = v; } catch { el.setAttribute(k, String(v)); } }
    }
    for (const c of [].concat(children)) {
      if (c == null) continue;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return el;
  }

  /**
   * Shows a loading spinner and sets aria-busy to true on the parent section.
   * @param {HTMLElement} element - The loader element.
   * @param {HTMLElement} parentSection - The parent section to set aria-busy on.
   */
  function showLoading(element, parentSection) {
    if (element) element.style.display = 'block';
    if (parentSection) parentSection.setAttribute('aria-busy', 'true');
  }

  /**
   * Hides a loading spinner and sets aria-busy to false on the parent section.
   * @param {HTMLElement} element - The loader element.
   * @param {HTMLElement} parentSection - The parent section to set aria-busy on.
   */
  function hideLoading(element, parentSection) {
    if (element) element.style.display = 'none';
    if (parentSection) parentSection.setAttribute('aria-busy', 'false');
  }

  /**
   * Truncates text and adds a "Read More" button.
   * @param {string} text - The full text.
   * @param {number} maxLength - The maximum length before truncation.
   * @param {string} id - Unique ID for the element to manage expansion.
   * @returns {string} HTML string with truncated text and button.
   */
  function truncateText(text, maxLength, id) {
    if (!text && text !== 0) return "<p></p>";
    const t = String(text);
    if (t.length <= maxLength) return `<p>${escapeHTML(t)}</p>`;
    const truncated = t.substring(0, maxLength) + '...';
    return `
      <p id="truncated-text-${id}">${escapeHTML(truncated)}</p>
      <p id="full-text-${id}" style="display: none;">${escapeHTML(t)}</p>
      <button class="read-more-btn text-primary hover:underline text-sm mt-2 inline-block" data-target-id="${id}" aria-expanded="false">Read More →</button>
    `;
  }

  /**
   * Best-effort parse of a "member since" value into a Date for sorting.
   * Accepts "YYYY", "YYYY-MM", or any Date-parseable string.
   * Returns a far-future date for missing/invalid inputs to push them to the end.
   */
  function getMemberSinceDate(value) {
    if (!value && value !== 0) return new Date(8640000000000000);
    try {
      const str = String(value);
      const parts = str.split("-");
      if (parts.length === 1) return new Date(Number(parts[0]), 0, 1);
      if (parts.length === 2) return new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
      const d = new Date(str);
      if (!isNaN(d.getTime())) return d;
    } catch (e) {}
    return new Date(8640000000000000);
  }

  /**
   * Formats a "member since" value for display.
   * Accepts "YYYY", "YYYY-MM", or any ISO-ish date string.
   */
  function formatMemberSince(value) {
    if (!value && value !== 0) return "";
    try {
      const parts = String(value).split("-");
      if (parts.length === 1) {
        return parts[0]; // e.g. "2021"
      }
      if (parts.length === 2) {
        // "2021-03" -> "March 2021"
        const [y, m] = parts;
        const date = new Date(Number(y), Number(m) - 1, 1);
        if (!isNaN(date.getTime())) {
          return date.toLocaleString(undefined, { month: 'long', year: 'numeric' });
        }
      }
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleString(undefined, { month: 'long', year: 'numeric' });
      }
    } catch (e) {}
    return String(value);
  }

  /**
   * Toggles the visibility of full/truncated text.
   * @param {string} id - The ID of the text block to toggle.
   * @param {HTMLElement} button - The button that triggered the toggle.
   */
  function toggleTextVisibility(id, button) {
    const truncatedElement = document.getElementById(`truncated-text-${id}`);
    const fullElement = document.getElementById(`full-text-${id}`);

    if (truncatedElement && fullElement) {
      const isExpanded = button.getAttribute('aria-expanded') === 'true';
      if (isExpanded) {
        truncatedElement.style.display = 'block';
        fullElement.style.display = 'none';
        button.textContent = 'Read More →';
        button.setAttribute('aria-expanded', 'false');
      }
    }
  }

  
  function createEl(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === undefined || v === null) continue;
      if (k === 'text') { el.textContent = String(v); continue; }
      if (k === 'html') { el.innerHTML = String(v); continue; } // use only for static, trusted snippets
      if (k === 'dataset' && typeof v === 'object') {
        for (const [dk, dv] of Object.entries(v)) el.dataset[dk] = String(dv);
        continue;
      }
      if (k in el) { try { el[k] = v; } catch { el.setAttribute(k, String(v)); } }
      else { el.setAttribute(k, String(v)); }
    }
    for (const c of [].concat(children || [])) {
      if (c == null) continue;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return el;
  }


  function createYouTubeEmbed(url) {
    try {
      const u = new URL(String(url), window.location.origin);
      const host = u.hostname.toLowerCase();
      if (!['www.youtube.com','youtube.com'].includes(host)) return null;
      if (!u.pathname.startsWith('/embed/')) return null;
      const iframe = document.createElement('iframe');
      iframe.src = u.href;
      iframe.loading = 'lazy';
      iframe.allowFullscreen = true;
      iframe.setAttribute('allow','accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
      iframe.className = 'absolute top-0 left-0 w-full h-full rounded-md border border-primary-dark';
      return iframe;
    } catch { return null; }
  }


  function createSafeMedia(url) {
    if (!url) return null;
    if (String(url).includes('youtube.com/embed/')) {
      const container = document.createElement('div');
      container.className = 'relative w-full';
      container.style.paddingBottom = '56.25%';
      const iframe = createYouTubeEmbed(url);
      if (iframe) container.appendChild(iframe);
      return container;
    }
    const v = document.createElement('video');
    v.controls = true;
    v.loading = 'lazy';
    v.className = 'w-full h-auto rounded-md border border-primary-dark';
    const src = document.createElement('source');
    src.src = sanitizeUrl(url);
    src.type = 'video/mp4';
    v.appendChild(src);
    return v;
  }

return { showLoading, hideLoading, truncateText, toggleTextVisibility, formatMemberSince, getMemberSinceDate, escapeHTML, sanitizeUrl, isSafeUrl, createEl, createYouTubeEmbed, createSafeMedia };
})();

/**
 * Manages data fetching and rendering of all content sections.
 */
const DataManager = (() => {
    /**
     * Fetches all necessary JSON data.
     */
    async function fetchAllData() {
        const loaders = [
            DOMElements.researchLoading, DOMElements.teamLoading, DOMElements.alumniLoading,
            DOMElements.newsListLoading, DOMElements.newsCarouselLoading, DOMElements.gamesLoading,
            DOMElements.outreachTalksLoading, DOMElements.academicPresentationsLoading, DOMElements.outreachNewsLoading
        ];
        const sections = [
            document.getElementById('research-page'),
            document.getElementById('team-grid'),
            document.getElementById('alumni-grid'),
            document.getElementById('news-list'),
            document.getElementById('news-carousel-track'),
            document.getElementById('games-grid'),
            document.getElementById('outreach-talks-grid'),
            document.getElementById('academic-presentations-grid'),
            document.getElementById('outreach-news-list')
        ];

        loaders.forEach((loader, index) => Utils.showLoading(loader, sections[index]));

        try {
            [
                newsData,
                researchData,
                teamData,
                alumniData,
                gamesData,
                outreachTalksData,
                outreachNewsData,
                academicPresentationsData
            ] = await Promise.all([
                fetch('newsData.json').then(res => { if (!res.ok) throw new Error(`HTTP error! status: ${res.status} for newsData.json`); return res.json(); }),
                fetch('researchData.json').then(res => { if (!res.ok) throw new Error(`HTTP error! status: ${res.status} for researchData.json`); return res.json(); }),
                fetch('teamData.json').then(res => { if (!res.ok) throw new Error(`HTTP error! status: ${res.status} for teamData.json`); return res.json(); }),
                fetch('alumniData.json').then(res => { if (!res.ok) throw new Error(`HTTP error! status: ${res.status} for alumniData.json`); return res.json(); }),
                fetch('gamesData.json').then(res => { if (!res.ok) throw new Error(`HTTP error! status: ${res.status} for gamesData.json`); return res.json(); }),
                fetch('outreachTalksData.json').then(res => { if (!res.ok) throw new Error(`HTTP error! status: ${res.status} for outreachTalksData.json`); return res.json(); }),
                fetch('outreachNewsData.json').then(res => { if (!res.ok) throw new Error(`HTTP error! status: ${res.status} for outreachNewsData.json`); return res.json(); }),
                fetch('academicPresentationsData.json').then(res => { if (!res.ok) throw new Error(`HTTP error! status: ${res.status} for academicPresentationsData.json`); return res.json(); })
            ]);

            // Make data globally available for researchHub.js and other functions
            window.newsData = newsData;
            window.researchData = researchData;
            window.teamData = teamData;
            window.alumniData = alumniData;
            window.gamesData = gamesData;
            window.outreachTalksData = outreachTalksData;
            window.outreachNewsData = outreachNewsData;
            window.academicPresentationsData = academicPresentationsData;

            
            // Defensive normalization: ensure expected arrays exist to avoid undefined errors
            function ensureArray(obj, key) {
                if (!obj || typeof obj !== 'object') return;
                if (!Array.isArray(obj[key])) obj[key] = [];
            }
            try {
                window.newsData = window.newsData || {};
                window.researchData = window.researchData || {};
                window.teamData = window.teamData || {};
                window.alumniData = window.alumniData || {};
                window.gamesData = window.gamesData || {};
                window.outreachTalksData = window.outreachTalksData || {};
                window.outreachNewsData = window.outreachNewsData || {};
                window.academicPresentationsData = window.academicPresentationsData || {};

                // Common property names used by renderers
                ['items','list','entries','news','talks','presentations','team','alumni','games','research'].forEach((k) => {
                    ensureArray(window.newsData, k);
                    ensureArray(window.researchData, k);
                    ensureArray(window.teamData, k);
                    ensureArray(window.alumniData, k);
                    ensureArray(window.gamesData, k);
                    ensureArray(window.outreachTalksData, k);
                    ensureArray(window.outreachNewsData, k);
                    ensureArray(window.academicPresentationsData, k);
                });
            } catch (e) {
                console.warn('Normalization skipped due to unexpected data shape:', e);
            }
    console.log("Data assigned to window object.");

            // Render all content after data is loaded
            Renderer.renderAllContent();

        } catch (error) {
            console.error('Error loading data:', error);
            const errorText = 'An error occurred while loading content. See the console for more details and ensure data files exist.';

            // Display error message in relevant sections
            if (DOMElements.researchContentGrid) if (DOMElements.researchContentGrid) { DOMElements.researchContentGrid.textContent = errorText; }
            if (DOMElements.teamGrid) if (DOMElements.teamGrid) { DOMElements.teamGrid.textContent = errorText; }
            if (DOMElements.alumniGrid) if (DOMElements.alumniGrid) { DOMElements.alumniGrid.textContent = errorText; }
            if (DOMElements.newsList) if (DOMElements.newsList) { DOMElements.newsList.textContent = errorText; }
            if (DOMElements.newsCarouselTrack) if (DOMElements.newsCarouselTrack) { DOMElements.newsCarouselTrack.textContent = errorText; }
            if (DOMElements.gamesGrid) if (DOMElements.gamesGrid) { DOMElements.gamesGrid.textContent = errorText; }
            if (DOMElements.outreachTalksGrid) if (DOMElements.outreachTalksGrid) { DOMElements.outreachTalksGrid.textContent = errorText; }
            if (DOMElements.academicPresentationsGrid) if (DOMElements.academicPresentationsGrid) { DOMElements.academicPresentationsGrid.textContent = errorText; }
            if (DOMElements.outreachNewsList) if (DOMElements.outreachNewsList) { DOMElements.outreachNewsList.textContent = errorText; }

        } finally {
            loaders.forEach((loader, index) => Utils.hideLoading(loader, sections[index]));
        }
    }

    return { fetchAllData };
})();

/**
 * Handles rendering of various content sections and their individual items.
 */
const Renderer = (() => {
    function renderAllContent() {
        renderResearchItems();
        renderOutreachTalks();
        renderAcademicPresentations();
        renderOutreachNews();
        renderNewsCarouselAndList();
        renderTeamAndAlumni();
        renderGamesAndFilters();
    }

    function renderResearchItems() {
        const grid = DOMElements.researchContentGrid;
        if (!grid) return;
        grid.replaceChildren();
        const items = Array.isArray(window.researchData) ? window.researchData : (window.researchData?.items || []);
        if (!items || items.length === 0) {
            grid.textContent = 'No research items available at the moment.';
            return;
        }
        const cards = items.map((item) => {
            const img = item?.image ? Utils.createEl('img', {
                src: Utils.sanitizeUrl(item.image),
                alt: Utils.escapeHTML(item.title || 'Research image'),
                className: 'w-full h-48 object-cover rounded-md mb-4 border border-primary-dark',
                loading: 'lazy'
            }) : null;
            const title = Utils.createEl('h3', { className: 'text-lg font-semibold', text: item?.title || '' });
            const desc = Utils.createEl('p', { className: 'text-sm text-medium-text', text: item?.shortDescription || item?.description || '' });
            return Utils.createEl('div', { className: 'card rounded-lg p-6 text-center flex flex-col items-center' }, [img, title, desc].filter(Boolean));
        });
        grid.append(...cards);
    }

    function renderOutreachTalks() {
        const grid = DOMElements.outreachTalksGrid;
        if (!grid) return;
        grid.replaceChildren();
        const items = Array.isArray(window.outreachTalksData) ? window.outreachTalksData : (window.outreachTalksData?.items || []);
        if (!items || items.length === 0) {
            grid.textContent = 'No outreach talks available at the moment.';
            return;
        }
        const nodes = items.map((talk) => {
            const children = [];
            const media = Utils.createSafeMedia(talk?.videoLink);
            if (media) children.push(media);
            children.push(
                Utils.createEl('h3', { className: 'text-lg font-semibold mt-3', text: talk?.title || '' }),
                Utils.createEl('p', { className: 'text-xs text-medium-text', text: talk?.date || '' }),
                Utils.createEl('p', { className: 'text-sm text-medium-text mt-2', text: talk?.description || '' })
            );
            if (Array.isArray(talk?.speakers) && talk.speakers.length) {
                const chips = talk.speakers.map(sp => Utils.createEl('span', { className:'px-2 py-1 rounded bg-primary/10 text-primary text-xs' , text: sp }));
                children.push(Utils.createEl('div', { className: 'flex flex-wrap gap-2 mt-2' }, chips));
            }
            return Utils.createEl('div', { className: 'card rounded-lg p-4' }, children);
        });
        grid.append(...nodes);
    }

    function renderAcademicPresentations() {
        const grid = DOMElements.academicPresentationsGrid;
        if (!grid) return;
        grid.replaceChildren();
        const items = Array.isArray(window.academicPresentationsData) ? window.academicPresentationsData : (window.academicPresentationsData?.items || []);
        if (!items || items.length === 0) {
            grid.textContent = 'No academic presentations available at the moment.';
            return;
        }
        const nodes = items.map((pres) => {
            const title = Utils.createEl('h3', { className: 'text-lg font-semibold', text: pres?.title || '' });
            const meta = Utils.createEl('p', { className: 'text-xs text-medium-text', text: pres?.date || '' });
            const desc = Utils.createEl('p', { className: 'text-sm text-medium-text mt-2', text: pres?.description || '' });
            const children = [title, meta, desc];
            if (pres?.link) {
                children.push(Utils.createEl('a', { href: Utils.sanitizeUrl(pres.link, '#'), className: 'text-primary underline mt-2 inline-block', text: 'View presentation' }));
            }
            return Utils.createEl('div', { className: 'card rounded-lg p-4' }, children);
        });
        grid.append(...nodes);
    }

    function renderOutreachNews() {
        const list = DOMElements.outreachNewsList;
        if (!list) return;
        list.replaceChildren();
        const items = Array.isArray(window.outreachNewsData) ? window.outreachNewsData : (window.outreachNewsData?.items || []);
        if (!items || items.length === 0) {
            list.textContent = 'No outreach news available at the moment.';
            return;
        }
        const nodes = items.map((n) => Utils.createEl('li', { className: 'p-4 border-b border-primary-dark' }, [
            Utils.createEl('h4', { className: 'font-semibold', text: n?.title || '' }),
            Utils.createEl('p', { className: 'text-sm text-medium-text', text: n?.summary || n?.description || '' }),
            n?.link ? Utils.createEl('a', { href: Utils.sanitizeUrl(n.link, '#'), className: 'text-primary underline', text: 'Read more' }) : null
        ].filter(Boolean)));
        list.append(...nodes);
    }

    function renderNewsCarouselAndList() {
        const listEl = DOMElements.newsList;
        const trackEl = DOMElements.newsCarouselTrack;
        if (listEl) listEl.replaceChildren();
        if (trackEl) trackEl.replaceChildren();
        const items = Array.isArray(window.newsData) ? window.newsData : (window.newsData?.items || []);
        if (!items || items.length === 0) {
            if (listEl) listEl.textContent = 'No news available at the moment.';
            if (trackEl) trackEl.textContent = 'No news available at the moment.';
            return;
        }
        if (listEl) {
            const nodes = items.map((n) => Utils.createEl('li', { className: 'p-4 border-b border-primary-dark' }, [
                Utils.createEl('h4', { className: 'font-semibold', text: n?.title || '' }),
                Utils.createEl('p', { className: 'text-sm text-medium-text', text: n?.summary || n?.description || '' }),
                n?.link ? Utils.createEl('a', { href: Utils.sanitizeUrl(n.link, '#'), className: 'text-primary underline', text: 'Read more' }) : null
            ].filter(Boolean)));
            listEl.append(...nodes);
        }
        if (trackEl) {
            const slides = items.map((n) => Utils.createEl('div', { className: 'carousel-slide p-4' }, [
                n?.image ? Utils.createEl('img', { src: Utils.sanitizeUrl(n.image), alt: Utils.escapeHTML(n?.title || 'News image'), className: 'w-full h-56 object-cover rounded-md mb-3 border border-primary-dark', loading: 'lazy' }) : null,
                Utils.createEl('h4', { className: 'font-semibold', text: n?.title || '' }),
                Utils.createEl('p', { className: 'text-sm text-medium-text', text: n?.summary || n?.description || '' }),
                n?.link ? Utils.createEl('a', { href: Utils.sanitizeUrl(n.link, '#'), className: 'text-primary underline', text: 'Read more' }) : null
            ].filter(Boolean)));
            trackEl.append(...slides);
        }
    }

    function renderTeamAndAlumni() {
        const teamGrid = DOMElements.teamGrid;
        const alumniGrid = DOMElements.alumniGrid;
        if (teamGrid) teamGrid.replaceChildren();
        if (alumniGrid) alumniGrid.replaceChildren();

        const tItems = Array.isArray(window.teamData) ? window.teamData : (window.teamData?.items || []);
        const aItems = Array.isArray(window.alumniData) ? window.alumniData : (window.alumniData?.items || []);

        function personCard(p, isAlumni=false) {
            const img = p?.image ? Utils.createEl('img', { src: Utils.sanitizeUrl(p.image), alt: Utils.escapeHTML(p?.name || (isAlumni ? 'Alumni' : 'Team')), className:'w-32 h-32 object-cover rounded-full mb-3 border border-primary-dark', loading:'lazy' }) : null;
            const name = Utils.createEl('h3', { className: 'text-base font-semibold', text: p?.name || '' });
            const role = Utils.createEl('p', { className: 'text-sm text-medium-text', text: p?.role || '' });
            const since = p?.memberSince ? Utils.createEl('p', { className: 'text-xs text-medium-text', text: Utils.formatMemberSince(p.memberSince) }) : null;
            return Utils.createEl('div', { className: 'card rounded-lg p-4 text-center flex flex-col items-center' }, [img, name, role, since].filter(Boolean));
        }

        if (teamGrid) {
            const nodes = tItems.map(p => personCard(p, false));
            if (nodes.length) teamGrid.append(...nodes);
            else teamGrid.textContent = 'No team members available at the moment.';
        }

        if (alumniGrid) {
            const nodes = aItems.map(p => personCard(p, true));
            if (nodes.length) alumniGrid.append(...nodes);
            else alumniGrid.textContent = 'No alumni available at the moment.';
        }
    }

    function renderGamesAndFilters() {
        const grid = DOMElements.gamesGrid;
        const filtersWrap = DOMElements.gameFiltersContainer;
        if (grid) grid.replaceChildren();
        if (filtersWrap) filtersWrap.replaceChildren();

        const items = Array.isArray(window.gamesData) ? window.gamesData : (window.gamesData?.items || []);
        if (!items || items.length === 0) {
            if (grid) grid.textContent = 'No games available at the moment.';
            return;
        }

        const genres = Array.from(new Set(items.flatMap(g => Array.isArray(g?.genres) ? g.genres : (g?.genre ? [g.genre] : [])))).filter(Boolean);
        let activeGenre = null;

        function renderFilters() {
            if (!filtersWrap) return;
            filtersWrap.replaceChildren();
            const allBtn = Utils.createEl('button', { className: 'px-3 py-1 rounded border border-primary-dark', text: 'All' });
            allBtn.addEventListener('click', () => { activeGenre = null; renderGrid(); });
            filtersWrap.appendChild(allBtn);
            genres.forEach(ge => {
                const b = Utils.createEl('button', { className: 'px-3 py-1 rounded border border-primary-dark', text: ge });
                b.addEventListener('click', () => { activeGenre = ge; renderGrid(); });
                filtersWrap.appendChild(b);
            });
        }

        function gameCard(gm) {
            const img = gm?.image ? Utils.createEl('img', { src: Utils.sanitizeUrl(gm.image), alt: Utils.escapeHTML(gm?.title || 'Game image'), className:'w-full h-40 object-cover rounded-md mb-3 border border-primary-dark', loading:'lazy' }) : null;
            const title = Utils.createEl('h3', { className: 'text-lg font-semibold', text: gm?.title || '' });
            const desc = Utils.createEl('p', { className: 'text-sm text-medium-text', text: gm?.description || '' });
            const link = gm?.link ? Utils.createEl('a', { href: Utils.sanitizeUrl(gm.link, '#'), className:'text-primary underline mt-2 inline-block', text:'Play / Learn more' }) : null;
            return Utils.createEl('div', { className: 'card rounded-lg p-4' }, [img, title, desc, link].filter(Boolean));
        }

        function renderGrid() {
            if (!grid) return;
            grid.replaceChildren();
            const filtered = activeGenre ? items.filter(x => (Array.isArray(x?.genres) ? x.genres.includes(activeGenre) : x?.genre === activeGenre)) : items;
            const nodes = filtered.map(gameCard);
            if (nodes.length) grid.append(...nodes);
            else grid.textContent = 'No games match the selected filter.';
        }

        renderFilters();
        renderGrid();
    }

    return { renderAllContent };
})();;

/**
 * Manages modal opening, closing, and focus trapping.
 */
const ModalManager = (() => {
  let lastFocusedElement = null;

  function openModal(modal, triggerElement) {
    lastFocusedElement = triggerElement || null;
    if (!modal) return;
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    modal.focus();

    const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    function trap(e) {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          last.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    }

    modal.addEventListener('keydown', trap);
    modal._trapHandler = trap;
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    if (modal._trapHandler) modal.removeEventListener('keydown', modal._trapHandler);
    if (lastFocusedElement) lastFocusedElement.focus();
  }

  function clear(el) { if (el) { while (el.firstChild) el.removeChild(el.firstChild); } }

  // Research modal
  function openResearchDescriptionModal(item, trigger) {
    const m = DOMElements.researchDescriptionModal;
    if (!m || !item) return;
    if (DOMElements.researchModalTitle) DOMElements.researchModalTitle.textContent = item.title || '';
    if (DOMElements.researchModalDescription) DOMElements.researchModalDescription.textContent = item.description || '';
    if (DOMElements.researchModalCaption) DOMElements.researchModalCaption.textContent = item.caption || '';
    if (DOMElements.researchModalCredit) DOMElements.researchModalCredit.textContent = item.credit || '';
    if (DOMElements.researchModalMedia) {
      clear(DOMElements.researchModalMedia);
      if (item.modalMedia) {
        const media = Utils.createSafeMedia(item.modalMedia) || (function(){
          const img = document.createElement('img');
          img.src = Utils.sanitizeUrl(item.modalMedia);
          img.alt = Utils.escapeHTML(item.title || 'Research');
          img.className = 'w-full h-auto rounded-md object-cover border border-primary-dark';
          img.loading = 'lazy';
          return img;
        })();
        if (media) DOMElements.researchModalMedia.appendChild(media);
      }
    }
    openModal(m, trigger);
  }

  // News modal
  function openNewsModal(newsItem, trigger) {
    const m = DOMElements.newsDescriptionModal;
    if (!m || !newsItem) return;
    if (DOMElements.newsModalTitle) DOMElements.newsModalTitle.textContent = newsItem.title || '';
    if (DOMElements.newsModalDate) DOMElements.newsModalDate.textContent = newsItem.date || '';
    if (DOMElements.newsModalDescription) DOMElements.newsModalDescription.textContent = newsItem.description || newsItem.summary || '';
    if (DOMElements.newsModalImage) {
      const img = DOMElements.newsModalImage;
      img.src = newsItem.image ? Utils.sanitizeUrl(newsItem.image) : '';
      img.alt = Utils.escapeHTML(newsItem.title || 'News');
    }
    openModal(m, trigger);
  }

  // Outreach talk modal
  function openOutreachTalkModal(talk, trigger) {
    const m = DOMElements.outreachTalkDescriptionModal;
    if (!m || !talk) return;
    if (DOMElements.outreachTalkModalTitle) DOMElements.outreachTalkModalTitle.textContent = talk.title || '';
    if (DOMElements.outreachTalkModalDate) DOMElements.outreachTalkModalDate.textContent = talk.date || '';
    if (DOMElements.outreachTalkModalDescription) DOMElements.outreachTalkModalDescription.textContent = talk.description || '';
    if (DOMElements.outreachTalkModalSpeakers) {
      clear(DOMElements.outreachTalkModalSpeakers);
      if (Array.isArray(talk.speakers)) {
        talk.speakers.forEach(sp => {
          const li = document.createElement('li');
          li.textContent = String(sp);
          DOMElements.outreachTalkModalSpeakers.appendChild(li);
        });
      }
    }
    if (DOMElements.outreachTalkModalMedia) {
      clear(DOMElements.outreachTalkModalMedia);
      const media = Utils.createSafeMedia(talk.videoLink);
      if (media) DOMElements.outreachTalkModalMedia.appendChild(media);
    }
    openModal(m, trigger);
  }

  // Academic presentation modal
  function openAcademicPresentationModal(pres, trigger) {
    const m = DOMElements.academicPresentationDescriptionModal || DOMElements.academicPresentationModal;
    if (!m || !pres) return;
    if (DOMElements.academicPresentationModalTitle) DOMElements.academicPresentationModalTitle.textContent = pres.title || '';
    if (DOMElements.academicPresentationModalDate) {
      const d = pres.date;
      const dateText = (d && typeof d === 'object' && 'year' in d) ? `${d.day ?? ''} ${d.month ?? ''} ${d.year ?? ''}`.trim() : String(d ?? '');
      DOMElements.academicPresentationModalDate.textContent = dateText;
    }
    if (DOMElements.academicPresentationModalDescription) DOMElements.academicPresentationModalDescription.textContent = pres.description || '';
    if (DOMElements.academicPresentationModalSpeakers) {
      clear(DOMElements.academicPresentationModalSpeakers);
      if (Array.isArray(pres.speakers)) {
        pres.speakers.forEach(sp => {
          const li = document.createElement('li');
          li.textContent = String(sp);
          DOMElements.academicPresentationModalSpeakers.appendChild(li);
        });
      }
    }
    if (DOMElements.academicPresentationModalMedia) {
      clear(DOMElements.academicPresentationModalMedia);
      if (pres.videoLink) {
        const media = Utils.createSafeMedia(pres.videoLink);
        if (media) DOMElements.academicPresentationModalMedia.appendChild(media);
      }
    }
    if (DOMElements.academicPresentationModalLink) {
      const a = DOMElements.academicPresentationModalLink;
      if (pres.link) {
        a.href = Utils.sanitizeUrl(pres.link, '#');
        a.textContent = 'Open link';
        a.style.display = '';
      } else {
        a.removeAttribute('href');
        a.textContent = '';
        a.style.display = 'none';
      }
    }
    openModal(m, trigger);
  }

  function handleModalClicks(e) {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    const type = t.getAttribute('data-modal-target');
    const id = t.getAttribute('data-id');
    if (!type || !id) return;

    if (type === 'open-research-modal') {
      const item = (Array.isArray(window.researchData) ? window.researchData : (window.researchData?.items || [])).find(x => String(x.id) === String(id));
      if (item) openResearchDescriptionModal(item, t);
    } else if (type === 'open-news-modal') {
      const item = (Array.isArray(window.newsData) ? window.newsData : (window.newsData?.items || [])).find(x => String(x.id) === String(id));
      if (item) openNewsModal(item, t);
    } else if (type === 'open-academic-presentation-modal') {
      const item = (Array.isArray(window.academicPresentationsData) ? window.academicPresentationsData : (window.academicPresentationsData?.items || [])).find(x => String(x.id) === String(id));
      if (item) openAcademicPresentationModal(item, t);
    } else if (type === 'open-outreach-talk-modal') {
      const item = (Array.isArray(window.outreachTalksData) ? window.outreachTalksData : (window.outreachTalksData?.items || [])).find(x => String(x.id) === String(id));
      if (item) openOutreachTalkModal(item, t);
    }
  }

  return { openModal, closeModal, handleModalClicks, openResearchDescriptionModal, openNewsModal, openOutreachTalkModal, openAcademicPresentationModal };
})();;

/**
 * Manages the news carousel functionality.
 */
const CarouselManager = (() => {
    let currentIndex = 0;
    let slides = [];
    let slideWidth = 0;

    function updateCarousel() {
        if (!DOMElements.newsCarouselTrack) return;
        slides = Array.from(DOMElements.newsCarouselTrack.children).filter(el => !el.classList.contains('loader')); // Filter out loader
        if (slides.length === 0) return;

        slideWidth = slides[0].getBoundingClientRect().width;
        DOMElements.newsCarouselTrack.style.transform = 'translateX(' + (-slideWidth * currentIndex) + 'px)';

        // Update carousel dots
        if (DOMElements.carouselDotsContainer) {
            /* innerHTML removed in DOM-safe pass */ // Clear existing dots
            slides.forEach((_, index) => {
                const dot = document.createElement('button');
                dot.className = `carousel-dot ${index === currentIndex ? 'active' : ''}`;
                dot.setAttribute('role', 'tab');
                dot.setAttribute('aria-selected', index === currentIndex);
                dot.setAttribute('aria-controls', `news-carousel-slide-${index}`); // Assuming slides have IDs
                dot.setAttribute('aria-label', `Go to slide ${index + 1}`);
                dot.addEventListener('click', () => {
                    currentIndex = index;
                    updateCarousel();
                });
                DOMElements.carouselDotsContainer.appendChild(dot);
            });
        }

        // Update aria-current for carousel slides (optional, for more detailed accessibility)
        slides.forEach((slide, index) => {
            slide.id = `news-carousel-slide-${index}`; // Assign ID for aria-controls
            if (index === currentIndex) {
                slide.setAttribute('aria-current', 'true');
            }
        });
    }

    function setupCarousel() {
        if (DOMElements.newsCarouselTrack) {
            updateCarousel(); // Initial setup

            if (DOMElements.carouselPrevBtn) {
                DOMElements.carouselPrevBtn.addEventListener('click', () => {
                    currentIndex = (currentIndex - 1 + slides.length) % slides.length;
                    updateCarousel();
                });
            }
            if (DOMElements.carouselNextBtn) {
                DOMElements.carouselNextBtn.addEventListener('click', () => {
                    currentIndex = (currentIndex + 1) % slides.length;
                    updateCarousel();
                });
            }

            // Keyboard navigation for carousel
            DOMElements.newsCarouselTrack.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowLeft') {
                    currentIndex = (currentIndex - 1 + slides.length) % slides.length;
                    updateCarousel();
                } else if (e.key === 'ArrowRight') {
                    currentIndex = (currentIndex + 1) % slides.length;
                    updateCarousel();
                }
            });

            window.addEventListener('resize', updateCarousel);
        }
    }
    return { setupCarousel, updateCarousel };
})();

/**
 * Manages page navigation and mobile menu.
 */
const NavigationManager = (() => {
    /**
     * Shows the specified page section and updates navigation.
     * @param {string} pageId - The ID of the page section to show (e.g., 'home', 'research').
     */
    function showPage(pageId) {
        DOMElements.pageSections.forEach(section => {
            const isActive = section.id === pageId + '-page';
            section.classList.toggle('active', isActive);
            if (!isActive) {
                const fadeInContent = section.querySelector('.fade-in-section');
                if (fadeInContent) fadeInContent.classList.remove('is-visible');
            }
        });
        DOMElements.navLinks.forEach(link => {
            const isActive = link.hash === '#' + pageId;
            link.classList.toggle('active', isActive);
            if (isActive) {
                link.setAttribute('aria-current', 'page');
            }
        });
        const activePageContent = document.querySelector('.page-section.active .fade-in-section');
        if(activePageContent) setTimeout(() => activePageContent.classList.add('is-visible'), 100);

        // Handle Research Hub initialization/resize on home page
        const homeResearchHubSection = document.getElementById('home-research-hub-section');
        if (pageId === 'home' && homeResearchHubSection && !window.researchHubInitialized) {
            const researchCanvasContainer = document.getElementById('research-canvas-container');
            if (researchCanvasContainer && typeof window.initResearchHub === 'function') {
                // Delay initialization slightly to ensure canvas is rendered and sized
                console.log("Attempting to initialize Research Hub.");
                console.log("THREE object status:", typeof window.THREE); // Log THREE object status
                // Ensure all data is loaded before initializing the research hub
                if (window.researchData && window.newsData && window.teamData && window.gamesData) {
                    setTimeout(() => {
                        window.initResearchHub(window.researchData, window.newsData, window.teamData, window.gamesData);
                        window.researchHubInitialized = true;
                    }, 50);
                }
            } else if (researchCanvasContainer) {
                console.warn('researchHub.js or initResearchHub function not found. Interactive Research Hub may not function.');
            }
        } else if (pageId === 'home' && window.researchHubInitialized) {
            const researchContainer = document.getElementById('research-canvas-container');
            const researchCanvas = document.getElementById('research-canvas');
            if (researchCanvas && researchContainer && window.camera && window.renderer) {
                // Resize renderer if already initialized
                window.camera.aspect = researchContainer.clientWidth / 600;
                window.camera.updateProjectionMatrix();
                window.renderer.setSize(researchContainer.clientWidth, 600);
                window.renderer.render(window.scene, window.camera);
            }
        }

        // Load privacy notice content
        if (pageId === 'privacy' && DOMElements.privacyNoticeContent) {
            fetch('privacyNotice.md')
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.text();
                })
                .then(markdown => {
                    if (typeof marked !== 'undefined') {
                        /* innerHTML removed in DOM-safe pass */
                    }
                })
                .catch(error => {
                    console.error('Error loading privacy notice:', error);
                    // Fallback to static content if markdown file fails to load
                    /* innerHTML removed in DOM-safe pass */
                });
        }
    }

    /**
     * Handles navigation link clicks.
     * @param {Event} e - The click event.
     */
    function handleNavClick(e) {
        e.preventDefault();
        const pageId = e.currentTarget.hash.substring(1);
        showPage(pageId);
        if (!DOMElements.mobileMenu.classList.contains('hidden')) {
            DOMElements.mobileMenu.classList.add('hidden');
            DOMElements.mobileMenuButton.setAttribute('aria-expanded', 'false');
        }
    }

    return { showPage, handleNavClick };
})();

/**
 * Manages the GDPR consent banner.
 */
const GDPRManager = (() => {
    function setupGDPRBanner() {
        const consentGiven = localStorage.getItem('gdpr_consent_given');
        if (!consentGiven && DOMElements.gdprConsentBanner) {
            DOMElements.gdprConsentBanner.style.display = 'flex';
        }

        if (DOMElements.acceptCookiesBtn) {
            DOMElements.acceptCookiesBtn.addEventListener('click', () => {
                localStorage.setItem('gdpr_consent_given', 'true');
                DOMElements.gdprConsentBanner.style.display = 'none';
            });
        }
    }
    return { setupGDPRBanner };
})();

/**
 * Manages the scroll-to-top button.
 */
const ScrollManager = (() => {
    function toggleScrollToTopButton() {
        if (DOMElements.scrollToTopBtn) {
            if (window.scrollY > 300) { // Show button after scrolling down 300px
                DOMElements.scrollToTopBtn.style.display = 'block';
            }
        }
    }

    function scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    function setupScrollToTop() {
        if (DOMElements.scrollToTopBtn) {
            DOMElements.scrollToTopBtn.addEventListener('click', scrollToTop);
            window.addEventListener('scroll', toggleScrollToTopButton);
        }
    }
    return { setupScrollToTop };
})();

/**
 * Manages collapsible sections.
 */
const CollapsibleManager = (() => {
    function setupCollapsibleSections() {
        document.querySelectorAll('.collapsible-header').forEach(header => {
            header.addEventListener('click', () => {
                const contentId = header.getAttribute('aria-controls');
                const content = document.getElementById(contentId);
                const isExpanded = header.getAttribute('aria-expanded') === 'true';

                if (content) {
                    if (isExpanded) {
                        content.classList.remove('expanded');
                        header.classList.remove('expanded');
                        header.setAttribute('aria-expanded', 'false');
                    }
                }
            });
        });
    }
    return { setupCollapsibleSections };
})();


// Main application initialization
const App = (() => {
    function init() {
        // Set current year in footer
        DOMElements.yearSpan.textContent = new Date().getFullYear();

        // Fetch all data and render content first
        DataManager.fetchAllData().then(() => {
            // Initial page display based on hash or default to home
            const initialPageId = window.location.hash ? window.location.hash.substring(1) : 'home';
            NavigationManager.showPage(initialPageId);

            // Setup carousel after news data is rendered
            CarouselManager.setupCarousel();

            // Setup other event listeners
            setupEventListeners();

            // Setup GDPR Consent Banner
            GDPRManager.setupGDPRBanner();

            // Particles.js initialization
            particlesJS('particles-js', {
                "particles": {
                    "number": {"value": 80,"density": {"enable": true,"value_area": 800}},
                    "color": {"value": "#10b981"},
                    "shape": {"type": "circle"},
                    "opacity": {"value": 0.5,"random": true,"anim": {"enable": true,"speed": 0.5,"opacity_min": 0.1,"sync": false}},
                    "size": {"value": 3,"random": true},
                    "line_linked": {"enable": true,"distance": 150,"color": "#10b981","opacity": 0.2,"width": 1},
                    "move": {"enable": true,"speed": 2,"direction": "none","random": true,"straight": false,"out_mode": "out"}
                },
                "interactivity": {"detect_on": "canvas","events": {"onhover": {"enable": true,"mode": "repulse"},"onclick": {"enable": true,"mode": "push"},"resize": true},"modes": {"repulse": {"distance": 100,"duration": 0.4},"push": {"particles_nb": 4}}},
                "retina_detect": true
            });
        });
    }

    function setupEventListeners() {
        DOMElements.navLinks.forEach(link => link.addEventListener('click', NavigationManager.handleNavClick));
        DOMElements.navLinkHeader.addEventListener('click', NavigationManager.handleNavClick);

        DOMElements.mobileMenuButton.addEventListener('click', () => {
            const isExpanded = DOMElements.mobileMenu.classList.toggle('hidden');
            DOMElements.mobileMenuButton.setAttribute('aria-expanded', !isExpanded);
        });

        document.body.addEventListener('click', ModalManager.handleModalClicks); // Centralized modal click handler

        if (DOMElements.gameFiltersContainer) {
            DOMElements.gameFiltersContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('filter-btn')) {
                    document.querySelectorAll('.filter-btn').forEach(btn => {
                        btn.classList.remove('active', 'bg-primary');
                        btn.setAttribute('aria-pressed', 'false');
                    });
                    e.target.classList.add('active', 'bg-primary');
                    e.target.setAttribute('aria-pressed', 'true');
                    Renderer.renderGames(e.target.dataset.filter);
                }
            });
        }

        ScrollManager.setupScrollToTop();
        CollapsibleManager.setupCollapsibleSections();
    }

    return { init };
})();

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', App.init);
