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
  function createEl(tag, attrs = {}, children = []) {
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
      else { el.setAttribute(k, String(v)); }
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
      } else {
        truncatedElement.style.display = 'none';
        fullElement.style.display = 'block';
        button.textContent = 'Show Less ←';
        button.setAttribute('aria-expanded', 'true');
      }
    }
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
    /**
     * Renders all content sections after data is loaded.
     */
    function renderAllContent() {
        renderResearchItems();
        renderOutreachTalks();
        renderAcademicPresentations();
        renderOutreachNews();
        renderNewsCarouselAndList();
        renderTeamAndAlumni();
        renderGamesAndFilters();
    }

    /**
     * Creates an HTML string for a research card.
     * @param {object} item - The research item data.
     * @returns {string} HTML string for the research card.
     */
    function createResearchCardHtml(item) {
        let teamMembersHtml = '';
        if (item.teamMembers && item.teamMembers.length > 0) {
            teamMembersHtml = '<div class="mt-4 text-sm text-medium-text"><strong>Associated Members:</strong><div class="flex flex-wrap justify-center gap-2 mt-2">';
            item.teamMembers.forEach(memberId => {
                const teamMember = teamData.find(member => member.id === memberId);
                if (teamMember) {
                    teamMembersHtml += `<button data-modal-target="${teamMember.id}" class="open-modal-btn text-primary hover:text-light-text font-semibold">${Utils.escapeHTML(teamMember.name)}</button>`;
                } else {
                    const alumnus = alumniData.find(alumni => alumni.id === memberId);
                    if (alumnus) {
                        teamMembersHtml += `<span class="text-slate-400">${Utils.escapeHTML(alumnus.name)} (Alumnus)</span>`;
                    } else {
                        teamMembersHtml += `<span class="text-red-400">Unknown Member (${memberId})</span>`;
                    }
                }
            });
            teamMembersHtml += '</div></div>';
        }

        return `
            <div class="card rounded-lg p-6 text-center flex flex-col items-center">
                <img src="${item.image}" alt="${Utils.escapeHTML(item.title)}" class="w-full h-48 object-cover rounded-md mb-4 border border-primary-dark" loading="lazy">
                <h3 class="text-xl font-bold text-light-text mb-2">${Utils.escapeHTML(item.title)}</h3>
                ${teamMembersHtml}
                <button data-research-id="${item.id}" class="open-research-modal-btn bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-full text-sm transition duration-300 mt-auto">More Info →</button>
            </div>
        `;
    }

    function renderResearchItems() {
        const grid = DOMElements.researchContentGrid;
        if (!grid) return;
        grid.replaceChildren();
        const items = Array.isArray(researchData) ? researchData : (researchData?.items || []);
        if (!items || items.length === 0) {
            grid.textContent = 'No research items available at the moment.';
            return;
        }
        const cards = items.map((item) => {
            const img = createEl('img', {
                src: Utils.sanitizeUrl(item.image),
                alt: Utils.escapeHTML(item.title || 'Research image'),
                className: 'w-full h-48 object-cover rounded-md mb-4 border border-primary-dark',
                loading: 'lazy'
            });
            const title = createEl('h3', { className: 'text-lg font-semibold', text: item.title || '' });
            const desc = createEl('p', { className: 'text-sm text-medium-text', text: item.shortDescription || item.description || '' });
            return createEl('div', { className: 'card rounded-lg p-6 text-center flex flex-col items-center' }, [img, title, desc]);
        });
        grid.append(...cards);
    }
        const cards = items.map((item) => {
            const img = createEl('img', {
                src: Utils.sanitizeUrl(item.image),
                alt: Utils.escapeHTML(item.title || 'Research image'),
                className: 'w-full h-48 object-cover rounded-md mb-4 border border-primary-dark',
                loading: 'lazy'
            });
            const title = createEl('h3', { className: 'text-lg font-semibold' , text: item.title || ''});
            const desc = createEl('p', { className: 'text-sm text-medium-text', text: item.shortDescription || item.description || ''});
            const card = createEl('div', { className: 'card rounded-lg p-6 text-center flex flex-col items-center' }, [img, title, desc]);
            return card;
        });
        grid.append(...cards);
    } else if (DOMElements.researchContentGrid) {
            /* replaced by DOM rendering */
        }
    }

    /**
     * Creates an HTML string for an outreach talk card.
     * @param {object} talk - The outreach talk data.
     * @returns {string} HTML string for the talk card.
     */
    function createOutreachTalkCardHtml(talk) {
        let mediaHtml = '';
        if (talk.videoLink) {
            if (talk.videoLink.includes('youtube.com/embed/')) {
                mediaHtml = `<div class="relative w-full" style="padding-bottom: 56.25%;">
                                <iframe class="absolute top-0 left-0 w-full h-full rounded-md border border-primary-dark" src="${talk.videoLink}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>
                            </div>`;
            } else {
                mediaHtml = `<video controls class="w-full h-auto rounded-md border border-primary-dark" loading="lazy">
                                <source src="${talk.videoLink}" type="video/mp4">
                                Your browser does not support the video tag.
                            </video>`;
            }
        } else {
            mediaHtml = `<img src="https://placehold.co/400x225/047857/f3f4f6?" alt="${Utils.escapeHTML(talk.title)} Placeholder" class="w-full h-auto rounded-md mb-4 border border-primary-dark" loading="lazy">`;
        }

        let speakerHtml = '';
        if (talk.speakerIds && Array.isArray(talk.speakerIds) && talk.speakerIds.length > 0) {
            const speakerNames = talk.speakerIds.map(speakerId => {
                const speaker = teamData.find(member => member.id === speakerId) ||
                                alumniData.find(alumni => alumni.id === speakerId);
                return speaker ? `<button data-modal-target="${speaker.id}" class="open-modal-btn hover:underline">${Utils.escapeHTML(speaker.name)}</button>` : `Unknown (${speakerId})`;
            }).join(', ');
            speakerHtml = `<p class="text-primary font-semibold text-sm">Speaker(s): ${speakerNames}</p>`;
        } else {
            speakerHtml = `<p class="text-primary font-semibold text-sm">Speaker(s): N/A</p>`;
        }

        return `
            <div class="card rounded-lg p-6 flex flex-col items-center text-center">
                ${mediaHtml}
                <p class="text-sm text-medium-text mt-4 mb-2">${talk.date.day} ${talk.date.month} ${talk.date.year}</p>
                <h3 class="text-xl font-bold text-light-text mb-2">${Utils.escapeHTML(talk.title)}</h3>
                ${Utils.truncateText(talk.description, 150, `outreach-talk-${talk.id}`)}
                ${speakerHtml}
                <button data-outreach-talk-id="${talk.id}" class="open-outreach-talk-modal-btn bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-full text-sm transition duration-300 mt-auto">More Info →</button>
            </div>
        `;
    }

    function renderOutreachTalks() {
        const grid = DOMElements.outreachTalksGrid;
        if (!grid) return;
        grid.replaceChildren();
        const items = Array.isArray(outreachTalksData) ? outreachTalksData : (outreachTalksData?.items || []);
        if (!items || items.length === 0) {
            grid.textContent = 'No outreach talks available at the moment.';
            return;
        }
        const nodes = items.map((talk) => {
            const children = [];
            const media = Utils.createSafeMedia(talk.videoLink);
            if (media) children.push(media);
            children.push(
                createEl('h3', { className: 'text-lg font-semibold mt-3', text: talk.title || '' }),
                createEl('p', { className: 'text-xs text-medium-text', text: talk.date || '' }),
                createEl('p', { className: 'text-sm text-medium-text mt-2', text: talk.description || '' })
            );
            if (Array.isArray(talk.speakers) && talk.speakers.length) {
                const chips = talk.speakers.map(sp => createEl('span', { className:'px-2 py-1 rounded bg-primary/10 text-primary text-xs' , text: sp }));
                children.push(createEl('div', { className: 'flex flex-wrap gap-2 mt-2' }, chips));
            }
            return createEl('div', { className: 'card rounded-lg p-4' }, children);
        });
        grid.append(...nodes);
    }

    /**
     * Creates an HTML string for a news list item.
     * @param {object} item - The news item data.
     * @returns {string} HTML string for the news list item.
     */
    function createNewsListItemHtml(item) {
        return `
            <div class="card rounded-lg p-6 flex flex-col sm:flex-row items-start sm:space-x-6 cursor-pointer" data-news-id="${item.id}">
                <div class="bg-primary text-white text-center rounded-lg p-3 w-full sm:w-auto mb-4 sm:mb-0 flex-shrink-0">
                    <p class="text-sm font-bold">${item.date.month}</p>
                    <p class="text-2xl font-bold">${item.date.day}</p>
                    <p class="text-sm font-bold">${item.date.year}</p>
                </div>
                <div>
                    <h3 class="text-xl font-bold text-light-text">${Utils.escapeHTML(item.title)}</h3>
                    ${Utils.truncateText(item.description, 200, `news-${item.id}`)}
                </div>
            </div>
        `;
    }

    function renderNewsCarouselAndList() {
        const listEl = DOMElements.newsList;
        const trackEl = DOMElements.newsCarouselTrack;
        if (listEl) listEl.replaceChildren();
        if (trackEl) trackEl.replaceChildren();

        const items = Array.isArray(newsData) ? newsData : (newsData?.items || []);
        if (!items || items.length === 0) {
            if (listEl) listEl.textContent = 'No news available at the moment.';
            if (trackEl) trackEl.textContent = 'No news available at the moment.';
            return;
        }

        // List
        if (listEl) {
            const nodes = items.map((n) => {
                const li = createEl('li', { className: 'p-4 border-b border-primary-dark' }, [
                    createEl('h4', { className: 'font-semibold', text: n.title || '' }),
                    createEl('p', { className: 'text-sm text-medium-text', text: n.summary || n.description || '' }),
                    n.link ? createEl('a', { href: Utils.sanitizeUrl(n.link, '#'), className: 'text-primary underline', text: 'Read more' }) : null
                ]);
                return li;
            });
            listEl.append(...nodes);
        }

        // Carousel
        if (trackEl) {
            const slides = items.map((n) => {
                const slide = createEl('div', { className: 'carousel-slide p-4' }, [
                    n.image ? createEl('img', { src: Utils.sanitizeUrl(n.image), alt: Utils.escapeHTML(n.title || 'News image'), className: 'w-full h-56 object-cover rounded-md mb-3 border border-primary-dark', loading: 'lazy' }) : null,
                    createEl('h4', { className: 'font-semibold', text: n.title || '' }),
                    createEl('p', { className: 'text-sm text-medium-text', text: n.summary || n.description || '' }),
                    n.link ? createEl('a', { href: Utils.sanitizeUrl(n.link, '#'), className: 'text-primary underline', text: 'Read more' }) : null
                ]);
                return slide;
            });
            trackEl.append(...slides);
        }
    } ${a.date.month} ${a.date.day}`);
                const dateB = new Date(`${b.date.year} ${b.date.month} ${b.date.day}`);
                return dateB - dateA;
            });

            if (DOMElements.newsCarouselTrack) {
                /* replaced by DOM rendering */
            }
            if (DOMElements.newsList) {
                /* replaced by DOM rendering */
            }
        } else {
            if (DOMElements.newsCarouselTrack) /* replaced by DOM rendering */
            if (DOMElements.newsList) /* replaced by DOM rendering */
        }
    }

    /**
     * Creates an HTML string for a team member card.
     * @param {object} member - The team member data.
     * @returns {string} HTML string for the team card.
     */
    function createTeamCardHtml(member) {
        return `
            <div class="card rounded-lg p-6 text-center">
                <img src="${member.image}" class="w-32 h-32 rounded-full mx-auto mb-4 border-4 border-primary" alt="${Utils.escapeHTML(member.name)}" loading="lazy">
                <h3 class="text-xl font-bold text-light-text">${Utils.escapeHTML(member.name)}</h3>
                <p class="text-primary font-semibold">${Utils.escapeHTML(member.role)}</p>
                <button data-modal-target="${member.id}" class="open-modal-btn text-medium-text mt-2 text-sm hover:text-primary">View Bio →</button>
            </div>
        `;
    }

    /**
     * Creates an HTML string for an alumni member card.
     * @param {object} alumnus - The alumni member data.
     * @returns {string} HTML string for the alumni card.
     */
    function createAlumniCardHtml(alumnus) {
        return `
            <div class="card rounded-lg p-6 text-center">
                <img src="${alumnus.image}" class="w-32 h-32 rounded-full mx-auto mb-4 border-4 border-slate-400" alt="${Utils.escapeHTML(alumnus.name)}" loading="lazy">
                <h3 class="text-xl font-bold text-light-text">${Utils.escapeHTML(alumnus.name)}</h3>
                <p class="text-slate-400 font-semibold">${Utils.escapeHTML(alumnus.role)}</p>
                <button data-modal-target="${alumnus.id}" class="open-modal-btn text-medium-text mt-2 text-sm hover:text-primary">View Bio →</button>
            </div>
        `;
    }

    /**
     * Creates an HTML string for a person modal.
     * @param {object} person - The person data (team or alumni).
     * @param {string} borderColorClass - Tailwind class for border color.
     * @returns {string} HTML string for the person modal.
     */
    function createPersonModalHtml(person, borderColorClass) {
        // Get associated content for this person
        const associatedContentHtml = getAssociatedContentForPerson(person.id);

        return `
            <div id="${person.id}" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="${person.id}-title" aria-describedby="${person.id}-bio">
                <div class="modal-content flex flex-col md:flex-row items-center gap-8">
                    <button class="modal-close" aria-label="Close ${Utils.escapeHTML(person.name)} bio modal">×</button>
                    <img src="${person.image}" class="w-48 h-48 rounded-full border-4 ${borderColorClass}" alt="${Utils.escapeHTML(person.name)}" loading="lazy">
                    <div class="text-center md:text-left">
                        <h2 id="${person.id}-title" class="text-3xl font-bold text-light-text">${Utils.escapeHTML(person.name)}</h2>
                        <p class="text-primary font-semibold text-xl mb-4">${Utils.escapeHTML(person.role)}</p>
                                      ${person.memberSince ? `<p class="text-slate-400 text-sm mb-4">Member since: ${Utils.formatMemberSince(person.memberSince)}</p>` : ``}
              <p id="${person.id}-bio" class="text-medium-text">${person.bio}</p>
                        ${associatedContentHtml}
                        <div class="mt-4 text-left">
                            <label class="flex items-center text-xs text-slate-500">
                                <input type="checkbox" checked disabled class="form-checkbox h-4 w-4 text-primary bg-slate-700 border-slate-600 rounded mr-2">
                                GDPR: Consent to display personal information and image has been obtained.
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generates HTML for content associated with a given person ID.
     * @param {string} personId - The ID of the person.
     * @returns {string} HTML string containing links to associated content.
     */
    function getAssociatedContentForPerson(personId) {
        let contentHtml = '';
        let hasContent = false;

        // Research Projects
        const relatedResearch = researchData ? researchData.filter(r => Array.isArray(r.teamMembers) && r.teamMembers.includes(personId)) : [];
        if (relatedResearch.length > 0) {
            hasContent = true;
            contentHtml += `<h4 class="font-bold text-lg text-light-text border-b border-primary/20 pb-1 mt-6 mb-2">Associated Research Projects</h4><div class="space-y-2">`;
            relatedResearch.forEach(item => {
                contentHtml += `<button class="associated-content-link text-sm text-primary hover:underline text-left" data-type="open-research-modal" data-id="${item.id}">${Utils.escapeHTML(item.title)}</button>`;
            });
            contentHtml += `</div>`;
        }

        // Academic Presentations
        const relatedAcademicPresentations = academicPresentationsData ? academicPresentationsData.filter(p => Array.isArray(p.speakerIds) && p.speakerIds.includes(personId)) : [];
        if (relatedAcademicPresentations.length > 0) {
            hasContent = true;
            contentHtml += `<h4 class="font-bold text-lg text-light-text border-b border-primary/20 pb-1 mt-6 mb-2">Academic Presentations</h4><div class="space-y-2">`;
            relatedAcademicPresentations.forEach(item => {
                contentHtml += `<button class="associated-content-link text-sm text-primary hover:underline text-left" data-type="open-academic-presentation-modal" data-id="${item.id}">${Utils.escapeHTML(item.title)} (${item.date.year})</button>`;
            });
            contentHtml += `</div>`;
        }

        // Outreach Talks
        const relatedOutreachTalks = outreachTalksData ? outreachTalksData.filter(t => Array.isArray(t.speakerIds) && t.speakerIds.includes(personId)) : [];
        if (relatedOutreachTalks.length > 0) {
            hasContent = true;
            contentHtml += `<h4 class="font-bold text-lg text-light-text border-b border-primary/20 pb-1 mt-6 mb-2">Outreach Talks</h4><div class="space-y-2">`;
            relatedOutreachTalks.forEach(item => {
                contentHtml += `<button class="associated-content-link text-sm text-primary hover:underline text-left" data-type="open-outreach-talk-modal" data-id="${item.id}">${Utils.escapeHTML(item.title)} (${item.date.year})</button>`;
            });
            contentHtml += `</div>`;
        }

        return hasContent ? contentHtml : `<p class="text-medium-text text-sm mt-4">No directly associated content found.</p>`;
    }

    function renderTeamAndAlumni() {
        if (DOMElements.teamGrid && teamData && teamData.length > 0) {
            const teamDataSorted = teamData.slice().sort((a,b) => Utils.getMemberSinceDate(a.memberSince) - Utils.getMemberSinceDate(b.memberSince));
            /* innerHTML removed in DOM-safe pass */
            teamDataSorted.forEach(member => {
                DOMElements.modalContainer.insertAdjacentHTML('beforeend', createPersonModalHtml(member, 'border-primary'));
            });
        } else if (DOMElements.teamGrid) {
            /* innerHTML removed in DOM-safe pass */
        }

        if (DOMElements.alumniGrid && alumniData && alumniData.length > 0) {
            const alumniDataSorted = alumniData.slice().sort((a,b) => Utils.getMemberSinceDate(a.memberSince) - Utils.getMemberSinceDate(b.memberSince));
            /* innerHTML removed in DOM-safe pass */
            alumniDataSorted.forEach(alumnus => {
                DOMElements.modalContainer.insertAdjacentHTML('beforeend', createPersonModalHtml(alumnus, 'border-slate-400'));
            });
        } else if (DOMElements.alumniGrid) {
            /* innerHTML removed in DOM-safe pass */
        }
    }

    /**
     * Creates an HTML string for a game card.
     * @param {object} game - The game data.
     * @returns {string} HTML string for the game card.
     */
    function createGameCardHtml(game) {
        return `
            <div class="game-card card rounded-lg p-6 text-center">
                <img src="${game.thumbnail}" class="w-full h-40 object-cover rounded-md mb-4" alt="${Utils.escapeHTML(game.title)} Thumbnail" loading="lazy">
                <h3 class="text-xl font-bold text-light-text mb-2">${Utils.escapeHTML(game.title)}</h3>
                ${Utils.truncateText(game.description, 100, `game-${game.id}`)}
                
                ${game.ageRange ? `<p class=\"text-slate-400 text-sm mt-1\">Age range: ${game.ageRange}</p>` : ``}
                <div class="flex flex-wrap justify-center gap-1 mb-4">
                    ${game.themes.map(theme => `<span class="bg-primary-dark text-xs text-white px-2 py-1 rounded-full">${theme}</span>`).join(' ')}
                </div>
                <a href="${game.file}" target="_blank" class="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-full text-sm transition duration-300">Play Game</a>
            </div>
        `;
    }

    function renderGamesAndFilters() {
        if (DOMElements.gamesGrid && gamesData && gamesData.length > 0) {
            const allGameThemes = [...new Set(gamesData.flatMap(game => game.themes))];

            if (DOMElements.gameFiltersContainer) {
                /* innerHTML removed in DOM-safe pass */
                allGameThemes.forEach(theme => {
                    const button = document.createElement('button');
                    button.className = 'filter-btn bg-slate-700 hover:bg-primary-dark text-light-text font-bold py-2 px-4 rounded-full text-sm transition duration-300';
                    button.dataset.filter = theme;
                    button.textContent = theme;
                    button.setAttribute('aria-pressed', 'false');
                    DOMElements.gameFiltersContainer.appendChild(button);
                });
            }

            renderGames('all'); // Initial render of all games
        } else if (DOMElements.gamesGrid) {
            /* innerHTML removed in DOM-safe pass */
            if (DOMElements.gameFiltersContainer) /* innerHTML removed in DOM-safe pass */ // Clear filters if no games
        }
    }

    function renderGames(filter) {
        if (DOMElements.gamesGrid) /* innerHTML removed in DOM-safe pass */
        if (!gamesData) return; // Exit if gamesData is not loaded

        const filteredGames = gamesData.filter(game => filter === 'all' || game.themes.includes(filter));

        if (filteredGames.length > 0) {
            /* innerHTML removed in DOM-safe pass */
        } else {
            /* innerHTML removed in DOM-safe pass */
        }
    }

    return {
        renderAllContent,
        renderResearchItems,
        renderOutreachTalks,
        renderAcademicPresentations,
        renderOutreachNews,
        renderNewsCarouselAndList,
        renderTeamAndAlumni,
        renderGamesAndFilters,
        renderGames // Expose for filter functionality
    };
})();

/**
 * Manages modal opening, closing, and focus trapping.
 */
const ModalManager = (() => {
    let lastFocusedElement = null; // To store element that opened the modal

    /**
     * Opens a modal and handles focus trapping.
     * @param {HTMLElement} modal - The modal element to open.
     * @param {HTMLElement} triggerElement - The element that triggered the modal.
     */
    function openModal(modal, triggerElement) {
        lastFocusedElement = triggerElement;
        modal.classList.add('active');
        modal.focus(); // Set focus to the modal overlay for keyboard accessibility

        // Trap focus inside the modal
        const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        const firstFocusableElement = focusableElements[0];
        const lastFocusableElement = focusableElements[focusableElements.length - 1];

        modal.addEventListener('keydown', function trapFocus(e) {
            if (e.key === 'Tab') {
                if (e.shiftKey) { // Shift + Tab
                    if (document.activeElement === firstFocusableElement) {
                        lastFocusableElement.focus();
                        e.preventDefault();
                    }
                } else { // Tab
                    if (document.activeElement === lastFocusableElement) {
                        firstFocusableElement.focus();
                        e.preventDefault();
                    }
                }
            } else if (e.key === 'Escape') {
                closeModal(modal);
            }
        });

        if (firstFocusableElement) {
            firstFocusableElement.focus(); // Focus the first focusable element inside the modal
        }
    }

    /**
     * Closes a modal and returns focus to the triggering element.
     * @param {HTMLElement} modal - The modal element to close.
     */
    function closeModal(modal) {
        modal.classList.remove('active');
        if (lastFocusedElement) {
            lastFocusedElement.focus(); // Return focus to the element that opened the modal
            lastFocusedElement = null;
        }
    }

    /**
     * Opens the research description modal with the given research item data.
     * @param {object} researchItem - The research item data.
     * @param {HTMLElement} triggerElement - The element that triggered the modal.
     */
    function openResearchDescriptionModal(researchItem, triggerElement) {
        const researchModal = DOMElements.researchDescriptionModal;

        if (researchItem && researchModal) {
            DOMElements.researchModalTitle.textContent = researchItem.title;
            DOMElements.researchModalDescription.textContent = researchItem.description; // Full description here

            /* innerHTML removed in DOM-safe pass */
            DOMElements.researchModalCaption.textContent = '';
            /* innerHTML removed in DOM-safe pass */

            if (researchItem.modalMedia) {
                const mediaType = researchItem.modalMedia.endsWith('.mp4') || researchItem.modalMedia.endsWith('.webm') || researchItem.modalMedia.endsWith('.ogg') ? 'video' : 'image';
                if (mediaType === 'image') {
                    const img = document.createElement('img');
                    img.src = researchItem.modalMedia;
                    img.alt = researchItem.title;
                    img.className = 'w-full h-auto rounded-md object-cover border border-primary-dark';
                    img.setAttribute('loading', 'lazy');
                    DOMElements.researchModalMedia.appendChild(img);
                } else if (mediaType === 'video') {
                    const video = document.createElement('video');
                    video.src = researchItem.modalMedia;
                    video.controls = true;
                    video.className = 'w-full h-auto rounded-md object-cover border border-primary-dark';
                    video.setAttribute('loading', 'lazy');
                    DOMElements.researchModalMedia.appendChild(video);
                }

                if (researchItem.modalMediaCaption) {
                    DOMElements.researchModalCaption.textContent = researchItem.modalMediaCaption;
                }

                if (researchItem.modalMediaCreditId) {
                    const creditMember = teamData.find(member => member.id === researchItem.modalMediaCreditId) ||
                                         alumniData.find(alumni => alumni.id === researchItem.modalMediaCreditId);
                    if (creditMember) {
                        const creditButton = document.createElement('button');
                        creditButton.className = 'open-modal-btn text-slate-500 hover:text-primary font-semibold';
                        creditButton.setAttribute('data-modal-target', creditMember.id);
                        creditButton.textContent = `Photo Credit: ${Utils.escapeHTML(creditMember.name)}`;
                        DOMElements.researchModalCredit.appendChild(creditButton);
                    } else {
                        DOMElements.researchModalCredit.textContent = `Photo Credit: Unknown (${researchItem.modalMediaCreditId})`;
                    }
                }
            }

            let teamMembersHtml = '';
            if (researchItem.teamMembers && researchItem.teamMembers.length > 0) {
                teamMembersHtml = '<strong>Associated Members:</strong><div class="flex flex-wrap justify-start gap-2 mt-2">';
                researchItem.teamMembers.forEach(memberId => {
                    const teamMember = teamData.find(member => member.id === memberId);
                    if (teamMember) {
                        teamMembersHtml += `<button data-modal-target="${teamMember.id}" class="open-modal-btn text-primary hover:text-light-text font-semibold">${Utils.escapeHTML(teamMember.name)}</button>`;
                    } else {
                        const alumnus = alumniData.find(alumni => alumni.id === memberId);
                        if (alumnus) {
                            teamMembersHtml += `<button data-modal-target="${alumnus.id}" class="open-modal-btn text-slate-400 font-semibold">${Utils.escapeHTML(alumnus.name)} (Alumnus)</button>`;
                        } else {
                            teamMembersHtml += `<span class="text-red-400">Unknown Member (${memberId})</span>`;
                        }
                    }
                });
                teamMembersHtml += '</div>';
            }
            /* innerHTML removed in DOM-safe pass */

            openModal(researchModal, triggerElement);
        }
    }

    /**
     * Opens the news description modal with the given news item data.
     * @param {object} newsItem - The news item data.
     * @param {HTMLElement} triggerElement - The element that triggered the modal.
     */
    function openNewsDescriptionModal(newsItem, triggerElement) {
        const newsModal = DOMElements.newsDescriptionModal;

        if (newsItem && newsModal) {
            DOMElements.newsModalTitle.textContent = newsItem.title;
            DOMElements.newsModalDate.textContent = `${newsItem.date.day} ${newsItem.date.month} ${newsItem.date.year}`;
            DOMElements.newsModalDescription.textContent = newsItem.description; // Full description here
            DOMElements.newsModalImage.src = newsItem.image;
            DOMElements.newsModalImage.alt = newsItem.title; // Ensure alt text is set

            openModal(newsModal, triggerElement);
        }
    }

    /**
     * Opens the outreach talk description modal with the given talk item data.
     * @param {object} talkItem - The outreach talk item data.
     * @param {HTMLElement} triggerElement - The element that triggered the modal.
     */
    function openOutreachTalkModal(talkItem, triggerElement) {
        const talkModal = DOMElements.outreachTalkDescriptionModal;

        if (talkItem && talkModal) {
            DOMElements.outreachTalkModalTitle.textContent = talkItem.title;
            DOMElements.outreachTalkModalDate.textContent = `${talkItem.date.day} ${talkItem.date.month} ${talkItem.date.year}`;
            DOMElements.outreachTalkModalDescription.textContent = talkItem.description;

            /* innerHTML removed in DOM-safe pass */
            if (talkItem.videoLink) {
                if (talkItem.videoLink.includes('youtube.com/embed/')) {
                    /* innerHTML removed in DOM-safe pass */">
                                    <iframe class="absolute top-0 left-0 w-full h-full rounded-md border border-primary-dark" src="${talkItem.videoLink}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>
                                </div>`;
                } else {
                    /* innerHTML removed in DOM-safe pass */
                }
            } else {
                /* innerHTML removed in DOM-safe pass */
            }

            let speakerHtml = '';
            if (talkItem.speakerIds && Array.isArray(talkItem.speakerIds) && talkItem.speakerIds.length > 0) {
                const speakerNames = talkItem.speakerIds.map(speakerId => {
                    const speaker = teamData.find(member => member.id === speakerId) ||
                                    alumniData.find(alumni => alumni.id === speakerId);
                    return speaker ? `<button data-modal-target="${speaker.id}" class="open-modal-btn hover:underline">${Utils.escapeHTML(speaker.name)}</button>` : `Unknown (${speakerId})`;
                }).join(', ');
                speakerHtml = `<strong>Speaker(s):</strong> ${speakerNames}`;
            }
            /* innerHTML removed in DOM-safe pass */

            /* innerHTML removed in DOM-safe pass */

            openModal(talkModal, triggerElement);
        }
    }

    /**
     * Opens the academic presentation description modal with the given presentation item data.
     * @param {object} presItem - The academic presentation item data.
     * @param {HTMLElement} triggerElement - The element that triggered the modal.
     */
    function openAcademicPresentationModal(presItem, triggerElement) {
        const presModal = DOMElements.academicPresentationDescriptionModal;

  if (presItem && presModal) {
    DOMElements.academicPresentationModalTitle.textContent = presItem.title;
    DOMElements.academicPresentationModalDate.textContent =
      `${presItem.date.day} ${presItem.date.month} ${presItem.date.year}`;
    DOMElements.academicPresentationModalDescription.textContent = presItem.description;

    /* innerHTML removed in DOM-safe pass */

    if (presItem.videoLink) {
      if (presItem.videoLink.includes('youtube.com/embed/')) {
        /* innerHTML removed in DOM-safe pass */">
            <iframe class="absolute top-0 left-0 w-full h-full rounded-md border border-primary-dark"
                    src="${presItem.videoLink}"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen
                    loading="lazy"></iframe>
          </div>`;
      } else {
        /* innerHTML removed in DOM-safe pass */
      }
    } else {
      const imgSrc = presItem.image || 'images/placeholder-400x225.png'; // fallback path you control
      /* innerHTML removed in DOM-safe pass */
    }

            let speakerHtml = '';
            if (presItem.speakerIds && Array.isArray(presItem.speakerIds) && presItem.speakerIds.length > 0) {
                const speakerNames = presItem.speakerIds.map(speakerId => {
                    const speaker = teamData.find(member => member.id === speakerId) ||
                                    alumniData.find(alumni => alumni.id === speakerId);
                    return speaker ? `<button data-modal-target="${speaker.id}" class="open-modal-btn hover:underline">${Utils.escapeHTML(speaker.name)}</button>` : `Unknown (${speakerId})`;
                }).join(', ');
                speakerHtml = `<strong>Speaker(s):</strong> ${speakerNames}`;
            }
            /* innerHTML removed in DOM-safe pass */

            /* innerHTML removed in DOM-safe pass */

            openModal(presModal, triggerElement);
        }
    }

    /**
     * Handles clicks on modal-related elements.
     * @param {Event} e - The click event.
     */
    function handleModalClicks(e) {
        // Open person/alumni modal
        if (e.target.matches('.open-modal-btn')) {
            const modalId = e.target.getAttribute('data-modal-target');
            const modal = document.getElementById(modalId);
            if(modal) openModal(modal, e.target);
        }
        // Close modal by clicking close button or overlay
        if (e.target.matches('.modal-close') || e.target.matches('.modal-overlay')) {
            const activeModal = document.querySelector('.modal-overlay.active');
            if(activeModal) closeModal(activeModal);
        }
        // Open Research modal (from research page cards)
        if (e.target.matches('.open-research-modal-btn')) {
            const researchId = e.target.getAttribute('data-research-id');
            const researchItem = researchData.find(item => item.id === researchId);
            openResearchDescriptionModal(researchItem, e.target);
        }
        // Open News modal (from news page cards or carousel)
        if (e.target.closest('.card.cursor-pointer[data-news-id]')) {
            const newsCard = e.target.closest('.card.cursor-pointer[data-news-id]');
            const newsId = newsCard.getAttribute('data-news-id');
            const newsItem = newsData.find(item => item.id === newsId);
            openNewsDescriptionModal(newsItem, newsCard);
        }
        // Open Outreach Talk modal (from outreach page cards)
        if (e.target.matches('.open-outreach-talk-modal-btn')) {
            const talkId = e.target.getAttribute('data-outreach-talk-id');
            const talkItem = outreachTalksData.find(item => item.id === talkId);
            openOutreachTalkModal(talkItem, e.target);
        }
        // Open Academic Presentation modal (from outreach page cards)
        if (e.target.matches('.open-academic-presentation-modal-btn')) {
            const presId = e.target.getAttribute('data-academic-presentation-id');
            const presItem = academicPresentationsData.find(item => item.id === presId);
            openAcademicPresentationModal(presItem, e.target);
        }

        // Handle "Read More" button clicks
        if (e.target.matches('.read-more-btn')) {
            const targetId = e.target.getAttribute('data-target-id');
            Utils.toggleTextVisibility(targetId, e.target);
        }
        // Handle clicks on associated content links within person modals
        if (e.target.matches('.associated-content-link')) {
            const type = e.target.dataset.type;
            const id = e.target.dataset.id;

            closeModal(e.target.closest('.modal-overlay')); // Close the person modal first

            if (type === 'open-research-modal') {
                const researchItem = researchData.find(item => item.id === id);
                if (researchItem) {
                    openResearchDescriptionModal(researchItem, e.target);
                }
            } else if (type === 'open-academic-presentation-modal') {
                const presItem = academicPresentationsData.find(item => item.id === id);
                if (presItem) {
                    openAcademicPresentationModal(presItem, e.target);
                }
            } else if (type === 'open-outreach-talk-modal') {
                const talkItem = outreachTalksData.find(item => item.id === id);
                if (talkItem) {
                    openOutreachTalkModal(talkItem, e.target);
                }
            }
        }
    }

    return { openModal, closeModal, handleModalClicks, openResearchDescriptionModal, openNewsDescriptionModal, openOutreachTalkModal, openAcademicPresentationModal };
})();

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
            } else {
                slide.removeAttribute('aria-current');
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
            } else {
                link.removeAttribute('aria-current');
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
                } else {
                    console.warn("Research Hub data not yet loaded. Skipping initialization.");
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
                    } else {
                        console.error('marked.js is not loaded.');
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
            } else {
                DOMElements.scrollToTopBtn.style.display = 'none';
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
                    } else {
                        content.classList.add('expanded');
                        header.classList.add('expanded');
                        header.setAttribute('aria-expanded', 'true');
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
