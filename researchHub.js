/* SMARTBio Research Hub (resilient)
   - Renders research cards from window.researchData when available
   - Works with existing main.js modal delegation
   - Optional live search via #research-hub-search
*/
(function () {
  const CONTAINER_SELECTOR = '[data-research-hub], #research-hub, #researchHub';

  function q(sel, root = document) { return root.querySelector(sel); }
  function qa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

  function dataReady() {
    const d = window.researchData;
    return Array.isArray(d) || (d && Array.isArray(d.items));
  }
  function asArray(raw) {
    if (Array.isArray(raw)) return raw;
    if (raw && Array.isArray(raw.items)) return raw.items;
    return [];
  }

  function card(item) {
    const el = document.createElement('div');
    el.className = 'card rounded-lg p-6 text-center flex flex-col items-center';

    if (item?.image) {
      const img = document.createElement('img');
      img.src = item.image;
      img.alt = (item?.title || 'Research image');
      img.loading = 'lazy';
      img.className = 'research-card-img rounded-md mb-4 border border-primary-dark';
      el.appendChild(img);
    }

    const h3 = document.createElement('h3');
    h3.className = 'text-lg font-semibold';
    h3.textContent = item?.title || '';
    el.appendChild(h3);

    const desc = String(item?.description || '');
    const short = desc.length > 180 ? desc.slice(0, 180) + '…' : desc;
    const p = document.createElement('p');
    p.className = 'text-medium-text mt-2';
    p.textContent = short;
    el.appendChild(p);

    const btn = document.createElement('button');
    btn.className = 'mt-3 text-primary font-semibold hover:underline';
    btn.dataset.modalTarget = 'open-research-modal';
    btn.dataset.id = String(item?.id ?? item?.title ?? '');
    btn.textContent = 'Read More →';
    el.appendChild(btn);

    return el;
  }

  function render(list, root) {
    root.replaceChildren();
    if (!list.length) {
      root.textContent = 'No research items available at the moment.';
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3';
    list.forEach(item => grid.appendChild(card(item)));
    root.appendChild(grid);
  }

  function applySearch(items, term) {
    const t = term.trim().toLowerCase();
    if (!t) return items;
    return items.filter(it => {
      const hay = [
        it?.title, it?.description, it?.tags?.join(' ')
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(t);
    });
  }

  function init() {
    const container = q(CONTAINER_SELECTOR);
    if (!container) return; // nothing to render into

    const doRender = () => {
      const items = asArray(window.researchData);
      const searchEl = q('#research-hub-search');
      const filtered = searchEl ? applySearch(items, searchEl.value || '') : items;
      render(filtered, container);
    };

    // Live search support (if present)
    const searchEl = q('#research-hub-search');
    if (searchEl) {
      searchEl.addEventListener('input', doRender);
    }

    // Render now if data is ready, otherwise wait a bit for DataManager
    if (dataReady()) {
      doRender();
      return;
    }

    let tries = 0, max = 100; // ~10s
    const timer = setInterval(() => {
      tries++;
      if (dataReady()) {
        clearInterval(timer);
        doRender();
      } else if (tries >= max) {
        clearInterval(timer);
        container.textContent = 'Research data not available.';
      }
    }, 100);
  }

  // Handle late-mounted container too
  function waitForContainer() {
    if (q(CONTAINER_SELECTOR)) { init(); return; }
    const mo = new MutationObserver(() => {
      if (q(CONTAINER_SELECTOR)) { mo.disconnect(); init(); }
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForContainer);
  } else {
    waitForContainer();
  }
})();
