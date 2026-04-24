/* XSS-hardened & CSP-friendly version of researchHub.js
 * - Replaces innerHTML with DOM creation + textContent
 * - Validates and restricts URLs to same-origin http(s) or relative paths
 * - Avoids injecting untrusted HTML and inline event handlers
 * - Keeps original functionality (Three.js scene, clicks, content updates)
 * - Adds SMART letter badges inside each colored theme node
 * - Shows related Publications when a theme node is clicked
 */

// Global variables for Three.js scene, camera, etc., attached to window for global access
window.scene = null;
window.camera = null;
window.renderer = null;
window.group = null;
window.raycaster = null;
window.mouse = null;
window.themeNodes = [];
window.researchHubInitialized = false; // Flag to ensure initialization only runs once

// --- Debug logger ---
const RH_DEBUG = true; // flip to false to silence logs
function dlog(...args) {
  if (RH_DEBUG) {
    console.log('[ResearchHub]', ...args);
  }
}

// --- Helpers: sanitization & DOM utils ---

/**
 * Returns true for:
 *   - Absolute http/https URLs on the same origin  (e.g. https://smart-biomaterials.com/…)
 *   - Relative paths/URLs                          (e.g. ./games/foo.html, assets/img/x.png)
 *
 * Rejects:
 *   - javascript:, data:, blob:, and other potentially dangerous schemes
 *   - Absolute URLs pointing to a different origin
 */
const isSafeUrl = (value) => {
  if (!value) return false;
  const s = String(value).trim();
  // Relative path: starts with ./, ../, /, or is just a bare filename/path with no scheme
  if (/^\.{0,2}\//.test(s) || /^[^:]+$/.test(s)) return true;
  // Absolute URL — must be http/https and same origin
  try {
    const u = new URL(s, window.location.origin);
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.origin === window.location.origin;
  } catch (_) { return false; }
};

// Keep the old name as an alias so nothing else breaks
const isHttpUrlSameOrigin = isSafeUrl;

const safeSetImgSrc = (img, url) => {
  if (isSafeUrl(url)) {
    img.src = String(url);
  } else {
    img.removeAttribute('src');
  }
};

const safeSetAnchorHref = (a, url) => {
  if (isSafeUrl(url)) {
    a.href = String(url);
  } else {
    a.removeAttribute('href');
  }
};

const clearChildren = (el) => {
  while (el.firstChild) el.removeChild(el.firstChild);
};

const makeSectionHeader = (text) => {
  const h = document.createElement('h4');
  h.className = 'font-bold text-lg text-light-text border-b border-primary/20 pb-1 mt-4';
  h.textContent = text;
  return h;
};

const makeDiv = (className) => {
  const d = document.createElement('div');
  if (className) d.className = className;
  return d;
};

/* ======================
   THEME BADGE UTILITIES
   ====================== */
/**
 * Create a high-DPI sprite that renders a centered single letter.
 */
function createLetterBadgeSprite(letter) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.font = 'bold 300px "Exo 2", sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  ctx.lineWidth = 28;
  ctx.strokeStyle = '#000000';
  ctx.strokeText(letter, size / 2, size / 2);

  ctx.fillStyle = '#cfd4cf';
  ctx.fillText(letter, size / 2, size / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = Math.min(8, texture.anisotropy || 8);
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false
  });

  const sprite = new THREE.Sprite(material);
  return sprite;
}

/**
 * Attach a letter badge sprite to a spherical theme node.
 */
function addBadgeToThemeNode(themeMesh, letter, nodeRadius = 0.3) {
  if (!themeMesh || !letter) return;
  if (themeMesh.userData && themeMesh.userData.badgeAttached) return;

  const badge = createLetterBadgeSprite(letter);
  const spriteSize = nodeRadius * 1.3;
  badge.scale.set(spriteSize, spriteSize, 1);
  badge.position.set(0, 0, nodeRadius + 0.02);

  themeMesh.add(badge);
  themeMesh.userData = themeMesh.userData || {};
  themeMesh.userData.badgeAttached = true;
}

// Function to initialize the Three.js research hub
window.initResearchHub = function(researchData, newsData, teamData, gamesData, outreachTalksData, academicPresentationsData, alumniData) {
  const researchContainer = document.getElementById('research-canvas-container');
  const researchCanvas = document.getElementById('research-canvas');

  if (!researchCanvas.dataset.rhClickBound) {
    researchCanvas.addEventListener('click', (event) => {
      const rect = researchCanvas.getBoundingClientRect();
      window.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      window.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      window.raycaster.setFromCamera(window.mouse, window.camera);
      const hits = window.raycaster.intersectObjects(window.themeNodes);
      if (hits.length > 0) {
        const themeName = hits[0].object.name;
        window.updateDynamicContent(
          themeName,
          window.researchData,
          window.newsData,
          window.teamData,
          window.gamesData,
          window.outreachTalksData,
          window.academicPresentationsData,
          window.alumniData || []
        );
      }
    }, { passive: true });
    researchCanvas.dataset.rhClickBound = '1';
  }

  try {
    window.researchData = Array.isArray(researchData) ? researchData.slice() : [];
    window.newsData = Array.isArray(newsData) ? newsData.slice() : [];
    window.teamData = Array.isArray(teamData) ? teamData.slice() : [];
    window.gamesData = Array.isArray(gamesData) ? gamesData.slice() : [];
    window.outreachTalksData = Array.isArray(outreachTalksData) ? outreachTalksData.slice() : [];
    window.academicPresentationsData = Array.isArray(academicPresentationsData) ? academicPresentationsData.slice() : [];
    window.alumniData = Array.isArray(alumniData) ? alumniData.slice() : [];

    window.scene = new THREE.Scene();
    window.camera = new THREE.PerspectiveCamera(75, researchContainer.clientWidth / 600, 0.1, 1000);
    window.renderer = new THREE.WebGLRenderer({ canvas: researchCanvas, alpha: true, antialias: true });
    window.renderer.setSize(researchContainer.clientWidth, 600);
    window.renderer.setPixelRatio(window.devicePixelRatio);

    window.group = new THREE.Group();
    window.scene.add(window.group);

    const points = [];
    const numPoints = 50;
    for (let i = 0; i < numPoints; i++) {
      const x = (Math.random() - 0.5) * 4;
      const y = (Math.random() - 0.5) * 4;
      const z = (Math.random() - 0.5) * 4;
      points.push(new THREE.Vector3(x, y, z));
    }
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x9ca3af, transparent: true, opacity: 0.3 });
    for (let i = 0; i < numPoints; i++) {
      for (let j = i + 1; j < numPoints; j++) {
        if (points[i].distanceTo(points[j]) < 1.5) {
          const geometry = new THREE.BufferGeometry().setFromPoints([points[i], points[j]]);
          const line = new THREE.Line(geometry, lineMaterial);
          window.group.add(line);
        }
      }
    }
    const nodeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const nodeMaterial = new THREE.MeshBasicMaterial({ color: 0x9ca3af });
    points.forEach(p => {
      const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
      node.position.copy(p);
      window.group.add(node);
    });

    const themes = [
      { name: 'Sensing',       color: 0xfacc15, position: new THREE.Vector3( 3,  2,  0) },
      { name: 'Modulating',    color: 0xef4444, position: new THREE.Vector3(-3,  2,  0) },
      { name: 'Adaptive',      color: 0x3b82f6, position: new THREE.Vector3( 0, -2,  3) },
      { name: 'Regenerative',  color: 0x34d399, position: new THREE.Vector3( 2, -2, -3) },
      { name: 'Therapeutic',   color: 0x8b5cf6, position: new THREE.Vector3(-2, -2, -3) }
    ];
    window.themeNodes = [];
    themes.forEach(theme => {
      const themeNodeGeo = new THREE.SphereGeometry(0.3, 16, 16);
      const themeNodeMat = new THREE.MeshStandardMaterial({ color: theme.color, metalness: 0.3, roughness: 0.5 });
      const themeNode = new THREE.Mesh(themeNodeGeo, themeNodeMat);
      themeNode.position.copy(theme.position);
      themeNode.name = theme.name;
      window.group.add(themeNode);

      const closestPoint = points.reduce((prev, curr) => prev.distanceTo(theme.position) < curr.distanceTo(theme.position) ? prev : curr);
      const connectorGeo = new THREE.BufferGeometry().setFromPoints([theme.position, closestPoint]);
      const connectorLine = new THREE.Line(connectorGeo, new THREE.LineBasicMaterial({ color: theme.color, transparent: true, opacity: 0.5 }));
      window.group.add(connectorLine);

      const letter = (theme.name && theme.name[0]) ? theme.name[0].toUpperCase() : '';
      addBadgeToThemeNode(themeNode, letter, 0.3);

      window.themeNodes.push(themeNode);
    });

    const light = new THREE.DirectionalLight(0xffffff, 1.5);
    light.position.set(5, 5, 5);
    window.scene.add(light);
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    window.scene.add(ambientLight);

    window.camera.position.z = 8;

    window.raycaster = new THREE.Raycaster();
    window.mouse = new THREE.Vector2();

    if (!researchCanvas.dataset.rhClickBound) {
      researchCanvas.addEventListener('click', (e) => {
        if (typeof window.onCanvasClick === 'function') {
          window.onCanvasClick(e);
        }
      }, { passive: true });
      researchCanvas.dataset.rhClickBound = '1';
    }

    let isMouseDown = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = (e) => { isMouseDown = true; previousMousePosition = { x: e.clientX, y: e.clientY }; };
    const onMouseUp = () => { isMouseDown = false; };
    const onMouseMove = (e) => {
      if (!isMouseDown) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;
      window.group.rotation.y += deltaX * 0.005;
      window.group.rotation.x += deltaY * 0.005;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };
    const onMouseLeave = () => { isMouseDown = false; };

    researchCanvas.removeEventListener('mousedown', onMouseDown);
    researchCanvas.removeEventListener('mouseup', onMouseUp);
    researchCanvas.removeEventListener('mousemove', onMouseMove);
    researchCanvas.removeEventListener('mouseleave', onMouseLeave);

    researchCanvas.addEventListener('mousedown', onMouseDown);
    researchCanvas.addEventListener('mouseup', onMouseUp);
    researchCanvas.addEventListener('mousemove', onMouseMove);
    researchCanvas.addEventListener('mouseleave', onMouseLeave);

    window.animateResearchHub = function() {
      requestAnimationFrame(window.animateResearchHub);
      if (!isMouseDown) {
        window.group.rotation.y += 0.0005;
      }
      if (window.renderer && window.scene && window.camera) {
        window.renderer.render(window.scene, window.camera);
      } else {
        console.warn('Renderer, scene or camera not ready for rendering in animateResearchHub.');
      }
    };

    if (!window.researchHubInitialized) {
      window.animateResearchHub();
    }

    window.removeEventListener('resize', window.onResearchCanvasResize);
    window.onResearchCanvasResize = function() {
      if (researchCanvas.offsetParent !== null && window.camera && window.renderer) {
        window.camera.aspect = researchContainer.clientWidth / 600;
        window.camera.updateProjectionMatrix();
        window.renderer.setSize(researchContainer.clientWidth, 600);
        window.renderer.render(window.scene, window.camera);
      } else {
        console.log('Skipping resize: canvas not visible or Three.js components not ready.');
      }
    };
    window.addEventListener('resize', window.onResearchCanvasResize);

    window.initResearchHubLegacy = function(r,n,t,g){ return window.initResearchHub(r,n,t,g, [], [], []); };

    window.researchHubInitialized = true;

    if (window.renderer && window.scene && window.camera) {
      window.renderer.render(window.scene, window.camera);
    }

  } catch (e) {
    console.error('Error during initResearchHub execution:', e);
  }
};

// Function to handle clicks on theme nodes (made global)
window.onCanvasClick = function(event) {
  const researchCanvas = document.getElementById('research-canvas');
  if (!researchCanvas) {
    console.warn('onCanvasClick: research-canvas not found.');
    return;
  }

  if (!window.raycaster || !window.mouse || !window.camera || !window.themeNodes) {
    console.error('Raycaster, mouse, camera, or themeNodes not initialized for onCanvasClick.');
    return;
  }

  const rect = researchCanvas.getBoundingClientRect();
  window.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  window.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  window.raycaster.setFromCamera(window.mouse, window.camera);
  const intersects = window.raycaster.intersectObjects(window.themeNodes);

  if (intersects.length > 0) {
    const themeName = intersects[0].object.name;
    if (window.researchData && window.newsData && window.teamData && window.gamesData && window.outreachTalksData && window.academicPresentationsData) {
      window.updateDynamicContent(
        themeName,
        window.researchData,
        window.newsData,
        window.teamData,
        window.gamesData,
        window.outreachTalksData,
        window.academicPresentationsData,
        window.alumniData || []
      );
    } else {
      console.error('Data (researchData, newsData, etc.) not available for updateDynamicContent.');
    }
  } else {
    dlog('No theme node clicked.');
  }
};

// Function to update the content panel based on selected theme (made global)
// ===============================
// TWO-COLUMN TAB SYSTEM (SAFE)
// ===============================
function createTwoColumnTabs(tabs, defaultKey) {
  const wrapper = makeDiv('grid grid-cols-1 md:grid-cols-4 gap-4');

  const nav = makeDiv('flex md:flex-col gap-2');
  const right = makeDiv('md:col-span-3 flex flex-col gap-3');

  const controls = makeDiv('flex flex-wrap items-center gap-2');
  const content = makeDiv('');

  let activeKey = defaultKey || Object.keys(tabs)[0];
  let searchTerm = '';
  let sortMode = 'default';

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search...';
  searchInput.className = 'px-2 py-1 text-sm rounded bg-slate-800 border border-slate-600';

  searchInput.addEventListener('input', () => {
    searchTerm = searchInput.value.toLowerCase();
    render();
  });

  const sortBtn = document.createElement('button');
  sortBtn.type = 'button';
  sortBtn.className = 'px-2 py-1 text-xs border border-primary text-primary rounded';

  sortBtn.addEventListener('click', () => {
    sortMode =
      sortMode === 'default' ? 'az' :
      sortMode === 'az' ? 'newest' :
      'default';
    render();
  });

  function render() {
    clearChildren(nav);
    clearChildren(content);

    Object.entries(tabs).forEach(([key, tab]) => {
      const btn = document.createElement('button');
      btn.type = 'button';

      btn.className = `text-left px-3 py-2 rounded-lg text-sm border flex items-center gap-2 ${
        key === activeKey
          ? 'bg-primary text-white border-primary'
          : 'border-primary text-primary hover:bg-primary/20'
      }`;

      const icon = document.createElement('span');
      icon.textContent = tab.icon || '•';

      const label = document.createElement('span');
      label.textContent = tab.label;

      btn.appendChild(icon);
      btn.appendChild(label);

      btn.addEventListener('click', () => {
        activeKey = key;
        render();
      });

      nav.appendChild(btn);
    });

    clearChildren(controls);
    sortBtn.textContent =
      sortMode === 'az' ? 'A–Z' :
      sortMode === 'newest' ? 'Newest' : 'Default';

    controls.appendChild(searchInput);
    controls.appendChild(sortBtn);

    const raw = tabs[activeKey].items || [];

    let filtered = raw.filter(item =>
      (item.title || item.name || '').toLowerCase().includes(searchTerm)
    );

    if (sortMode === 'az') {
      filtered.sort((a, b) =>
        (a.title || a.name || '').localeCompare(b.title || b.name || '')
      );
    }

    if (sortMode === 'newest') {
      filtered.sort((a, b) => (b.year || 0) - (a.year || 0));
    }

    content.appendChild(tabs[activeKey].render(filtered));
  }

  render();

  right.appendChild(controls);
  right.appendChild(content);

  wrapper.appendChild(nav);
  wrapper.appendChild(right);

  return wrapper;
}


// ===============================
// SAFE CLICKABLE CARDS
// ===============================
function createClickableCard(text, modalTarget, id) {
  const c = makeDiv('card p-3 text-sm cursor-pointer hover:bg-slate-700/30');
  c.textContent = text || '';

  if (modalTarget && id !== -1 && id !== undefined) {
    c.dataset.modalTarget = modalTarget;
    c.dataset.id = String(id);
  }

  return c;
}

function createTeamCard(item) {
  const c = makeDiv('card p-2 flex items-center gap-2 cursor-pointer hover:bg-slate-700/30');

  const img = document.createElement('img');
  img.className = 'w-8 h-8 rounded-full';
  safeSetImgSrc(img, item.image);

  const name = document.createElement('span');
  name.textContent = item.name || '';

  c.appendChild(img);
  c.appendChild(name);

  if (item.id) {
    c.dataset.modalTarget = 'open-person-bio';
    c.dataset.id = String(item.id);
  }

  return c;
}


// ===============================
// NEW MAIN RENDER
// ===============================
window.updateDynamicContent = function(
  themeName,
  researchData,
  newsData,
  teamData,
  gamesData,
  outreachTalksData,
  academicPresentationsData,
  alumniData = []
) {
  const contentGrid = document.getElementById('dynamic-content-grid');
  const contentTitle = document.getElementById('dynamic-content-title');

  contentTitle.textContent = `${themeName} Theme`;
  clearChildren(contentGrid);

  const filter = (arr) =>
    (Array.isArray(arr) ? arr : []).filter(x =>
      Array.isArray(x.themes) && x.themes.includes(themeName)
    );

  const relatedResearch = filter(researchData);
  const relatedNews = filter(newsData);
  const relatedTeam = filter(teamData);
  const relatedTalks = filter(outreachTalksData);
  const relatedPres = filter(academicPresentationsData);

  const publications = Array.isArray(window.publicationsData)
    ? window.publicationsData
    : (window.publicationsData?.items || []);

  const relatedPubs = publications.filter(p =>
    Array.isArray(p.themes) &&
    p.themes.some(t => t.toLowerCase() === themeName.toLowerCase())
  );

  const tabs = {};

  // PROJECTS (DEFAULT)
  if (relatedResearch.length) {
    tabs.projects = {
      label: `Projects (${relatedResearch.length})`,
      icon: '🧪',
      items: relatedResearch,
      render: (items) => {
        const grid = makeDiv('grid grid-cols-1 sm:grid-cols-2 gap-3');

        items.forEach(item => {
          const idx = researchData.findIndex(r => r.id === item.id);
          grid.appendChild(createClickableCard(item.title, 'open-research-modal', idx));
        });

        return grid;
      }
    };
  }

  if (relatedPubs.length) {
    tabs.publications = {
      label: `Publications (${relatedPubs.length})`,
      icon: '📄',
      items: relatedPubs,
      render: (items) => {
        const grid = makeDiv('grid grid-cols-1 sm:grid-cols-2 gap-3');
        items.forEach(p => grid.appendChild(createClickableCard(p.title)));
        return grid;
      }
    };
  }

  if (relatedTeam.length) {
    tabs.team = {
      label: `Team (${relatedTeam.length})`,
      icon: '👥',
      items: relatedTeam,
      render: (items) => {
        const grid = makeDiv('grid grid-cols-1 sm:grid-cols-2 gap-3');
        items.forEach(t => grid.appendChild(createTeamCard(t)));
        return grid;
      }
    };
  }

  if (relatedNews.length) {
    tabs.news = {
      label: `News (${relatedNews.length})`,
      icon: '📰',
      items: relatedNews,
      render: (items) => {
        const grid = makeDiv('grid grid-cols-1 sm:grid-cols-2 gap-3');
        items.forEach(n => {
          const idx = newsData.findIndex(x => x.id === n.id);
          grid.appendChild(createClickableCard(n.title, 'open-news-modal', idx));
        });
        return grid;
      }
    };
  }

  if (relatedTalks.length) {
    tabs.talks = {
      label: `Talks (${relatedTalks.length})`,
      icon: '🎤',
      items: relatedTalks,
      render: (items) => {
        const grid = makeDiv('grid grid-cols-1 sm:grid-cols-2 gap-3');
        items.forEach(t => {
          const idx = outreachTalksData.findIndex(x => x.id === t.id);
          grid.appendChild(createClickableCard(t.title, 'open-outreach-talk-modal', idx));
        });
        return grid;
      }
    };
  }

  if (relatedPres.length) {
    tabs.presentations = {
      label: `Presentations (${relatedPres.length})`,
      icon: '📊',
      items: relatedPres,
      render: (items) => {
        const grid = makeDiv('grid grid-cols-1 sm:grid-cols-2 gap-3');
        items.forEach(p => {
          const idx = academicPresentationsData.findIndex(x => x.id === p.id);
          grid.appendChild(createClickableCard(p.title, 'open-academic-presentation-modal', idx));
        });
        return grid;
      }
    };
  }

  if (!Object.keys(tabs).length) {
    const empty = makeDiv('text-sm text-medium-text');
    empty.textContent = 'No content for this theme';
    contentGrid.appendChild(empty);
    return;
  }

  contentGrid.appendChild(createTwoColumnTabs(tabs, 'projects'));
};

  contentTitle.textContent = `${themeName} Theme`;
  clearChildren(contentGrid);

  const safeFilter = (arr) => Array.isArray(arr) ? arr.filter(Boolean) : [];
  const relatedResearch = safeFilter(researchData).filter(r => Array.isArray(r.themes) && r.themes.includes(themeName));
  const relatedNews = safeFilter(newsData).filter(n => Array.isArray(n.themes) && n.themes.includes(themeName));
  const relatedTeam = safeFilter(teamData).filter(t => Array.isArray(t.themes) && t.themes.includes(themeName));
  const relatedGames = safeFilter(gamesData).filter(g => Array.isArray(g.themes) && g.themes.includes(themeName));
  const relatedOutreachTalks = safeFilter(outreachTalksData).filter(talk => Array.isArray(talk.themes) && talk.themes.includes(themeName));
  const relatedAcademicPresentations = safeFilter(academicPresentationsData).filter(pres => Array.isArray(pres.themes) && pres.themes.includes(themeName));

  // ── Projects ──────────────────────────────────────────────────────────────
  if (relatedResearch.length > 0) {
    contentGrid.appendChild(makeSectionHeader('Projects'));
    relatedResearch.forEach(item => {
      const d = makeDiv('text-sm p-2 rounded-md bg-slate-800/50');
      d.textContent = String(item.title || '');
      contentGrid.appendChild(d);
    });
  }

  // ── News ──────────────────────────────────────────────────────────────────
  if (relatedNews.length > 0) {
    contentGrid.appendChild(makeSectionHeader('News'));
    relatedNews.forEach(item => {
      const d = makeDiv('text-sm p-2 rounded-md bg-slate-800/50');
      d.textContent = String(item.title || '');
      contentGrid.appendChild(d);
    });
  }

  // ── Team ──────────────────────────────────────────────────────────────────
  if (relatedTeam.length > 0) {
    contentGrid.appendChild(makeSectionHeader('Team'));
    relatedTeam.forEach(item => {
      const row = makeDiv('flex items-center gap-2 p-2 rounded-md bg-slate-800/50');

      const img = document.createElement('img');
      img.className = 'w-8 h-8 rounded-full';
      img.alt = '';
      img.loading = 'lazy';
      img.referrerPolicy = 'no-referrer';
      safeSetImgSrc(img, item.image);

      const span = document.createElement('span');
      span.className = 'flex-grow text-sm';
      span.textContent = String(item.name || '');

      const btn = document.createElement('button');
      btn.className = 'open-modal-btn text-xs text-primary hover:underline';
      btn.type = 'button';
      if (typeof item.id === 'string') {
        btn.setAttribute('data-modal-target', item.id);
      }
      btn.textContent = 'Bio';

      row.appendChild(img);
      row.appendChild(span);
      row.appendChild(btn);
      contentGrid.appendChild(row);
    });
  }

  // ── Games ─────────────────────────────────────────────────────────────────
  if (relatedGames.length > 0) {
    contentGrid.appendChild(makeSectionHeader('Games'));
    relatedGames.forEach(item => {
      const row = makeDiv('flex items-center gap-2 p-2 rounded-md bg-slate-800/50');

      const img = document.createElement('img');
      img.className = 'w-8 h-8 rounded-full';
      img.alt = '';
      img.loading = 'lazy';
      img.referrerPolicy = 'no-referrer';
      safeSetImgSrc(img, item.thumbnail);

      const span = document.createElement('span');
      span.className = 'flex-grow text-sm';
      span.textContent = String(item.title || '');

      const link = document.createElement('a');
      link.className = 'text-xs text-primary hover:underline';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      safeSetAnchorHref(link, item.file);
      link.textContent = 'Play';

      row.appendChild(img);
      row.appendChild(span);
      row.appendChild(link);
      contentGrid.appendChild(row);
    });
  }

  // ── Outreach Talks ────────────────────────────────────────────────────────
  if (relatedOutreachTalks.length > 0) {
    contentGrid.appendChild(makeSectionHeader('Outreach Talks'));
    relatedOutreachTalks.forEach(item => {
      const d = makeDiv('text-sm p-2 rounded-md bg-slate-800/50');
      const title = document.createElement('p');
      title.className = 'font-semibold';
      title.textContent = String(item.title || '');

      const p = document.createElement('p');
      p.className = 'text-xs text-light-text/70';

      const speakerNames = [];
      const pool = [...safeFilter(teamData), ...safeFilter(alumniData)];
      if (Array.isArray(item.speakerIds)) {
        item.speakerIds.forEach(sid => {
          const s = pool.find(m => m && m.id === sid);
          if (s && s.name) speakerNames.push(String(s.name));
        });
      }
      p.textContent = `Speaker(s): ${speakerNames.length > 0 ? speakerNames.join(', ') : 'N/A'}`;

      d.appendChild(title);
      d.appendChild(p);
      contentGrid.appendChild(d);
    });
  }

  // ── Academic Presentations ────────────────────────────────────────────────
  if (relatedAcademicPresentations.length > 0) {
    contentGrid.appendChild(makeSectionHeader('Academic Presentations'));
    relatedAcademicPresentations.forEach(item => {
      const d = makeDiv('text-sm p-2 rounded-md bg-slate-800/50');
      const title = document.createElement('p');
      title.className = 'font-semibold';
      title.textContent = String(item.title || '');

      const p = document.createElement('p');
      p.className = 'text-xs text-light-text/70';

      const speakerNames = [];
      const pool = [...safeFilter(teamData), ...safeFilter(alumniData)];
      if (Array.isArray(item.speakerIds)) {
        item.speakerIds.forEach(sid => {
          const s = pool.find(m => m && m.id === sid);
          if (s && s.name) speakerNames.push(String(s.name));
        });
      }
      p.textContent = `Speaker(s): ${speakerNames.length > 0 ? speakerNames.join(', ') : 'N/A'}`;

      d.appendChild(title);
      d.appendChild(p);
      contentGrid.appendChild(d);
    });
  }
// ── Publications ──────────────────────────────────────────

if (!window.publicationsData) {
  const msg = makeDiv('text-xs text-medium-text italic p-2');
  msg.textContent = 'Loading publications…';
  contentGrid.appendChild(msg);

  document.addEventListener('smartbio:data-ready', () => {
    window.updateDynamicContent(
      themeName,
      researchData,
      newsData,
      teamData,
      gamesData,
      outreachTalksData,
      academicPresentationsData,
      alumniData
    );
  }, { once: true });

  return;
}

const publications = Array.isArray(window.publicationsData)
  ? window.publicationsData
  : (window.publicationsData?.items || []);

const relatedPubs = publications.filter(pub =>
  Array.isArray(pub.themes) &&
  pub.themes.some(t => t.toLowerCase() === themeName.toLowerCase())
);

if (!relatedPubs.length) {
  const msg = makeDiv('text-xs text-medium-text italic p-2');
  msg.textContent = 'No publications for this theme';
  contentGrid.appendChild(msg);
  return;
}

// render publications
const sorted = relatedPubs.slice().sort((a, b) => (b.year || 0) - (a.year || 0));

contentGrid.appendChild(makeSectionHeader(`Publications (${sorted.length})`));

sorted.forEach(pub => {
  const card = makeDiv('text-sm p-2 rounded-md bg-slate-800/50');

  const title = document.createElement('p');
  title.className = 'font-semibold';
  title.textContent = pub.title || '';

  const meta = document.createElement('p');
  meta.className = 'text-xs text-medium-text';
  meta.textContent = [pub.authors, pub.year].filter(Boolean).join(' · ');

  card.appendChild(title);
  card.appendChild(meta);

  contentGrid.appendChild(card);
});
}
/* =====================================================================
   SMARTBio Research Hubs
   - Topic Hub mount left intact
   - Anatomy Hub reads research.json and opens a modal per "application"
   ===================================================================== */

window.SMARTBio = window.SMARTBio || {};
const { modal } = window.SMARTBio;

/* --------------------------
   Topic Hub bootstrap (safe)
-------------------------- */
(function initTopicHub() {
  const mount = document.getElementById('topicHubMount');
  if (!mount) return;
})();

/* --------------------------
   Load research.json (once)
-------------------------- */
let researchJSON = null;
async function loadResearchJSON() {
  if (researchJSON) return researchJSON;
  try {
    const res = await fetch('research.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(res.statusText || 'HTTP error');
    researchJSON = await res.json();
  } catch (e) {
    researchJSON = { error: true, message: e.message };
  }
  return researchJSON;
}

/* ---------------------------------
   Anatomy Research Hub: Controller
---------------------------------- */
(function initAnatomyHub() {
  const container = document.getElementById('anatomy-hub');
  if (!container) return;

  const applicationsWrap = document.getElementById('applicationsWrap');
  const emptyEl = document.getElementById('anatomyEmpty');
  const jsonErrEl = document.getElementById('jsonError');
  const labelEl = document.getElementById('selectedRegionLabel');
  const appCountChip = document.getElementById('appCountChip');
  const regions = Array.from(document.querySelectorAll('.body-svg .region'));

  let currentRegion = null;

  regions.forEach(el => {
    el.setAttribute('tabindex', '0');
    const key = el.dataset.region;

    const handleActivate = async (e) => {
      e.preventDefault();
      await setRegion(key);
    };
    el.addEventListener('click', handleActivate);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') handleActivate(e);
    });
  });

  async function setRegion(regionKey) {
    currentRegion = regionKey;
    const pretty = regionKey.charAt(0).toUpperCase() + regionKey.slice(1);
    labelEl.textContent = pretty;

    regions.forEach(r => r.classList.remove('active-stroke'));
    regions.filter(r => r.dataset.region === regionKey).forEach(r => r.classList.add('active-stroke'));

    const data = await loadResearchJSON();
    if (data?.error) {
      applicationsWrap.innerHTML = '';
      emptyEl.style.display = 'none';
      jsonErrEl.style.display = 'block';
      appCountChip.style.display = 'none';
      return;
    }
    jsonErrEl.style.display = 'none';

    const items = data?.anatomy?.[regionKey] || [];
    const appMap = items.reduce((acc, it) => {
      const app = it.application || 'General';
      (acc[app] = acc[app] || []).push(it);
      return acc;
    }, {});

    renderApplications(appMap, pretty);
  }

  function renderApplications(appMap, prettyRegion) {
    applicationsWrap.innerHTML = '';
    const apps = Object.keys(appMap).sort((a, b) => a.localeCompare(b));
    if (!apps.length) {
      emptyEl.style.display = 'block';
      appCountChip.style.display = 'none';
      return;
    }
    emptyEl.style.display = 'none';
    appCountChip.textContent = `${apps.length} application${apps.length>1?'s':''}`;
    appCountChip.style.display = 'inline-flex';

    apps.forEach(appName => {
      const chip = document.createElement('button');
      chip.className = 'chip';
      chip.type = 'button';
      chip.textContent = appName;
      chip.addEventListener('click', () => openApplicationModal(prettyRegion, appName, appMap[appName]));
      applicationsWrap.appendChild(chip);
    });
  }

  function openApplicationModal(regionPretty, appName, list) {
    // Build modal content using safe DOM methods (no innerHTML with untrusted data)
    const wrap = document.createDocumentFragment();

    list.forEach(item => {
      const card = makeDiv('result-card');

      const titleEl = document.createElement('div');
      titleEl.className = 'result-title';
      const strong = document.createElement('strong');
      strong.textContent = String(item.title || '');
      titleEl.appendChild(strong);
      card.appendChild(titleEl);

      const meta = document.createElement('div');
      meta.className = 'result-meta';
      meta.textContent = [item.authors, item.year].filter(Boolean).join(' · ');
      card.appendChild(meta);

      const summary = document.createElement('p');
      summary.className = 'result-summary';
      summary.textContent = String(item.summary || '');
      card.appendChild(summary);

      const tagsRow = makeDiv('result-tags');
      (item.tags || []).forEach(t => {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.style.cursor = 'default';
        chip.textContent = `#${t}`;
        tagsRow.appendChild(chip);
      });
      card.appendChild(tagsRow);

      if (item.link && isSafeUrl(item.link)) {
        const linkWrap = document.createElement('div');
        linkWrap.style.marginTop = '6px';
        const a = document.createElement('a');
        a.href = String(item.link);
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = 'View';
        linkWrap.appendChild(a);
        card.appendChild(linkWrap);
      }

      wrap.appendChild(card);
    });

    if (modal && typeof modal.open === 'function') {
      modal.open({
        title: `${regionPretty} · ${appName}`,
        fragment: wrap
      });
    }
  }

  applicationsWrap.innerHTML = '';
  emptyEl.style.display = 'block';
})();
