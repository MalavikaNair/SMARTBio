const fs = require('fs');
const path = require('path');
function ensureDir(p){if(!fs.existsSync(p))fs.mkdirSync(p,{recursive:true});}
const outDir=path.join(__dirname,'..','assets','js');ensureDir(outDir);
function copy(src,destName){const dest=path.join(outDir,destName);fs.copyFileSync(src,dest);console.log(`Copied -> ${destName}`);}
try{
 const threePkg=path.dirname(require.resolve('three/package.json'));
 copy(path.join(threePkg,'build','three.min.js'),'three.min.js');
 const orbitPath=path.join(threePkg,'examples','js','controls','OrbitControls.js');
 copy(orbitPath,'OrbitControls.js');
 const particlesPkg=path.dirname(require.resolve('particles.js/package.json'));
 copy(path.join(particlesPkg,'particles.min.js'),'particles.min.js');
 const markedPath=require.resolve('marked');
 copy(markedPath,'marked.min.js');
 const tonePath=require.resolve('tone/build/Tone.min.js');
 copy(tonePath,'Tone.min.js');
 console.log('All vendor files copied to /assets/js');
}catch(e){console.error('Vendor copy failed:',e);process.exit(1);}
