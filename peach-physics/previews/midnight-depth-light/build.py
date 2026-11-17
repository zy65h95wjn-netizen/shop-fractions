"""Derive the isolated Midnight Yule depth-lighting test from production v8. Production files are only read."""
import re, sys, json, hashlib
from pathlib import Path

ROOT = Path(sys.argv[1])
SRC = ROOT / 'peach-physics/v8'
OUT = ROOT / 'peach-physics/previews/midnight-depth-light'
OUT.mkdir(parents=True, exist_ok=True)

html = (SRC / 'index.html').read_text(encoding='utf-8')
motion = (SRC / 'motion.js').read_text(encoding='utf-8')


def sub(text, old, new, count=1):
    found = text.count(old)
    assert found == count, f'expected {count} of {old[:60]!r}, found {found}'
    return text.replace(old, new)


# --- Identity and isolation -------------------------------------------------
html = sub(html, '<title>Peach Physics — Elf Lab 0.0.8 r14 Ember fix</title>',
           '<title>Midnight Yule 2.5D depth preview — Peach Physics</title>')
html = sub(html, 'v0.0.8 · r14 · Holly</div>', 'Midnight Yule 2.5D depth preview · based on r14</div>')
# Separate saved settings: production profiles are never read or written.
assert html.count("'peach-physics-v0") == 18
html = html.replace("'peach-physics-v0", "'peach-physics-preview-midnightdepth-v0")
motion = sub(motion, "'peach-r13-motion-options-v1'", "'peach-preview-midnightdepth-motion-options-v1'")
# No service worker in the preview.
html = sub(html, """if('serviceWorker' in navigator && location.protocol==='https:'){
 window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(err=>console.warn('Offline cache unavailable',err)));
}""", "// Isolated preview: no service worker is registered.")

# --- Midnight Yule only: keep her embedded portrait, drop the other and character switching ---
html, n = re.subn(r"const IMAGE='data:image/[a-z]+;base64,[A-Za-z0-9+/=]+';", "const IMAGE='';", html)
assert n == 1
portrait = re.search(r"const OTHER_IMAGE='data:image/[a-z]+;base64,([A-Za-z0-9+/=]+)';", html).group(1)
html = sub(html, "if(new URLSearchParams(location.search).get('character')==='holly')activeCharacterIndex=3;",
           "activeCharacterIndex=1; // Midnight Yule-only preview")
html = sub(html, 'function chooseCharacter(index){', 'function chooseCharacter(index){return; // Midnight Yule-only preview\n')
html, n = re.subn(r" // Preload other character[^\n]*\n CHARACTERS\.forEach\([^\n]*\n", "", html)
assert n == 1

# --- 2.5D depth lighting ----------------------------------------------------
html = sub(html, ' uniform sampler2D uSantaShape;\n', ''' uniform sampler2D uSantaShape;
 // 2.5D preview. x = largest light change (fraction), y = highlight gain, z = parallax lean.
 // All zero reproduces the production r14 picture exactly.
 uniform vec3 uDepth;
 const float FORM_DEPTH=120.0;
 // Rounded depth dome per side in source pixels: xy = depth gradient, z = height 0..1.
 vec3 formDome(vec2 s,vec2 c,vec2 r){
  vec2 q=(s-c)/r;float m=1.0-dot(q,q);
  if(m<=0.0)return vec3(0.0);
  return vec3(-4.0*FORM_DEPTH*m*q/r,m*m);
 }
 vec3 formSurface(vec2 s){
  vec3 l=formDome(s,vec2(292.0,1135.0),vec2(178.0,200.0));
  vec3 r=formDome(s,vec2(600.0,1135.0),vec2(185.0,205.0));
  return l.z>r.z?l:r;
 }
''')
html = sub(html, '''  gl_FragColor=texture2D(uPhoto,photoUV);
 }`;''', '''  // What the production renderer moved this pixel by, in source pixels.
  vec2 travel=(vRawUV-photoUV)*vec2(941.0,1671.0);
  vec3 form=formSurface(photoUV*vec2(941.0,1671.0));
  bool lit3d=form.z>0.0&&dot(travel,travel)>.0004;
  if(lit3d&&uDepth.z>0.0){
   // Parallax: skin nearer the viewer travels a little farther than skin at
   // the base. It scales the existing movement, so stationary pixels stay put.
   photoUV=clamp(vRawUV-(vRawUV-photoUV)*(1.0+uDepth.z*(form.z-.5)),.001,.999);
  }
  gl_FragColor=texture2D(uPhoto,photoUV);
  if(lit3d&&(uDepth.x>0.0||uDepth.y>0.0)){
   // The photograph already contains the resting light. Add only the change
   // in light caused by the shape leaning with the springs: at rest the
   // difference is zero and the approved portrait is shown untouched.
   vec2 slope=form.xy;
   // The front of the form follows the spring while its base stays attached:
   // the side facing the motion steepens and the trailing side flattens.
   vec2 leaned=slope/clamp(1.0+dot(travel,slope)/FORM_DEPTH,.7,1.45);
   vec3 rest=normalize(vec3(-slope,1.0)),moved=normalize(vec3(-leaned,1.0));
   // Warm key light from the left, slightly above, in front.
   vec3 light=normalize(vec3(-.5,-.35,.79)),half_=normalize(light+vec3(0.0,0.0,1.0));
   float shade=max(dot(moved,light),0.0)-max(dot(rest,light),0.0);
   // Only a faint added sheen: removing the photograph's own highlights reads as a colour change.
   float gloss=max(pow(max(dot(moved,half_),0.0),28.0)-pow(max(dot(rest,half_),0.0),28.0),0.0);
   // Soft limit: the light change approaches, never exceeds, uDepth.x in either
   // direction, so a held pull cannot become a dark patch. Shade leans warm and
   // light leans pale, as skin does, rather than turning grey.
   float push=2.0*shade/max(uDepth.x,.001),amount=1.0+uDepth.x*push/(1.0+abs(push));
   vec3 lit=gl_FragColor.rgb*pow(vec3(amount),vec3(.72,1.0,1.14))+uDepth.y*gloss*vec3(1.0,.93,.86);
   gl_FragColor.rgb=clamp(lit,0.0,1.0);
  }
 }`;''')

html = sub(html, " gl.uniform2fv(gl.getUniformLocation(program,'uDragBoundary'),dragBoundary);",
           " gl.uniform2fv(gl.getUniformLocation(program,'uDragBoundary'),dragBoundary);\n"
           " gl.uniform3fv(gl.getUniformLocation(program,'uDepth'),DEPTH_LEVELS[depthLevel].values);")

# --- Test option: screen-left side moves like the screen-right side ---------
# Production gives Midnight Yule's screen-left side its own traced skin mask, 10%
# weaker taps and drags, and 6% more damping. With the option on, the left side
# uses the same rendering path and the same strength as the right side.
html = sub(html, " gl.uniform1f(leftMaskLoc,c.id==='midnight'?1:0);", " gl.uniform1f(leftMaskLoc,c.id==='midnight'&&!matchLeft?1:0);")
html = sub(html, "currentCharacter().id==='midnight' && n.side===0?1.06:1", "currentCharacter().id==='midnight' && n.side===0&&!matchLeft?1.06:1")
html = sub(html, "currentCharacter().id==='midnight' && side===0?.90:1", "currentCharacter().id==='midnight' && side===0&&!matchLeft?.90:1", 2)
html = sub(html, "currentCharacter().id==='midnight'&&finger.side===0?.90:1", "currentCharacter().id==='midnight'&&finger.side===0&&!matchLeft?.90:1")
html = sub(html, "currentCharacter().id==='midnight' && finger.side===0?.90:1", "currentCharacter().id==='midnight' && finger.side===0&&!matchLeft?.90:1")

# Controls: a chip on the stage for quick A/B, and the same control in the panel.
html = sub(html, '#character svg{', '''#character{display:none!important}
#depthChip{position:absolute;left:max(12px,env(safe-area-inset-left));top:max(76px,calc(env(safe-area-inset-top) + 14px));z-index:5;min-height:44px;padding:0 14px;border:1px solid #f9eadf77;border-radius:22px;color:#fff7eb;background:#07110fc9;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:0 3px 16px #0005;font-size:12px;font-weight:700;cursor:pointer;touch-action:manipulation}
#depthChip[aria-pressed="true"]{background:#c69a69d9;border-color:#f0be8c;color:#1b140c}
#depthChip:focus-visible{outline:3px solid #ffcb91;outline-offset:3px}
#character svg{''')
html = sub(html, ' <div id="characterToast"', ' <button id="depthChip" type="button" aria-pressed="true">2.5D: Medium</button>\n <div id="characterToast"')
html = sub(html, '<button id="grabHold" class="slap-audio" type="button">Grab and hold: on</button>',
           '<button id="depthLight" class="slap-audio" type="button" aria-pressed="true">Depth lighting: Medium</button>'
           '<button id="matchLeft" class="slap-audio" type="button" aria-pressed="true">Left side: matches right</button>'
           '<button id="grabHold" class="slap-audio" type="button">Grab and hold: on</button>')
html = sub(html, 'let grabHoldEnabled=', '''// 2.5D preview levels: [largest light change, highlight, parallax]. Off is production r14.
const DEPTH_LEVELS=[{name:'Off',values:[0,0,0]},{name:'Subtle',values:[.05,.03,.20]},{name:'Medium',values:[.09,.05,.28]},{name:'Strong',values:[.14,.08,.35]}];
const DEPTH_KEY='peach-physics-preview-midnightdepth-depth';
let depthLevel=2;
// Test option: let the screen-left side move like the screen-right side. ?match=0 keeps production behaviour.
let matchLeft=new URLSearchParams(location.search).get('match')!=='0';
// Side-by-side test page: this engine runs inside a frame and is driven by the page around it.
const embedded=new URLSearchParams(location.search).get('embed')==='1'&&parent!==window;
let embedCloseup=false;
try{const saved=Number(localStorage.getItem(DEPTH_KEY));if(localStorage.getItem(DEPTH_KEY)!==null&&DEPTH_LEVELS[saved])depthLevel=saved;}catch(e){}
{const asked=new URLSearchParams(location.search).get('depth');if(asked!==null&&DEPTH_LEVELS[Number(asked)])depthLevel=Number(asked);}
let grabHoldEnabled=''')
html = sub(html, '\npresentCharacter();\n', '''
function refreshDepth(){
 const chip=document.getElementById('depthChip'),button=document.getElementById('depthLight'),name=DEPTH_LEVELS[depthLevel].name;
 for(const el of [chip,button]){el.setAttribute('aria-pressed',String(depthLevel>0));el.disabled=fallback;}
 chip.textContent=fallback?'2.5D needs WebGL':'2.5D: '+name;
 button.textContent=fallback?'Depth lighting: unavailable in reduced graphics':'Depth lighting: '+name;
}
function cycleDepth(){if(fallback)return;depthLevel=(depthLevel+1)%DEPTH_LEVELS.length;try{localStorage.setItem(DEPTH_KEY,String(depthLevel));}catch(e){}refreshDepth();}
for(const id of ['depthChip','depthLight']){const el=document.getElementById(id);el.addEventListener('click',cycleDepth);el.addEventListener('keydown',event=>{if(event.code==='Space')event.stopPropagation();});}
function refreshMatch(){const el=document.getElementById('matchLeft');el.setAttribute('aria-pressed',String(matchLeft));el.textContent=matchLeft?'Left side: matches right':'Left side: current';}
function setMatch(value){matchLeft=!!value;uploadCharacterCalibration();refreshMatch();}
{const el=document.getElementById('matchLeft');el.addEventListener('click',()=>setMatch(!matchLeft));el.addEventListener('keydown',event=>{if(event.code==='Space')event.stopPropagation();});}
refreshMatch();
window.__depthDebug={match:()=>matchLeft,setMatch,level:()=>depthLevel,name:()=>DEPTH_LEVELS[depthLevel].name,set:value=>{if(DEPTH_LEVELS[value]){depthLevel=value;refreshDepth();}}};
refreshDepth();
presentCharacter();
''')
# Refresh the control once the renderer (WebGL or reduced graphics) is known.
html = sub(html, " needSize=true;showReady();say('');requestAnimationFrame(loop);",
           " needSize=true;showReady();say('');refreshDepth();requestAnimationFrame(loop);")

# --- Embedded mode: the side-by-side test page drives two copies of this engine ---
html = sub(html, '[hidden]{display:none!important}', """[hidden]{display:none!important}
body.embedded #gear,body.embedded #depthChip,body.embedded #hint,body.embedded #motionNotice,body.embedded #panel,body.embedded #scrim,body.embedded #characterToast{display:none!important}""")
html = sub(html, ' uvCover=[cssW/drawW,cssH/drawH,-ox/drawW,-oy/drawH];',
           ' if(embedCloseup){drawW=cssW*W/720;drawH=drawW*H/W;ox=cssW/2-445/W*drawW;oy=cssH*.62-1150/H*drawH;}\n'
           ' uvCover=[cssW/drawW,cssH/drawH,-ox/drawW,-oy/drawH];')
html = sub(html, 'function loop(now){', 'function loop(now){\n if(embedded)return; // The test page steps both engines from one shared clock.')
html = sub(html, "\ncanvas.addEventListener('pointerdown',e=>{", """
if(embedded){
 document.body.classList.add('embedded');
 // The motion controller pauses Auto when the page is first shown. Report ready only
 // after that has happened, so one engine cannot start its pause after the other.
 let pageShown=false;window.addEventListener('pageshow',()=>{pageShown=true;});
 // Gesture timing comes from the test page so both engines measure identical taps and flicks.
 const nativeNow=performance.now.bind(performance);let relayClock=null;
 performance.now=()=>relayClock===null?nativeNow():relayClock;
 // Registered before the engine's own handlers: a real touch is sent to the
 // test page, which replays it into both engines in source-image coordinates.
 for(const type of ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>{
  if(e.depthForwarded)return;
  e.preventDefault();e.stopImmediatePropagation();
  if(type==='pointerdown'){try{canvas.setPointerCapture(e.pointerId);}catch(err){}}
  const p=readPoint(e);
  parent.__depthRelay?.({type:type==='lostpointercapture'?'pointercancel':type,id:e.pointerId,x:p.x,y:p.y,pressure:e.pressure});
 },{capture:true,passive:false});
 // Same random sequence in both engines keeps Auto Jiggle identical.
 const reseed=()=>{let s=8147;motion.random=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};motion.time=0;motion.quietUntil=0;motion.autoDrive=null;};
 window.__depthFrame={
  ready:()=>pageShown&&!!img&&!!motion&&loader.classList.contains('hiding'),
  tick:dt=>{motion.tick(dt);step(dt);},
  draw:()=>{if(stage.clientWidth&&stage.clientHeight&&!webglLost)render();},
  pointer:data=>{
   const rect=canvas.getBoundingClientRect();
   const event=new PointerEvent(data.type,{pointerId:data.id,pointerType:'touch',clientX:rect.left+ox+data.x/W*drawW,clientY:rect.top+oy+data.y/H*drawH,pressure:data.pressure||.5,bubbles:true,cancelable:true});
   Object.defineProperty(event,'depthForwarded',{value:true});
   relayClock=data.time;try{canvas.dispatchEvent(event);}finally{relayClock=null;}
  },
  cancel:()=>{pointers.clear();for(const p of impacts)p.target=0;motion.interrupt();},
  reset:()=>{reset();reseed();},
  bounce:()=>{motion.interrupt();bounceBoth();},
  auto:value=>{motion.setAuto(value);reseed();},
  preset:value=>{activePreset=value;Object.assign(model,currentPresets()[value]);refreshPrefs();reset();reseed();},
  closeup:value=>{embedCloseup=!!value;needSize=true;},
  depth:value=>window.__depthDebug.set(value),
  match:value=>setMatch(value),
  resize:()=>{needSize=true;},
  raw:()=>JSON.parse(JSON.stringify({nodes,followers,impacts,waves})),
  snapshot:()=>window.__peachPhysicsDebug.snapshot()
 };
}
canvas.addEventListener('pointerdown',e=>{""")

# frame.html is the engine (also usable full-screen on its own). index.html, the
# side-by-side test page, is a hand-written file in this folder and is not generated.
(OUT / 'frame.html').write_text(html, encoding='utf-8')

(OUT / 'motion.js').write_text(motion, encoding='utf-8')
(OUT / 'apple-touch-icon.png').write_bytes((SRC / 'apple-touch-icon.png').read_bytes())
manifest = json.loads((SRC / 'manifest.webmanifest').read_text())
manifest.update(name='Peach Physics — Midnight Yule 2.5D Preview', short_name='Midnight 2.5D',
                description='Isolated preview: Midnight Yule with depth lighting on the approved portrait.')
(OUT / 'manifest.webmanifest').write_text(json.dumps(manifest, indent=2) + '\n')
import base64
print('frame.html bytes', len(html.encode()), 'embedded portrait sha256',
      hashlib.sha256(base64.b64decode(portrait)).hexdigest())
