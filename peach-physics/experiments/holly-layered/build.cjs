// Reproducible, additive-only experiment. Never write to a release directory.
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..');
const refs={r4:'f582612',r5:'8eb02d3',r6:'ddf3456cc937c7f84f0b022f76f6824e59c2d079'};
for(const [version,ref] of Object.entries(refs)){
 let html=execFileSync('git',['show',`${ref}:peach-physics/v8/index.html`],{cwd:root,maxBuffer:3e6}).toString();
 html=html.replaceAll('./assets/','../../v8/assets/').replace('<link rel="manifest" href="./manifest.webmanifest">','').replaceAll('./apple-touch-icon.png','../../v8/apple-touch-icon.png');
 // No production preference writes, imports or service workers in this sandbox.
 html=html.replaceAll('peach-physics-v','holly-layer-lab-v').replace('let activeCharacterIndex=0;','let activeCharacterIndex=3;').replace('activeCharacterIndex=Math.max(0,CHARACTERS.findIndex(c=>c.id===saved));','if(saved)activeCharacterIndex=Math.max(0,CHARACTERS.findIndex(c=>c.id===saved));');
 html=html.replace("if('serviceWorker' in navigator && location.protocol==='https:')",'if(false)');
 html=html.replace('<script>','<script src="bootstrap.js"></script>\n<script src="renderer.js"></script>\n<script>');
 html=html.replace('presentCharacter();\ngetPhoto',fs.readFileSync(path.join(__dirname,'adapter.js'),'utf8')+'\npresentCharacter();\ngetPhoto');
 html=html.replace('</body>',`<a id="labBack" href="./" style="position:fixed;top:8px;left:8px;z-index:20;color:white;background:#142623;padding:8px;border-radius:8px;font:12px system-ui">← Holly lab · ${version}</a></body>`);
 fs.writeFileSync(path.join(__dirname,`${version}.html`),html);
}
console.log('Built isolated r4/r5/r6 runners; production files untouched.');
