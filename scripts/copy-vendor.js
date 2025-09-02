const fs = require('fs');
const path = require('path');

function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p,{ recursive:true }); }
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
  // three.js core
  const threePkg = path.dirname(require.resolve('three/package.json'));
  copy(path.join(threePkg, 'build', 'three.min.js'), 'three.min.js');

  // OrbitControls from three examples
  const orbitCandidates = [
    path.join(threePkg, 'examples', 'js', 'controls', 'OrbitControls.js'),
    path.join(threePkg, 'examples', 'jsm', 'controls', 'OrbitControls.js'), // JSM just in case
  ];
  if (!tryPaths(orbitCandidates, 'OrbitControls.js')) {
    throw new Error('OrbitControls not found in three/examples.');
  }

  // particles.js — package layouts vary, so try several
  const particlesRoot = path.dirname(require.resolve('particles.js/package.json'));
  const particlesCandidates = [
    path.join(particlesRoot, 'dist', 'particles.min.js'),
    path.join(particlesRoot, 'particles.min.js'),
    path.join(particlesRoot, 'lib', 'particles.min.js'),
    // fallback to unminified main file
    require.resolve('particles.js')
  ];
  if (!tryPaths(particlesCandidates, 'particles.min.js')) {
    throw new Error('particles.js not found in expected locations.');
  }

  // marked (browser build resolves to a single file)
  copy(require.resolve('marked'), 'marked.min.js');

  // Tone.js
  const toneCandidates = [
    require.resolve('tone/build/Tone.min.js'),
    // fallback to main if min not present
    require.resolve('tone')
  ];
  if (!tryPaths(toneCandidates, 'Tone.min.js')) {
    throw new Error('Tone.js not found in expected locations.');
  }

  console.log('All vendor files copied to /assets/js');
} catch (e) {
  console.error('Vendor copy failed:', e);
  process.exit(1);
}
