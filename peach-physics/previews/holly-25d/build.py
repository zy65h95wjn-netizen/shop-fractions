"""Build an isolated Holly relief preview from the approved v8 renderer.

Only presentation, depth projection and event forwarding are added. The spring
solver, artwork sampling, support masks and motion controller remain upstream.
"""
import hashlib, json, re
from pathlib import Path

HERE = Path(__file__).resolve().parent
V8 = HERE.parent.parent / 'v8'
source = (V8 / 'index.html').read_text()
def replace(old, new):
    global source
    assert source.count(old) == 1, (source.count(old), old[:100])
    source = source.replace(old, new)

source = re.sub(r"const (IMAGE|OTHER_IMAGE)='[^']*';", r"const \1='';", source)
replace("src:'./assets/holly-heartbreaker.png'", "src:'../../v8/assets/holly-heartbreaker.png'")
source = re.sub(r"src:'./assets/(aurelia-frost.jpg|santa-claus.jpg)'", "src:''", source)
start = source.index('let activeCharacterIndex=0;')
end = source.index('const currentCharacter=', start)
source = source[:start] + 'let activeCharacterIndex=3;\n' + source[end:]
source = re.sub(r' CHARACTERS.forEach\(\(c,index\)=>.*?\);\n', '', source)
source = re.sub(r"<script>\s*if\('serviceWorker'.*?</script>", '', source, flags=re.S)
source = re.sub(r'<link[^>]+(?:manifest|icon)[^>]*>', '', source)
source = source.replace('localStorage', 'previewStorage')
motion = (V8 / 'motion.js').read_text().replace('win.localStorage', 'win.previewStorage')
memory = '<script>window.previewStorage={getItem:()=>null,setItem:()=>{}};</script>'
replace('<script src="./motion.js?v=r14-auto2"></script>', memory + '<script>' + motion + '</script>')
source = source.replace('requestAnimationFrame(loop)', 'void 0')

# The same existing mesh and fragment shader are used on both sides.
replace(' attribute vec2 aPosition;', ' attribute vec2 aPosition;\n attribute vec3 aRelief;\n uniform vec2 uReliefView;\n uniform vec2 uReliefMotion;')
marker = '   gl_Position=vec4(aPosition.x*2.0-1.0,1.0-aPosition.y*2.0,0.0,1.0);return;'
start = source.index('  if(uHolly>0.5){')
at = source.index(marker, start)
source = source[:at] + '''   float height=aRelief.x+dot(aRelief.yz,uReliefMotion);
   vec2 projected=aPosition+uReliefView*height/(vec2(754.0,1280.0)*uCover.xy);
   gl_Position=vec4(projected.x*2.0-1.0,1.0-projected.y*2.0,0.0,1.0);return;''' + source[at+len(marker):]
replace(' meshCount=indices.length;', ' meshCount=indices.length;')
replace(' uploadCharacterCalibration();\n}', ' reliefInit();\n uploadCharacterCalibration();\n}')
replace(" gl.uniform2fv(gl.getUniformLocation(program,'uDragBoundary'),dragBoundary);", " reliefUniforms();\n gl.uniform2fv(gl.getUniformLocation(program,'uDragBoundary'),dragBoundary);")

# Identical, undistorted framing; fit the entire original photograph at rest.
start = source.index(' const portrait=cssH>cssW;')
end = source.index(' if(gl)gl.viewport', start)
source = source[:start] + ''' const scale=reliefClose?Math.min(cssW/540,cssH/820):Math.min(cssW/W,cssH/H);
 drawW=W*scale;drawH=H*scale;ox=cssW/2-(reliefClose?405:W/2)*scale;
 oy=reliefClose?cssH/2-410*scale:(cssH-drawH)/2;
 uvCover=[cssW/drawW,cssH/drawH,-ox/drawW,-oy/drawH];
 canvas.style.webkitMaskImage='none';canvas.style.maskImage='none';
 if(gl)reliefRefresh();
''' + source[end:]
replace('presentCharacter();\ngetPhoto', (HERE / 'frame-hook.js').read_text() + '\npresentCharacter();\ngetPhoto')
replace('</head>', '<style>#gear,#character,#hint,#panel,#scrim,#characterToast,#status,#pulse,.slap-burst,#backdrop{display:none!important}#stage{background:#0b1713}#loader b{font-size:14px}</style></head>')
(HERE / 'engine.html').write_text(source)
(HERE / 'build-info.json').write_text(json.dumps({
    'sourceSHA256': hashlib.sha256((V8 / 'index.html').read_bytes()).hexdigest(),
    'motionSHA256': hashlib.sha256((V8 / 'motion.js').read_bytes()).hexdigest(),
    'artworkSHA256': hashlib.sha256((V8 / 'assets/holly-heartbreaker.png').read_bytes()).hexdigest(),
    'description': 'Original Holly photograph and v8 physics, with bounded shallow relief projection. Authored approximate depth; no regenerated artwork or full 3D character.'
}, indent=2) + '\n')
print('Built engine:', len(source.encode()), 'bytes')
