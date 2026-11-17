"""Build the four-portrait viewer from the tested Holly, depth and Aurelia previews."""
from pathlib import Path
import json
here = Path(__file__).resolve().parent
previews = here.parent
source = (previews / 'holly-bounce/engine.html').read_text()

def edit(old, new):
    global source
    assert source.count(old) == 1, old[:100]
    source = source.replace(old, new)

edit("const IMAGE='';", "const IMAGE=parent.embeddedPortraits[0];")
edit("const OTHER_IMAGE='';", "const OTHER_IMAGE=parent.embeddedPortraits[1];")
edit("name:'Aurelia Frost',src:''", "name:'Aurelia Frost',src:'../../v8/assets/aurelia-frost.jpg'")
edit("let activeCharacterIndex=3;", "const selection=new URLSearchParams(location.search).get('portrait');\nlet activeCharacterIndex=Math.max(0,['ember','midnight','aurelia','holly'].indexOf(selection));")
edit("window.name==='softer'", "window.name==='study'")
edit("if(!bounceExperiment)return;\n const [ox", "if(!bounceExperiment||!isHolly())return;\n const [ox")
start = source.index(" const scale=bounceClose?")
end = source.index(" if(gl)gl.viewport",start)
source=source[:start]+""" const scale=Math.min(cssW/W,cssH/H)*(bounceClose?1.5:1);
 drawW=W*scale;drawH=H*scale;ox=(cssW-drawW)/2;
 oy=bounceClose?clamp(cssH*.5-regions[0].y*scale,Math.min(0,cssH-drawH),Math.max(0,cssH-drawH)):(cssH-drawH)/2;
 uvCover=[cssW/drawW,cssH/drawH,-ox/drawW,-oy/drawH];
 if(gl)uploadDepth();
"""+source[end:]
edit(" attribute vec2 aPosition;", " attribute vec2 aPosition;\n attribute float aDepth;\n uniform vec2 uView;")
projection="gl_Position=vec4(aPosition.x*2.0-1.0,1.0-aPosition.y*2.0,0.0,1.0);"
assert source.count(projection)==4
source=source.replace(projection, "vec2 projected=aPosition+uView*aDepth/uCover.xy;gl_Position=vec4(projected.x*2.0-1.0,1.0-projected.y*2.0,0.0,1.0);")
edit(" uploadCharacterCalibration();\n}", " depthBuffer=gl.createBuffer();\n depthAttribute=gl.getAttribLocation(program,'aDepth');\n viewUniform=gl.getUniformLocation(program,'uView');\n uploadCharacterCalibration();\n}")
edit(" gl.uniform1f(gl.getUniformLocation(program,'uSoftBounce')", " gl.uniform2f(viewUniform,viewX,viewY*W/H);\n gl.uniform1f(gl.getUniformLocation(program,'uSoftBounce')")
# Rotate the upper cup and its trim together about the garment anchor.
edit("vGarmentRight=hollyOriginalVelocity(vec2(498.0/754.0,539.0/1280.0),1);", """vGarmentRight=hollyOriginalVelocity(vec2(498.0/754.0,539.0/1280.0),1);
   if(uSoftBounce>.5){
    vec2 size=vec2(754.,1280.);
    vec2 left=uv*size-vec2(320.,536.),right=uv*size-vec2(498.,539.);
    vGarmentLeft+=vec2(-left.y,left.x)*clamp(-uOffsets[1].y*1280.*.0013,-.03,.03)/size;
    vGarmentRight+=vec2(-right.y,right.x)*clamp(uOffsets[4].y*1280.*.0013,-.03,.03)/size;
   }""".replace('\n', ' '))
edit("g=hollyGarment[side];let sx", """g=hollyGarment[side].slice();
 if(bounceExperiment){
  const [ax,ay]=HOLLY_GARMENT_ANCHORS[side],angle=clamp((side?1:-1)*nodes[side*3+1].dy*.0013,-.03,.03);
  g[0]-=(cy+y+.5-ay)*angle;g[1]+=(cx+x+.5-ax)*angle;
 }
 let sx""")
# Restrict extra drag damping to Ember's screen-left diagonal recoil.
edit("const localDamping=currentCharacter()", """const directionMix=Math.min(Math.abs(n.vx),Math.abs(n.vy))/(1+Math.max(Math.abs(n.vx),Math.abs(n.vy)));
  const localDamping=bounceExperiment&&selection==='ember'&&n.side===0?1+.30*directionMix:currentCharacter()""")
# Reduce direct linked velocity during a Midnight drag; recover the motion through
# the existing spring so the other side follows after displacement develops.
edit("follow=(linkedTransfer()/50)*.020", "follow=(linkedTransfer()/50)*.020*(bounceExperiment&&selection==='midnight'?.55:1)")
edit("const cross=k*.24*(linkedTransfer()/100);", "const cross=k*.24*(linkedTransfer()/100)*(bounceExperiment&&selection==='midnight'?1.3:1);")
edit("createLeftShapeTexture();createAureliaShapeTexture();createHollyShapeTexture();createSantaShapeTexture();",
     "if(isHolly())createHollyShapeTexture();else if(selection==='aurelia')createAureliaShapeTexture();else createLeftShapeTexture();")
# Keep the accepted right-hand field and both spring trajectories intact.
edit("let leftShapePixels=null;", (here/'midnight.js').read_text()+"\nlet leftShapePixels=null;")
edit("leftShapePixels[y*w+x]=Math.round(255*t*t*(3-2*t));",
     "const weight=bounceExperiment&&selection==='midnight'?midnightSeamWeight(px,py):t*t*(3-2*t);\n   leftShapePixels[y*w+x]=Math.round(255*weight);")
edit("   const [srcX,srcY,sw,sh]=fallbackRect(side);",
     "   if(bounceExperiment&&selection==='midnight'&&side===0){drawMidnightLeft(sc);continue;}\n   const [srcX,srcY,sw,sh]=fallbackRect(side);")
# In the free interior, evaluate the same spatial response as Midnight's right
# side using the three left nodes. The fragment mask selects the transition.
edit("if(s==0 && uLeftMask>0.5)local*=",
     "if(s==0 && uLeftMask>0.5 && uSoftBounce<.5)local*=")
edit("    vLeftVelocity=leftVelocity(uv);", """    vLeftVelocity=leftVelocity(uv);
    if(uSoftBounce>.5)vEmberLeft=(local+press+wave);""")
edit("for(int k=0;k<4;k++)sampleUV-=vLeftVelocity*leftEnvelope(sampleUV)*mix(1.0,midnightSupport(sampleUV),uDragBoundary.x)/4.0;",
     """for(int k=0;k<4;k++){
    float support=leftEnvelope(sampleUV);
    float interior=smoothstep(.62,.98,support);
    vec2 response=mix(vLeftVelocity,vEmberLeft,interior*${bounceExperiment&&selection==='midnight'?'1.0':'0.0'});
    // During a held drag, keep the fold attached to the same moving surface.
    float holdLimit=${bounceExperiment&&selection==='midnight'?'1.0':'mix(1.0,midnightSupport(sampleUV),uDragBoundary.x)'};
    sampleUV-=response*support*holdLimit/4.0;
   }""")
depth=(previews/'holly-25d/frame-hook.js').read_text()
holly=depth[depth.index('const reliefSmooth='):depth.index('function reliefInit()')]
aurelia=(previews/'aurelia-comparison/frame-hook.js').read_text()
aurelia=aurelia[:aurelia.index('function comparisonPointer')]
bake=json.loads((previews/'aurelia-comparison/blender-response.json').read_text())
aurelia=aurelia.replace('__BAKE__',json.dumps({k:bake[k] for k in ('fps','curves')},separators=(',',':'))).replace("window.name==='blender'", "bounceExperiment&&selection==='aurelia'").replace('if(this.auto&&!this.shake)','if(selection===\'aurelia\'&&this.auto&&!this.shake)')
edit('function step(dt){', 'function step(dt){\n comparisonTime+=dt;')
source=source.replace('damping*localDamping*n.v','damping*localDamping*comparisonDamping(n.side)*n.v')
start=source.index('function bouncePointer(')
end=source.index('presentCharacter();\ngetPhoto',start)
source=source[:start]+holly+aurelia+(here/'portrait.js').read_text()+'\n'+source[end:]
(here/'engine.html').write_text(source)
