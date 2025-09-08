/* SMARTBio Research Hub — resilient render + modal wiring
   - No global function calls; uses delegated .open-modal-btn from main.js
   - Tolerates different container ids/attrs
*/

(function () {
  const SELECTOR = '[data-research-hub], #research-hub, #researchHub';

  function getContainer() {
    return document.querySelector(SELECTOR);
  }

  function dataReady() {
    const has = (x) => Array.isArray(x) || (x && Array.isArray(x.items));
    return has(window.teamData) || has(window.alumniData);
  }

  function asArray(raw) {
    if (Array.isArray(raw)) return raw;
    if (raw && Array.isArray(raw.items)) return raw.items;
    return [];
  }

  function personCard(p) {
    const card = document.createElement('div');
    card.className = 'card rounded-lg p-6 text-center flex flex-col items-center';

    if (p?.image) {
      const img = document.createElement('img');
      img.src = p.image;
      img.alt = (p?.name || 'Member') + ' photo';
      img.loading = 'lazy';
      img.className = 'w-24 h-24 object-cover rounded-full mb-3';
      card.appendChild(img);
    }

    const name = document.createElement('h3');
    name.className = 'text-lg font-semibold';
    name.textContent = p?.name || '';
    card.appendChild(name);

    if (p?.role) {
      const role = document.createElement('p');
      role.className = 'text-sm text-medium-text';
      role.textContent = p.role;
      card.appendChild(role);
    }

    const bioBtn = document.createElement('a');
    bioBtn.href = '#';
    bioBtn.className = 'open-modal-btn inline-block font-bold text-gray-900 hover:underline mt-2';
    // 🔑 main.js listens for .open-modal-btn and reads dataset.modalTarget as the personId
    bioBtn.dataset.modalTarget = String(p?.id ?? '');
    bioBtn.textContent = 'Bio →';
    card.appendChild(bioBtn);

    return card;
  }

  function render() {
    const root = getContainer();
    if (!root) return;

    root.replaceChildren();

    const team = asArray(window.teamData);
    const alumni = asArray(window.alumniData);

    if (!team.length && !alumni.length) {
      root.textContent = 'No people to show right now.';
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3';

    // Render team first, then alumni
    team.forEach(p => grid.appendChild(personCard(p)));
    alumni.forEach(p => grid.appendChild(personCard(p)));

    root.appendChild(grid);
  }

  function init() {
    // Try immediately after DOM is ready
    const tryRender = () => {
      if (!getContainer()) return false;
      if (dataReady()) { render(); return true; }
      return false;
    };

    if (tryRender()) return;

    // Poll briefly until data arrives (DataManager in main.js populates window.*)
    let attempts = 0;
    const max = 50; // ~5s at 100ms
    const timer = setInterval(() => {
      attempts++;
      if (tryRender() || attempts >= max) clearInterval(timer);
    }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
