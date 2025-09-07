/* researchHub.js — XSS-hardened build (no innerHTML with untrusted data) */
(() => {
  'use strict';

  // --- small local safe utils (don’t depend on main.js loading order) ---
  function resolveCollection(raw) {
    if (Array.isArray(raw)) return raw;
    if (raw && Array.isArray(raw.items)) return raw.items;
    return [];
  }
  function escapeText(s) { return String(s ?? ''); }
  function isSafeUrl(url) {
    try {
      const u = new URL(String(url), window.location.href);
      if (u.protocol === 'http:' || u.protocol === 'https:') return true;
      // allow same-origin relative paths
      if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(String(url))) return true;
      return false;
    } catch { return false; }
  }
  function sanitizeUrl(url, fallback = '#') {
    return isSafeUrl(url) ? String(url) : fallback;
  }
  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null) continue;
      if (k === 'text') { node.textContent = escapeText(v); continue; }
      if (k === 'dataset' && typeof v === 'object') {
        for (const [dk, dv] of Object.entries(v)) node.dataset[dk] = String(dv);
        continue;
      }
      if (k in node) {
        try { node[k] = v; } catch { node.setAttribute(k, String(v)); }
      } else {
        node.setAttribute(k, String(v));
      }
    }
    for (const c of [].concat(children)) {
      if (c == null) continue;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return node;
  }

  // --- THREE.js hub ---
  window.initResearchHub = function initResearchHub(
    researchDataArg, newsDataArg, teamDataArg, gamesDataArg,
    outreachTalksDataArg, academicPresentationsDataArg
  ) {
    try {
      const researchData = resolveCollection(researchDataArg ?? window.researchData);
      const newsData = resolveCollection(newsDataArg ?? window.newsData);
      const teamData = resolveCollection(teamDataArg ?? window.teamData);
      const gamesData = resolveCollection(gamesDataArg ?? window.gamesData);
      const outreachTalksData = resolveCollection(outreachTalksDataArg ?? window.outreachTalksData);
      const academicPresentationsData = resolveCollection(academicPresentationsDataArg ?? window.academicPresentationsData);

      const researchContainer = document.getElementById('research-canvas-container');
      const researchCanvas = document.getElementById('research-canvas');
      if (!researchContainer || !researchCanvas) return;

      const width = researchContainer.clientWidth;
      const height = 600;
      researchCanvas.width = width;
      researchCanvas.height = height;

      if (!window.THREE) {
        console.warn('THREE not available; skipping 3D hub.');
        window.researchHubInitialized = true;
        return;
      }

      // Scene
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      camera.position.set(0, 0, 30);

      const renderer = new THREE.WebGLRenderer({ canvas: researchCanvas, antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

      const light = new THREE.AmbientLight(0xffffff, 1.0);
      scene.add(light);

      const group = new THREE.Group();
      scene.add(group);

      // Build nodes from unique themes present in your data
      const themeSet = new Set();
      [researchData, newsData, teamData, gamesData, outreachTalksData, academicPresentationsData]
        .forEach(list => resolveCollection(list).forEach(it => {
          (Array.isArray(it?.themes) ? it.themes : []).forEach(t => themeSet.add(String(t)));
        }));
      const themes = Array.from(themeSet);
      const radius = 10;
      const sphereGeo = new THREE.SphereGeometry(0.8, 24, 24);
      const colors = [0x10b981, 0x22d3ee, 0xa78bfa, 0xf59e0b, 0xf472b6, 0x38bdf8, 0x34d399];

      window.themeNodes = [];
      themes.forEach((name, i) => {
        const theta = (i / Math.max(1, themes.length)) * Math.PI * 2;
        const phi = (i % 2 ? 0.6 : 0.4) * Math.PI;
        const mat = new THREE.MeshStandardMaterial({ color: colors[i % colors.length] });
        const mesh = new THREE.Mesh(sphereGeo, mat);
        mesh.position.set(
          radius * Math.cos(theta) * Math.sin(phi),
          radius * Math.cos(phi) * (i % 3 ? 1 : -1),
          radius * Math.sin(theta) * Math.sin(phi)
        );
        mesh.name = name; // used by raycaster
        group.add(mesh);
        window.themeNodes.push(mesh);
      });

      // Save handles globally (existing code expects these)
      window.scene = scene;
      window.camera = camera;
      window.renderer = renderer;
      window.group = group;
      window.raycaster = new THREE.Raycaster();
      window.mouse = new THREE.Vector2();

      // Click to select theme
      researchCanvas.removeEventListener('click', window.onCanvasClick);
      researchCanvas.addEventListener('click', window.onCanvasClick);

      // Drag to rotate
      let isMouseDown = false;
      let previousMousePosition = { x: 0, y: 0 };
      const onMouseDown = (e) => { isMouseDown = true; previousMousePosition = { x: e.clientX, y: e.clientY }; };
      const onMouseUp = () => { isMouseDown = false; };
      const onMouseMove = (e) => {
        if (!isMouseDown) return;
        const dx = e.clientX - previousMousePosition.x;
        const dy = e.clientY - previousMousePosition.y;
        group.rotation.y += dx * 0.005;
        group.rotation.x += dy * 0.005;
        previousMousePosition = { x: e.clientX, y: e.clientY };
      };
      const onMouseLeave = () => { isMouseDown = false; };

      ['mousedown','mouseup','mousemove','mouseleave'].forEach(ev => researchCanvas.removeEventListener(ev, {mousedown:onMouseDown,mouseup:onMouseUp,mousemove:onMouseMove,mouseleave:onMouseLeave}[ev]));
      researchCanvas.addEventListener('mousedown', onMouseDown);
      researchCanvas.addEventListener('mouseup', onMouseUp);
      researchCanvas.addEventListener('mousemove', onMouseMove);
      researchCanvas.addEventListener('mouseleave', onMouseLeave);

      // Animate
      window.animateResearchHub = function animate() {
        requestAnimationFrame(window.animateResearchHub);
        if (!isMouseDown) group.rotation.y += 0.0005;
        renderer.render(scene, camera);
      };
      if (!window.researchHubInitialized) window.animateResearchHub();

      // Resize
      window.onResearchCanvasResize = function onResearchCanvasResize() {
        if (researchCanvas.offsetParent === null) return;
        const w = researchContainer.clientWidth;
        const h = 600;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        renderer.render(scene, camera);
      };
      window.removeEventListener('resize', window.onResearchCanvasResize);
      window.addEventListener('resize', window.onResearchCanvasResize);

      window.researchHubInitialized = true;
      renderer.render(scene, camera);
    } catch (e) {
      console.error('Error during initResearchHub:', e);
    }
  };

  // --- Raycast click handler (global) ---
  window.onCanvasClick = function onCanvasClick(event) {
    const researchCanvas = document.getElementById('research-canvas');
    if (!researchCanvas || !window.raycaster || !window.mouse || !window.camera || !window.themeNodes) return;

    const rect = researchCanvas.getBoundingClientRect();
    window.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    window.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    window.raycaster.setFromCamera(window.mouse, window.camera);
    const hits = window.raycaster.intersectObjects(window.themeNodes);
    if (hits.length) {
      const themeName = hits[0].object.name;
      const d = (x) => resolveCollection(x);
      window.updateDynamicContent(themeName, d(window.researchData), d(window.newsData), d(window.teamData), d(window.gamesData), d(window.outreachTalksData), d(window.academicPresentationsData));
    }
  };

  // --- Safe dynamic panel (global) ---
  window.updateDynamicContent = function updateDynamicContent(themeName, researchData, newsData, teamData, gamesData, outreachTalksData, academicPresentationsData) {
    const contentGrid = document.getElementById('dynamic-content-grid');
    const contentTitle = document.getElementById('dynamic-content-title');
    if (!contentGrid || !contentTitle) return;

    contentTitle.textContent = `${escapeText(themeName)} Theme`;
    contentGrid.replaceChildren();

    const hasTheme = (x) => Array.isArray(x?.themes) && x.themes.map(String).includes(String(themeName));

    const relatedResearch = resolveCollection(researchData).filter(hasTheme);
    const relatedNews = resolveCollection(newsData).filter(hasTheme);
    const relatedTeam = resolveCollection(teamData).filter(hasTheme);
    const relatedGames = resolveCollection(gamesData).filter(hasTheme);
    const relatedOutreach = resolveCollection(outreachTalksData).filter(hasTheme);
    const relatedAcademic = resolveCollection(academicPresentationsData).filter(hasTheme);

    function addSection(title, items, renderItem) {
      if (!items.length) return;
      const h4 = el('h4', { className: 'font-bold text-lg text-light-text border-b border-primary/20 pb-1 mt-4', text: title });
      contentGrid.appendChild(h4);
      items.forEach((item) => {
        const node = renderItem(item);
        if (node) contentGrid.appendChild(node);
      });
    }

    addSection('Projects', relatedResearch, (item) =>
      el('div', { className: 'text-sm p-2 rounded-md bg-slate-800/50' }, [escapeText(item?.title || '')])
    );

    addSection('News', relatedNews, (item) =>
      el('div', { className: 'text-sm p-2 rounded-md bg-slate-800/50' }, [escapeText(item?.title || '')])
    );

    addSection('Team', relatedTeam, (m) => {
      const row = el('div', { className: 'flex items-center gap-2 p-2 rounded-md bg-slate-800/50' });
      if (m?.image) {
        const img = el('img', { src: sanitizeUrl(m.image), alt: '', className: 'w-8 h-8 rounded-full', loading: 'lazy' });
        row.appendChild(img);
      }
      row.appendChild(el('span', { className: 'flex-grow text-sm', text: m?.name || '' }));
      // Correct modal attributes for ModalManager
      row.appendChild(el('button', {
        className: 'text-xs text-primary hover:underline',
        dataset: { modalTarget: 'open-person-bio', id: m?.id },
        text: 'Bio'
      }));
      return row;
    });

    addSection('Games', relatedGames, (g) => {
      const row = el('div', { className: 'flex items-center gap-2 p-2 rounded-md bg-slate-800/50' });
      if (g?.thumbnail) {
        row.appendChild(el('img', { src: sanitizeUrl(g.thumbnail), alt: '', className: 'w-8 h-8 rounded-full', loading: 'lazy' }));
      }
      row.appendChild(el('span', { className: 'flex-grow text-sm', text: g?.title || '' }));
      if (g?.file) {
        const a = el('a', { href: sanitizeUrl(g.file), target: '_blank', rel: 'noopener', className: 'text-xs text-primary hover:underline', text: 'Play' });
        row.appendChild(a);
      }
      return row;
    });

    addSection('Outreach Talks', relatedOutreach, (t) => {
      const names = Array.isArray(t?.speakerIds) ? t.speakerIds : [];
      const speakerNames = names
        .map(id => (resolveCollection(window.teamData).find(p => String(p.id) === String(id)) ||
                    resolveCollection(window.alumniData).find(a => String(a.id) === String(id)))?.name)
        .filter(Boolean);
      const box = el('div', { className: 'text-sm p-2 rounded-md bg-slate-800/50' });
      box.appendChild(el('p', { className: 'font-semibold', text: t?.title || '' }));
      box.appendChild(el('p', { className: 'text-xs text-light-text/70', text: `Speaker(s): ${speakerNames.length ? speakerNames.join(', ') : 'N/A'}` }));
      return box;
    });

    addSection('Academic Presentations', relatedAcademic, (p) => {
      const names = Array.isArray(p?.speakerIds) ? p.speakerIds : [];
      const speakerNames = names
        .map(id => (resolveCollection(window.teamData).find(x => String(x.id) === String(id)) ||
                    resolveCollection(window.alumniData).find(a => String(a.id) === String(id)))?.name)
        .filter(Boolean);
      const box = el('div', { className: 'text-sm p-2 rounded-md bg-slate-800/50' });
      box.appendChild(el('p', { className: 'font-semibold', text: p?.title || '' }));
      box.appendChild(el('p', { className: 'text-xs text-light-text/70', text: `Speaker(s): ${speakerNames.length ? speakerNames.join(', ') : 'N/A'}` }));
      return box;
    });
  };
})();
