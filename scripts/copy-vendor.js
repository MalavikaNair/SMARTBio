const fs = require('fs');
const path = require('path');

function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirmkdirSync(p,{ recursive:true }); } // <-- fix typo if you copy by hand
function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p,{ recursive:true }); }      // real line

const outDir = path.join(__dirname, '..', 'assets', 'js');
ensureDir(outDir);

function copy(src, destName) {
  const dest = path.join(outDir, destName);
  fs.copyFileSync(src, dest);
  console.log(`Copied -> ${destName}`);
}

function tryPaths(candidates, destName) {
  for (const p of candidates) {
    if (fs.existsSync(p)) { copy(p, destName); return true; }
  }
  return false;
}

try {
  // three.js
  const threeRoot = path.dirname(require.resolve('three/package.json'));
  copy(path.join(threeRoot, 'build', 'three.min.js'), 'three.min.js');

  // OrbitControls
  const orbitCandidates = [
    path.join(threeRoot, 'examples', 'js',  'controls', 'OrbitControls.js'),
    path.join(threeRoot, 'examples', 'jsm', 'controls', 'OrbitControls.js'),
  ];
  if (!tryPaths(orbitCandidates, 'OrbitControls.js')) {
    throw new Error('OrbitControls not found.');
  }

  // particles.js
  const particlesRoot = path.dirname(require.resolve('particles.js/package.json'));
  const particlesCandidates = [
    path.join(particlesRoot, 'dist', 'particles.min.js'),
    path.join(particlesRoot, 'particles.min.js'),
    path.join(particlesRoot, 'lib', 'particles.min.js'),
    require.resolve('particles.js')
  ];
  if (!tryPaths(particlesCandidates, 'particles.min.js')) {
    throw new Error('particles.js not found.');
  }

  // marked — always copy the browser build
  const markedRoot = path.dirname(require.resolve('marked/package.json'));
  const markedCandidates = [
    path.join(markedRoot, 'marked.min.js'),        // most packages ship this at root
    path.join(markedRoot, 'dist', 'marked.min.js'),
    path.join(markedRoot, 'lib', 'marked.umd.js'),
  // explicit resolve to the browser file if available
    (() => { try { return require.resolve('marked/marked.min.js'); } catch { return null; } })()
  ].filter(Boolean);

  if (!tryPaths(markedCandidates, 'marked.min.js')) {
    throw new Error('Browser build of marked not found.');
  }

  // Tone.js — search multiple known locations
  const toneRoot = path.dirname(require.resolve('tone/package.json'));
  const toneCandidates = [
    path.join(toneRoot, 'build', 'Tone.min.js'),
    path.join(toneRoot, 'build', 'Tone.js'),
    path.join(toneRoot, 'dist',  'Tone.min.js'),
    path.join(toneRoot, 'dist',  'Tone.js'),
    path.join(toneRoot, 'Tone.js'),        // older layouts
    require.resolve('tone')                 // last resort (module entry)
  ];
  if (!tryPaths(toneCandidates, 'Tone.min.js')) {
    throw new Error('Tone.js not found in expected locations.');
  }

  console.log('All vendor files copied to /assets/js');
} catch (e) {
  console.error('Vendor copy failed:', e);
  process.exit(1);
}
