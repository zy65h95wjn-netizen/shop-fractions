"""Bundle the approved Aurelia engine and an isolated Blender comparison offline."""
import base64, hashlib, json, re
from pathlib import Path
HERE=Path(__file__).resolve().parent
V8=HERE.parent.parent/'v8'
source=(V8/'index.html').read_text()
motion=(V8/'motion.js').read_text()
art=(V8/'assets/aurelia-frost.jpg').read_bytes()
bake=json.loads((HERE.parent/'aurelia-comparison/blender-response.json').read_text())
def replace(old,new):
    global source
    assert source.count(old)==1,old[:80]
    source=source.replace(old,new)
# Remove unused embedded portraits and preloading. The approved Aurelia JPEG is exact.
source=re.sub(r"const (IMAGE|OTHER_IMAGE)='[^']*';",r"const \1='';",source)
replace("src:'./assets/aurelia-frost.jpg'","src:'data:image/jpeg;base64,"+base64.b64encode(art).decode()+"'")
source=re.sub(r"src:'./assets/(holly-heartbreaker.png|santa-claus.jpg)'","src:''",source)
start=source.index('let activeCharacterIndex=0;')
end=source.index('const currentCharacter=',start)
source=source[:start]+'let activeCharacterIndex=2;\n'+source[end:]
source=re.sub(r' CHARACTERS.forEach\(\(c,index\)=>.*?\);\n', '',source)
source=re.sub(r"<script>\s*if\('serviceWorker'.*?</script>",'',source,flags=re.S)
source=re.sub(r'<link[^>]+(?:manifest|icon)[^>]*>','',source)
source=source.replace('localStorage','previewStorage')
motion=motion.replace('win.localStorage','win.previewStorage')
memory="<script>window.previewStorage={getItem:()=>null,setItem:()=>{}};</script>"
replace('<script src="./motion.js?v=r14-auto2"></script>',memory+'<script>'+motion+'</script>')
# One parent clock drives both panes. Physics and renderer code are otherwise retained.
source=source.replace('requestAnimationFrame(loop)','void 0')
replace('function step(dt){','function step(dt){\n comparisonTime+=dt;')
replace('damping*localDamping*n.vx','damping*localDamping*comparisonDamping(n.side)*n.vx')
replace('damping*localDamping*n.vy','damping*localDamping*comparisonDamping(n.side)*n.vy')
hook=((HERE/'glass.js').read_text()+'\n'+(HERE/'frame-hook.js').read_text()).replace('__BAKE__',json.dumps({'fps':bake['fps'],'curves':bake['curves']},separators=(',',':')))
replace('presentCharacter();\ngetPhoto',hook+'\npresentCharacter();\ngetPhoto')
css='<style>#gear,#character,#hint,#panel,#scrim,#characterToast,#status{display:none!important}#backdrop{filter:blur(25px) brightness(.3)}#loader b{font-size:14px}</style>'
replace('</head>',css+'</head>')
# Match composition between the two panes and fit the full original photograph.
start=source.index(' const portrait=cssH>cssW;')
end=source.index(' if(gl)gl.viewport',start)
source=source[:start]+''' const scale=comparisonCloseup?Math.min(cssW/580,cssH/650):Math.min(cssW/W,cssH/H);
 drawW=W*scale;drawH=H*scale;ox=(cssW-drawW)/2;
 oy=comparisonCloseup?cssH/2-850*scale:(cssH-drawH)/2;
 uvCover=[cssW/drawW,cssH/drawH,-ox/drawW,-oy/drawH];
 canvas.style.webkitMaskImage='none';canvas.style.maskImage='none';
'''+source[end:]
template=(HERE/'shell.html').read_text()
# Escape closing script tags inside the string embedded in the outer script.
bundled=template.replace('__FRAME__',json.dumps(source).replace('</','<\\/'))
(HERE/'index.html').write_text(bundled)
(HERE/'build-info.json').write_text(json.dumps({'sourceSHA256':hashlib.sha256((V8/'index.html').read_bytes()).hexdigest(),'artworkSHA256':hashlib.sha256(art).hexdigest(),'blender':bake['tool'],'description':'Aurelia preview-2 Blender clap motion versus a masked glass-pressure rendering experiment; original JPEG and solver preserved.'},indent=2)+'\n')
print('Built',len(bundled),'characters')
