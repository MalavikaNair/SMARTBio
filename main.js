// main.js (patched) — Align modal builders with existing CSS and HTML structure
// - Research modal: media/caption/credit LEFT, details/members RIGHT (uses pre-defined HTML in index.html)
// - Team bio modal: image LEFT, bio + bold green links RIGHT (dynamically created overlay)
// Other app modules (DataManager, Renderer, etc.) maintained as-is with small fixes to avoid duplicate functions.

// =========================
// Global variables for data (as per existing structure)
// =========================
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
  carouselDotsContainer: document.getElementById('carousel-dots'),
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

  // Pre-defined modals (index.html)
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

// =========================
// Utils
// =========================
const Utils = (() => {
  function escapeHTML(str){ const s = String(str ?? ''); return s.replace(/[&<>\"'`]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',\"'\":'&#39;','`':'&#96;'}[c])); }
  function isSafeUrl(url){ try{ const u=new URL(String(url),window.location.origin); return ['http:','https:'].includes(u.protocol); }catch{ return false; } }
  function sanitizeUrl(url,fallback='#'){ return isSafeUrl(url)?String(url):fallback; }
  function createEl(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    for (const [k,v] of Object.entries(attrs||{})) {
      if (v==null) continue;
      if (k==='text'){ el.textContent=String(v); continue; }
      if (k==='html'){ el.innerHTML=String(v); continue; }
      if (k==='dataset' && typeof v==='object'){ for (const [dk,dv] of Object.entries(v)) el.dataset[dk]=String(dv); continue; }
      if (k in el){ try{ el[k]=v; } catch { el.setAttribute(k,String(v)); } } else el.setAttribute(k,String(v));
    }
    for (const c of [].concat(children||[])){ if (c==null) continue; el.appendChild(typeof c==='string'?document.createTextNode(c):c); }
    return el;
  }
  function createYouTubeEmbed(url){
    try{ const u=new URL(String(url),window.location.origin); const host=u.hostname.toLowerCase();
      if(!['www.youtube.com','youtube.com'].includes(host)) return null;
      if(!u.pathname.startsWith('/embed/')) return null;
      const iframe=document.createElement('iframe'); iframe.src=u.href; iframe.loading='lazy'; iframe.allowFullscreen=true;
      iframe.setAttribute('allow','accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
      iframe.className='absolute top-0 left-0 w-full h-full rounded-md border border-primary-dark'; return iframe;
    } catch { return null; }
  }
  function createSafeMedia(url){
    if(!url) return null; const u=String(url);
    if(/\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(u)){ const img=document.createElement('img'); img.src=sanitizeUrl(u); img.alt=''; img.loading='lazy'; img.className='w-full h-auto rounded-md object-cover border border-primary-dark'; return img; }
    if(u.includes('youtube.com/embed/')){ const box=document.createElement('div'); box.className='relative w-full'; box.style.paddingBottom='56.25%'; const ifr=createYouTubeEmbed(u); if(ifr) box.appendChild(ifr); return box; }
    const v=document.createElement('video'); v.controls=true; v.loading='lazy'; v.className='w-full h-auto rounded-md border border-primary-dark';
    const src=document.createElement('source'); src.src=sanitizeUrl(u); src.type='video/mp4'; v.appendChild(src); return v;
  }
  return { escapeHTML, sanitizeUrl, createEl, createYouTubeEmbed, createSafeMedia };
})();

// =========================
// Data Manager (unchanged API)
// =========================
const DataManager = (() => {
  async function fetchAllData(){
    const loaders=[
      DOMElements.researchLoading, DOMElements.teamLoading, DOMElements.alumniLoading,
      DOMElements.newsListLoading, DOMElements.newsCarouselLoading, DOMElements.gamesLoading,
      DOMElements.outreachTalksLoading, DOMElements.academicPresentationsLoading, DOMElements.outreachNewsLoading
    ];
    const sections=[
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
    loaders.forEach((l,i)=>{ if(l) l.style.display='block'; if(sections[i]) sections[i].setAttribute('aria-busy','true'); });
    try{
      [ newsData, researchData, teamData, alumniData, gamesData, outreachTalksData, outreachNewsData, academicPresentationsData ] = await Promise.all([
        fetch('newsData.json').then(r=>{ if(!r.ok) throw new Error(r.status); return r.json(); }),
        fetch('researchData.json').then(r=>{ if(!r.ok) throw new Error(r.status); return r.json(); }),
        fetch('teamData.json').then(r=>{ if(!r.ok) throw new Error(r.status); return r.json(); }),
        fetch('alumniData.json').then(r=>{ if(!r.ok) throw new Error(r.status); return r.json(); }),
        fetch('gamesData.json').then(r=>{ if(!r.ok) throw new Error(r.status); return r.json(); }),
        fetch('outreachTalksData.json').then(r=>{ if(!r.ok) throw new Error(r.status); return r.json(); }),
        fetch('outreachNewsData.json').then(r=>{ if(!r.ok) throw new Error(r.status); return r.json(); }),
        fetch('academicPresentationsData.json').then(r=>{ if(!r.ok) throw new Error(r.status); return r.json(); })
      ]);
      // expose globally for researchHub
      Object.assign(window,{ newsData, researchData, teamData, alumniData, gamesData, outreachTalksData, outreachNewsData, academicPresentationsData });
      Renderer.renderAllContent();
    } catch(e){
      console.error('Error loading data', e);
      const msg='An error occurred while loading content.';
      ['researchContentGrid','teamGrid','alumniGrid','newsList','newsCarouselTrack','gamesGrid','outreachTalksGrid','academicPresentationsGrid','outreachNewsList'].forEach(k=>{
        const el=DOMElements[k]; if(el) el.textContent=msg;
      });
    } finally {
      loaders.forEach((l,i)=>{ if(l) l.style.display='none'; if(sections[i]) sections[i].setAttribute('aria-busy','false'); });
    }
  }
  return { fetchAllData };
})();

// =========================
// Renderer (kept minimal here; your project may have more renderers)
// =========================
const Renderer = (() => {

  function resolveCollection(raw){ if(Array.isArray(raw)) return raw; if(raw && Array.isArray(raw.items)) return raw.items; return []; }

  function renderResearchItems(){
    const grid = DOMElements.researchContentGrid; if(!grid) return;
    grid.replaceChildren();
    const items = resolveCollection(window.researchData);
    if(!items.length){ grid.textContent='No research items available at the moment.'; return; }

    const team = resolveCollection(window.teamData);
    const alumni = resolveCollection(window.alumniData);
    const nameById=(id)=>{ const p=team.find(x=>String(x.id)===String(id)) || alumni.find(x=>String(x.id)===String(id)); return p?p.name:String(id); };

    const nodes = items.map(item=>{
      const img = item?.image ? Utils.createEl('img',{ src:Utils.sanitizeUrl(item.image), alt:Utils.escapeHTML(item.title||'Research image'), className:'research-card-img rounded-md mb-4 border border-primary-dark', loading:'lazy' }) : null;
      const title = Utils.createEl('h3',{ className:'text-lg font-semibold', text:item?.title||'' });
      const descShort = String(item?.description||'');
      const truncated = descShort.length>180 ? (descShort.slice(0,180)+'…') : descShort;
      const pTrunc = Utils.createEl('p',{ id:`truncated-text-research-${item?.id}`, text:truncated });
      const pFull  = Utils.createEl('p',{ id:`full-text-research-${item?.id}`, text:descShort }); if(descShort.length>180) pFull.style.display='none';
      const btn = Utils.createEl('button',{ className:'read-more-btn text-primary hover:underline text-sm mt-2', dataset:{ modalTarget:'open-research-modal', id:item?.id ?? item?.title }, text: (descShort.length>180?'Read More →':'More Info') });

      return Utils.createEl('div',{ className:'card rounded-lg p-6 text-center flex flex-col items-center' }, [img,title,pTrunc,pFull,btn].filter(Boolean));
    });
    grid.append(...nodes);
  }

  function renderTeamAndAlumni(){
    const grid = DOMElements.teamGrid; const agrid = DOMElements.alumniGrid;
    if(grid) grid.replaceChildren(); if(agrid) agrid.replaceChildren();
    const team = resolveCollection(window.teamData); const alumni = resolveCollection(window.alumniData);
    function personCard(p){
      const img = p?.image ? Utils.createEl('img',{ src:Utils.sanitizeUrl(p.image), alt:Utils.escapeHTML(p?.name||'Person'), className:'w-32 h-32 object-cover rounded-full mb-3 border border-primary-dark', loading:'lazy' }) : null;
      const name = Utils.createEl('h3',{ className:'text-base font-semibold', text:p?.name||'' });
      const role = Utils.createEl('p',{ className:'text-sm text-medium-text', text:p?.role||'' });
      const btn  = Utils.createEl('button',{ className:'read-more-btn text-primary hover:underline text-sm mt-2', dataset:{ modalTarget:'open-person-bio', id:p?.id }, text:'View Bio →' });
      return Utils.createEl('div',{ className:'card rounded-lg p-4 text-center flex flex-col items-center' }, [img,name,role,btn].filter(Boolean));
    }
    if(grid){ const nodes=team.map(personCard); if(nodes.length) grid.append(...nodes); else grid.textContent='No team members available at the moment.'; }
    if(agrid){ const nodes=alumni.map(personCard); if(nodes.length) agrid.append(...nodes); else agrid.textContent='No alumni available at the moment.'; }
  }

  function renderAllContent(){ renderResearchItems(); renderTeamAndAlumni(); }
  return { renderAllContent };
})();

// =========================
// Modal Manager
// =========================
const ModalManager = (() => {
  let lastFocusedElement = null;

  function openModal(overlay, triggerEl){
    lastFocusedElement = triggerEl || null;
    if(!overlay) return;
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden','false');
    const focusable = overlay.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const first = focusable[0]; const last = focusable[focusable.length-1] || first;
    function trap(e){
      if(e.key!=='Tab') return;
      if(e.shiftKey){ if(document.activeElement===first){ last?.focus(); e.preventDefault(); } }
      else { if(document.activeElement===last){ first?.focus(); e.preventDefault(); } }
    }
    overlay.addEventListener('keydown', trap);
    overlay._trapHandler = trap;
    (first||overlay).focus();
  }

  function closeModal(overlay){
    if(!overlay) return;
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden','true');
    if(overlay._trapHandler) overlay.removeEventListener('keydown', overlay._trapHandler);
    // Remove dynamic overlays from DOM, keep pre-defined ones
    if (!overlay.id) overlay.remove();
    if(lastFocusedElement) lastFocusedElement.focus();
  }

  function clear(el){ if(el){ while(el.firstChild) el.removeChild(el.firstChild); } }

  // -------- Research modal (pre-defined in index.html) --------
  function openResearchDescriptionModal(item, trigger){
    const overlay = DOMElements.researchDescriptionModal; if(!overlay || !item) return;

    // Left column: media + caption + credit
    if (DOMElements.researchModalMedia) {
      clear(DOMElements.researchModalMedia);
      const media = Utils.createSafeMedia(item.modalMedia || item.image);
      if (media) {
        if (media.tagName && media.tagName.toLowerCase() === 'img') {
          media.className = 'w-full h-auto rounded-md object-cover border border-primary-dark';
        }
        DOMElements.researchModalMedia.appendChild(media);
      }
    }
    if (DOMElements.researchModalCaption) {
      DOMElements.researchModalCaption.textContent = item.modalMediaCaption || '';
    }
    if (DOMElements.researchModalCredit) {
      // resolve credit id -> name from team/alumni
      const dataset = (Array.isArray(window.teamData) ? window.teamData : (window.teamData?.items||[]))
        .concat(Array.isArray(window.alumniData) ? window.alumniData : (window.alumniData?.items||[]));
      const person = dataset.find(p => String(p.id) === String(item.modalMediaCreditId));
      DOMElements.researchModalCredit.textContent = person ? `Credit: ${person.name}` : (item.modalMediaCreditId ? `Credit: ${item.modalMediaCreditId}` : '');
    }

    // Right column: title + description + associated members
    if (DOMElements.researchModalTitle) DOMElements.researchModalTitle.textContent = item.title || '';
    if (DOMElements.researchModalDescription) DOMElements.researchModalDescription.textContent = String(item.description || '');
    if (DOMElements.researchModalTeamMembers) {
      clear(DOMElements.researchModalTeamMembers);
      if (Array.isArray(item.teamMembers) && item.teamMembers.length) {
        const dataset = (Array.isArray(window.teamData) ? window.teamData : (window.teamData?.items||[]))
          .concat(Array.isArray(window.alumniData) ? window.alumniData : (window.alumniData?.items||[]));
        const label = Utils.createEl('strong',{ text:'Associated Members:' });
        const row = Utils.createEl('div',{ className:'mt-2 flex flex-wrap gap-2' });
        item.teamMembers.forEach(id => {
          const person = dataset.find(p => String(p.id) === String(id));
          row.appendChild(Utils.createEl('button',{
            className:'text-primary font-bold hover:underline', // bold green link style
            dataset:{ modalTarget:'open-person-bio', id },
            text: person ? person.name : String(id)
          }));
        });
        DOMElements.researchModalTeamMembers.appendChild(label);
        DOMElements.researchModalTeamMembers.appendChild(row);
      }
    }

    openModal(overlay, trigger);
  }

  // -------- Team/Alumni bio modal (dynamic overlay) --------
  function openPersonBioModal(person, trigger){
    const container = DOMElements.modalContainer || document.body;
    const overlay = Utils.createEl('div', { className:'modal-overlay', tabindex:'-1', role:'dialog', 'aria-modal':'true' });
    // Two-column content, keeping to site classes (no CSS changes required)
    const panel = Utils.createEl('div', { className:'modal-content flex flex-col md:flex-row items-start gap-8' });
    const closeBtn = Utils.createEl('button', { className:'modal-close', text:'×', dataset:{ closeModal:'true' }, 'aria-label':'Close' });
    closeBtn.addEventListener('click', () => closeModal(overlay));
    panel.appendChild(closeBtn);

    // Left: image
    const left = Utils.createEl('div', { className:'w-full md:w-1/2' });
    if (person?.image) {
      left.appendChild(Utils.createEl('img', {
        src: Utils.sanitizeUrl(person.image),
        alt: Utils.escapeHTML(person?.name || 'Person'),
        className: 'w-full h-auto rounded-md object-cover border border-primary-dark'
      }));
    }
    panel.appendChild(left);

    // Right: name/role/bio + links
    const right = Utils.createEl('div', { className:'w-full md:w-1/2 text-left' });
    right.appendChild(Utils.createEl('h3', { className:'text-2xl font-bold text-light-text', text: person?.name || '' }));
    if (person?.role) right.appendChild(Utils.createEl('p', { className:'text-sm text-medium-text mt-1', text: person.role }));
    if (person?.bio)  right.appendChild(Utils.createEl('p', { className:'text-sm text-medium-text mt-3', text: person.bio }));

    // Links: accept array of {label,url} or common individual fields
    const links = [];
    if (Array.isArray(person?.links)) {
      person.links.forEach(l => {
        if (l && l.label && l.url) links.push(l);
      });
    }
    // Common fallbacks
    if (person?.presentationsLink) links.push({ label:'Presentations', url: person.presentationsLink });
    if (person?.googleScholar)     links.push({ label:'Google Scholar', url: person.googleScholar });
    if (person?.website)           links.push({ label:'Website', url: person.website });
    if (person?.linkedin)          links.push({ label:'LinkedIn', url: person.linkedin });

    if (links.length) {
      const list = Utils.createEl('div', { className:'mt-4 flex flex-wrap gap-3' });
      links.forEach(({label,url}) => {
        const a = Utils.createEl('a', { href: Utils.sanitizeUrl(url,'#'), target:'_blank', rel:'noopener', className:'text-primary font-bold hover:underline', text: String(label) });
        list.appendChild(a);
      });
      right.appendChild(list);
    }

    panel.appendChild(right);
    overlay.appendChild(panel);
    container.appendChild(overlay);
    // Activate
    openModal(overlay, trigger);
    overlay.classList.add('active');
  }

  // -------- News & other existing modals (simple) --------
  function openNewsModal(newsItem, trigger){
    const m = DOMElements.newsDescriptionModal; if(!m || !newsItem) return;
    if (DOMElements.newsModalTitle) DOMElements.newsModalTitle.textContent = newsItem.title || '';
    if (DOMElements.newsModalDate)  DOMElements.newsModalDate.textContent  = newsItem.date || '';
    if (DOMElements.newsModalDescription) DOMElements.newsModalDescription.textContent = newsItem.description || newsItem.summary || '';
    if (DOMElements.newsModalImage) {
      const img = DOMElements.newsModalImage;
      img.src = newsItem.image ? Utils.sanitizeUrl(newsItem.image) : '';
      img.alt = Utils.escapeHTML(newsItem.title || 'News');
    }
    openModal(m, trigger);
  }

  // Delegated click handling for opening/closing
  function handleModalClicks(e){
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;

    // CLOSE: overlay click or button with data-close-modal / .modal-close
    if (target.classList.contains('modal-overlay')) { closeModal(target); return; }
    const closeBtn = target.closest('[data-close-modal]') || target.closest('.modal-close');
    if (closeBtn) { const ov = closeBtn.closest('.modal-overlay'); if (ov) closeModal(ov); return; }

    // OPEN variants
    const t = target.closest('[data-modal-target]'); if (!t) return;
    const type = t.getAttribute('data-modal-target'); const id = t.getAttribute('data-id');

    if (type === 'open-person-bio' && id != null) {
      const ds = (Array.isArray(window.teamData) ? window.teamData : (window.teamData?.items || []))
        .concat(Array.isArray(window.alumniData) ? window.alumniData : (window.alumniData?.items || []));
      const person = ds.find(p => String(p.id) === String(id));
      if (person) openPersonBioModal(person, t);
    } else if (type === 'open-research-modal' && id != null) {
      const items = Array.isArray(window.researchData) ? window.researchData : (window.researchData?.items || []);
      const item = items.find(x => String(x.id) === String(id) || String(x.title) === String(id));
      if (item) openResearchDescriptionModal(item, t);
    }
  }

  return { openModal, closeModal, handleModalClicks, openResearchDescriptionModal, openNewsModal, openPersonBioModal };
})();

// =========================
// Carousel (minimal, unchanged behaviour)
// =========================
const CarouselManager = (() => {
  let currentIndex = 0, slides = [], slideWidth = 0;
  function updateCarousel(){
    if (!DOMElements.newsCarouselTrack) return;
    slides = Array.from(DOMElements.newsCarouselTrack.children).filter(el => !el.classList.contains('loader'));
    if (!slides.length) return;
    slideWidth = slides[0].getBoundingClientRect().width;
    DOMElements.newsCarouselTrack.style.transform = 'translateX(' + (-slideWidth * currentIndex) + 'px)';
    if (DOMElements.carouselDotsContainer) {
      DOMElements.carouselDotsContainer.innerHTML='';
      slides.forEach((_,i)=>{
        const dot=document.createElement('button');
        dot.className = 'carousel-dot ' + (i===currentIndex?'active':'');
        dot.setAttribute('role','tab'); dot.setAttribute('aria-selected', i===currentIndex);
        dot.addEventListener('click', ()=>{ currentIndex=i; updateCarousel(); });
        DOMElements.carouselDotsContainer.appendChild(dot);
      });
    }
  }
  function setupCarousel(){
    if (!DOMElements.newsCarouselTrack) return;
    updateCarousel();
    DOMElements.carouselPrevBtn?.addEventListener('click', ()=>{ currentIndex = (currentIndex-1+slides.length)%slides.length; updateCarousel(); });
    DOMElements.carouselNextBtn?.addEventListener('click', ()=>{ currentIndex = (currentIndex+1)%slides.length; updateCarousel(); });
    window.addEventListener('resize', updateCarousel);
  }
  return { setupCarousel, updateCarousel };
})();

// =========================
// Navigation & extras (trimmed to essentials)
// =========================
const NavigationManager = (() => {
  function showPage(pageId){
    DOMElements.pageSections.forEach(section => {
      const isActive = section.id === pageId + '-page';
      section.classList.toggle('active', isActive);
      if (!isActive) section.querySelector('.fade-in-section')?.classList.remove('is-visible');
    });
    DOMElements.navLinks.forEach(link => {
      const isActive = link.hash === '#' + pageId;
      link.classList.toggle('active', isActive);
      if (isActive) link.setAttribute('aria-current', 'page');
    });
    const activeContent = document.querySelector('.page-section.active .fade-in-section');
    if (activeContent) setTimeout(()=>activeContent.classList.add('is-visible'), 100);
  }
  function handleNavClick(e){ e.preventDefault(); const pageId = e.currentTarget.hash.substring(1); showPage(pageId);
    if (!DOMElements.mobileMenu.classList.contains('hidden')) { DOMElements.mobileMenu.classList.add('hidden'); DOMElements.mobileMenuButton.setAttribute('aria-expanded','false'); } }
  return { showPage, handleNavClick };
})();

// =========================
// GDPR + Scroll + Collapsible (trim)
// =========================
const GDPRManager = (() => {
  function setupGDPRBanner(){
    const consent = localStorage.getItem('gdpr_consent_given');
    if (!consent && DOMElements.gdprConsentBanner) DOMElements.gdprConsentBanner.style.display='flex';
    DOMElements.acceptCookiesBtn?.addEventListener('click', ()=>{ localStorage.setItem('gdpr_consent_given','true'); DOMElements.gdprConsentBanner.style.display='none'; });
  }
  return { setupGDPRBanner };
})();

const ScrollManager = (() => {
  function setupScrollToTop(){
    if (!DOMElements.scrollToTopBtn) return;
    DOMElements.scrollToTopBtn.addEventListener('click', ()=>window.scrollTo({ top:0, behavior:'smooth' }));
    window.addEventListener('scroll', ()=>{ if (window.scrollY>300) DOMElements.scrollToTopBtn.style.display='block'; });
  }
  return { setupScrollToTop };
})();

const CollapsibleManager = (() => {
  function toggle(header){
    if (!header) return;
    const contentId = header.getAttribute('aria-controls');
    const content = contentId ? document.getElementById(contentId) : header.nextElementSibling;
    const isExpanded = header.getAttribute('aria-expanded') === 'true';
    const newState = !isExpanded;
    header.setAttribute('aria-expanded', String(newState));
    header.classList.toggle('expanded', newState);
    if (content) {
      content.classList.toggle('hidden', !newState);
      content.classList.toggle('expanded', newState);
      content.setAttribute('aria-hidden', String(!newState));
    }
  }
  function setupCollapsibleSections(){
    document.querySelectorAll('.collapsible-header').forEach(h=>{
      const contentId=h.getAttribute('aria-controls'); const content=contentId?document.getElementById(contentId):h.nextElementSibling;
      const isExpanded=h.getAttribute('aria-expanded')==='true';
      h.setAttribute('role', h.getAttribute('role') || 'button');
      h.setAttribute('tabindex', h.getAttribute('tabindex') || '0');
      if (content) { content.classList.toggle('hidden', !isExpanded); content.setAttribute('aria-hidden', String(!isExpanded)); }
    });
    document.addEventListener('click', (e)=>{ const h=e.target.closest?.('.collapsible-header'); if (h) toggle(h); });
    document.addEventListener('keydown', (e)=>{ if (e.key!=='Enter' && e.key!==' ') return; const h=e.target.closest?.('.collapsible-header'); if (h){ e.preventDefault(); toggle(h); } });
  }
  return { setupCollapsibleSections };
})();

// =========================
// App init
// =========================
const App = (() => {
  function init(){
    if (DOMElements.yearSpan) DOMElements.yearSpan.textContent = new Date().getFullYear();
    DataManager.fetchAllData().then(()=>{
      const initial = window.location.hash ? window.location.hash.substring(1) : 'home';
      NavigationManager.showPage(initial);
      CarouselManager.setupCarousel();
      setupEventListeners();
      GDPRManager.setupGDPRBanner();
    });
  }
  function setupEventListeners(){
    document.addEventListener('click', ModalManager.handleModalClicks);
    document.addEventListener('click', (e)=>{
      const close = e.target.closest?.('[data-close-modal]'); if (close){ const ov=close.closest('.modal-overlay'); if (ov) ModalManager.closeModal(ov); }
      if (e.target.classList?.contains('modal-overlay')) ModalManager.closeModal(e.target);
    });
    // Read-more collapse back to truncated state (only one-way in this build)
    document.addEventListener('click', (e)=>{
      const btn = e.target.closest('.read-more-btn'); if (!btn) return;
      const id = btn.getAttribute('data-target-id'); if (!id) return;
      const trunc = document.getElementById(`truncated-text-${id}`);
      const full = document.getElementById(`full-text-${id}`);
      if (trunc && full){ trunc.style.display='block'; full.style.display='none'; btn.textContent='Read More →'; btn.setAttribute('aria-expanded','false'); }
    });
    DOMElements.navLinks.forEach(link => link.addEventListener('click', NavigationManager.handleNavClick));
    DOMElements.navLinkHeader?.addEventListener('click', NavigationManager.handleNavClick);
    DOMElements.mobileMenuButton?.addEventListener('click', ()=>{
      const isHidden = DOMElements.mobileMenu.classList.toggle('hidden');
      DOMElements.mobileMenuButton.setAttribute('aria-expanded', String(!isHidden));
    });
    ScrollManager.setupScrollToTop();
    CollapsibleManager.setupCollapsibleSections();
  }
  return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
