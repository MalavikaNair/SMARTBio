/* SMARTBio Research Hub (robust mount + safe fallback)
   - Mount order: [data-research-hub], #research-hub, #researchHub, #research-content-grid
   - Waits for researchData; no duplicate render if target has children
   - Buttons open the existing research modal in main.js
*/
(function () {
  const MOUNT_SELECTORS = [
    '[data-research-hub]',
    '#research-hub',
    '#researchHub',
    '#research-content-grid' // graceful fallback
  ];

  const q = (s, r = document) => r.querySelector(s);
  const asArray = (raw) => Array.isArray(raw) ? raw : (raw && Array.isArray(raw.items) ? raw.items : []);
  const dataReady = () => {
    const d = window.researchData;
    return Array.isArray(d) || (d && Array.isArray(d.items));
  };

  function getMount() {
    for (const sel of MOUNT_SELECTORS) {
      const el = q(sel);
      if (el) return el;
    }
    return null;
  }

  function makeCard(item) {
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

  function renderInto(root, items) {
    // Avoid double-rendering if something is already there (e.g., main.js already filled it)
    if (root.children.length > 0 && root.querySelector('.card')) return;

    root.replaceChildren();
    if (!items.length) {
      root.textContent = 'No research items available at the moment.';
      return;
    }
    const grid = document.createElement('div');
    grid.className = 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3';
    items.forEach(item => grid.appendChild(makeCard(item)));
    root.appendChild(grid);
  }

  function init() {
    const mount = getMount();
    if (!mount) return; // nothing to render into

    // If data is present now, render. Otherwise, wait briefly for DataManager to populate it.
    const tryRender = () => {
      if (!dataReady()) return false;
      renderInto(mount, asArray(window.researchData));
      return true;
    };

    if (tryRender()) return;

    let tries = 0, max = 100; // ~10s
    const t = setInterval(() => {
      tries++;
      if (tryRender() || tries >= max) clearInterval(t);
    }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
