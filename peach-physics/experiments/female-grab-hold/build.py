"""Derive an isolated all-character preview from the exact production r11 file."""
from pathlib import Path
import re,shutil,sys
sys.dont_write_bytecode=True
here=Path(__file__).resolve().parent
source=here.parents[1]/'v8'
s=(source/'index.html').read_text()
s=s.replace("'use strict';", """'use strict';
// Preview preferences cannot overwrite production profiles on the same origin.
const previewStorage={getItem:k=>localStorage.getItem('female-grab-preview:'+k),setItem:(k,v)=>localStorage.setItem('female-grab-preview:'+k,v)};
let grabHoldEnabled=new URLSearchParams(location.search).get('hold')!=='off';
const canGrabHold=()=>grabHoldEnabled&&['ember','midnight','aurelia','holly'].includes(currentCharacter().id);
""")
# Only original storage calls: preserve wrapper's localStorage access.
s=s.replace('localStorage.', 'previewStorage.').replace("previewStorage.getItem('female-grab-preview:'", "localStorage.getItem('female-grab-preview:'").replace("previewStorage.setItem('female-grab-preview:'", "localStorage.setItem('female-grab-preview:'")
s=re.sub(r'<script>\s*if\(\'serviceWorker\'.*?</script>', '',s,flags=re.S)
s=s.replace('<link rel="manifest" href="./manifest.webmanifest">', '').replace('<link rel="apple-touch-icon" href="./apple-touch-icon.png">', '')
s=s.replace('<title>Peach Physics — Elf Lab 0.0.8 r11</title>', '<title>Peaches — Grab and hold preview</title>')
s=s.replace('v0.0.8 · r11', 'Grab and hold · experimental')
s=s.replace('  const n=nodes[i],f=forces[i],inertia=i%3===2?.86:1;', '''  const n=nodes[i],f=forces[i],inertia=i%3===2?.86:1;
  const held=canGrabHold()&&[...pointers.values()].find(p=>p.side===n.side&&p.grabbed);
  if(held){const target=held.grabTargets[i%3];n.dx=target.dx;n.dy=target.dy;n.vx=n.vy=0;continue;}''')
s=s.replace(' if(side<0)return;\n const {p,offsetX,offsetY}=touchAnchor(side,raw);', ''' if(side<0)return;
 if(canGrabHold()&&[...pointers.values()].some(f=>f.side===side))return;
 const {p,offsetX,offsetY}=touchAnchor(side,raw);''')
s=s.replace('pressure:e.pressure||.5,offsetX,offsetY});', '''pressure:e.pressure||.5,offsetX,offsetY,
  grabOrigin:{x:p.x,y:p.y},grabbed:false,grabTargets:[],
  grabBase:nodes.slice(side*3,side*3+3).map(n=>({dx:n.dx,dy:n.dy,
   weight:.20+.8*Math.exp(-1.4*(((p.x-n.x)/n.rx)**2+((p.y-n.y)/n.ry)**2))}))});''')
s=s.replace(" // Simultaneous fingers contribute only to their own side's nodes.", ''' if(canGrabHold()){
  finger.grabbed=finger.grabbed||finger.travel>8;
  const gain=.17*(isHolly()?.95:currentCharacter().id==='midnight'&&finger.side===0?.90:1);
  finger.grabTargets=finger.grabBase.map(n=>({
   dx:clamp(n.dx+(p.x-finger.grabOrigin.x)*gain*n.weight,-26,26),
   dy:clamp(n.dy+(p.y-finger.grabOrigin.y)*gain*n.weight,-30,30)}));
 }
 // Simultaneous fingers contribute only to their own side's nodes.''')
s=s.replace('  const n=nodes[i],q=((p.x-n.x)/n.rx)**2+', '''  if(canGrabHold()&&finger.grabbed){const n=nodes[i],target=finger.grabTargets[i%3];n.dx=target.dx;n.dy=target.dy;n.vx=n.vy=0;continue;}
  const n=nodes[i],q=((p.x-n.x)/n.rx)**2+''')
s=s.replace('  if(f.travel<27&&held<400){','  if(!(canGrabHold()&&f.grabbed)&&f.travel<27&&held<400){')
s=s.replace('function presentCharacter(){', '''function presentCharacter(){
 document.getElementById('grabHold').disabled=isSanta();
 document.getElementById('grabHold').textContent=isSanta()?'Santa · original interaction':grabHoldEnabled?'Grab and hold: on':'Grab and hold: off';''')
s=s.replace('<button id="slapAudio"', '<button id="grabHold" class="slap-audio" type="button">Grab and hold: on</button><button id="slapAudio"')
# Keep original hint for Santa; make new capability discoverable on all female selections.
s=s.replace('function presentCharacter(){', "function presentCharacter(){\n hint.textContent=isSanta()?'Tap · drag · flick':'Pull slowly · hold · release';")
s=s.replace('restorePrefs();\ndocument.getElementById', """restorePrefs();
document.getElementById('grabHold').addEventListener('click',()=>{grabHoldEnabled=!grabHoldEnabled;for(const f of pointers.values())f.grabbed=false;presentCharacter();});
document.getElementById""",1)
# Public diagnostic only, full controls injected by tests.
s=s.replace('frames,activePointers:', 'frames,grabHold:canGrabHold(),activePointers:').replace('side:p.side,vx:p.vx,vy:p.vy}', 'side:p.side,vx:p.vx,vy:p.vy,grabbed:!!p.grabbed}')
from boundary_patch import patch
s=patch(s)
(here/'index.html').write_text(s)
shutil.copytree(source/'assets',here/'assets',dirs_exist_ok=True)
print('Built isolated r11 preview with original assets')
