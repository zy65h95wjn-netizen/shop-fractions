"""Isolated Holly bounce comparison. Production and the 2.5D preview stay intact."""
import hashlib, json, re
from pathlib import Path
HERE=Path(__file__).resolve().parent
V8=HERE.parent.parent/'v8'
source=(V8/'index.html').read_text()
def replace(old,new):
    global source
    assert source.count(old)==1,(source.count(old),old[:100])
    source=source.replace(old,new)
source=re.sub(r"const (IMAGE|OTHER_IMAGE)='[^']*';",r"const \1='';",source)
replace("src:'./assets/holly-heartbreaker.png'","src:'../../v8/assets/holly-heartbreaker.png'")
source=re.sub(r"src:'./assets/(aurelia-frost.jpg|santa-claus.jpg)'","src:''",source)
start=source.index('let activeCharacterIndex=0;');end=source.index('const currentCharacter=',start)
source=source[:start]+'let activeCharacterIndex=3;\n'+source[end:]
source=re.sub(r' CHARACTERS.forEach\(\(c,index\)=>.*?\);\n','',source)
source=re.sub(r"<script>\s*if\('serviceWorker'.*?</script>",'',source,flags=re.S)
source=re.sub(r'<link[^>]+(?:manifest|icon)[^>]*>','',source)
source=source.replace('localStorage','previewStorage').replace('requestAnimationFrame(loop)','void 0')
motion=(V8/'motion.js').read_text().replace('win.localStorage','win.previewStorage')
replace('<script src="./motion.js?v=r14-auto2"></script>','<script>window.previewStorage={getItem:()=>null,setItem:()=>{}};</script><script>'+motion+'</script>')
replace(' uniform vec2 uSecondary[2];',' uniform vec2 uSecondary[2];\n uniform float uSoftBounce;')
start=source.index(' vec2 hollyVelocity(vec2 uv,int side){');end=source.index(' void main(){',start)
original_velocity=source[start:end].replace('hollyVelocity(', 'hollyOriginalVelocity(', 1)
replace(' vec2 hollyVelocity(vec2 uv,int side){',original_velocity+' vec2 hollyVelocity(vec2 uv,int side){')
replace(' vec2 hollyVelocity(vec2 uv,int side){', ''' vec2 hollyVelocity(vec2 uv,int side){
  if(uSoftBounce>0.5){
   vec2 size=vec2(754.0,1280.0);
   vec2 upper=uOffsets[side*3]*size,center=uOffsets[side*3+1]*size,lower=uOffsets[side*3+2]*size;
   vec2 local=(uv-uPoints[side*3+1].xy)*size;
   // A shared carrier plus a restrained roll keeps the region coordinated.
   vec2 motion=.18*upper+.64*center+.18*lower+uSecondary[side]*size*vec2(.35,.50);
   float roll=clamp((lower.x-upper.x)*.0014,-.018,.018);
   float shape=clamp((lower.y-upper.y)*.00065,-.010,.010);
   motion+=vec2(-local.y,local.x)*roll+vec2(local.x,-local.y)*shape;
   vec4 h=uImpacts[side];vec2 delta=(uv-h.xy)*size;
   vec2 hi=delta/vec2(74.0,66.0);
   motion+=delta*exp(-2.6*dot(hi,hi))*(h.z*.035-h.w*.045);
   float travel=length(motion);
   if(travel>16.0)motion*=(16.0+8.0*(1.0-exp(-(travel-16.0)/8.0)))/travel;
   return motion/size*${HOLLY_JIGGLE_GAIN.toFixed(2)};
  }''')
replace(" gl.uniform2fv(gl.getUniformLocation(program,'uDragBoundary'),dragBoundary);", " gl.uniform1f(gl.getUniformLocation(program,'uSoftBounce'),bounceExperiment?1:0);\n gl.uniform2fv(gl.getUniformLocation(program,'uDragBoundary'),dragBoundary);")
replace('vGarmentLeft=hollyVelocity(vec2(320.0/754.0,536.0/1280.0),0);vGarmentRight=hollyVelocity(vec2(498.0/754.0,539.0/1280.0),1);', 'vGarmentLeft=hollyOriginalVelocity(vec2(320.0/754.0,536.0/1280.0),0);vGarmentRight=hollyOriginalVelocity(vec2(498.0/754.0,539.0/1280.0),1);')
replace('if(HOLLY_FABRIC)hollyGarment=HOLLY_GARMENT_ANCHORS.map(([x,y],side)=>hollyVelocity(x,y,side));', 'if(HOLLY_FABRIC)hollyGarment=HOLLY_GARMENT_ANCHORS.map(([x,y],side)=>bounceNativeVelocity(x,y,side));')
start=source.index(' const portrait=cssH>cssW;');end=source.index(' if(gl)gl.viewport',start)
source=source[:start]+''' const scale=bounceClose?Math.min(cssW/540,cssH/820):Math.min(cssW/W,cssH/H);
 drawW=W*scale;drawH=H*scale;ox=cssW/2-(bounceClose?405:W/2)*scale;
 oy=bounceClose?cssH/2-410*scale:(cssH-drawH)/2;
 uvCover=[cssW/drawW,cssH/drawH,-ox/drawW,-oy/drawH];
 canvas.style.webkitMaskImage='none';canvas.style.maskImage='none';
'''+source[end:]
replace('presentCharacter();\ngetPhoto',(HERE/'frame-hook.js').read_text()+'\npresentCharacter();\ngetPhoto')
replace('</head>','<style>#gear,#character,#hint,#panel,#scrim,#characterToast,#status,#pulse,.slap-burst,#backdrop{display:none!important}#stage{background:#0b1713}#loader b{font-size:14px}</style></head>')
(HERE/'engine.html').write_text(source)
(HERE/'build-info.json').write_text(json.dumps({
 'sourceSHA256':hashlib.sha256((V8/'index.html').read_bytes()).hexdigest(),
 'motionSHA256':hashlib.sha256((V8/'motion.js').read_bytes()).hexdigest(),
 'artworkSHA256':hashlib.sha256((V8/'assets/holly-heartbreaker.png').read_bytes()).hexdigest(),
 'description':'Original Holly motion versus a broader skin support envelope and coordinated displacement field. Same photograph, spring trajectories, Auto drive and garment mask; fixed front view.'
},indent=2)+'\n')
print('Built',len(source.encode()),'bytes')
