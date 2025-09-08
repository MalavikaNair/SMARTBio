/* SMARTBio main.js — fixes:
   - Global ReferenceError for openAcademicPresentationModal (exposed on window)
   - Keeps modal handlers delegated; bio images round in the person modal
   - Privacy page uses DOMPurify; YouTube URLs normalized to /embed/
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
      if (k === 'html') { el.innerHTML = String(v); continue; } // only for static templates
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
    outreachTalksGrid, academicPresentationsGrid, outreachNewsList,
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
    }
  }

  return { fetchAllData };
})();

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
      const truncated = desc.length > 180 ? desc.slice(0, 180) + '…' : desc;
      const pTrunc = Utils.createEl('p', { id: 'truncated-text-research-' + String(item?.id), text: truncated });
      const pFull  = Utils.createEl('p', { id: 'full-text-research-' + String(item?.id), text: desc });
      if (desc.length > 180) pFull.style.display = 'none';

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
        if (p?.website) linksWrap.appendChild(Utils.createEl('a', { href: Utils.sanitizeUrl(p.website), target: '_blank', rel: 'noopener', className: 'text-primary font-semibold hover:underline', text: 'Website' }));
        if (p?.googleScholar) linksWrap.appendChild(Utils.createEl('a', { href: Utils.sanitizeUrl(Utils.normalizeScholarUrl(p.googleScholar)), target: '_blank', rel: 'noopener', className: 'text-primary font-semibold hover:underline', text: 'Scholar' }));
        const bioBtn = Utils.createEl('a', {
          href: '#',
          className: 'inline-block font-bold text-gray-900 hover:underline mt-2',
          dataset: { modalTarget: 'open-person-bio', id: p?.id },
          text: 'Bio →'
        });
        return Utils.createEl('div', { className: 'card rounded-lg p-6 text-center flex flex-col items-center' },
          [img, name, role, since, linksWrap, bioBtn].filter(Boolean));
      });

    grid.append(...cards);
  }

  function renderGames() {
    const grid = DOMElements.gamesGrid;
    if (!grid) return;
    grid.replaceChildren();
    const items = resolve(window.gamesData);
    if (!items.length) { grid.textContent = 'No games yet.'; return; }
    items.forEach(game => {
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
  }

  return { renderAllContent };
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

  function clear(el){ if (el) while (el.firstChild) el.removeChild(el.firstChild); }

  // Team Bio modal — LEFT image: square, fully round, NO border
  function openPersonBioModal(personId, trigger) {
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
        className: 'w-48 h-48 object-cover rounded-full' // circle image
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
    if (Array.isArray(person?.presentations)) {
      person.presentations.forEach(pr => {
        if (typeof pr === 'string') addLink('Presentation', pr);
        else if (pr?.link) addLink(pr?.title || 'Presentation', pr.link);
      });
    }
    if (links.childNodes.length) right.appendChild(links);

    const talksAll = Array.isArray(window.outreachTalksData) ? window.outreachTalksData : (window.outreachTalksData?.items || []);
    const presAll  = Array.isArray(window.academicPresentationsData) ? window.academicPresentationsData : (window.academicPresentationsData?.items || []);

    const talkMatches = talksAll.filter(t => Array.isArray(t.speakerIds) && t.speakerIds.some(id => String(id) === String(personId)));
    const presMatches = presAll.filter(t => Array.isArray(t.speakerIds) && t.speakerIds.some(id => String(id) === String(personId)));

    if (talkMatches.length || presMatches.length) {
      right.appendChild(Utils.createEl('h4', { className: 'text-xl font-semibold mt-6 mb-2', text: 'Talks & Presentations' }));

      const listWrap = Utils.createEl('div', { className: 'space-y-1' });
      const addItemLink = (item) => {
        const href = item.link || item.videoLink || item.modalMedia || item.image;
        if (!href) return;
        listWrap.appendChild(Utils.createEl('a', {
          href: Utils.sanitizeUrl(href),
          target: '_blank',
          rel: 'noopener',
          className: 'block text-primary font-bold hover:underline',
          text: item.title || 'View'
        }));
      };
      talkMatches.forEach(addItemLink);
      presMatches.forEach(addItemLink);
      right.appendChild(listWrap);
    }

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
      DOMElements.researchModalTeamMembers.replaceChildren();
      (Array.isArray(item?.teamMembers) ? item.teamMembers : []).forEach(id => {
        const p = resolvePeople().find(pp => String(pp.id) === String(id));
        DOMElements.researchModalTeamMembers.appendChild(Utils.createEl('a', {
          href: '#',
          className: 'inline-block font-bold text-gray-900 hover:underline',
          dataset: { modalTarget: 'open-person-bio', id },
          text: p ? p.name : String(id)
        }));
      });
    }

    openModal(m, trigger);
  }

  function openNewsModal(index, trigger) {
    const items = Array.isArray(window.newsData) ? window.newsData : (window.newsData && window.newsData.items) || [];
    const n = items[index];
    const m = DOMElements.newsDescriptionModal;
    if (!m || !n) return;

    m.querySelector('#news-modal-title').textContent = n?.title || '';
    m.querySelector('#news-modal-date').textContent = Utils.formatDate(n?.date) || '';
    m.querySelector('#news-modal-description').textContent = n?.description || '';
    const img = m.querySelector('#news-modal-image');
    if (img && n?.image) { img.src = Utils.sanitizeUrl(n.image); img.alt = Utils.escapeHTML(n?.title || 'News Image'); }

    openModal(m, trigger);
  }

  function openOutreachTalkModal(index, trigger) {
    const items = Array.isArray(window.outreachTalksData) ? window.outreachTalksData : (window.outreachTalksData && window.outreachTalksData.items) || [];
    const t = items[index];
    const m = DOMElements.outreachTalkDescriptionModal;
    if (!m || !t) return;

    m.querySelector('#outreach-talk-modal-title').textContent = t?.title || '';
    m.querySelector('#outreach-talk-modal-date').textContent = Utils.formatDate(t?.date) || '';
    m.querySelector('#outreach-talk-modal-description').textContent = t?.description || '';

    const mediaWrap = m.querySelector('#outreach-talk-modal-media');
    if (mediaWrap) { mediaWrap.replaceChildren(); const media = Utils.createSafeMedia(t?.videoLink || t?.modalMedia || t?.image); if (media) mediaWrap.appendChild(media); }
    const speakers = m.querySelector('#outreach-talk-modal-speakers');
    if (speakers) {
      speakers.replaceChildren();
      (Array.isArray(t?.speakerIds) ? t.speakerIds : []).forEach(id => {
        const p = resolvePeople().find(pp => String(pp.id) === String(id));
        speakers.appendChild(Utils.createEl('a', {
          href: '#',
          className: 'inline-block font-bold text-gray-900 hover:underline',
          dataset: { modalTarget: 'open-person-bio', id },
          text: p ? p.name : String(id)
        }));
      });
    }
    const linkWrap = m.querySelector('#outreach-talk-modal-link');
    if (linkWrap) { linkWrap.replaceChildren(); if (t?.link) linkWrap.appendChild(Utils.createEl('a', { href: Utils.sanitizeUrl(t.link), target: '_blank', rel: 'noopener', className: 'text-primary font-bold hover:underline', text: 'View Link' })); }

    openModal(m, trigger);
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

  function openAcademicPresentationModal(index, trigger) {
    const items = Array.isArray(window.academicPresentationsData) ? window.academicPresentationsData : (window.academicPresentationsData && window.academicPresentationsData.items) || [];
    const t = items[index];
    const m = DOMElements.academicPresentationDescriptionModal;
    if (!m || !t) return;

    m.querySelector('#academic-presentation-modal-title').textContent = t?.title || '';
    m.querySelector('#academic-presentation-modal-date').textContent = Utils.formatDate(t?.date) || '';

    const mediaWrap = m.querySelector('#academic-presentation-modal-media');
    if (mediaWrap) { mediaWrap.replaceChildren(); const media = Utils.createSafeMedia(t?.videoLink || t?.modalMedia || t?.image); if (media) mediaWrap.appendChild(media); }
    const descEl = m.querySelector('#academic-presentation-modal-description');
    if (mediaWrap && descEl && descEl.parentNode) descEl.parentNode.insertBefore(mediaWrap, descEl);
    if (descEl) descEl.textContent = t?.description || '';

    const speakers = m.querySelector('#academic-presentation-modal-speakers');
    if (speakers) {
      speakers.replaceChildren();
      (Array.isArray(t?.speakerIds) ? t.speakerIds : []).forEach(id => {
        const p = resolvePeople().find(pp => String(pp.id) === String(id));
        speakers.appendChild(Utils.createEl('a', {
          href: '#',
          className: 'inline-block font-bold text-gray-900 hover:underline',
          dataset: { modalTarget: 'open-person-bio', id },
          text: p ? p.name : String(id)
        }));
      });
    }
    const linkWrap = m.querySelector('#academic-presentation-modal-link');
    if (linkWrap) { linkWrap.replaceChildren(); if (t?.link) linkWrap.appendChild(Utils.createEl('a', { href: Utils.sanitizeUrl(t.link), target: '_blank', rel: 'noopener', className: 'text-primary font-bold hover:underline', text: 'View Link' })); }

    openModal(m, trigger);
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
  function showPage(pageId) {
    DOMElements.pageSections.forEach(section => {
      const isActive = section.id === pageId + '-page';
      section.classList.toggle('active', isActive);
      if (!isActive) section.querySelector('.fade-in-section')?.classList.remove('is-visible');
    });
    DOMElements.navLinks.forEach(link => {
      const isActive = link.hash === '#' + pageId;
      link.classList.toggle('active', isActive);
      if (isActive) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    const visible = document.querySelector('.page-section.active .fade-in-section');
    if (visible) setTimeout(() => visible.classList.add('is-visible'), 100);

    if (pageId === 'privacy' && DOMElements.privacyNoticeContent) {
      fetch('privacyNotice.md')
        .then(response => {
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          return response.text();
        })
        .then(markdown => {
          if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
            const html = marked.parse(markdown, { mangle: false, headerIds: false });
            DOMElements.privacyNoticeContent.innerHTML = DOMPurify.sanitize(html, {
              USE_PROFILES: { html: true }
            });
          } else {
            DOMElements.privacyNoticeContent.textContent = markdown;
          }
        })
        .catch(error => {
          console.error('Error loading privacy notice:', error);
          DOMElements.privacyNoticeContent.textContent =
            'Unable to load the privacy notice at the moment.';
        });
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
      content.setAttribute('aria-hidden', 'false');
    } else {
      content.style.maxHeight = '0';
      content.setAttribute('aria-hidden', 'true');
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

/* ======================= App ======================= */
const App = (() => {
  function setupEventListeners() {
    document.addEventListener('click', ModalManager.handleModalClicks);
    DOMElements.navLinks.forEach(link => link.addEventListener('click', NavigationManager.handleNavClick));
    DOMElements.navLinkHeader && DOMElements.navLinkHeader.addEventListener('click', NavigationManager.handleNavClick);
    ScrollManager.setupScrollToTop();
    CollapsibleManager.setupCollapsibleSections();
    GDPRManager.setupGDPRBanner();
  }

  function init() {
    if (DOMElements.yearSpan) DOMElements.yearSpan.textContent = new Date().getFullYear();
    DataManager.fetchAllData().then(() => {
      const initial = window.location.hash ? window.location.hash.substring(1) : 'home';
      NavigationManager.showPage(initial);
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
