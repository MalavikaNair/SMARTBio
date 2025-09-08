/* XSS-hardened & CSP-friendly version of researchHub.js
 * - Replaces innerHTML with DOM creation + textContent
 * - Validates and restricts URLs to same-origin http(s)
 * - Avoids injecting untrusted HTML and inline event handlers
 * - Keeps original functionality (Three.js scene, clicks, content updates)
 * - Adds SMART letter badges inside each colored theme node
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
const isHttpUrlSameOrigin = (value) => {
  try {
    const u = new URL(String(value), window.location.origin);
    // Allow only http/https and same-origin to comply with typical CSP (img-src/script-src 'self')
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.origin === window.location.origin;
  } catch (_) { return false; }
};

const safeSetImgSrc = (img, url) => {
  if (isHttpUrlSameOrigin(url)) {
    img.src = url;
  } else {
    // If not allowed by CSP, don't set; optionally hide image placeholder
    img.removeAttribute('src');
  }
};

const safeSetAnchorHref = (a, url) => {
  if (isHttpUrlSameOrigin(url)) {
    a.href = url;
  } else {
    // Disallow external/unsupported schemes to avoid CSP violations
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
 * - Uses a transparent canvas (no background), so the colored sphere shows behind it.
 * - White bold letter with a soft dark stroke to ensure legibility on any node color.
 * - depthTest:false so the letter is always readable atop its node.
 */
function createLetterBadgeSprite(letter) {
  const size = 256; // high DPI for crisp text
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Text styling
  ctx.font = 'bold 300px "Exo 2", sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  // Stroke (outline) for contrast
  ctx.lineWidth = 28;
  ctx.strokeStyle = '#000000';
  ctx.strokeText(letter, size / 2, size / 2);

  // Fill
  ctx.fillStyle = '#cfd4cf';
  ctx.fillText(letter, size / 2, size / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = Math.min(8, texture.anisotropy || 8);
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,   // keep the letter on top of the sphere
    depthWrite: false
  });

  const sprite = new THREE.Sprite(material);
  return sprite;
}

/**
 * Attach a letter badge sprite to a spherical theme node.
 * Places the sprite slightly above the surface, scaled to the node radius.
 */
function addBadgeToThemeNode(themeMesh, letter, nodeRadius = 0.3) {
  if (!themeMesh || !letter) return;

  // Avoid duplicates
  if (themeMesh.userData && themeMesh.userData.badgeAttached) return;

  const badge = createLetterBadgeSprite(letter);
  // Scale sprite roughly to the projected diameter of the sphere
  // Sprite units are in world space like meshes; choose a size that reads well.
  const spriteSize = nodeRadius * 1.3; // tuned for readability
  badge.scale.set(spriteSize, spriteSize, 1);

  // Place it slightly in front of the sphere surface toward the camera (z+ from local POV).
  // If the node rotates with the group, keeping it on local z improves the "stuck-on" look.
  badge.position.set(0, 0, nodeRadius + 0.02);

  themeMesh.add(badge);
  themeMesh.userData = themeMesh.userData || {};
  themeMesh.userData.badgeAttached = true;
}

// Function to initialize the Three.js research hub
window.initResearchHub = function(researchData, newsData, teamData, gamesData, outreachTalksData, academicPresentationsData, alumniData) {
  console.log('initResearchHub called.');

  if (window.researchHubInitialized) {
    console.log('Research Hub already initialized. Skipping.');
    return;
  }

  // Ensure THREE is defined
  if (typeof THREE === 'undefined') {
    console.error('THREE.js library not loaded. Aborting initResearchHub.');
    return;
  }
  console.log('THREE.js library detected.');

  const researchContainer = document.getElementById('research-canvas-container');
  const researchCanvas = document.getElementById('research-canvas');

  if (!researchCanvas || !researchContainer) {
    console.error('Research canvas or container not found. Cannot initialize hub.');
    return;
  }
  console.log('Research canvas and container found.');
  console.log('Canvas dimensions: ', researchContainer.clientWidth, 'x', 600);

  try {
    // Stash data safely on window for click handler usage (read-only copies)
    window.researchData = Array.isArray(researchData) ? researchData.slice() : [];
    window.newsData = Array.isArray(newsData) ? newsData.slice() : [];
    window.teamData = Array.isArray(teamData) ? teamData.slice() : [];
    window.gamesData = Array.isArray(gamesData) ? gamesData.slice() : [];
    window.outreachTalksData = Array.isArray(outreachTalksData) ? outreachTalksData.slice() : [];
    window.academicPresentationsData = Array.isArray(academicPresentationsData) ? academicPresentationsData.slice() : [];
    window.alumniData = Array.isArray(alumniData) ? alumniData.slice() : [];

    // Initialize Three.js components
    window.scene = new THREE.Scene();
    window.camera = new THREE.PerspectiveCamera(75, researchContainer.clientWidth / 600, 0.1, 1000);
    window.renderer = new THREE.WebGLRenderer({ canvas: researchCanvas, alpha: true, antialias: true });
    window.renderer.setSize(researchContainer.clientWidth, 600);
    window.renderer.setPixelRatio(window.devicePixelRatio);
    console.log('Three.js Scene, Camera, Renderer initialized.');

    window.group = new THREE.Group();
    window.scene.add(window.group);
    console.log('Group added to scene.');

    // Create random background points and lines (network effect)
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
    console.log('Background network generated.');

    // Define research themes and create interactive nodes
    const themes = [
      { name: 'Sensing', color: 0x66D9EF, position: new THREE.Vector3(3, 2, 0) },
      { name: 'Modulating', color: 0xA6E22E, position: new THREE.Vector3(-3, 2, 0) },
      { name: 'Adaptive', color: 0xF92672, position: new THREE.Vector3(0, -2, 3) },
      { name: 'Regenerative', color: 0xFD971F, position: new THREE.Vector3(2, -2, -3) },
      { name: 'Therapeutic', color: 0xAE81FF, position: new THREE.Vector3(-2, -2, -3) }
    ];
    window.themeNodes = [];
    themes.forEach(theme => {
      const themeNodeGeo = new THREE.SphereGeometry(0.3, 16, 16);
      const themeNodeMat = new THREE.MeshStandardMaterial({ color: theme.color, metalness: 0.3, roughness: 0.5 });
      const themeNode = new THREE.Mesh(themeNodeGeo, themeNodeMat);
      themeNode.position.copy(theme.position);
      themeNode.name = theme.name; // For raycasting
      window.group.add(themeNode);

      // Connectors
      const closestPoint = points.reduce((prev, curr) => prev.distanceTo(theme.position) < curr.distanceTo(theme.position) ? prev : curr);
      const connectorGeo = new THREE.BufferGeometry().setFromPoints([theme.position, closestPoint]);
      const connectorLine = new THREE.Line(connectorGeo, new THREE.LineBasicMaterial({ color: theme.color, transparent: true, opacity: 0.5 }));
      window.group.add(connectorLine);

      // --- NEW: add SMART letter badge inside the node ---
      // Take the first letter of the theme name: S, M, A, R, T
      const letter = (theme.name && theme.name[0]) ? theme.name[0].toUpperCase() : '';
      addBadgeToThemeNode(themeNode, letter, 0.3);

      window.themeNodes.push(themeNode);
    });
    console.log('Theme nodes created, connected, and labeled.');

    // Add lighting to the scene
    const light = new THREE.DirectionalLight(0xffffff, 1.5);
    light.position.set(5, 5, 5);
    window.scene.add(light);
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    window.scene.add(ambientLight);
    console.log('Lighting added to scene.');

    window.camera.position.z = 8;

    // Setup Raycaster for interaction
    window.raycaster = new THREE.Raycaster();
    window.mouse = new THREE.Vector2();
    console.log('Raycaster and Mouse vector initialized.');

    // Event listeners for interactivity (click and drag)
    // Attach click handler in a CSP-safe, late-bound way so it works even if window.onCanvasClick is defined later
    if (!researchCanvas.dataset.rhClickBound) {
      researchCanvas.addEventListener('click', (e) => {
        if (typeof window.onCanvasClick === 'function') {
          window.onCanvasClick(e);
        }
      }, { passive: true });
      researchCanvas.dataset.rhClickBound = '1';
      console.log('Click listener for onCanvasClick (late-bound) added.');
    }

    let isMouseDown = false;
    let previousMousePosition = { x: 0, y: 0 };

    // Named functions for event listeners to ensure proper removal/addition
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

    // Remove and re-add drag listeners
    researchCanvas.removeEventListener('mousedown', onMouseDown);
    researchCanvas.removeEventListener('mouseup', onMouseUp);
    researchCanvas.removeEventListener('mousemove', onMouseMove);
    researchCanvas.removeEventListener('mouseleave', onMouseLeave);

    researchCanvas.addEventListener('mousedown', onMouseDown);
    researchCanvas.addEventListener('mouseup', onMouseUp);
    researchCanvas.addEventListener('mousemove', onMouseMove);
    researchCanvas.addEventListener('mouseleave', onMouseLeave);
    console.log('Drag listeners added.');

    // Define animateResearchHub and assign to window
    window.animateResearchHub = function() {
      requestAnimationFrame(window.animateResearchHub);
      if (!isMouseDown) {
        window.group.rotation.y += 0.0005; // Continuous subtle rotation when not dragging
      }
      if (window.renderer && window.scene && window.camera) {
        window.renderer.render(window.scene, window.camera);
      } else {
        console.warn('Renderer, scene or camera not ready for rendering in animateResearchHub.');
      }
    };

    // Start animation loop only once
    if (!window.researchHubInitialized) {
      window.animateResearchHub();
      console.log('animateResearchHub started.');
    }

    // Handle window resize for responsiveness
    window.removeEventListener('resize', window.onResearchCanvasResize);
    window.onResearchCanvasResize = function() {
      if (researchCanvas.offsetParent !== null && window.camera && window.renderer) {
        window.camera.aspect = researchContainer.clientWidth / 600;
        window.camera.updateProjectionMatrix();
        window.renderer.setSize(researchContainer.clientWidth, 600);
        window.renderer.render(window.scene, window.camera); // Force a render on resize
        console.log('Canvas resized and re-rendered.');
      } else {
        console.log('Skipping resize: canvas not visible or Three.js components not ready.');
      }
    };
    window.addEventListener('resize', window.onResearchCanvasResize);
    console.log('Resize listener added.');

    // Expose a legacy init for older main.js signatures (4-arg call)
    window.initResearchHubLegacy = function(r,n,t,g){ return window.initResearchHub(r,n,t,g, [], [], []); };

    window.researchHubInitialized = true; // Set flag to true after successful initialization
    console.log('Research Hub initialization complete.');

    // Perform an initial render immediately after setup
    if (window.renderer && window.scene && window.camera) {
      window.renderer.render(window.scene, window.camera);
      console.log('Initial render performed.');
    }

  } catch (e) {
    console.error('Error during initResearchHub execution:', e);
  }
};

// Function to handle clicks on theme nodes (made global)
window.onCanvasClick = function(event) {
  console.log('onCanvasClick triggered.');
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
    dlog('Theme node clicked:', themeName);
    // Data objects are expected to be globally available after initResearchHub
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
window.updateDynamicContent = function(themeName, researchData, newsData, teamData, gamesData, outreachTalksData, academicPresentationsData, alumniData = []) {
  console.log('updateDynamicContent called for theme:', themeName);
  const contentGrid = document.getElementById('dynamic-content-grid');
  const contentTitle = document.getElementById('dynamic-content-title');
  if (!contentGrid || !contentTitle) {
    console.warn('Dynamic content grid or title not found.');
    return;
  }

  contentTitle.textContent = `${themeName} Theme`;
  clearChildren(contentGrid); // Clear previous content safely

  const safeFilter = (arr) => Array.isArray(arr) ? arr.filter(Boolean) : [];
  const relatedResearch = safeFilter(researchData).filter(r => Array.isArray(r.themes) && r.themes.includes(themeName));
  const relatedNews = safeFilter(newsData).filter(n => Array.isArray(n.themes) && n.themes.includes(themeName));
  const relatedTeam = safeFilter(teamData).filter(t => Array.isArray(t.themes) && t.themes.includes(themeName));
  const relatedGames = safeFilter(gamesData).filter(g => Array.isArray(g.themes) && g.themes.includes(themeName));
  const relatedOutreachTalks = safeFilter(outreachTalksData).filter(talk => Array.isArray(talk.themes) && talk.themes.includes(themeName));
  const relatedAcademicPresentations = safeFilter(academicPresentationsData).filter(pres => Array.isArray(pres.themes) && pres.themes.includes(themeName));

  // Projects
  if (relatedResearch.length > 0) {
    contentGrid.appendChild(makeSectionHeader('Projects'));
    relatedResearch.forEach(item => {
      const d = makeDiv('text-sm p-2 rounded-md bg-slate-800/50');
      d.textContent = String(item.title || '');
      contentGrid.appendChild(d);
    });
  }

  // News
  if (relatedNews.length > 0) {
    contentGrid.appendChild(makeSectionHeader('News'));
    relatedNews.forEach(item => {
      const d = makeDiv('text-sm p-2 rounded-md bg-slate-800/50');
      d.textContent = String(item.title || '');
      contentGrid.appendChild(d);
    });
  }

  // Team
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
      // Preserve data-modal-target as an attribute (used by external modal code)
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

  // Games
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

  // Outreach Talks
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
      const speakersText = speakerNames.length > 0 ? speakerNames.join(', ') : 'N/A';
      p.textContent = `Speaker(s): ${speakersText}`;

      d.appendChild(title);
      d.appendChild(p);
      contentGrid.appendChild(d);
    });
  }

  // Academic Presentations
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
      const speakersText = speakerNames.length > 0 ? speakerNames.join(', ') : 'N/A';
      p.textContent = `Speaker(s): ${speakersText}`;

      d.appendChild(title);
      d.appendChild(p);
      contentGrid.appendChild(d);
    });
  }

  console.log('Dynamic content updated.');
};
