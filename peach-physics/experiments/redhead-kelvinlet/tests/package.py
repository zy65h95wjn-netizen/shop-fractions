"""Package actual browser captures. Requires Pillow, NumPy and ffmpeg."""
import json, math, subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np

source = Path(sys.argv[1] if len(sys.argv)>1 else '/tmp/kelvinlet-evidence')
dest = Path(__file__).resolve().parent.parent/'evidence'
dest.mkdir(exist_ok=True)
results=json.loads((source/'browser-results.json').read_text())
phases=['rest','light-tap','strong-tap','hold','release','inward','outward','upward','downward','both','restored']
consistency=[]
for renderer in ['webgl','canvas']:
    boxes=results[renderer]['boxes']
    sheet=Image.new('RGB',(1380,280*len(phases)+36),'#171614')
    draw=ImageDraw.Draw(sheet)
    for i,mode in enumerate(['A','A+','B']): draw.text((i*460+12,10),mode,fill='white')
    for j,phase in enumerate(phases):
        image=Image.open(source/f'{renderer}-{phase}.png')
        for i,box in enumerate(boxes):
            scale=(box['width']-2)/490
            x=box['x']+1+(260-150)*scale
            y=box['y']+48+(400-100)*scale
            region=image.crop((round(x),round(y),round(x+310*scale),round(y+165*scale))).resize((450,240))
            sheet.paste(region,(i*460+5,36+j*280+24))
        draw.text((10,36+j*280),phase.replace('-',' '),fill='white')
    sheet.save(dest/f'{renderer}-comparison.jpg',quality=92)
    (dest/f'{renderer}-three-way.mp4').write_bytes((source/f'{renderer}-three-way.mp4').read_bytes())
    for mode,box in zip(['A','AP','B'],boxes):
        x=int(box['x'])//2*2;y=int(box['y'])//2*2;w=int(box['width'])//2*2;h=int(box['height'])//2*2
        subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(source/f'{renderer}-three-way.mp4'),'-vf',f'crop={w}:{h}:{x}:{y}','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',str(dest/f'{renderer}-{mode}.mp4')],check=True)
for phase in phases:
    gl=np.asarray(Image.open(source/f'webgl-{phase}.png').convert('RGB'),dtype=float)
    cpu=np.asarray(Image.open(source/f'canvas-{phase}.png').convert('RGB'),dtype=float)
    glrest=np.asarray(Image.open(source/'webgl-rest.png').convert('RGB'),dtype=float)
    cpurest=np.asarray(Image.open(source/'canvas-rest.png').convert('RGB'),dtype=float)
    for mode,box in zip(['A','A+','B'],results['webgl']['boxes']):
        x=round(box['x']+2);y=round(box['y']+49);w=int(box['width']-4);h=int(box['height']-51)
        d=gl[y:y+h,x:x+w]-cpu[y:y+h,x:x+w]
        motion=(gl-glrest-(cpu-cpurest))[y:y+h,x:x+w]
        consistency.append({'phase':phase,'mode':mode,'rgbMAE':float(np.abs(d).mean()),'rgbRMSE':float(np.sqrt((d*d).mean())),'maxChannelDifference':float(np.abs(d).max()),'motionResidualRMSE':float(np.sqrt((motion*motion).mean()))})
(dest/'consistency.json').write_text(json.dumps({'note':'Aligned actual browser portrait pixels, RGB 0..255. Canvas performs source-resolution interpolation before viewport resampling; GL samples the original directly. These renderers are not pixel-identical. Motion residual subtracts each renderer\'s resting frame.', 'samples':consistency},indent=2))
for f in ['browser-results.json','validation.json','performance.json']:(dest/f).write_bytes((source/f).read_bytes())
for src,name in [('/tmp/kelvinlet-math.json','math.json'),('/tmp/kelvinlet-measurements.json','measurements.json'),('/tmp/kelvinlet-refined.json','refined.json'),('/tmp/kelvinlet-local.json','local-response.json')]: (dest/name).write_bytes(Path(src).read_bytes())
print(json.dumps({'maxRGB_MAE':max(s['rgbMAE'] for s in consistency),'maxMotionResidualRMSE':max(s['motionResidualRMSE'] for s in consistency),'files':len(list(dest.iterdir()))}))
