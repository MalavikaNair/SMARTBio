(function () {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();

// ---- Debug switches ----
const APP_DEBUG = true;
const alog = (...args) => { if (APP_DEBUG) console.log('[App]', ...args); };
const warn = (...args) => console.warn('[App]', ...args);
const err  = (...args) => console.error('[App]', ...args);

// Catch uncaught errors/rejections
window.addEventListener('error', (e) => err('Uncaught error', e.error || e.message, e));
window.addEventListener('unhandledrejection', (e) => err('Unhandled promise rejection', e.reason || e));


/* ======================= Utils ======================= */
const Utils = (() => {
  const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

  function escapeHTML(str) {
    if (str === undefined || str === null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function isSafeUrl(url) {
    try {
      const u = new URL(String(url), window.location.origin);
      return ALLOWED_PROTOCOLS.has(u.protocol);
    } catch {
      return false;
    }
  }

  function sanitizeUrl(url, fallback = '#') {
    return isSafeUrl(url) ? String(url) : fallback;
  }

  function normalizeScholarUrl(val) {
    if (!val) return null;
    const s = String(val).trim();
    if (/^https?:\/\//i.test(s)) return s;
    return `https://scholar.google.com/citations?user=${encodeURIComponent(s)}`;
  }

  function createEl(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === undefined || v === null) continue;
      if (k === 'text') { el.textContent = String(v); continue; }
      if (k === 'html') { el.innerHTML = String(v); continue; }
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

  function toYouTubeEmbedURL(input) {
    try {
      const u = new URL(String(input), window.location.origin);
      const host = u.hostname.toLowerCase();
      if (host === 'youtu.be') {
        const id = u.pathname.slice(1);
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
      if ((host === 'youtube.com' || host === 'www.youtube.com') && u.pathname === '/watch') {
        const id = u.searchParams.get('v');
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
      if ((host === 'youtube.com' || host === 'www.youtube.com') && u.pathname.startsWith('/embed/')) {
        return `https://www.youtube.com${u.pathname}${u.search}`;
      }
      if (host === 'www.youtube-nocookie.com' && u.pathname.startsWith('/embed/')) {
        return u.href;
      }
    } catch {}
    return null;
  }

  function createYouTubeEmbed(url) {
    const embed = toYouTubeEmbedURL(url);
    if (!embed) return null;
    const iframe = document.createElement('iframe');
    iframe.src = embed;
    iframe.loading = 'lazy';
    iframe.allowFullscreen = true;
    iframe.setAttribute('allow','accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
    iframe.className = 'absolute top-0 left-0 w-full h-full rounded-md border border-primary-dark';
    return iframe;
  }

  function createSafeMedia(url) {
    if (!url) return null;
    const u = String(url);
    if (/\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(u)) {
      const img = document.createElement('img');
      img.src = sanitizeUrl(u);
      img.alt = '';
      img.loading = 'lazy';
      img.className = 'w-full h-auto rounded-md object-cover border border-primary-dark';
      return img;
    }
    if (u.includes('youtube.com/embed/')) {
      const container = document.createElement('div');
      container.className = 'relative w-full';
      container.style.paddingBottom = '56.25%';
      const iframe = createYouTubeEmbed(u);
      if (iframe) container.appendChild(iframe);
      return container;
    }
    const v = document.createElement('video');
    v.controls = true;
    v.className = 'w-full h-auto rounded-md border border-primary-dark';
    const src = document.createElement('source');
    src.src = sanitizeUrl(u);
    v.appendChild(src);
    return v;
  }

  const MONTH_MAP = {
    jan:'Jan', january:'Jan',
    feb:'Feb', february:'Feb',
    mar:'Mar', march:'Mar',
    apr:'Apr', april:'Apr',
    may:'May',
    jun:'Jun', june:'Jun',
    jul:'Jul', july:'Jul',
    aug:'Aug', august:'Aug',
    sep:'Sep', sept:'Sep', september:'Sep',
    oct:'Oct', october:'Oct',
    nov:'Nov', november:'Nov',
    dec:'Dec', december:'Dec'
  };
  function formatDate(input) {
    if (!input) return '';
    if (typeof input === 'string') return input;
    if (typeof input === 'object') {
      const day = (input.day ?? '').toString();
      const rawMonth = (input.month ?? '').toString();
      const mKey = rawMonth.toLowerCase();
      const month = MONTH_MAP[mKey] || rawMonth;
      const year = input.year ?? '';
      const parts = [];
      if (day) parts.push(day);
      if (month) parts.push(month);
      if (year) parts.push(String(year));
      return parts.join(' ');
    }
    try {
      const d = new Date(input);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString(undefined, { day:'2-digit', month:'short', year:'numeric' });
      }
    } catch {}
    return String(input);
  }

  function getMemberSinceDate(v) {
    if (!v && v !== 0) return new Date(8640000000000000);
    try {
      const str = String(v);
      const parts = str.split('-');
      if (parts.length === 1) return new Date(Number(parts[0]), 0, 1);
      if (parts.length === 2) return new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
      const d = new Date(str);
      if (!isNaN(d.getTime())) return d;
    } catch {}
    return new Date(8640000000000000);
  }
  function formatMemberSince(v) {
    if (!v && v !== 0) return '';
    try {
      const parts = String(v).split('-');
      if (parts.length === 1) return parts[0];
      if (parts.length === 2) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
        if (!isNaN(d.getTime())) return d.toLocaleString(undefined, { month: 'long', year: 'numeric' });
      }
      const d = new Date(v);
      if (!isNaN(d.getTime())) return d.toLocaleString(undefined, { month: 'long', year: 'numeric' });
    } catch {}
    return String(v);
  }

  return {
    escapeHTML, isSafeUrl, sanitizeUrl, normalizeScholarUrl, createEl, createSafeMedia,
    formatDate, getMemberSinceDate, formatMemberSince
  };
})();

/* ======================= DOM Cache ======================= */
const DOMElements = (() => {
  const pageSections = document.querySelectorAll('.page-section');
  const yearSpan = document.getElementById('year');

  const researchContentGrid = document.getElementById('research-content-grid');
  const teamGrid = document.getElementById('team-grid');
  const alumniGrid = document.getElementById('alumni-grid');
  const newsList = document.getElementById('news-list');
  const newsCarouselTrack = document.getElementById('news-carousel-track');
  const carouselDotsContainer = document.getElementById('carousel-dots');
  const carouselPrevBtn = document.getElementById('carousel-prev');
  const carouselNextBtn = document.getElementById('carousel-next');
  const outreachTalksGrid = document.getElementById('outreach-talks-grid');
  const academicPresentationsGrid = document.getElementById('academic-presentations-grid');
  const outreachNewsList = document.getElementById('outreach-news-list');
  const publicationsList = document.getElementById('publications-list');
  const gamesGrid = document.getElementById('games-grid');
  const gameFilters = document.getElementById('game-filters');

  const modalContainer = document.getElementById('modal-container');

  const researchDescriptionModal = document.getElementById('research-description-modal');
  const researchModalMedia = document.getElementById('research-modal-media');
  const researchModalCaption = document.getElementById('research-modal-caption');
  const researchModalCredit = document.getElementById('research-modal-credit');
  const researchModalTitle = document.getElementById('research-modal-title');
  const researchModalDescription = document.getElementById('research-modal-description');
  const researchModalTeamMembers = document.getElementById('research-modal-team-members');

  const newsDescriptionModal = document.getElementById('news-description-modal');
  const outreachTalkDescriptionModal = document.getElementById('outreach-talk-description-modal');
  const academicPresentationDescriptionModal = document.getElementById('academic-presentation-description-modal');

  const navLinks = document.querySelectorAll('.nav-link');
  const navLinkHeader = document.querySelector('.nav-link-header');
  const mobileMenuButton = document.getElementById('mobile-menu-button');
  const mobileMenu = document.getElementById('mobile-menu');

  const scrollToTopBtn = document.getElementById('scroll-to-top-btn');
  const privacyNoticeContent = document.getElementById('privacy-notice-content');

  return {
    pageSections, yearSpan,
    researchContentGrid, teamGrid, alumniGrid, newsList,
    newsCarouselTrack, carouselDotsContainer, carouselPrevBtn, carouselNextBtn,
    outreachTalksGrid, academicPresentationsGrid, outreachNewsList, publicationsList,
    gamesGrid, gameFilters,
    modalContainer,
    researchDescriptionModal, researchModalMedia, researchModalCaption, researchModalCredit,
    researchModalTitle, researchModalDescription, researchModalTeamMembers,
    newsDescriptionModal, outreachTalkDescriptionModal, academicPresentationDescriptionModal,
    navLinks, navLinkHeader, mobileMenuButton, mobileMenu,
    scrollToTopBtn, privacyNoticeContent
  };
})();

/* ======================= Data Manager ======================= */
const DataManager = (() => {
  async function fetchJSON(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
    return res.json();
  }

  async function fetchAllData() {
    try {
      const [
        research, team, alumni, news, games, outreachTalks,
        academicPresentations, outreachNews, publications
      ] = await Promise.all([
        fetchJSON('data/research.json').catch(() => ({ items: [] })),
        fetchJSON('data/team.json').catch(() => ({ items: [] })),
        fetchJSON('data/alumni.json').catch(() => ({ items: [] })),
        fetchJSON('data/news.json').catch(() => ({ items: [] })),
        fetchJSON('data/games.json').catch(() => ({ items: [] })),
        fetchJSON('data/outreachTalks.json').catch(() => ({ items: [] })),
        fetchJSON('data/academicPresentations.json').catch(() => ({ items: [] })),
        fetchJSON('data/outreachNews.json').catch(() => ({ items: [] })),
        fetchJSON('data/publications.json').catch(() => ({ items: [] })) 
      ]);

      const assign = (name, data) => {
        const val = Array.isArray(data) ? data : (data && data.items) || [];
        window[name] = val;
      };
      assign('researchData', research);
      assign('teamData', team);
      assign('alumniData', alumni);
      assign('newsData', news);
      assign('gamesData', games);
      assign('outreachTalksData', outreachTalks);
      assign('academicPresentationsData', academicPresentations);
      assign('outreachNewsData', outreachNews);
      assign('publicationsData', publications);
      Renderer.renderAllContent();
      window.smartbioDataReady = true;
      document.dispatchEvent(new CustomEvent('smartbio:data-ready'));

    } catch (err) {
      console.error('Error loading data:', err);
      const msg = 'An error occurred while loading content.';
      if (DOMElements.researchContentGrid) DOMElements.researchContentGrid.textContent = msg;
      if (DOMElements.teamGrid) DOMElements.teamGrid.textContent = msg;
      if (DOMElements.alumniGrid) DOMElements.alumniGrid.textContent = msg;
      if (DOMElements.newsList) DOMElements.newsList.textContent = msg;
      if (DOMElements.newsCarouselTrack) DOMElements.newsCarouselTrack.textContent = msg;
      if (DOMElements.gamesGrid) DOMElements.gamesGrid.textContent = msg;
      if (DOMElements.outreachTalksGrid) DOMElements.outreachTalksGrid.textContent = msg;
      if (DOMElements.academicPresentationsGrid) DOMElements.academicPresentationsGrid.textContent = msg;
      if (DOMElements.outreachNewsList) DOMElements.outreachNewsList.textContent = msg;
      if (DOMElements.publicationsList) DOMElements.publicationsList.textContent = msg;

    }
  }

  return { fetchAllData };
})();
let activePublicationFilter = 'all';
/* ======================= Renderer ======================= */
const Renderer = (() => {
  const resolve = (raw) => Array.isArray(raw) ? raw : (raw && raw.items) || [];

  function renderResearchItems() {
    const grid = DOMElements.researchContentGrid;
    if (!grid) return;
    grid.replaceChildren();

    const items = resolve(window.researchData);
    if (!items.length) { grid.textContent = 'No research items available at the moment.'; return; }

    const people = resolve(window.teamData).concat(resolve(window.alumniData));
    const getPerson = (id) => people.find(p => String(p.id) === String(id));

    const cards = items.map(item => {
      const img = item?.image ? Utils.createEl('img', {
        src: Utils.sanitizeUrl(item.image),
        alt: Utils.escapeHTML(item.title || 'Research image'),
        className: 'research-card-img rounded-md mb-4 border border-primary-dark',
        loading: 'lazy'
      }) : null;

      const title = Utils.createEl('h3', { className: 'text-lg font-semibold', text: item?.title || '' });

      const desc = String(item?.description || '');
      const truncated = '';
      const pTrunc = Utils.createEl('p', { id: 'truncated-text-research-' + String(item?.id), text: truncated });
      const pFull  = Utils.createEl('p', { id: 'full-text-research-' + String(item?.id), text: desc });
      if (desc.length > 0) pFull.style.display = 'none';

      const moreBtn = Utils.createEl('button', {
        className: 'read-more-btn text-primary hover:underline text-sm mt-2',
        dataset: { modalTarget: 'open-research-modal', id: (item?.id ?? item?.title) },
        text: (desc.length > 180 ? 'Read More →' : 'More Info')
      });

      const extra = Utils.createEl('div', { className: 'mt-3 hidden', id: 'research-extra-' + String(item?.id) });
      const media = Utils.createSafeMedia(item?.modalMedia || item?.image);
      if (media) extra.appendChild(media);
      if (item?.modalMediaCaption) extra.appendChild(Utils.createEl('p', { className: 'text-xs text-medium-text mt-2', text: item.modalMediaCaption }));
      if (item?.modalMediaCreditId != null) {
        const p = getPerson(item.modalMediaCreditId);
        extra.appendChild(Utils.createEl('p', { className: 'text-xs text-medium-text', text: 'Credit: ' + (p ? p.name : String(item.modalMediaCreditId)) }));
      }
      if (Array.isArray(item?.teamMembers) && item.teamMembers.length) {
        const wrap = Utils.createEl('div', { className: 'mt-2 flex flex-wrap gap-2' });
        item.teamMembers.forEach(id => {
          const p = getPerson(id);
          wrap.appendChild(Utils.createEl('a', {
            href: '#',
            className: 'inline-block font-bold text-gray-900 hover:underline',
            dataset: { modalTarget: 'open-person-bio', id },
            text: p ? p.name : String(id)
          }));
        });
        extra.appendChild(wrap);
      }

      return Utils.createEl('div', { className: 'card rounded-lg p-6 text-center flex flex-col items-center' },
        [img, title, pTrunc, pFull, moreBtn, extra].filter(Boolean)
      );
    });

    grid.append(...cards);
  }

  function renderNews() {
    const list = DOMElements.newsList;
    if (!list) return;
    list.replaceChildren();
    const items = resolve(window.newsData);
    if (!items.length) { list.textContent = 'No news at the moment.'; return; }

    items.forEach((n, i) => {
      const li = Utils.createEl('li', { className: 'mb-6' });
      const heading = Utils.createEl('div', { className: 'flex items-center gap-3 mb-2' }, [
        Utils.createEl('h3', { className: 'text-lg font-semibold', text: n?.title || '' }),
        n?.date ? Utils.createEl('span', { className: 'date-badge', text: Utils.formatDate(n.date) }) : null
      ].filter(Boolean));
      const desc = Utils.createEl('p', { className: 'text-medium-text', text: n?.description || '' });
      const btn = Utils.createEl('button', {
        className: 'mt-2 text-primary font-semibold hover:underline',
        dataset: { modalTarget: 'open-news-modal', id: i },
        text: 'Read More →'
      });
      li.append(heading, desc, btn);
      list.appendChild(li);
    });

    const track = DOMElements.newsCarouselTrack;
    if (track) {
      track.replaceChildren();
      const slides = items.map((n, i) => {
        const img = n?.image ? Utils.createEl('img', {
          src: Utils.sanitizeUrl(n.image),
          alt: Utils.escapeHTML(n.title || 'News'),
          className: 'w-full h-64 object-cover rounded-md items-center',
          loading: 'lazy'
        }) : null;
        const slide = Utils.createEl('div', { className: 'carousel-slide', tabindex: '0' }, [
          img,
          Utils.createEl('h3', { className: 'text-lg font-semibold mt-2', text: n?.title || '' })
        ]);
        slide.style.flex = '0 0 100%';
        slide.style.boxSizing = 'border-box';
        slide.addEventListener('click', () => ModalManager.openNewsModal(i));
        return slide;
      });
      track.append(...slides);
    }
  }

  function renderTeam(kind, data, grid) {
    if (!grid) return;
    grid.replaceChildren();
    const items = resolve(data);
    if (!items.length) { grid.textContent = `No ${kind} available.`; return; }

    const cards = items
      .slice()
      .sort((a, b) => Utils.getMemberSinceDate(a?.memberSince) - Utils.getMemberSinceDate(b?.memberSince))
      .map(p => {
        const img = p?.image ? Utils.createEl('img', {
          src: Utils.sanitizeUrl(p.image),
          alt: Utils.escapeHTML(p?.name || 'Member'),
          className: 'w-32 h-32 object-cover rounded-full mb-3',
          loading: 'lazy'
        }) : null;
        const name = Utils.createEl('h3', { className: 'text-lg font-semibold', text: p?.name || '' });
        const role = p?.role ? Utils.createEl('p', { className: 'text-sm text-medium-text', text: p.role }) : null;
        const since = p?.memberSince ? Utils.createEl('p', { className: 'text-xs text-medium-text', text: 'Member since ' + Utils.formatMemberSince(p.memberSince) }) : null;
        const linksWrap = Utils.createEl('div', { className: 'mt-2 space-x-3' });
        if (p?.website) linksWrap.appendChild(Utils.createEl('a', { href: Utils.sanitizeUrl(p.website), target: '_blank', rel: 'noopener', className: 'text-gray-900 font-semibold hover:underline', text: 'Website' }));
        if (p?.googleScholar) linksWrap.appendChild(Utils.createEl('a', { href: Utils.sanitizeUrl(Utils.normalizeScholarUrl(p.googleScholar)), target: '_blank', rel: 'noopener', className: 'text-gray-900 font-semibold hover:underline', text: 'Link to Scholar' }));
        const bioBtn = Utils.createEl('a', {
          href: '#',
          className: 'inline-block font-bold text-primary hover:underline mt-2',
          dataset: { modalTarget: 'open-person-bio', id: p?.id },
          text: 'Bio →'
        });
        return Utils.createEl('div', { className: 'card rounded-lg p-6 text-center flex flex-col items-center' },
          [img, name, role, since, linksWrap, bioBtn].filter(Boolean));
      });

    grid.append(...cards);
  }

  function renderPublications() {
  const container = DOMElements.publicationsList;
  if (!container) return;

  container.replaceChildren();

  let items = Array.isArray(window.publicationsData)
    ? window.publicationsData
    : (window.publicationsData?.items || []);

  // --- FILTER LOGIC ---
  if (activePublicationFilter !== 'all') {
    items = items.filter(p => {
      if (p.category) return p.category === activePublicationFilter;
      if (activePublicationFilter === 'preprint') return p.type === 'preprint';
      if (activePublicationFilter === 'research') return p.type === 'journal';
      return false;
    });
  }

  if (!items.length) {
    container.textContent = 'No publications available.';
    return;
  }

  // group by year
  const grouped = {};
  items.forEach(p => {
    const y = p.year || 'Unknown';
    if (!grouped[y]) grouped[y] = [];
    grouped[y].push(p);
  });

  Object.keys(grouped).sort((a, b) => b - a).forEach(year => {
    const yearBlock = document.createElement('div');

    const heading = document.createElement('h3');
    heading.className = 'text-2xl font-bold mb-4';
    heading.textContent = year;

    const list = document.createElement('ul');

    grouped[year].forEach(p => {
      const li = document.createElement('li');
      li.className = 'mb-4';

      li.innerHTML = `
        <strong>${p.title}</strong><br>
        ${p.authors || ''}<br>
        <em>${p.journal || ''}</em>
        ${p.doi ? `<br><a href="https://doi.org/${p.doi}" target="_blank">DOI</a>` : ''}
      `;

      list.appendChild(li);
    });

    yearBlock.appendChild(heading);
    yearBlock.appendChild(list);
    container.appendChild(yearBlock);
  });
}

  function renderGames() {
    const grid = DOMElements.gamesGrid;
    if (!grid) return;
    grid.replaceChildren();

    const items = resolve(window.gamesData);
    if (!items.length) { grid.textContent = 'No games yet.'; return; }

    const active = (window.GameFilter && GameFilter.getActiveThemes)
      ? GameFilter.getActiveThemes()
      : new Set(Array.from((DOMElements.gameFilters || document).querySelectorAll('[data-theme].active')).map(b => b.dataset.theme));

    const matchesTheme = (game) => {
      if (!active || active.size === 0) return true;
      const raw = game?.themes ?? game?.theme;
      const themes = Array.isArray(raw) ? raw.map(String) : raw ? [String(raw)] : [];
      return themes.some(t => active.has(t));
    };

    const filtered = items.filter(matchesTheme);

    filtered.forEach(game => {
      const img = game?.thumbnail ? Utils.createEl('img', {
        src: Utils.sanitizeUrl(game.thumbnail),
        alt: Utils.escapeHTML(game?.title || 'Game'),
        className: 'w-full h-48 object-cover rounded-md border border-primary-dark mb-3',
        loading: 'lazy'
      }) : null;

      const play = game?.file ? Utils.createEl('a', {
        href: Utils.sanitizeUrl(game.file),
        target: '_blank',
        rel: 'noopener',
        className: 'bg-primary text-white px-4 py-2 rounded-full font-semibold inline-block mt-2',
        text: 'Play Game'
      }) : null;

      const card = Utils.createEl('div', { className: 'card rounded-lg p-6 flex flex-col' }, [
        img,
        Utils.createEl('h3', { className: 'text-lg font-semibold', text: game?.title || '' }),
        Utils.createEl('p', { className: 'text-medium-text', text: game?.description || '' }),
        play
      ].filter(Boolean));

      grid.appendChild(card);
    });
  }

  function renderOutreachTalks() {
    const grid = DOMElements.outreachTalksGrid;
    if (!grid) return;
    grid.replaceChildren();
    const items = resolve(window.outreachTalksData);
    if (!items.length) { grid.textContent = 'No outreach talks available at the moment.'; return; }

    const people = resolve(window.teamData).concat(resolve(window.alumniData));
    const personById = (id) => people.find(p => String(p.id) === String(id));

    const cards = items.map((t, idx) => {
      const heading = Utils.createEl('div', { className: 'flex items-center gap-3 mb-2' }, [
        Utils.createEl('h3', { className: 'text-lg font-semibold', text: t?.title || '' }),
        t?.date ? Utils.createEl('span', { className: 'date-badge', text: Utils.formatDate(t.date) }) : null
      ].filter(Boolean));

      const right = Utils.createEl('div', { className: 'mt-3 flex gap-2 flex-wrap' });
      (Array.isArray(t?.speakerIds) ? t.speakerIds : []).forEach(id => {
        const person = personById(id);
        right.appendChild(Utils.createEl('a', {
          href: '#',
          className: 'inline-block font-bold text-gray-900 hover:underline',
          dataset: { modalTarget: 'open-person-bio', id },
          text: person ? person.name : String(id)
        }));
      });

      const more = Utils.createEl('button', {
        className: 'text-primary font-semibold hover:underline mt-2',
        dataset: { modalTarget: 'open-outreach-talk-modal', id: idx },
        text: 'Details →'
      });

      return Utils.createEl('div', { className: 'card rounded-lg p-6 flex flex-col' }, [
        heading,
        Utils.createEl('p', { className: 'text-medium-text', text: t?.description || '' }),
        right,
        more
      ]);
    });
    grid.append(...cards);
  }

  function renderAcademicPresentations() {
    const grid = DOMElements.academicPresentationsGrid;
    if (!grid) return;
    grid.replaceChildren();
    const items = resolve(window.academicPresentationsData);
    if (!items.length) { grid.textContent = 'No academic presentations right now.'; return; }

    const people = resolve(window.teamData).concat(resolve(window.alumniData));
    const personById = (id) => people.find(p => String(p.id) === String(id));

    items.forEach((t, idx) => {
      const contentId = `ap-content-${idx}`;

      const header = Utils.createEl('div', {
        className: 'collapsible-header flex items-center justify-between gap-4 cursor-pointer',
        dataset: { contentId },
        tabindex: '0',
        role: 'button',
        'aria-expanded': 'false'
      }, [
        Utils.createEl('h3', { className: 'text-lg font-semibold', text: t?.title || '' }),
        t?.date ? Utils.createEl('span', { className: 'date-badge', text: Utils.formatDate(t.date) }) : null
      ].filter(Boolean));

      const content = Utils.createEl('div', { id: contentId, className: 'collapsible-content hidden', 'aria-hidden': 'true', style: 'max-height:0; overflow:hidden;' });

      const mediaWrap = Utils.createEl('div', { className: 'mt-3' });
      const media = Utils.createSafeMedia(t?.videoLink || t?.modalMedia || t?.image);
      if (media) mediaWrap.appendChild(media);
      if (mediaWrap.children.length) content.appendChild(mediaWrap);

      content.appendChild(Utils.createEl('p', { className: 'text-medium-text mt-3', text: t?.description || '' }));

      const speakers = Utils.createEl('div', { className: 'mt-3 flex gap-2 flex-wrap' });
      (Array.isArray(t?.speakerIds) ? t.speakerIds : []).forEach(id => {
        const p = personById(id);
        speakers.appendChild(Utils.createEl('a', {
          href: '#',
          className: 'inline-block font-bold text-gray-900 hover:underline',
          dataset: { modalTarget: 'open-person-bio', id },
          text: p ? p.name : String(id)
        }));
      });
      if (speakers.children.length) content.appendChild(speakers);

      if (t?.link) {
        const linkWrap = Utils.createEl('div', { className: 'mt-3' });
        linkWrap.appendChild(Utils.createEl('a', {
          href: Utils.sanitizeUrl(t.link),
          target: '_blank', rel: 'noopener',
          className: 'text-primary font-bold hover:underline',
          text: 'View Link'
        }));
        content.appendChild(linkWrap);
      }

      const card = Utils.createEl('div', { className: 'card rounded-lg p-6' }, [header, content]);
      grid.appendChild(card);
    });
  }

  function renderOutreachNews() {
    const list = DOMElements.outreachNewsList;
    if (!list) return;
    list.replaceChildren();
    const items = resolve(window.outreachNewsData);
    if (!items.length) { list.textContent = 'No dissemination news right now.'; return; }

    items.forEach((n, i) => {
      const li = Utils.createEl('li', { className: 'mb-6' });
      const heading = Utils.createEl('div', { className: 'flex items-center gap-3 mb-2' }, [
        Utils.createEl('h3', { className: 'text-lg font-semibold', text: n?.title || '' }),
        n?.date ? Utils.createEl('span', { className: 'date-badge', text: Utils.formatDate(n.date) }) : null
      ].filter(Boolean));
      const desc = Utils.createEl('p', { className: 'text-medium-text', text: n?.description || '' });
      const btn = Utils.createEl('button', {
        className: 'text-primary font-semibold hover:underline mt-2',
        dataset: { modalTarget: 'open-outreach-news-modal', id: i },
        text: 'Read More →'
      });
      li.append(heading, desc, btn);
      list.appendChild(li);
    });
  }

  function renderAllContent() {
    renderResearchItems();
    renderTeam('team members', window.teamData, DOMElements.teamGrid);
    renderTeam('alumni', window.alumniData, DOMElements.alumniGrid);
    renderNews();
    renderGames();
    renderOutreachTalks();
    renderAcademicPresentations();
    renderOutreachNews();
    renderPublications();
    alog('Renderers invoked for all sections.');
  }

  return { renderAllContent, renderGames };
})();

/* ======================= Carousel ======================= */
const CarouselManager = (() => {
  let currentIndex = 0;
  let slides = [];
  let slideWidth = 0;

  function ensureLayout() {
    const track = DOMElements.newsCarouselTrack;
    if (!track) return;
    const container = track.parentElement;
    if (container) container.style.overflow = 'hidden';
    track.style.display = 'flex';
    track.style.gap = '0';
    track.style.willChange = 'transform';
    track.style.transition = 'transform 300ms ease';
  }

  function updateCarousel() {
    if (!DOMElements.newsCarouselTrack) return;
    ensureLayout();

    slides = Array.from(DOMElements.newsCarouselTrack.children).filter(el => !el.classList.contains('loader'));
    if (!slides.length) return;

    const viewport = DOMElements.newsCarouselTrack.parentElement || DOMElements.newsCarouselTrack;
    const vw = Math.floor(viewport.getBoundingClientRect().width) || 0;

    slides.forEach((s) => {
      s.style.flex = `0 0 ${vw}px`;
      s.style.maxWidth = `${vw}px`;
      s.style.boxSizing = 'border-box';
    });

    slideWidth = vw;
    DOMElements.newsCarouselTrack.style.transform = `translateX(${-slideWidth * currentIndex}px)`;

    const dots = document.getElementById('carousel-dots');
    if (dots) {
      dots.innerHTML = '';
      slides.forEach((_, index) => {
        const dot = document.createElement('button');
        dot.className = `carousel-dot ${index === currentIndex ? 'active' : ''}`;
        dot.setAttribute('role', 'tab');
        dot.setAttribute('aria-selected', index === currentIndex);
        dot.setAttribute('aria-controls', `news-carousel-slide-${index}`);
        dot.setAttribute('aria-label', `Go to slide ${index + 1}`);
        dot.addEventListener('click', () => { currentIndex = index; updateCarousel(); });
        dots.appendChild(dot);
      });
    }

    slides.forEach((slide, index) => {
      slide.id = `news-carousel-slide-${index}`;
      if (index === currentIndex) slide.setAttribute('aria-current', 'true');
      else slide.removeAttribute('aria-current');
    });
  }

  function setupCarousel() {
    alog('Carousel setup start');
    if (!DOMElements.newsCarouselTrack) return;
    ensureLayout();
    updateCarousel();
    DOMElements.carouselPrevBtn && DOMElements.carouselPrevBtn.addEventListener('click', () => {
      currentIndex = (currentIndex - 1 + slides.length) % slides.length; updateCarousel();
    });
    DOMElements.carouselNextBtn && DOMElements.carouselNextBtn.addEventListener('click', () => {
      currentIndex = (currentIndex + 1) % slides.length; updateCarousel();
    });
    DOMElements.newsCarouselTrack.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { currentIndex = (currentIndex - 1 + slides.length) % slides.length; updateCarousel(); }
      else if (e.key === 'ArrowRight') { currentIndex = (currentIndex + 1) % slides.length; updateCarousel(); }
    });
    window.addEventListener('resize', updateCarousel);
  }

  return { setupCarousel, updateCarousel };
})();

/* ======================= Modals ======================= */
const ModalManager = (() => {
  let lastFocused = null;

  function openModal(modalEl, trigger) {
    if (!modalEl) return;
    lastFocused = trigger || document.activeElement;
    modalEl.classList.add('active');
    modalEl.setAttribute('aria-hidden', 'false');
    modalEl.focus?.();
  }
  function closeModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.remove('active');
    modalEl.setAttribute('aria-hidden', 'true');
    if (lastFocused) lastFocused.focus?.();
  }

  const resolvePeople = () => (Array.isArray(window.teamData) ? window.teamData : (window.teamData?.items || []))
    .concat(Array.isArray(window.alumniData) ? window.alumniData : (window.alumniData?.items || []));

  function findPersonById(id){
    const people = resolvePeople();
    return people.find(p => String(p.id) === String(id)) || null;
  }

  function clear(el){ if (el) while (el.firstChild) el.removeChild(el.firstChild); }

  function openPersonBioModal(personId, trigger) {
    try { console.debug('[SMARTBio] openPersonBioModal()', { personId: String(personId) }); } catch {}
    const people = resolvePeople();
    const person = people.find(p => String(p.id) === String(personId));
    if (!person) return;

    const container = DOMElements.modalContainer || document.body;
    const overlay = Utils.createEl('div', { className: 'modal-overlay active', tabindex: '-1', role: 'dialog', 'aria-modal': 'true' });
    const panel = Utils.createEl('div', { className: 'modal-content flex flex-col md:flex-row gap-8 items-center md:items-start' });

    const closeBtn = Utils.createEl('button', { className: 'modal-close', text: '×' });
    panel.appendChild(closeBtn);

    const left = Utils.createEl('div', { className: 'w-full md:w-1/2 flex-shrink-0 flex justify-center md:justify-start' });
    if (person?.image) {
      left.appendChild(Utils.createEl('img', {
        src: Utils.sanitizeUrl(person.image),
        alt: Utils.escapeHTML(person?.name || 'Person'),
        className: 'w-48 h-48 object-cover rounded-full'
      }));
    }

    const right = Utils.createEl('div', { className: 'w-full md:w-1/2' });
    right.appendChild(Utils.createEl('h3', { className: 'text-3xl font-bold text-light-text mb-2', text: person?.name || '' }));
    if (person?.role) right.appendChild(Utils.createEl('p', { className: 'text-medium-text text-sm mb-2', text: person.role }));
    if (person?.bio) right.appendChild(Utils.createEl('p', { className: 'text-medium-text mb-4', text: person.bio }));

    const links = Utils.createEl('div', { className: 'space-x-4 mt-2' });
    const addLink = (label, url) => {
      if (!url) return;
      links.appendChild(Utils.createEl('a', {
        href: Utils.sanitizeUrl(url), target: '_blank', rel: 'noopener',
        className: 'text-primary font-bold hover:underline', text: label
      }));
    };
    addLink('Website', person?.website);
    addLink('Scholar', Utils.normalizeScholarUrl(person?.googleScholar));

    const norm = v => String(v).trim().toLowerCase();
    const extractIds = (item) => {
      const pools = [
        item && item.speakerIds, item && item.presenterIds,
        item && item.presenters, item && item.speakers,
        item && item.associatedTeamMembers, item && item.teamMembers
      ];
      return pools.flatMap(arr => Array.isArray(arr) ? arr : []).map(x => String(x)).filter(Boolean);
    };
    const extractNames = (item) => {
      const pools = [
        item && item.speakerNames, item && item.presenterNames,
        item && item.speakers, item && item.presenters,
      ];
      return pools.flatMap(arr => Array.isArray(arr) ? arr : (typeof arr === 'string' ? [arr] : [])).map(norm).filter(Boolean);
    };

    (function buildTalksAndPresentations(){
      const pid = String(personId);
      const asArr = v => (Array.isArray(v) ? v : ((v && v.items) || []));
      const talksAll = asArr(window.outreachTalksData);
      const presAll  = asArr(window.academicPresentationsData);

      try { console.debug('[SMARTBio] T&P seed', { pid, talksLen: talksAll.length, presLen: presAll.length }); } catch {}

      if (!talksAll.length && !presAll.length && !window.researchHubInitialized) {
        const ph = Utils.createEl('p', { className:'text-sm text-medium-text', text:'Loading talks & presentations…' });
        right.appendChild(ph);
        (function wait(){
          if (window.researchHubInitialized) { ph.remove(); buildTalksAndPresentations(); }
          else setTimeout(wait, 150);
        })();
        return;
      }

      const ids = (v) => (Array.isArray(v) ? v : []).map(x => String(x)).filter(Boolean);
      const talkMatches = talksAll.filter(it => ids(it.speakerIds).includes(pid));
      const presMatches = presAll.filter(it => ids(it.speakerIds).includes(pid));

      if (!talkMatches.length && !presMatches.length) return;

      right.appendChild(Utils.createEl('h4', { className:'text-xl font-semibold mt-6 mb-2', text:'Talks & Presentations' }));
      const listWrap = Utils.createEl('div', { className:'space-y-1' });

      talkMatches.forEach(item => {
        const idx = talksAll.indexOf(item);
        if (idx > -1) listWrap.appendChild(Utils.createEl('a', {
          href:'#', className:'block text-primary font-bold hover:underline',
          dataset:{ modalTarget:'open-outreach-talk-modal', id:String(idx) },
          text: item.title || 'View Outreach Talk'
        }));
      });

      presMatches.forEach(item => {
        const idx = presAll.indexOf(item);
        if (idx > -1) listWrap.appendChild(Utils.createEl('a', {
          href:'#', className:'block text-primary font-bold hover:underline',
          dataset:{ modalTarget:'open-academic-presentation-modal', id:String(idx) },
          text: item.title || 'View Presentation'
        }));
      });

      right.appendChild(listWrap);
    })();

    (function buildPersonNews(){
      const norm = v => String(v).trim().toLowerCase();
      const pid  = String(personId);
      const pname = norm(person?.name || '');

      const extractIds = (item) => {
        const pools = [item?.associatedTeamMembers, item?.teamMembers, item?.authors, item?.contributors];
        return pools.flatMap(a => Array.isArray(a) ? a : []).map(String).filter(Boolean);
      };
      const extractNames = (item) => {
        const pools = [item?.authorNames, item?.contributorNames, item?.authors, item?.contributors];
        return pools.flatMap(a => Array.isArray(a) ? a : (typeof a === 'string' ? [a] : [])).map(norm).filter(Boolean);
      };

      const newsAll = Array.isArray(window.newsData) ? window.newsData : (window.newsData?.items || []);
      const outreachNewsAll = Array.isArray(window.outreachNewsData) ? window.outreachNewsData : (window.outreachNewsData?.items || []);

      if (!newsAll.length && !outreachNewsAll.length && !window.smartbioDataReady) {
        const ph = Utils.createEl('p', { className:'text-sm text-medium-text', text:'Loading news…' });
        right.appendChild(ph);
        const handler = () => { document.removeEventListener('smartbio:data-ready', handler); ph.remove(); buildPersonNews(); };
        document.addEventListener('smartbio:data-ready', handler, { once:true });
        return;
      }
      if (!newsAll.length && !outreachNewsAll.length) return;

      const matches = (it) => {
        const ids = extractIds(it), names = extractNames(it);
        return ids.some(id => String(id) === pid) || names.some(n => n === pname);
      };

      const personNews = newsAll.filter(matches);
      const personOutreachNews = outreachNewsAll.filter(matches);

      if (!personNews.length && !personOutreachNews.length) return;

      right.appendChild(Utils.createEl('h4', { className:'text-xl font-semibold mt-6 mb-2', text:'News' }));
      const nWrap = Utils.createEl('div', { className:'space-y-1' });

      personNews.forEach(item => {
        let idx = newsAll.indexOf(item);
        if (idx === -1) idx = newsAll.findIndex(x => String(x.id)===String(item.id) || x.title===item.title);
        if (idx > -1) nWrap.appendChild(Utils.createEl('a', {
          href:'#', className:'block text-primary font-bold hover:underline',
          dataset:{ modalTarget:'open-news-modal', id:String(idx) },
          text: item.title || 'View News'
        }));
      });

      personOutreachNews.forEach(item => {
        let idx = outreachNewsAll.indexOf(item);
        if (idx === -1) idx = outreachNewsAll.findIndex(x => String(x.id)===String(item.id) || x.title===item.title);
        if (idx > -1) nWrap.appendChild(Utils.createEl('a', {
          href:'#', className:'block text-primary font-bold hover:underline',
          dataset:{ modalTarget:'open-outreach-news-modal', id:String(idx) },
          text: item.title || 'View Outreach News'
        }));
      });

      right.appendChild(nWrap);
    })();

    window.SMARTBioPersonModalReady = () => { try { buildTalksAndPresentations(); } catch {} };

    panel.append(left, right);
    overlay.appendChild(panel);
    container.appendChild(overlay);
    openModal(overlay, trigger);
  }

  function openResearchDescriptionModal(item, trigger) {
    const m = DOMElements.researchDescriptionModal;
    if (!m) return;

    clear(DOMElements.researchModalMedia);
    const media = Utils.createSafeMedia(item?.modalMedia || item?.image);
    if (media) DOMElements.researchModalMedia.appendChild(media);

    if (DOMElements.researchModalCaption) DOMElements.researchModalCaption.textContent = item?.modalMediaCaption || '';

    if (DOMElements.researchModalCredit) {
      let credit = '';
      if (item?.modalMediaCreditId != null) {
        const p = resolvePeople().find(pp => String(pp.id) === String(item.modalMediaCreditId));
        credit = 'Credit: ' + (p ? p.name : String(item.modalMediaCreditId));
      }
      DOMElements.researchModalCredit.textContent = credit;
    }

    if (DOMElements.researchModalTitle) DOMElements.researchModalTitle.textContent = item?.title || '';
    if (DOMElements.researchModalDescription) DOMElements.researchModalDescription.textContent = item?.description || '';

    if (DOMElements.researchModalTeamMembers) {
      const wrap = DOMElements.researchModalTeamMembers;
      wrap.replaceChildren();
      const members = Array.isArray(item?.teamMembers) ? item.teamMembers : [];
      members.forEach((id, idx) => {
        const p = resolvePeople().find(pp => String(pp.id) === String(id));
        if (idx > 0) wrap.appendChild(document.createTextNode(' · '));
        wrap.appendChild(Utils.createEl('a', {
          href: '#',
          className: 'inline-block font-bold text-gray-900 hover:underline',
          dataset: { modalTarget: 'open-person-bio', id },
          text: p ? p.name : String(id)
        }));
      });
    }

    openModal(m, trigger);
  }

  function openNewsModal(index, trigger){
    var items = Array.isArray(window.newsData) ? window.newsData : (window.newsData && window.newsData.items) || [];
    var n = items[index]; if (!n) return;

    var m = DOMElements.newsDescriptionModal;
    if (m){
      var tEl = m.querySelector('#news-modal-title'),
          dEl = m.querySelector('#news-modal-date'),
          pEl = m.querySelector('#news-modal-description'),
          img = m.querySelector('#news-modal-image');

      if (tEl) tEl.textContent = n.title || '';
      if (dEl) dEl.textContent = Utils.formatDate(n.date) || '';
      if (pEl) pEl.textContent = n.description || '';
      if (img && n.image){ img.src = Utils.sanitizeUrl(n.image); img.alt = Utils.escapeHTML(n.title || 'News Image'); }
      var content = m.querySelector && m.querySelector('.modal-content');
      if (content){ content.style.maxHeight='90vh'; content.style.overflowY='auto'; content.style.webkitOverflowScrolling='touch'; }
      return ModalManager.openModal(m, trigger);
    }

    var container = DOMElements.modalContainer || document.body;
    var overlay = Utils.createEl('div', { className:'modal-overlay active', tabindex:'-1', role:'dialog', 'aria-modal':'true' });
    var panel   = Utils.createEl('div', { className:'modal-content' });

    var closeBtn = Utils.createEl('button', { className:'modal-close', text:'×' }); panel.appendChild(closeBtn);
    var header = Utils.createEl('div', { className:'flex items-center gap-3 mb-3' }, [
      Utils.createEl('h3', { className:'text-2xl font-bold', text: n.title || '' }),
      n.date ? Utils.createEl('span', { className:'date-badge', text: Utils.formatDate(n.date) }) : null
    ].filter(Boolean));
    panel.appendChild(header);

    if (n.image) panel.appendChild(Utils.createEl('img', {
      src: Utils.sanitizeUrl(n.image), alt: Utils.escapeHTML(n.title || 'News Image'),
      className: 'w-full h-auto rounded-md object-cover border border-primary-dark mb-3'
    }));
    if (n.description) panel.appendChild(Utils.createEl('p', { className:'text-medium-text', text: n.description }));

    overlay.appendChild(panel); container.appendChild(overlay);
    panel.style.maxHeight='90vh'; panel.style.overflowY='auto'; panel.style.webkitOverflowScrolling='touch';
    ModalManager.openModal(overlay, trigger);
  }

  function openOutreachTalkModal(index, trigger){
    const items = Array.isArray(window.outreachTalksData)
      ? window.outreachTalksData
      : (window.outreachTalksData && window.outreachTalksData.items) || [];
    const t = items[index]; if (!t) return;

    const m = DOMElements.outreachTalkDescriptionModal;
    if (m){
      const te = m.querySelector('#outreach-talk-modal-title');
      const de = m.querySelector('#outreach-talk-modal-date');
      const pe = m.querySelector('#outreach-talk-modal-description');
      const mediaWrap = m.querySelector('#outreach-talk-modal-media');
      const speakers  = m.querySelector('#outreach-talk-modal-speakers');
      const linkWrap  = m.querySelector('#outreach-talk-modal-link');

      if (te) te.textContent = t.title || '';
      if (de) de.textContent = Utils.formatDate(t.date) || '';
      if (pe) pe.textContent = t.description || '';

      if (mediaWrap){
        mediaWrap.replaceChildren();
        const media = Utils.createSafeMedia(t.videoLink || t.modalMedia || t.image);
        if (media) mediaWrap.appendChild(media);
      }

      if (speakers){
        speakers.replaceChildren();
        (Array.isArray(t.speakerIds) ? t.speakerIds : []).forEach(id => {
          const p = findPersonById(id);
          speakers.appendChild(Utils.createEl('a', {
            href:'#', className:'inline-block font-bold text-gray-900 hover:underline',
            dataset:{ modalTarget:'open-person-bio', id }, text: p ? p.name : String(id)
          }));
        });
      }

      if (linkWrap){
        linkWrap.replaceChildren();
        if (t.link){
          linkWrap.appendChild(Utils.createEl('a', {
            href: Utils.sanitizeUrl(t.link), target:'_blank', rel:'noopener',
            className:'text-primary font-bold hover:underline', text:'View Link'
          }));
        }
      }

      const content = m.querySelector('.modal-content');
      if (content){ content.style.maxHeight='90vh'; content.style.overflowY='auto'; content.style.webkitOverflowScrolling='touch'; }
      return openModal(m, trigger);
    }

    const container = DOMElements.modalContainer || document.body;
    const overlay = Utils.createEl('div', { className:'modal-overlay active', tabindex:'-1', role:'dialog', 'aria-modal':'true' });
    const panel   = Utils.createEl('div', { className:'modal-content' });

    panel.appendChild(Utils.createEl('button', { className:'modal-close', text:'×' }));
    panel.appendChild(Utils.createEl('div', { className:'flex items-center gap-3 mb-3' }, [
      Utils.createEl('h3', { className:'text-2xl font-bold', text: t.title || '' }),
      t.date ? Utils.createEl('span', { className:'date-badge', text: Utils.formatDate(t.date) }) : null
    ].filter(Boolean)));

    const media = Utils.createSafeMedia(t.videoLink || t.modalMedia || t.image);
    if (media) panel.appendChild(media);
    if (t.description) panel.appendChild(Utils.createEl('p', { className:'text-medium-text mt-3', text: t.description }));

    if (Array.isArray(t.speakerIds) && t.speakerIds.length){
      const wrap = Utils.createEl('div', { className:'mt-3 flex gap-2 flex-wrap' });
      t.speakerIds.forEach(id => {
        const p = findPersonById(id);
        wrap.appendChild(Utils.createEl('a', {
          href:'#', className:'inline-block font-bold text-gray-900 hover:underline',
          dataset:{ modalTarget:'open-person-bio', id }, text: p ? p.name : String(id)
        }));
      });
      panel.appendChild(wrap);
    }

    overlay.appendChild(panel); container.appendChild(overlay);
    panel.style.maxHeight='90vh'; panel.style.overflowY='auto'; panel.style.webkitOverflowScrolling='touch';
    openModal(overlay, trigger);
  }

  function openOutreachNewsModal(index, trigger) {
    const items = Array.isArray(window.outreachNewsData) ? window.outreachNewsData : (window.outreachNewsData && window.outreachNewsData.items) || [];
    const n = items[index];
    if (!n) return;

    const container = DOMElements.modalContainer || document.body;
    const overlay = Utils.createEl('div', { className: 'modal-overlay active', tabindex: '-1', role: 'dialog', 'aria-modal': 'true' });
    const panel = Utils.createEl('div', { className: 'modal-content' });

    const closeBtn = Utils.createEl('button', { className: 'modal-close', text: '×' });
    panel.appendChild(closeBtn);

    const header = Utils.createEl('div', { className: 'flex items-center gap-3 mb-3' }, [
      Utils.createEl('h3', { className: 'text-2xl font-bold', text: n?.title || '' }),
      n?.date ? Utils.createEl('span', { className: 'date-badge', text: Utils.formatDate(n.date) }) : null
    ].filter(Boolean));
    panel.appendChild(header);

    if (n?.image) {
      panel.appendChild(Utils.createEl('img', {
        src: Utils.sanitizeUrl(n.image),
        alt: Utils.escapeHTML(n?.title || 'Outreach News Image'),
        className: 'w-full h-auto rounded-md object-cover border border-primary-dark mb-3'
      }));
    }

    if (n?.description) {
      panel.appendChild(Utils.createEl('p', { className: 'text-medium-text mb-3', text: n.description }));
    }

    if (Array.isArray(n?.associatedTeamMembers) && n.associatedTeamMembers.length) {
      const people = resolvePeople();
      const wrap = Utils.createEl('div', { className: 'mt-2 flex flex-wrap gap-2' });
      n.associatedTeamMembers.forEach(id => {
        const p = people.find(pp => String(pp.id) === String(id));
        wrap.appendChild(Utils.createEl('a', {
          href: '#',
          className: 'inline-block font-bold text-gray-900 hover:underline',
          dataset: { modalTarget: 'open-person-bio', id },
          text: p ? p.name : String(id)
        }));
      });
      panel.appendChild(wrap);
    }

    overlay.appendChild(panel);
    container.appendChild(overlay);
    openModal(overlay, trigger);
  }

  function openAcademicPresentationModal(index, trigger){
    var items = Array.isArray(window.academicPresentationsData) ? window.academicPresentationsData
                : (window.academicPresentationsData && window.academicPresentationsData.items) || [];
    var t = items[index]; if (!t) return;
    var container = DOMElements.modalContainer || document.body;
    var overlay = Utils.createEl('div', { className:'modal-overlay active', tabindex:'-1', role:'dialog', 'aria-modal':'true' });
    var panel   = Utils.createEl('div', { className:'modal-content' });

    var closeBtn = Utils.createEl('button', { className:'modal-close', text:'×' });
    panel.appendChild(closeBtn);
    var header = Utils.createEl('div', { className:'flex items-center gap-3 mb-3' }, [
      Utils.createEl('h3', { className:'text-2xl font-bold', text: t.title || '' }),
      t.date ? Utils.createEl('span', { className:'date-badge', text: Utils.formatDate(t.date) }) : null
    ].filter(Boolean));
    panel.appendChild(header);

    var media = Utils.createSafeMedia(t.videoLink || t.modalMedia || t.image);
    if (media){ panel.appendChild(media); }

    if (t.description){ panel.appendChild(Utils.createEl('p', { className:'text-medium-text mt-3', text: t.description })); }

    if (Array.isArray(t.speakerIds) && t.speakerIds.length){
      var wrap = Utils.createEl('div', { className:'mt-3 flex gap-2 flex-wrap' });
      t.speakerIds.forEach(function(id){
        var p = (typeof findPersonById === 'function') ? findPersonById(id) : null;
        wrap.appendChild(Utils.createEl('a', {
          href:'#', className:'inline-block font-bold text-gray-900 hover:underline',
          dataset:{ modalTarget:'open-person-bio', id:id }, text: p ? p.name : String(id)
        }));
      });
      panel.appendChild(wrap);
    }

    if (t.link){ panel.appendChild(Utils.createEl('a', {
      href: Utils.sanitizeUrl(t.link), target:'_blank', rel:'noopener',
      className:'text-primary font-bold hover:underline mt-3 inline-block', text:'View Link'
    })); }

    overlay.appendChild(panel); (DOMElements.modalContainer || document.body).appendChild(overlay);
    panel.style.maxHeight='90vh'; panel.style.overflowY='auto'; panel.style.webkitOverflowScrolling='touch';
    ModalManager.openModal(overlay, trigger);
  }

  function handleModalClicks(e) {
    const t = e.target;

    const closeBtn = t.closest && t.closest('.modal-close');
    if (closeBtn) {
      const overlay = closeBtn.closest('.modal-overlay');
      if (overlay) closeModal(overlay);
      return;
    }
    if (t.classList && t.classList.contains('modal-overlay')) {
      closeModal(t);
      return;
    }

    const trigger = t.closest('[data-modal-target]') || t.closest('.open-modal-btn');
    if (!trigger) return;
    if (trigger.tagName === 'A') e.preventDefault();

    let action = trigger.dataset.modalTarget;
    let id = trigger.dataset.id;
    if (trigger.classList.contains('open-modal-btn') && !id) {
      id = action;
      action = 'open-person-bio';
    }

    switch (action) {
      case 'open-person-bio': return openPersonBioModal(id, trigger);
      case 'open-research-modal': {
        const items = Array.isArray(window.researchData) ? window.researchData : (window.researchData && window.researchData.items) || [];
        const item = items.find(x => String(x.id) === String(id)) || items.find(x => String(x.title) === String(id));
        if (item) openResearchDescriptionModal(item, trigger);
        return;
      }
      case 'open-news-modal': return openNewsModal(Number(id), trigger);
      case 'open-outreach-news-modal': return openOutreachNewsModal(Number(id), trigger);
      case 'open-outreach-talk-modal': return openOutreachTalkModal(Number(id), trigger);
      case 'open-academic-presentation-modal': return openAcademicPresentationModal(Number(id), trigger);
      default: return;
    }
  }

  return {
    openNewsModal, openOutreachTalkModal, openAcademicPresentationModal,
    openResearchDescriptionModal, openPersonBioModal, openOutreachNewsModal,
    handleModalClicks, openModal, closeModal
  };
})();

/* ======================= Navigation ======================= */
const NavigationManager = (() => {

  // Canonical list of valid page IDs — used to validate hashes from the URL
  // so arbitrary fragment values (e.g. from anchor links inside content) are ignored.
  const VALID_PAGES = new Set([
    'home', 'research', 'publications', 'team', 'news', 'outreach', 'contact', 'privacy'
  ]);

  // Normalise a raw hash string ('#team', 'team', '', etc.) to a valid page ID.
  // Falls back to 'home' for anything unrecognised.
  function hashToPageId(hash) {
    const raw = (hash || '').replace(/^#/, '').toLowerCase().trim();
    return VALID_PAGES.has(raw) ? raw : 'home';
  }

  function showPage(pageId, { pushState = true } = {}) {
    alog('showPage()', { pageId, hash: window.location.hash, pushState });

    // ── 1. Update the URL hash (without triggering a page reload) ──────────
    // We only push a new history entry when the navigation is user-initiated.
    // When showPage is called in response to a popstate event we pass
    // pushState:false so we don't double-stack the entry.
    const targetHash = '#' + pageId;
    if (pushState) {
      if (window.location.hash !== targetHash) {
        history.pushState({ pageId }, '', targetHash);
        alog('pushState →', targetHash);
      }
    } else {
      // Fired from popstate — just keep the URL the browser already set.
      alog('replaceState (popstate) →', targetHash);
    }

    // ── 2. Show / hide page sections ────────────────────────────────────────
    DOMElements.pageSections.forEach(section => {
      const isActive = section.id === pageId + '-page';
      section.classList.toggle('active', isActive);

      if (isActive) {
        section.style.overflowY = 'auto';
        section.style.overflowX = 'visible';
        section.style.height = 'auto';
        section.style.maxHeight = 'none';
      } else {
        section.style.overflow = '';
        section.style.height = '';
        section.style.maxHeight = '';
        const fadeInContent = section.querySelector('.fade-in-section');
        if (fadeInContent) fadeInContent.classList.remove('is-visible');
      }
    });

    // ── 3. Update nav link active states ────────────────────────────────────
    DOMElements.navLinks.forEach(link => {
      const isActive = link.hash === targetHash;
      link.classList.toggle('active', isActive);
      if (isActive) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });

    // ── 4. Fade-in animation for the active page ─────────────────────────────
    const activePageContent = document.querySelector('.page-section.active .fade-in-section');
    if (activePageContent) setTimeout(() => activePageContent.classList.add('is-visible'), 100);

    // ── 5. Scroll to top of page on each navigation ─────────────────────────
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // ── 6. Home branch: init / resize the 3D Research Hub ───────────────────
    const homeResearchHubSection = document.getElementById('home-research-hub-section');
    const researchCanvasContainer = document.getElementById('research-canvas-container');
    const researchCanvas = document.getElementById('research-canvas');

    if (pageId === 'home') {
      alog('Home branch entry', {
        hasSection: !!homeResearchHubSection,
        hasContainer: !!researchCanvasContainer,
        hasCanvas: !!researchCanvas,
        hasTHREE: typeof window.THREE,
        hasInitFn: typeof window.initResearchHub,
        alreadyInitialized: !!window.researchHubInitialized
      });

      if (researchCanvas) {
        const rect = researchCanvas.getBoundingClientRect();
        alog('Canvas rect', { width: rect.width, height: rect.height });
        if (rect.width === 0 || rect.height === 0) {
          warn('Canvas has zero size — likely hidden or container width=0 at this moment.');
        }
      }

      if (!window.researchHubInitialized) {
        const dataReady = {
          research: Array.isArray(window.researchData),
          news:     Array.isArray(window.newsData),
          team:     Array.isArray(window.teamData),
          games:    Array.isArray(window.gamesData)
        };
        alog('Data readiness for hub init', dataReady);

        if (homeResearchHubSection && researchCanvasContainer && typeof window.initResearchHub === 'function') {
          if (dataReady.research && dataReady.news && dataReady.team && dataReady.games) {
            setTimeout(() => {
              try {
                alog('Calling initResearchHub (full args)');
                window.initResearchHub(
                  window.researchData, window.newsData, window.teamData,
                  window.gamesData, window.outreachTalksData,
                  window.academicPresentationsData, window.alumniData
                );
                alog('initResearchHub returned');
                window.researchHubInitialized = true;
              } catch (e) {
                err('initResearchHub threw', e);
              }
            }, 50);
          } else {
            warn('Skipping init: data not ready yet', dataReady);
          }
        } else {
          warn('Skipping init: missing section/container or init fn', {
            hasSection: !!homeResearchHubSection,
            hasContainer: !!researchCanvasContainer,
            hasInitFn: typeof window.initResearchHub
          });
        }
      } else {
        alog('Hub already initialized; attempting resize');
        if (researchCanvas && researchCanvasContainer && window.camera && window.renderer) {
          try {
            window.camera.aspect = researchCanvasContainer.clientWidth / 600;
            window.camera.updateProjectionMatrix();
            window.renderer.setSize(researchCanvasContainer.clientWidth, 600);
            window.renderer.render(window.scene, window.camera);
            alog('Resize complete', { width: researchCanvasContainer.clientWidth });
          } catch (e) {
            err('Resize failed', e);
          }
        }
      }
    }

    // ── 7. Privacy page: load markdown ──────────────────────────────────────
    if (pageId === 'privacy' && DOMElements.privacyNoticeContent) {
      alog('Loading privacyNotice.md');
      fetch('privacyNotice.md')
        .then(response => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.text();
        })
        .then(markdown => {
          if (typeof marked !== 'undefined') {
            DOMElements.privacyNoticeContent.innerHTML = marked.parse(markdown);
            alog('Privacy markdown rendered with marked');
          } else {
            err('marked.js is not loaded; showing fallback');
            DOMElements.privacyNoticeContent.innerHTML = '<p class="text-red-500">Markdown parser not loaded.</p>';
          }
        })
        .catch(error => {
          err('Error loading privacy notice', error);
          DOMElements.privacyNoticeContent.innerHTML = '<p class="text-red-500">Failed to load privacy notice.</p>';
        });
    }
  }

  // Handles clicks on <a href="#section"> nav links
  function handleNavClick(e) {
    e.preventDefault();
    const pageId = hashToPageId(e.currentTarget.hash);
    showPage(pageId, { pushState: true });
    // Close mobile menu if open
    if (DOMElements.mobileMenu && !DOMElements.mobileMenu.classList.contains('hidden')) {
      DOMElements.mobileMenu.classList.add('hidden');
      DOMElements.mobileMenuButton.setAttribute('aria-expanded', 'false');
    }
  }

  // Handles browser back / forward button presses
  function handlePopState(e) {
    // e.state is set by our pushState calls; fall back to reading the hash directly
    const pageId = (e.state && e.state.pageId) ? e.state.pageId : hashToPageId(window.location.hash);
    alog('popstate →', pageId, e.state);
    showPage(pageId, { pushState: false });
  }

  // Set up the popstate listener once
  function setupPopState() {
    window.addEventListener('popstate', handlePopState);
  }

  return { showPage, handleNavClick, setupPopState, hashToPageId };
})();

/* ======================= GDPR ======================= */
const GDPRManager = (() => {
  function setupGDPRBanner() {
    const banner = document.getElementById('gdpr-consent-banner');
    if (!banner) return;
    const btn = document.getElementById('accept-cookies-btn');
    const KEY = 'smartbio_gdpr_consent';
    if (localStorage.getItem(KEY) === '1') return;
    banner.style.display = 'flex';
    btn && btn.addEventListener('click', () => {
      localStorage.setItem(KEY, '1');
      banner.style.display = 'none';
    });
  }
  return { setupGDPRBanner };
})();

/* ======================= Scroll & Collapsible ======================= */
const ScrollManager = (() => {
  function setupScrollToTop() {
    const b = DOMElements.scrollToTopBtn;
    if (!b) return;
    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) b.classList.add('show');
      else b.classList.remove('show');
    });
    b.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }
  return { setupScrollToTop };
})();

const CollapsibleManager = (() => {
  function resolveContentForHeader(h) {
    if (!h) return null;
    const id =
      h.getAttribute('data-content-id') ||
      h.getAttribute('data-target-id') ||
      h.getAttribute('aria-controls');
    let content = null;
    if (id) content = document.getElementById(id);
    if (!content) {
      content = h.nextElementSibling && h.nextElementSibling.classList?.contains('collapsible-content')
        ? h.nextElementSibling
        : h.parentElement?.querySelector?.('.collapsible-content');
    }
    return content;
  }

  function setExpandedState(h, content, expand) {
    h.setAttribute('aria-expanded', String(expand));
    if (!content) return;

    content.classList.toggle('hidden', !expand);
    content.classList.toggle('open', !!expand);

    if (expand) {
      content.style.maxHeight = content.scrollHeight + 'px';
      content.style.overflow = 'visible';
      setTimeout(() => { if (content.classList.contains('open')) content.style.maxHeight = 'none'; }, 250);
      content.querySelectorAll('img,iframe,video').forEach(el => {
        el.addEventListener('load', () => {
          if (content.classList.contains('open')) content.style.maxHeight = 'none';
        }, { once: true });
      });
    } else {
      content.style.maxHeight = '0';
      content.style.overflow = 'hidden';
    }
  }

  function toggle(h) {
    if (!h) return;
    const content = resolveContentForHeader(h);
    const isExpanded = h.getAttribute('aria-expanded') === 'true';
    setExpandedState(h, content, !isExpanded);
  }

  function setupCollapsibleSections() {
    document.querySelectorAll('.collapsible-header').forEach(h => {
      const content = resolveContentForHeader(h);
      const isExpanded = h.getAttribute('aria-expanded') === 'true';
      h.setAttribute('role', h.getAttribute('role') || 'button');
      h.setAttribute('tabindex', h.getAttribute('tabindex') || '0');
      setExpandedState(h, content, !!isExpanded);
    });

    document.addEventListener('click', (e) => {
      const header = e.target.closest?.('.collapsible-header');
      if (header) toggle(header);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const header = e.target.closest?.('.collapsible-header');
      if (header) { e.preventDefault(); toggle(header); }
    });
  }

  return { setupCollapsibleSections };
})();

(function hookPersonModalOnce(){
  function patch(){
    if (typeof window.openPersonBioModal !== 'function') { setTimeout(patch, 100); return; }
    const orig = window.openPersonBioModal;
    window.openPersonBioModal = function patchedOpenPersonBioModal(){
      const ret = orig.apply(this, arguments);
      try { if (typeof window.SMARTBioPersonModalReady === 'function') window.SMARTBioPersonModalReady(); } catch {}
      try { console.debug('[SMARTBio] patched openPersonBioModal called'); } catch {}
      return ret;
    };
  }
  patch();
})();

/* ======================= Game Filter ======================= */
const GameFilter = (() => {
  let active = new Set();

  function allThemes() {
    const items = Array.isArray(window.gamesData) ? window.gamesData : (window.gamesData?.items || []);
    const s = new Set();
    items.forEach(g => {
      const raw = g?.themes ?? g?.theme;
      if (Array.isArray(raw)) raw.forEach(t => t && s.add(String(t)));
      else if (raw) s.add(String(raw));
    });
    return Array.from(s).sort();
  }

  function renderChips() {
    const wrap = DOMElements.gameFilters;
    if (!wrap) return;
    wrap.querySelectorAll('[data-theme]').forEach(el => el.remove());
    GameFilter.allThemes().forEach(th => {
      wrap.appendChild(Utils.createEl('button', {
        className: 'filter-btn bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-full text-sm transition duration-300',
        text: th,
        dataset: { theme: th }
      }));
    });
  }

  function toggle(theme) {
    if (active.has(theme)) active.delete(theme); else active.add(theme);
    const wrap = DOMElements.gameFilters;
    if (wrap) wrap.querySelectorAll('[data-theme]').forEach(b => {
      b.classList.toggle('active', active.has(b.dataset.theme));
      b.setAttribute('aria-pressed', String(active.has(b.dataset.theme)));
    });
    if (Renderer && typeof Renderer.renderGames === 'function') Renderer.renderGames();
  }

  function setup() {
    const wrap = DOMElements.gameFilters;
    if (!wrap) return;
    renderChips();
    wrap.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-theme]');
      if (!btn) return;
      e.preventDefault();
      toggle(btn.dataset.theme);
    });
  }

  function getActiveThemes() { return new Set(active); }

  return { allThemes, setup, getActiveThemes };
})();

/* ======================= App ======================= */
const App = (() => {
  function setupEventListeners() {
    document.addEventListener('click', ModalManager.handleModalClicks);
    DOMElements.navLinks.forEach(link => link.addEventListener('click', NavigationManager.handleNavClick));
    DOMElements.navLinkHeader && DOMElements.navLinkHeader.addEventListener('click', NavigationManager.handleNavClick);
    ScrollManager.setupScrollToTop();
    CollapsibleManager.setupCollapsibleSections();
    GDPRManager.setupGDPRBanner();
    GameFilter.setup();
    document.querySelectorAll('#publication-filters .filter-btn')
      .forEach(btn => {
        btn.addEventListener('click', () => {
          activePublicationFilter = btn.dataset.filter;
          document.querySelectorAll('#publication-filters .filter-btn')
            .forEach(b => b.classList.remove('active'));

          btn.classList.add('active');
          Renderer.renderAllContent();
    });
  });

    if (DOMElements.mobileMenuButton && DOMElements.mobileMenu) {
      DOMElements.mobileMenuButton.addEventListener('click', () => {
        const expanded = DOMElements.mobileMenuButton.getAttribute('aria-expanded') === 'true';
        DOMElements.mobileMenuButton.setAttribute('aria-expanded', String(!expanded));
        DOMElements.mobileMenu.classList.toggle('hidden');
      });
    }
  }

  function init() {
    if (DOMElements.yearSpan) DOMElements.yearSpan.textContent = new Date().getFullYear();

    // Set up back/forward button support before any navigation occurs
    NavigationManager.setupPopState();

    DataManager.fetchAllData().then(() => {
      // Read the hash from the URL so direct links and page refreshes work.
      // Replace the initial history entry so that pressing back from the first
      // page doesn't take the user to a blank #hash-less URL.
      const initial = NavigationManager.hashToPageId(window.location.hash);
      history.replaceState({ pageId: initial }, '', '#' + initial);
      alog('App init → initial page:', initial);

      NavigationManager.showPage(initial, { pushState: false });
      CarouselManager.setupCarousel();
      setupEventListeners();
    });
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);

/* ======================= Expose globals (for inline handlers) ======================= */
Object.assign(window, {
  ModalManager,
  openAcademicPresentationModal: ModalManager.openAcademicPresentationModal,
  openOutreachTalkModal: ModalManager.openOutreachTalkModal,
  openOutreachNewsModal: ModalManager.openOutreachNewsModal,
  openNewsModal: ModalManager.openNewsModal,
  openPersonBioModal: ModalManager.openPersonBioModal,
  openResearchDescriptionModal: ModalManager.openResearchDescriptionModal
});

document.addEventListener('DOMContentLoaded', () => {
  if (window.particlesJS) {
    particlesJS.load('particles-js', './assets/js/particles.json', function() {});
  } else {
    console.warn('particlesJS not found');
  }
});

/* ===== SMARTBio: Person Bio augment (CSP-safe, strict) ===== */
(function SMARTBioPersonAugment(){
  if (window.__sbPersonAugmentHooked) return;
  window.__sbPersonAugmentHooked = true;

  const log = (...a) => { try { console.debug('[SMARTBio:augment]', ...a); } catch{} };
  const normIds = (arr) => (Array.isArray(arr) ? arr : []).map(v => String(v)).filter(Boolean);

  function appendTalksAndPresentations(personId, container) {
    const pid = String(personId);
    const asArr = v => (Array.isArray(v) ? v : ((v && v.items) || []));
    const talksAll = asArr(window.outreachTalksData);
    const presAll  = asArr(window.academicPresentationsData);

    log('seed', { pid, talksLen: talksAll.length, presLen: presAll.length });

    const talkMatches = talksAll.filter(it => normIds(it.speakerIds).includes(pid));
    const presMatches = presAll.filter(it => normIds(it.speakerIds).includes(pid));

    log('matches', { talks: talkMatches.length, pres: presMatches.length });

    if (!talkMatches.length && !presMatches.length) return;

    const h = document.createElement('h4');
    h.className = 'text-xl font-semibold mt-6 mb-2';
    h.textContent = 'Talks & Presentations';
    container.appendChild(h);

    const wrap = document.createElement('div');
    wrap.className = 'space-y-1';

    talkMatches.forEach(item => {
      const idx = talksAll.indexOf(item);
      if (idx > -1) {
        const a = document.createElement('a');
        a.href = '#';
        a.className = 'block text-primary font-bold hover:underline';
        a.dataset.modalTarget = 'open-outreach-talk-modal';
        a.dataset.id = String(idx);
        a.textContent = item.title || 'View Outreach Talk';
        wrap.appendChild(a);
      }
    });

    presMatches.forEach(item => {
      const idx = presAll.indexOf(item);
      if (idx > -1) {
        const a = document.createElement('a');
        a.href = '#';
        a.className = 'block text-primary font-bold hover:underline';
        a.dataset.modalTarget = 'open-academic-presentation-modal';
        a.dataset.id = String(idx);
        a.textContent = item.title || 'View Presentation';
        wrap.appendChild(a);
      }
    });

    container.appendChild(wrap);
  }

  function findRightColumn(modalEl) {
    return modalEl.querySelector('#person-modal-right, #research-modal-content-text, .modal-content > div:last-child') || modalEl;
  }

  function getPersonIdFromTarget(t) {
    const el = t.closest('[data-modal-target]');
    if (!el) return null;
    const id = el.getAttribute('data-modal-target');
    return id ? String(id) : null;
  }

  function augmentOpenModal(personId) {
    const active = document.querySelector('#modal-container .modal-overlay.active .modal-content');
    if (!active) { log('no active modal to augment'); return; }
    const right = findRightColumn(active);
    appendTalksAndPresentations(personId, right);
  }

  document.addEventListener('click', (e) => {
    const pid = getPersonIdFromTarget(e.target);
    if (!pid) return;
    requestAnimationFrame(() => {
      let tries = 0;
      (function waitForDataAndModal(){
        const talksReady = Array.isArray(window.outreachTalksData);
        const presReady  = Array.isArray(window.academicPresentationsData);
        const active = document.querySelector('#modal-container .modal-overlay.active .modal-content');
        if (talksReady && presReady && active) {
          augmentOpenModal(pid);
        } else if (tries++ < 40) {
          setTimeout(waitForDataAndModal, 50);
        } else {
          log('timeout waiting for data/modal');
        }
      })();
    });
  }, { passive: true });

  window.SMARTBio = window.SMARTBio || {};
  window.SMARTBio.augmentPersonModal = function(personId){
    let tries = 0;
    (function wait(){
      const active = document.querySelector('#modal-container .modal-overlay.active .modal-content');
      if (active && Array.isArray(window.outreachTalksData) && Array.isArray(window.academicPresentationsData)) {
        augmentOpenModal(String(personId));
      } else if (tries++ < 40) {
        setTimeout(wait, 50);
      } else {
        log('augmentPersonModal: timeout');
      }
    })();
  };

  log('person augment hook installed');
})();
