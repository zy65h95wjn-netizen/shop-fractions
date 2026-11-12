from pathlib import Path

def patch(s):
    runtime=Path(__file__).with_name('boundary_runtime.js').read_text()
    s=s.replace("'use strict';", "'use strict';\n"+runtime,1)
    s=s.replace('function step(dt){','function step(dt){\n advanceDragBoundary(dt);')
    s=s.replace('function reset(){','function reset(){dragBoundary.fill(0);')
    s=s.replace('varying vec2 vRawUV;', 'varying vec2 vRawUV;\n varying vec2 vEmberLeft;\n varying vec2 vEmberRight;')
    s=s.replace('  vRawUV=uv;', '  vRawUV=uv;vEmberLeft=vec2(0.0);vEmberRight=vec2(0.0);')
    s=s.replace('    drift+=edge*(local+press+wave);', '    vec2 contribution=edge*(local+press+wave);\n    if(s==0)vEmberLeft=contribution;else vEmberRight=contribution;\n    drift+=contribution;')
    s=s.replace(' uniform sampler2D uPhoto;', ''' uniform sampler2D uPhoto;
 uniform vec2 uDragBoundary;
 uniform float uEmberBoundary;
 float emberCrease(float y){float t=clamp((y-1060.0)/170.0,0.0,1.0);return 365.0+67.0*t*t+7.0*(1.0-smoothstep(1005.0,1060.0,y));}
 float emberSupport(vec2 uv,float side){vec2 p=uv*vec2(941.0,1671.0);return smoothstep(5.0,70.0,side<.5?emberCrease(p.y)-p.x:p.x-emberCrease(p.y));}
 float midnightSupport(vec2 uv){vec2 p=uv*vec2(941.0,1671.0);float crease=1300.0-.0012*pow(p.x-285.0,2.0);return 1.0-smoothstep(crease-65.0,crease,p.y);}
''')
    s=s.replace('  vec2 photoUV=vUV;', '''  vec2 photoUV=vUV;
  if(uEmberBoundary>.5&&(uDragBoundary.x>0.0||uDragBoundary.y>0.0)){
   float l=min(emberSupport(vRawUV,0.0),emberSupport(vRawUV-vEmberLeft,0.0));
   float r=min(emberSupport(vRawUV,1.0),emberSupport(vRawUV-vEmberRight,1.0));
   photoUV=clamp(vRawUV-vEmberLeft*mix(1.0,l,uDragBoundary.x)-vEmberRight*mix(1.0,r,uDragBoundary.y),.001,.999);
  }''')
    s=s.replace('vLeftVelocity*leftEnvelope(sampleUV)/4.0', 'vLeftVelocity*leftEnvelope(sampleUV)*mix(1.0,midnightSupport(sampleUV),uDragBoundary.x)/4.0')
    s=s.replace('pixels[at+1]=Math.round(255*aureliaSkinWeight(1,112+x+.5,768+y+.5));pixels[at+3]=255;', '''pixels[at+1]=Math.round(255*aureliaSkinWeight(1,112+x+.5,768+y+.5));
  pixels[at+2]=Math.round(255*aureliaDragWeight(0,112+x+.5,768+y+.5));
  pixels[at+3]=Math.round(255*aureliaDragWeight(1,112+x+.5,768+y+.5));''')
    s=s.replace('vec2 weights=texture2D(uAureliaShape,(sampleUV*vec2(756.0,1280.0)-vec2(112.0,768.0))/vec2(528.0,256.0)).rg;', '''vec4 mask=texture2D(uAureliaShape,(sampleUV*vec2(756.0,1280.0)-vec2(112.0,768.0))/vec2(528.0,256.0));
    vec2 weights=mix(mask.rg,mask.ba,uDragBoundary);''')
    s=s.replace(' gl.uniform4fv(coverLoc,new Float32Array(uvCover));', ''' gl.uniform2fv(gl.getUniformLocation(program,'uDragBoundary'),dragBoundary);
 gl.uniform1f(gl.getUniformLocation(program,'uEmberBoundary'),currentCharacter().id==='ember'?1:0);
 gl.uniform4fv(coverLoc,new Float32Array(uvCover));''')
    s=s.replace("return {layer,mask,ctx:layer.getContext('2d')};", "return {layer,mask,ctx:layer.getContext('2d'),...makeDragMasks(mask,side)};")
    s=s.replace("ctx.globalCompositeOperation='destination-in';ctx.drawImage(mask,0,0);", "ctx.globalCompositeOperation='destination-in';ctx.drawImage(fallbackDragMask(backups[side],side,(n.dx+followers[side].dx*followGain)*.8*gain,(n.dy+followers[side].dy*followGain)*.8*gain),0,0);")
    return s
