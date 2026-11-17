"""Derive the isolated Holly 2.5D preview from production v8. Production files are only read."""
import re, sys, json, hashlib
from pathlib import Path

ROOT = Path(sys.argv[1])
SRC = ROOT / 'peach-physics/v8'
OUT = ROOT / 'peach-physics/previews/holly-depth-light'
(OUT / 'assets').mkdir(parents=True, exist_ok=True)

html = (SRC / 'index.html').read_text(encoding='utf-8')
motion = (SRC / 'motion.js').read_text(encoding='utf-8')


def sub(text, old, new, count=1):
    found = text.count(old)
    assert found == count, f'expected {count} of {old[:60]!r}, found {found}'
    return text.replace(old, new)


# --- Identity and isolation -------------------------------------------------
html = sub(html, '<title>Peach Physics — Elf Lab 0.0.8 r14 Ember fix</title>',
           '<title>Holly 2.5D depth preview — Peach Physics</title>')
html = sub(html, 'v0.0.8 · r14 · Holly</div>', 'Holly 2.5D depth preview · based on r14</div>')
# Separate saved settings: production profiles are never read or written.
assert html.count("'peach-physics-v0") == 18
html = html.replace("'peach-physics-v0", "'peach-physics-preview-holly25d-v0")
motion = sub(motion, "'peach-r13-motion-options-v1'", "'peach-preview-holly25d-motion-options-v1'")
# No service worker in the preview.
html = sub(html, """if('serviceWorker' in navigator && location.protocol==='https:'){
 window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(err=>console.warn('Offline cache unavailable',err)));
}""", "// Isolated preview: no service worker is registered.")

# --- Holly only: drop the two embedded portraits and character switching ------
html, n = re.subn(r"const IMAGE='data:image/[a-z]+;base64,[A-Za-z0-9+/=]+';", "const IMAGE='';", html)
assert n == 1
html, n = re.subn(r"const OTHER_IMAGE='data:image/[a-z]+;base64,[A-Za-z0-9+/=]+';", "const OTHER_IMAGE='';", html)
assert n == 1
html = sub(html, "if(new URLSearchParams(location.search).get('character')==='holly')activeCharacterIndex=3;",
           "activeCharacterIndex=3; // Holly-only preview")
html = sub(html, 'function chooseCharacter(index){', 'function chooseCharacter(index){return; // Holly-only preview\n')
html, n = re.subn(r" // Preload other character[^\n]*\n CHARACTERS\.forEach\([^\n]*\n", "", html)
assert n == 1

# --- 2.5D depth lighting ----------------------------------------------------
html = sub(html, ' uniform sampler2D uSantaShape;\n', ''' uniform sampler2D uSantaShape;
 // 2.5D preview. x = shading gain, y = highlight gain, z = parallax lean.
 // All zero reproduces the production r14 picture exactly.
 uniform vec3 uDepth;
 const float HOLLY_DEPTH=72.0;
 // Rounded depth dome per side in source pixels: xy = depth gradient, z = height 0..1.
 vec3 hollyDome(vec2 s,vec2 c,vec2 r){
  vec2 q=(s-c)/r;float m=1.0-dot(q,q);
  if(m<=0.0)return vec3(0.0);
  return vec3(-4.0*HOLLY_DEPTH*m*q/r,m*m);
 }
 vec3 hollySurface(vec2 s){
  vec3 l=hollyDome(s,vec2(322.0,500.0),vec2(100.0,112.0));
  vec3 r=hollyDome(s,vec2(497.0,502.0),vec2(96.0,112.0));
  return l.z>r.z?l:r;
 }
 vec3 hollyWeights(vec2 uv){return texture2D(uHollyShape,(uv*vec2(754.0,1280.0)-vec2(216.0,380.0))/vec2(384.0,256.0)).rgb;}
''')
html = sub(html, '''    sampleUV-=(vAureliaLeft*weights.r+vAureliaRight*weights.g)/6.0;`}
   }
   photoUV=sampleUV;
  }''', '''    sampleUV-=(vAureliaLeft*weights.r+vAureliaRight*weights.g)/6.0;`}
   }
   if(uDepth.z>0.0){
    // Parallax: skin nearer the viewer travels a little farther than skin at
    // the base. Uses the same fixed supports, so stationary pixels stay put.
    vec3 w=hollyWeights(sampleUV);
    sampleUV-=(vAureliaLeft*w.r+vAureliaRight*w.g)*uDepth.z*(hollySurface(sampleUV*vec2(754.0,1280.0)).z-.5);
   }
   photoUV=sampleUV;
  }''')
html = sub(html, '''  gl_FragColor=texture2D(uPhoto,photoUV);
 }`;''', '''  gl_FragColor=texture2D(uPhoto,photoUV);
  if(uHolly>0.5&&(uDepth.x>0.0||uDepth.y>0.0)){
   // The photograph already contains the resting light. Add only the change
   // in light caused by the shape leaning with the springs: at rest the
   // difference is zero and the approved portrait is shown untouched.
   vec3 w=hollyWeights(photoUV);
   vec2 travel=(vAureliaLeft*w.r+vAureliaRight*w.g+(photoUV.x<410.0/754.0?vGarmentLeft:vGarmentRight)*w.b)*vec2(754.0,1280.0);
   if(dot(travel,travel)>.0004){
    vec2 slope=hollySurface(photoUV*vec2(754.0,1280.0)).xy;
    // The front of the form follows the spring while its base stays attached:
    // the side facing the motion steepens and the trailing side flattens.
    vec2 leaned=slope/clamp(1.0+dot(travel,slope)/HOLLY_DEPTH,.45,2.2);
    vec3 rest=normalize(vec3(-slope,1.0)),moved=normalize(vec3(-leaned,1.0));
    vec3 light=normalize(vec3(-.35,-.55,.76)),half_=normalize(light+vec3(0.0,0.0,1.0));
    float shade=max(dot(moved,light),0.0)-max(dot(rest,light),0.0);
    float gloss=pow(max(dot(moved,half_),0.0),28.0)-pow(max(dot(rest,half_),0.0),28.0);
    vec3 lit=gl_FragColor.rgb*clamp(1.0+uDepth.x*shade,.55,1.6)+uDepth.y*gloss*clamp(w.r+w.g,0.0,1.0)*vec3(1.0,.93,.86);
    gl_FragColor.rgb=clamp(lit,0.0,1.0);
   }
  }
 }`;''')
assert 'const HOLLY_FABRIC=true;' in html

html = sub(html, " gl.uniform2fv(gl.getUniformLocation(program,'uDragBoundary'),dragBoundary);",
           " gl.uniform2fv(gl.getUniformLocation(program,'uDragBoundary'),dragBoundary);\n"
           " gl.uniform3fv(gl.getUniformLocation(program,'uDepth'),DEPTH_LEVELS[depthLevel].values);")

# Controls: a chip on the stage for quick A/B, and the same control in the panel.
html = sub(html, '#character svg{', '''#character{display:none!important}
#depthChip{position:absolute;left:max(12px,env(safe-area-inset-left));top:max(76px,calc(env(safe-area-inset-top) + 14px));z-index:5;min-height:44px;padding:0 14px;border:1px solid #f9eadf77;border-radius:22px;color:#fff7eb;background:#07110fc9;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:0 3px 16px #0005;font-size:12px;font-weight:700;cursor:pointer;touch-action:manipulation}
#depthChip[aria-pressed="true"]{background:#c69a69d9;border-color:#f0be8c;color:#1b140c}
#depthChip:focus-visible{outline:3px solid #ffcb91;outline-offset:3px}
#character svg{''')
html = sub(html, ' <div id="characterToast"', ' <button id="depthChip" type="button" aria-pressed="true">2.5D: Medium</button>\n <div id="characterToast"')
html = sub(html, '<button id="grabHold" class="slap-audio" type="button">Grab and hold: on</button>',
           '<button id="depthLight" class="slap-audio" type="button" aria-pressed="true">Depth lighting: Medium</button>'
           '<button id="grabHold" class="slap-audio" type="button">Grab and hold: on</button>')
html = sub(html, 'let grabHoldEnabled=', '''// 2.5D preview levels: [shading, highlight, parallax]. Off is production r14.
const DEPTH_LEVELS=[{name:'Off',values:[0,0,0]},{name:'Subtle',values:[1.3,.18,.20]},{name:'Medium',values:[2.1,.30,.28]},{name:'Strong',values:[3.0,.45,.35]}];
const DEPTH_KEY='peach-physics-preview-holly25d-depth';
let depthLevel=2;
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
window.__hollyDepthDebug={level:()=>depthLevel,name:()=>DEPTH_LEVELS[depthLevel].name,set:value=>{if(DEPTH_LEVELS[value]){depthLevel=value;refreshDepth();}}};
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
           ' if(embedCloseup){const zoom=1.9;drawW*=zoom;drawH*=zoom;ox=cssW/2-410/W*drawW;oy=cssH*.5-498/H*drawH;}\n'
           ' uvCover=[cssW/drawW,cssH/drawH,-ox/drawW,-oy/drawH];')
html = sub(html, 'function loop(now){', 'function loop(now){\n if(embedded)return; // The test page steps both engines from one shared clock.')
html = sub(html, "\ncanvas.addEventListener('pointerdown',e=>{", """
if(embedded){
 document.body.classList.add('embedded');
 // Gesture timing comes from the test page so both engines measure identical taps and flicks.
 const nativeNow=performance.now.bind(performance);let relayClock=null;
 performance.now=()=>relayClock===null?nativeNow():relayClock;
 // Registered before the engine's own handlers: a real touch is sent to the
 // test page, which replays it into both engines in source-image coordinates.
 for(const type of ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>{
  if(e.hollyForwarded)return;
  e.preventDefault();e.stopImmediatePropagation();
  if(type==='pointerdown'){try{canvas.setPointerCapture(e.pointerId);}catch(err){}}
  const p=readPoint(e);
  parent.__hollyRelay?.({type:type==='lostpointercapture'?'pointercancel':type,id:e.pointerId,x:p.x,y:p.y,pressure:e.pressure});
 },{capture:true,passive:false});
 // Same random sequence in both engines keeps Auto Jiggle identical.
 const reseed=()=>{let s=8147;motion.random=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};motion.time=0;motion.quietUntil=0;motion.autoDrive=null;};
 window.__hollyFrame={
  ready:()=>!!img&&!!motion&&loader.classList.contains('hiding'),
  tick:dt=>{motion.tick(dt);step(dt);},
  draw:()=>{if(stage.clientWidth&&stage.clientHeight&&!webglLost)render();},
  pointer:data=>{
   const rect=canvas.getBoundingClientRect();
   const event=new PointerEvent(data.type,{pointerId:data.id,pointerType:'touch',clientX:rect.left+ox+data.x/W*drawW,clientY:rect.top+oy+data.y/H*drawH,pressure:data.pressure||.5,bubbles:true,cancelable:true});
   Object.defineProperty(event,'hollyForwarded',{value:true});
   relayClock=data.time;try{canvas.dispatchEvent(event);}finally{relayClock=null;}
  },
  cancel:()=>{pointers.clear();for(const p of impacts)p.target=0;motion.interrupt();},
  reset:()=>{reset();reseed();},
  bounce:()=>{motion.interrupt();bounceBoth();},
  auto:value=>{motion.setAuto(value);reseed();},
  preset:value=>{activePreset=value;Object.assign(model,currentPresets()[value]);refreshPrefs();reset();reseed();},
  closeup:value=>{embedCloseup=!!value;needSize=true;},
  depth:value=>window.__hollyDepthDebug.set(value),
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
(OUT / 'assets/holly-heartbreaker.png').write_bytes((SRC / 'assets/holly-heartbreaker.png').read_bytes())
(OUT / 'apple-touch-icon.png').write_bytes((SRC / 'apple-touch-icon.png').read_bytes())
manifest = json.loads((SRC / 'manifest.webmanifest').read_text())
manifest.update(name='Peach Physics — Holly 2.5D Preview', short_name='Holly 2.5D',
                description='Isolated preview: Holly with depth lighting on the approved portrait.')
(OUT / 'manifest.webmanifest').write_text(json.dumps(manifest, indent=2) + '\n')
print('frame.html bytes', len(html.encode()), 'portrait sha256',
      hashlib.sha256((OUT / 'assets/holly-heartbreaker.png').read_bytes()).hexdigest())
