/* SMARTBio main.js — consolidated & cleaned
 * - Leaves style.css untouched.
 * - Uses the pre-built modal markup in index.html for research/news/outreach/presentations.
 * - Team Bio modal: image left, bio right, green links.
 * - Fixes researchHub “Bio” buttons and card “Bio” chips.
 * - Restores all original functions (data load, renderers, nav, carousel, GDPR, particles, etc.).
 */

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

  function createEl(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === undefined || v === null) continue;
      if (k === 'text') { el.textContent = String(v); continue; }
      if (k === 'html') { el.innerHTML = String(v); continue; } // use only for static/templated content
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

  function showLoading(el, section) {
    if (el) el.style.display = 'block';
    if (section) section.setAttribute('aria-busy', 'true');
  }
  function hideLoading(el, section) {
    if (el) el.style.display = 'none';
    if (section) section.setAttribute('aria-busy', 'false');
  }

  function truncateHTML(text, maxLen, id) {
    const t = String(text || '');
    if (t.length <= maxLen) return `<p>${escapeHTML(t)}</p>`;
    const small = escapeHTML(t.slice(0, maxLen)) + '…';
    return `
      <p id="truncated-text-${id}">${small}</p>
      <p id="full-text-${id}" style="display:none">${escapeHTML(t)}</p>
      <button class="read-more-btn text-primary font-semibold hover:underline text-sm mt-2 inline-block" data-target-id="${id}" aria-expanded="false">Read More →</button>
    `;
  }

  function toggleTextVisibility(id, btn) {
    const trunc = document.getElementById(`truncated-text-${id}`);
    const full = document.getElementById(`full-text-${id}`);
    if (!trunc || !full) return;
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    if (expanded) {
      trunc.style.display = 'block'; full.style.display = 'none';
      btn.textContent = 'Read More →'; btn.setAttribute('aria-expanded', 'false');
    } else {
      trunc.style.display = 'none'; full.style.display = 'block';
      btn.textContent = 'Show Less'; btn.setAttribute('aria-expanded', 'true');
    }
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
    escapeHTML, isSafeUrl, sanitizeUrl, createEl, createSafeMedia,
    showLoading, hideLoading, truncateHTML, toggleTextVisibility,
    getMemberSinceDate, formatMemberSince
  };
})();


/* ======================= DOM Cache ======================= */
const DOMElements = (() => {
  // Sections
  const pageSections = document.querySelectorAll('.page-section');
  const yearSpan = document.getElementById('year');

  // Grids/Lists
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
  const gamesGrid = document.getElementById('games-grid');
  const gameFilters = document.getElementById('game-filters');

  // Modals container + specific research modal parts
  const modalContainer = document.getElementById('modal-container');

  const researchDescriptionModal = document.getElementById('research-description-modal');
  const researchModalMedia = document.getElementById('research-modal-media');
  const researchModalCaption = document.getElementById('research-modal-caption');
  const researchModalCredit = document.getElementById('research-modal-credit');
  const researchModalTitle = document.getElementById('research-modal-title');
  const researchModalDescription = document.getElementById('research-modal-description');
  const researchModalTeamMembers = document.getElementById('research-modal-team-members');

  // Other pre-built modals
  const newsDescriptionModal = document.getElementById('news-description-modal');
  const outreachTalkDescriptionModal = document.getElementById('outreach-talk-description-modal');
  const academicPresentationDescriptionModal = document.getElementById('academic-presentation-description-modal');

  // Nav
  const navLinks = document.querySelectorAll('.nav-link');
  const navLinkHeader = document.querySelector('.nav-link-header');
  const mobileMenuButton = document.getElementById('mobile-menu-button');
  const mobileMenu = document.getElementById('mobile-menu');

  // Loaders (optional)
  const loaders = document.querySelectorAll('.loader');

  // Misc
  const scrollToTopBtn = document.getElementById('scroll-to-top-btn');
  const privacyNoticeContent = document.getElementById('privacy-notice-content');

  return {
    pageSections, yearSpan,
    researchContentGrid, teamGrid, alumniGrid, newsList,
    newsCarouselTrack, carouselDotsContainer, carouselPrevBtn, carouselNextBtn,
    outreachTalksGrid, academicPresentationsGrid, outreachNewsList,
    gamesGrid, gameFilters,
    modalContainer,
    researchDescriptionModal, researchModalMedia, researchModalCaption, researchModalCredit,
    researchModalTitle, researchModalDescription, researchModalTeamMembers,
    newsDescriptionModal, outreachTalkDescriptionModal, academicPresentationDescriptionModal,
    navLinks, navLinkHeader, mobileMenuButton, mobileMenu,
    loaders, scrollToTopBtn, privacyNoticeContent
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
    const sections = Array.from(DOMElements.pageSections || []);
    const loaders = Array.from(DOMElements.loaders || []);
    loaders.forEach((loader, i) => Utils.showLoading(loader, sections[i]));

    try {
      const [
        research, team, alumni, news, games, outreachTalks,
        academicPresentations, outreachNews
      ] = await Promise.all([
        fetchJSON('data/research.json').catch(() => ({ items: [] })),
        fetchJSON('data/team.json').catch(() => ({ items: [] })),
        fetchJSON('data/alumni.json').catch(() => ({ items: [] })),
        fetchJSON('data/news.json').catch(() => ({ items: [] })),
        fetchJSON('data/games.json').catch(() => ({ items: [] })),
        fetchJSON('data/outreachTalks.json').catch(() => ({ items: [] })),
        fetchJSON('data/academicPresentations.json').catch(() => ({ items: [] })),
        fetchJSON('data/outreachNews.json').catch(() => ({ items: [] })),
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

      Renderer.renderAllContent();
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
    } finally {
      loaders.forEach((loader, i) => Utils.hideLoading(loader, sections[i]));
    }
  }

  return { fetchAllData };
})();


/* ======================= Renderer ======================= */
const Renderer = (() => {
  function resolve(raw) {
    if (Array.isArray(raw)) return raw;
    if (raw && Array.isArray(raw.items)) return raw.items;
    return [];
  }

  function renderResearchItems() {
    const grid = DOMElements.researchContentGrid;
    if (!grid) return;
    grid.replaceChildren();

    const items = resolve(window.researchData);
    if (items.length === 0) { grid.textContent = 'No research items available at the moment.'; return; }

    const team = resolve(window.teamData);
    const alumni = resolve(window.alumniData);
    const nameById = (id) => {
      const p = team.find(x => String(x.id) === String(id)) || alumni.find(x => String(x.id) === String(id));
      return p ? p.name : String(id);
    };

    const cards = items.map(item => {
      const topImg = item?.image ? Utils.createEl('img', {
        src: Utils.sanitizeUrl(item.image),
        alt: Utils.escapeHTML(item.title || 'Research image'),
        className: 'research-card-img rounded-md mb-4 border border-primary-dark',
        loading: 'lazy'
      }) : null;

      const title = Utils.createEl('h3', { className: 'text-lg font-semibold', text: item?.title || '' });

      const desc = String(item?.description || '');
      const truncated = desc.length > 180 ? desc.slice(0, 180) + '…' : desc;
      const pTrunc = Utils.createEl('p', { id: 'truncated-text-research-' + String(item?.id), text: truncated });
      const pFull  = Utils.createEl('p', { id: 'full-text-research-' + String(item?.id), text: desc });
      if (desc.length > 180) pFull.style.display = 'none';

      // “More Info” opens the proper modal (not inline expand)
      const btn = Utils.createEl('button', {
        className: 'read-more-btn text-primary hover:underline text-sm mt-2',
        dataset: { modalTarget: 'open-research-modal', id: (item?.id ?? item?.title) },
        text: (desc.length > 180 ? 'Read More →' : 'More Info')
      });

      // Hidden extra section (media + caption + credit + chips) — shown in modal instead, but kept for parity
      const extra = Utils.createEl('div', { className: 'mt-3 hidden', id: 'research-extra-' + String(item?.id) });
      const media = Utils.createSafeMedia(item?.modalMedia || item?.image);
      if (media) extra.appendChild(media);
      if (item?.modalMediaCaption) extra.appendChild(Utils.createEl('p', { className: 'text-xs text-medium-text mt-2', text: item.modalMediaCaption }));
      if (item?.modalMediaCreditId != null) {
        extra.appendChild(Utils.createEl('p', { className: 'text-xs text-medium-text', text: 'Credit: ' + nameById(item.modalMediaCreditId) }));
      }
      if (Array.isArray(item?.teamMembers) && item.teamMembers.length) {
        const wrap = Utils.createEl('div', { className: 'mt-2 flex flex-wrap gap-2' });
        item.teamMembers.forEach(id => {
          wrap.appendChild(Utils.createEl('button', {
            className: 'px-2 py-1 rounded bg-primary text-white text-xs',
            dataset: { modalTarget: 'open-person-bio', id },
            text: nameById(id)
          }));
        });
        extra.appendChild(wrap);
      }

      return Utils.createEl('div', { className: 'card rounded-lg p-6 text-center flex flex-col items-center' },
        [topImg, title, pTrunc, pFull, btn, extra].filter(Boolean)
      );
    });

    grid.append(...cards);
  }

  function renderListWithDates(container, items, emptyText) {
    container.replaceChildren();
    if (!items.length) { container.textContent = emptyText; return; }
    const children = items.map((item, idx) => {
      const li = Utils.createEl('li', { className: 'mb-6' });
      const title = Utils.createEl('h3', { className: 'text-lg font-semibold', text: item?.title || '' });
      const meta = Utils.createEl('p', { className: 'text-sm text-medium-text mb-2', text: item?.date || '' });
      const desc = Utils.createEl('p', { className: 'text-medium-text', text: item?.description || '' });
      const btn = Utils.createEl('button', {
        className: 'mt-2 text-primary font-semibold hover:underline',
        dataset: { modalTarget: 'open-news-modal', id: idx },
        text: 'Read More →'
      });
      li.append(title, meta, desc, btn);
      return li;
    });
    container.append(...children);
  }

  function renderNews() {
    const list = DOMElements.newsList;
    if (list) {
      const items = resolve(window.newsData);
      renderListWithDates(list, items, 'No news at the moment.');
    }

    // Carousel
    const track = DOMElements.newsCarouselTrack;
    if (track) {
      track.replaceChildren();
      const items = resolve(window.newsData);
      if (!items.length) { track.textContent = 'No items'; return; }
      const slides = items.map((n, i) => {
        const img = n?.image ? Utils.createEl('img', {
          src: Utils.sanitizeUrl(n.image),
          alt: Utils.escapeHTML(n.title || 'News'),
          className: 'w-full h-64 object-cover rounded-md border border-primary-dark',
          loading: 'lazy'
        }) : null;
        const slide = Utils.createEl('div', { className: 'carousel-slide', tabindex: '0' }, [
          img,
          Utils.createEl('h3', { className: 'text-lg font-semibold mt-2', text: n?.title || '' })
        ]);
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
          className: 'w-32 h-32 object-cover rounded-full mb-3 border border-primary-dark',
          loading: 'lazy'
        }) : null;
        const name = Utils.createEl('h3', { className: 'text-lg font-semibold', text: p?.name || '' });
        const role = p?.role ? Utils.createEl('p', { className: 'text-sm text-medium-text', text: p.role }) : null;
        const since = p?.memberSince ? Utils.createEl('p', { className: 'text-xs text-medium-text', text: 'Member since ' + Utils.formatMemberSince(p.memberSince) }) : null;
        const linksWrap = Utils.createEl('div', { className: 'mt-2 space-x-3' });
        if (p?.website) linksWrap.appendChild(Utils.createEl('a', { href: Utils.sanitizeUrl(p.website), target: '_blank', rel: 'noopener', className: 'text-primary font-semibold hover:underline', text: 'Website' }));
        if (p?.googleScholar) linksWrap.appendChild(Utils.createEl('a', { href: Utils.sanitizeUrl(p.googleScholar), target: '_blank', rel: 'noopener', className: 'text-primary font-semibold hover:underline', text: 'Scholar' }));
        const bioBtn = Utils.createEl('button', { className: 'text-primary font-semibold hover:underline mt-2 block', dataset: { modalTarget: 'open-person-bio', id: p?.id }, text: 'Bio →' });

        return Utils.createEl('div', { className: 'card rounded-lg p-6 text-center flex flex-col items-center' },
          [img, name, role, since, linksWrap, bioBtn].filter(Boolean));
      });

    grid.append(...cards);
  }

  function renderGames() {
    const grid = DOMElements.gamesGrid;
    if (!grid) return;
    grid.replaceChildren();
    const filters = DOMElements.gameFilters;
    if (filters) {
      // Expect filters already has "All Games" button in HTML
      const themes = new Set();
      resolve(window.gamesData).forEach(g => (g?.theme) && themes.add(g.theme));
      themes.forEach(theme => {
        const btn = Utils.createEl('button', {
          className: 'filter-btn bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-full text-sm transition duration-300',
          dataset: { filter: theme },
          text: theme
        });
        filters.appendChild(btn);
      });
    }

    const items = resolve(window.gamesData);
    if (!items.length) { grid.textContent = 'No games yet.'; return; }
    items.forEach(g => {
      const img = g?.image ? Utils.createEl('img', {
        src: Utils.sanitizeUrl(g.image),
        alt: Utils.escapeHTML(g?.title || 'Game'),
        className: 'w-full h-48 object-cover rounded-md border border-primary-dark mb-3',
        loading: 'lazy'
      }) : null;
      const play = g?.link ? Utils.createEl('a', {
        href: Utils.sanitizeUrl(g.link),
        target: '_blank',
        rel: 'noopener',
        className: 'bg-primary text-white px-4 py-2 rounded-full font-semibold inline-block mt-2',
        text: 'Play Game'
      }) : null;
      const card = Utils.createEl('div', { className: 'card rounded-lg p-6 flex flex-col' }, [
        img,
        Utils.createEl('h3', { className: 'text-lg font-semibold', text: g?.title || '' }),
        Utils.createEl('p', { className: 'text-medium-text', text: g?.description || '' }),
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
      const left = Utils.createEl('div', { className: 'flex-1' }, [
        Utils.createEl('h3', { className: 'text-lg font-semibold mb-1', text: t?.title || '' }),
        Utils.createEl('p', { className: 'text-sm text-medium-text mb-2', text: t?.date || '' }),
        Utils.createEl('p', { className: 'text-medium-text', text: t?.description || '' }),
      ]);
      const right = Utils.createEl('div', { className: 'mt-3 flex gap-2 flex-wrap' });
      (Array.isArray(t?.speakers) ? t.speakers : []).forEach(id => {
        const person = personById(id);
        right.appendChild(Utils.createEl('button', {
          className: 'px-2 py-1 rounded bg-primary text-white text-xs',
          dataset: { modalTarget: 'open-person-bio', id },
          text: person ? person.name : String(id)
        }));
      });
      const more = Utils.createEl('button', {
        className: 'text-primary font-semibold hover:underline mt-2',
        dataset: { modalTarget: 'open-outreach-talk-modal', id: idx },
        text: 'Details →'
      });
      return Utils.createEl('div', { className: 'card rounded-lg p-6 flex flex-col' }, [left, right, more]);
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

    const cards = items.map((t, idx) => {
      const right = Utils.createEl('div', { className: 'mt-3 flex gap-2 flex-wrap' });
      (Array.isArray(t?.speakers) ? t.speakers : []).forEach(id => {
        const person = personById(id);
        right.appendChild(Utils.createEl('button', {
          className: 'px-2 py-1 rounded bg-primary text-white text-xs',
          dataset: { modalTarget: 'open-person-bio', id },
          text: person ? person.name : String(id)
        }));
      });
      const more = Utils.createEl('button', {
        className: 'text-primary font-semibold hover:underline mt-2',
        dataset: { modalTarget: 'open-academic-presentation-modal', id: idx },
        text: 'Details →'
      });
      return Utils.createEl('div', { className: 'card rounded-lg p-6 flex flex-col' }, [
        Utils.createEl('h3', { className: 'text-lg font-semibold mb-1', text: t?.title || '' }),
        Utils.createEl('p', { className: 'text-sm text-medium-text mb-2', text: t?.date || '' }),
        Utils.createEl('p', { className: 'text-medium-text', text: t?.description || '' }),
        right, more
      ]);
    });
    grid.append(...cards);
  }

  function renderOutreachNews() {
    const list = DOMElements.outreachNewsList;
    if (!list) return;
    list.replaceChildren();
    const items = resolve(window.outreachNewsData);
    if (!items.length) { list.textContent = 'No dissemination news right now.'; return; }
    items.forEach((n, i) => {
      const li = Utils.createEl('li', { className: 'mb-6' }, [
        Utils.createEl('h3', { className: 'text-lg font-semibold mb-1', text: n?.title || '' }),
        Utils.createEl('p', { className: 'text-sm text-medium-text mb-2', text: n?.date || '' }),
        Utils.createEl('p', { className: 'text-medium-text', text: n?.description || '' }),
        Utils.createEl('button', { className: 'text-primary font-semibold hover:underline mt-2', dataset: { modalTarget: 'open-news-modal', id: i }, text: 'Read More →' })
      ]);
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
  }

  return {
    renderAllContent
  };
})();


/* ======================= Carousel ======================= */
const CarouselManager = (() => {
  let currentIndex = 0;
  let slides = [];
  let slideWidth = 0;

  function updateCarousel() {
    if (!DOMElements.newsCarouselTrack) return;
    slides = Array.from(DOMElements.newsCarouselTrack.children).filter(el => !el.classList.contains('loader'));
    if (!slides.length) return;
    slideWidth = slides[0].getBoundingClientRect().width;
    DOMElements.newsCarouselTrack.style.transform = `translateX(${-slideWidth * currentIndex}px)`;

    if (DOMElements.carouselDotsContainer) {
      DOMElements.carouselDotsContainer.innerHTML = '';
      slides.forEach((_, index) => {
        const dot = document.createElement('button');
        dot.className = `carousel-dot ${index === currentIndex ? 'active' : ''}`;
        dot.setAttribute('role', 'tab');
        dot.setAttribute('aria-selected', index === currentIndex);
        dot.setAttribute('aria-controls', `news-carousel-slide-${index}`);
        dot.setAttribute('aria-label', `Go to slide ${index + 1}`);
        dot.addEventListener('click', () => { currentIndex = index; updateCarousel(); });
        DOMElements.carouselDotsContainer.appendChild(dot);
      });
    }

    slides.forEach((slide, index) => {
      slide.id = `news-carousel-slide-${index}`;
      if (index === currentIndex) slide.setAttribute('aria-current', 'true');
      else slide.removeAttribute('aria-current');
    });
  }

  function setupCarousel() {
    if (!DOMElements.newsCarouselTrack) return;
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
    modalEl.focus();
  }
  function closeModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.remove('active');
    modalEl.setAttribute('aria-hidden', 'true');
    if (lastFocused) lastFocused.focus();
  }

  function personDataset() {
    return resolve(window.teamData).concat(resolve(window.alumniData));
    function resolve(raw){ return Array.isArray(raw) ? raw : (raw && raw.items) || []; }
  }

  function clear(el){ if (el) while (el.firstChild) el.removeChild(el.firstChild); }

  /* ---- Team Bio Modal (custom overlay) ----
   * Layout: image (left), bio (right). Links in bold green.
   */
  function openPersonBioModal(personId, trigger) {
    const people = personDataset();
    const person = people.find(p => String(p.id) === String(personId));
    const container = DOMElements.modalContainer || document.body;

    // Build overlay
    const overlay = Utils.createEl('div', { className: 'modal-overlay active', tabindex: '-1', role: 'dialog', 'aria-modal': 'true' });
    const panel = Utils.createEl('div', { className: 'modal-content flex flex-col md:flex-row gap-8 items-center md:items-start' });

    const closeBtn = Utils.createEl('button', { className: 'modal-close', text: '×' });
    panel.appendChild(closeBtn);

    // Left: image
    const left = Utils.createEl('div', { className: 'w-full md:w-1/2 flex-shrink-0' });
    if (person?.image) {
      left.appendChild(Utils.createEl('img', {
        src: Utils.sanitizeUrl(person.image),
        alt: Utils.escapeHTML(person?.name || 'Person'),
        className: 'w-full h-auto rounded-md object-cover border border-primary-dark'
      }));
    }

    // Right: name, role, bio, links
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
    addLink('Scholar', person?.googleScholar);
    if (Array.isArray(person?.presentations)) {
      person.presentations.forEach(pr => {
        if (typeof pr === 'string') addLink('Presentation', pr);
        else if (pr?.link) addLink(pr?.title || 'Presentation', pr.link);
      });
    }
    if (links.childNodes.length) right.appendChild(links);

    panel.append(left, right);
    overlay.appendChild(panel);
    container.appendChild(overlay);
    openModal(overlay, trigger);
  }

  /* ---- Research Description Modal (use pre-built DOM) ----
   * Left: media + caption + credit. Right: title + description + team chips.
   */
  function openResearchDescriptionModal(item, trigger) {
    const m = DOMElements.researchDescriptionModal;
    if (!m) return;
    const {
      researchModalMedia, researchModalCaption, researchModalCredit,
      researchModalTitle, researchModalDescription, researchModalTeamMembers
    } = DOMElements;

    // Left column
    clear(researchModalMedia);
    if (item?.modalMedia || item?.image) {
      const media = Utils.createSafeMedia(item.modalMedia || item.image);
      if (media) researchModalMedia.appendChild(media);
    }
    researchModalCaption && (researchModalCaption.textContent = item?.modalMediaCaption || '');
    if (researchModalCredit) {
      let credit = '';
      if (item?.modalMediaCreditId != null) {
        const people = personDataset();
        const p = people.find(pp => String(pp.id) === String(item.modalMediaCreditId));
        credit = 'Credit: ' + (p ? p.name : String(item.modalMediaCreditId));
      }
      researchModalCredit.textContent = credit;
    }

    // Right column
    researchModalTitle && (researchModalTitle.textContent = item?.title || '');
    researchModalDescription && (researchModalDescription.textContent = item?.description || '');

    if (researchModalTeamMembers) {
      researchModalTeamMembers.replaceChildren();
      const people = personDataset();
      (Array.isArray(item?.teamMembers) ? item.teamMembers : []).forEach(id => {
        const p = people.find(pp => String(pp.id) === String(id));
        researchModalTeamMembers.appendChild(Utils.createEl('button', {
          className: 'px-2 py-1 rounded bg-primary text-white text-xs mr-2 mb-2',
          dataset: { modalTarget: 'open-person-bio', id },
          text: p ? p.name : String(id)
        }));
      });
    }

    openModal(m, trigger);
  }

  /* ---- Other modals (use pre-built DOM in index.html) ---- */
  function openNewsModal(index, trigger) {
    const items = Array.isArray(window.newsData) ? window.newsData : (window.newsData && window.newsData.items) || [];
    const n = items[index];
    const m = DOMElements.newsDescriptionModal;
    if (!m || !n) return;
    // Populate
    m.querySelector('#news-modal-title').textContent = n?.title || '';
    m.querySelector('#news-modal-date').textContent = n?.date || '';
    m.querySelector('#news-modal-description').textContent = n?.description || '';
    const img = m.querySelector('#news-modal-image');
    if (img) {
      if (n?.image) { img.src = Utils.sanitizeUrl(n.image); img.alt = Utils.escapeHTML(n?.title || 'News Image'); }
    }
    openModal(m, trigger);
  }

  function openOutreachTalkModal(index, trigger) {
    const items = Array.isArray(window.outreachTalksData) ? window.outreachTalksData : (window.outreachTalksData && window.outreachTalksData.items) || [];
    const t = items[index];
    const m = DOMElements.outreachTalkDescriptionModal;
    if (!m || !t) return;
    m.querySelector('#outreach-talk-modal-title').textContent = t?.title || '';
    m.querySelector('#outreach-talk-modal-date').textContent = t?.date || '';
    m.querySelector('#outreach-talk-modal-description').textContent = t?.description || '';

    const mediaWrap = m.querySelector('#outreach-talk-modal-media');
    if (mediaWrap) { mediaWrap.replaceChildren(); const media = Utils.createSafeMedia(t?.modalMedia || t?.image); if (media) mediaWrap.appendChild(media); }
    const speakers = m.querySelector('#outreach-talk-modal-speakers');
    if (speakers) {
      speakers.replaceChildren();
      const people = personDataset();
      (Array.isArray(t?.speakers) ? t.speakers : []).forEach(id => {
        const p = people.find(pp => String(pp.id) === String(id));
        speakers.appendChild(Utils.createEl('button', {
          className: 'px-2 py-1 rounded bg-primary text-white text-xs mr-2 mb-2',
          dataset: { modalTarget: 'open-person-bio', id },
          text: p ? p.name : String(id)
        }));
      });
    }
    const linkWrap = m.querySelector('#outreach-talk-modal-link');
    if (linkWrap) {
      linkWrap.replaceChildren();
      if (t?.link) linkWrap.appendChild(Utils.createEl('a', { href: Utils.sanitizeUrl(t.link), target: '_blank', rel: 'noopener', className: 'text-primary font-bold hover:underline', text: 'View Link' }));
    }
    openModal(m, trigger);
  }

  function openAcademicPresentationModal(index, trigger) {
    const items = Array.isArray(window.academicPresentationsData) ? window.academicPresentationsData : (window.academicPresentationsData && window.academicPresentationsData.items) || [];
    const t = items[index];
    const m = DOMElements.academicPresentationDescriptionModal;
    if (!m || !t) return;
    m.querySelector('#academic-presentation-modal-title').textContent = t?.title || '';
    m.querySelector('#academic-presentation-modal-date').textContent = t?.date || '';
    m.querySelector('#academic-presentation-modal-description').textContent = t?.description || '';

    const mediaWrap = m.querySelector('#academic-presentation-modal-media');
    if (mediaWrap) { mediaWrap.replaceChildren(); const media = Utils.createSafeMedia(t?.modalMedia || t?.image); if (media) mediaWrap.appendChild(media); }
    const speakers = m.querySelector('#academic-presentation-modal-speakers');
    if (speakers) {
      speakers.replaceChildren();
      const people = personDataset();
      (Array.isArray(t?.speakers) ? t.speakers : []).forEach(id => {
        const p = people.find(pp => String(pp.id) === String(id));
        speakers.appendChild(Utils.createEl('button', {
          className: 'px-2 py-1 rounded bg-primary text-white text-xs mr-2 mb-2',
          dataset: { modalTarget: 'open-person-bio', id },
          text: p ? p.name : String(id)
        }));
      });
    }
    const linkWrap = m.querySelector('#academic-presentation-modal-link');
    if (linkWrap) {
      linkWrap.replaceChildren();
      if (t?.link) linkWrap.appendChild(Utils.createEl('a', { href: Utils.sanitizeUrl(t.link), target: '_blank', rel: 'noopener', className: 'text-primary font-bold hover:underline', text: 'View Link' }));
    }
    openModal(m, trigger);
  }

  // Delegated clicks for every modal trigger, plus close controls
  function handleModalClicks(e) {
    const t = e.target;

    // Close actions: .modal-close or click on overlay background
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

    const trigger = t.closest('[data-modal-target]') || t.closest('.open-modal-btn'); // researchHub "Bio" buttons
    if (!trigger) return;

    // Special-casing researchHub "Bio" button: it sets data-modal-target to the PERSON ID directly
    let action = trigger.dataset.modalTarget;
    let id = trigger.dataset.id;
    if (trigger.classList.contains('open-modal-btn') && !id) {
      // When coming from researchHub, dataset.modalTarget is the person id
      id = action;
      action = 'open-person-bio';
    }

    // News/outreach/presentation may pass index; research passes research id/title
    switch (action) {
      case 'open-person-bio': {
        if (!id) return;
        openPersonBioModal(id, trigger);
        break;
      }
      case 'open-research-modal': {
        const items = Array.isArray(window.researchData) ? window.researchData : (window.researchData && window.researchData.items) || [];
        const item = items.find(x => String(x.id) === String(id)) || items.find(x => String(x.title) === String(id));
        if (item) openResearchDescriptionModal(item, trigger);
        break;
      }
      case 'open-news-modal': {
        openNewsModal(Number(id), trigger);
        break;
      }
      case 'open-outreach-talk-modal': {
        openOutreachTalkModal(Number(id), trigger);
        break;
      }
      case 'open-academic-presentation-modal': {
        openAcademicPresentationModal(Number(id), trigger);
        break;
      }
      default: break;
    }
  }

  return { openNewsModal, openOutreachTalkModal, openAcademicPresentationModal, openResearchDescriptionModal, openPersonBioModal, handleModalClicks, openModal, closeModal };
})();


/* ======================= Navigation ======================= */
const NavigationManager = (() => {
  function showPage(pageId) {
    DOMElements.pageSections.forEach(section => {
      const isActive = section.id === pageId + '-page';
      section.classList.toggle('active', isActive);
      if (!isActive) {
        const f = section.querySelector('.fade-in-section');
        if (f) f.classList.remove('is-visible');
      }
    });
    DOMElements.navLinks.forEach(link => {
      const isActive = link.hash === '#' + pageId;
      link.classList.toggle('active', isActive);
      if (isActive) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    const visible = document.querySelector('.page-section.active .fade-in-section');
    if (visible) setTimeout(() => visible.classList.add('is-visible'), 100);

    // Research Hub sizing on Home
    const homeResearchHubSection = document.getElementById('home-research-hub-section');
    if (pageId === 'home' && homeResearchHubSection && !window.researchHubInitialized) {
      const container = document.getElementById('research-canvas-container');
      if (container && typeof window.initResearchHub === 'function') {
        if (window.researchData && window.newsData && window.teamData && window.gamesData) {
          setTimeout(() => {
            window.initResearchHub(window.researchData, window.newsData, window.teamData, window.gamesData);
            window.researchHubInitialized = true;
          }, 50);
        }
      }
    } else if (pageId === 'home' && window.researchHubInitialized) {
      const container = document.getElementById('research-canvas-container');
      const canvas = document.getElementById('research-canvas');
      if (canvas && container && window.camera && window.renderer) {
        window.camera.aspect = container.clientWidth / 600;
        window.camera.updateProjectionMatrix();
        window.renderer.setSize(container.clientWidth, 600);
        window.renderer.render(window.scene, window.camera);
      }
    }

    // Privacy page markdown (already loaded via marked in index.html)
    if (pageId === 'privacy' && DOMElements.privacyNoticeContent) {
      fetch('privacyNotice.md')
        .then(r => r.ok ? r.text() : Promise.reject(r.status))
        .then(md => { if (typeof marked !== 'undefined') { DOMElements.privacyNoticeContent.innerHTML = marked.parse(md); } })
        .catch(() => { DOMElements.privacyNoticeContent.textContent = 'Privacy notice could not be loaded.'; });
    }
  }

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
  function setupCollapsibleSections() {
    const headers = document.querySelectorAll('.collapsible-header');
    function toggle(h) {
      const contentId = h.getAttribute('data-content-id');
      const expanded = h.getAttribute('aria-expanded') === 'true';
      h.setAttribute('aria-expanded', String(!expanded));
      const content = contentId ? document.getElementById(contentId) : h.nextElementSibling;
      if (content) {
        content.classList.toggle('hidden', expanded);
        content.setAttribute('aria-hidden', String(expanded));
      }
    }
    headers.forEach(h => {
      const contentId = h.getAttribute('data-content-id');
      const isExpanded = h.getAttribute('aria-expanded') === 'true';
      const content = contentId ? document.getElementById(contentId) : h.nextElementSibling;
      h.setAttribute('role', h.getAttribute('role') || 'button');
      h.setAttribute('tabindex', h.getAttribute('tabindex') || '0');
      if (content) {
        content.classList.toggle('hidden', !isExpanded);
        content.setAttribute('aria-hidden', String(!isExpanded));
      }
    });
    document.addEventListener('click', (e) => {
      const header = e.target.closest('.collapsible-header');
      if (header) toggle(header);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const header = e.target.closest && e.target.closest('.collapsible-header');
      if (header) { e.preventDefault(); toggle(header); }
    });
  }
  return { setupCollapsibleSections };
})();


/* ======================= App ======================= */
const App = (() => {
  function setupEventListeners() {
    // Modal triggers/close
    document.addEventListener('click', ModalManager.handleModalClicks);

    // Read More toggle
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.read-more-btn');
      if (btn) {
        const id = btn.getAttribute('data-target-id');
        if (id) Utils.toggleTextVisibility(id, btn);
      }
    });

    // Nav
    DOMElements.navLinks.forEach(link => link.addEventListener('click', NavigationManager.handleNavClick));
    DOMElements.navLinkHeader && DOMElements.navLinkHeader.addEventListener('click', NavigationManager.handleNavClick);

    // Mobile menu
    if (DOMElements.mobileMenuButton && DOMElements.mobileMenu) {
      DOMElements.mobileMenuButton.addEventListener('click', () => {
        const isHidden = DOMElements.mobileMenu.classList.toggle('hidden');
        DOMElements.mobileMenuButton.setAttribute('aria-expanded', String(!isHidden));
      });
    }

    ScrollManager.setupScrollToTop();
    CollapsibleManager.setupCollapsibleSections();
  }

  function init() {
    if (DOMElements.yearSpan) DOMElements.yearSpan.textContent = new Date().getFullYear();
    DataManager.fetchAllData().then(() => {
      const initial = window.location.hash ? window.location.hash.substring(1) : 'home';
      NavigationManager.showPage(initial);
      CarouselManager.setupCarousel();
      setupEventListeners();
      GDPRManager.setupGDPRBanner();

      // Particles.js (element exists in index.html)
      if (window.particlesJS) {
        particlesJS('particles-js', {
          particles: {
            number: { value: 80, density: { enable: true, value_area: 800 } },
            color: { value: '#10b981' },
            shape: { type: 'circle' },
            opacity: { value: 0.5, random: true, anim: { enable: true, speed: 0.5, opacity_min: 0.1, sync: false } },
            size: { value: 3, random: true },
            line_linked: { enable: true, distance: 150, color: '#10b981', opacity: 0.2, width: 1 },
            move: { enable: true, speed: 2, direction: 'none', random: true, straight: false, out_mode: 'out' }
          },
          interactivity: { detect_on: 'canvas', events: { onhover: { enable: true, mode: 'repulse' }, onclick: { enable: true, mode: 'push' }, resize: true }, modes: { repulse: { distance: 100, duration: 0.4 }, push: { particles_nb: 4 } } },
          retina_detect: true
        });
      }
    });
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
