"""Native capture crops and marked source geometry, all below 700 KiB."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,hashlib,math
import numpy as np

HERE=Path(__file__).resolve().parents[1];OUT=HERE/'evidence';RAW=OUT/'raw';ROOT=HERE.parents[2]
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
title=ImageFont.truetype(FONT,17);small=ImageFont.truetype(FONT,14)
LIMIT=700*1024;files=[]
m=json.loads((OUT/'measurements.json').read_text())
variants=['r5','r6','simple'];labels=['Original / r5','Original / r6','Contour trial / same art']
def record(p,kind,**info):
    with Image.open(p) as im: im.verify()
    assert p.stat().st_size<LIMIT,(p,p.stat().st_size)
    files.append({'file':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'kind':kind,**info})
def jpeg(im,name,kind):
    p=OUT/name
    for q in [94,93,92,91,90,89,88,87,86]:
        im.save(p,quality=q,subsampling=0,optimize=True)
        if p.stat().st_size<LIMIT:break
    record(p,kind,quality=q,chroma='4:4:4')
def frame(backend,variant,side,phase):
    suffix=f'-{side}-{phase}' if phase!='rest' else '-rest'
    return Image.open(RAW/f'{backend}-{variant}{suffix}.png').convert('RGB')
def holly_crop(backend,variant,side,phase):
    return frame(backend,variant,side,phase).crop((195,535,461,872) if side==0 else (431,535,697,872))
for backend in ['webgl','canvas']:
 for side,name in [(0,'left'),(1,'right')]:
    for phase in ['peak','rebound']:
        sheet=Image.new('RGB',(798,377),'#14231e');d=ImageDraw.Draw(sheet)
        for col,variant in enumerate(variants):
            im=holly_crop(backend,variant,side,phase);sheet.paste(im,(col*266,40));d.text((col*266+6,9),labels[col],font=small,fill='white')
            assert sheet.crop((col*266,40,col*266+266,377)).tobytes()==im.tobytes()
        p=OUT/f'{backend}-{name}-{phase}.png';sheet.save(p,optimize=True);record(p,'lossless-native-comparison',side=name,phase=phase)
    rows=[('impact / 0 s','impact'),('loading / 0.067 s','loading'),('peak / 0.100 s','peak'),('return / 0.200 s','return'),(f'rebound / {37/120 if side==0 else 35/120:.3f} s','rebound'),('settled / 8 s','settled')]
    sheet=Image.new('RGB',(798,64+6*369),'#14231e');d=ImageDraw.Draw(sheet)
    d.text((8,6),f'{backend.upper()} / {name} / identical recorded Holly states',font=title,fill='white')
    for col,label in enumerate(labels):d.text((col*266+6,37),label,font=small,fill='white')
    for row,(label,phase) in enumerate(rows):
        y=64+row*369;d.text((8,y+7),label,font=small,fill='white')
        for col,variant in enumerate(variants):sheet.paste(holly_crop(backend,variant,side,phase),(col*266,y+32))
    jpeg(sheet,f'{backend}-{name}-temporal.jpg','native-temporal-comparison')

# Earlier characters: their own preserved Natural preset and independently
# captured extrema. Native screenshot crops; no claim of identical physics.
study_boxes={
 'ember':[(60,915,460,1385),(390,915,840,1385)],
 'midnight':[(130,975,470,1395),(440,975,810,1395)],
 'aurelia':[(112,770,405,1030),(395,770,640,1030)]}
for backend in ['webgl','canvas']:
 for char,boxes in study_boxes.items():
    info=next(q['info'] for q in m['study'] if q['backend']==backend and q['id']==char)
    f=info['framing'];sx=f['width']/info['width']*2;sy=f['height']/info['height']*2
    crops=[]
    for box in boxes:crops.append(tuple(round(v) for v in (f['x']*2+box[0]*sx,f['y']*2+box[1]*sy,f['x']*2+box[2]*sx,f['y']*2+box[3]*sy)))
    w=max(b[2]-b[0] for b in crops);h=max(b[3]-b[1] for b in crops)
    sheet=Image.new('RGB',(4*w,64+2*(h+34)),'#14231e');d=ImageDraw.Draw(sheet)
    d.text((8,5),f'{char.title()} / {backend.upper()} / unchanged Natural response',font=title,fill='white')
    for col,phase in enumerate(['rest','peak','rebound','settled']):d.text((col*w+8,36),phase,font=small,fill='white')
    for side in [0,1]:
        stat=next(q for q in m['study'] if q['backend']==backend and q['id']==char and q['side']==side)
        y=64+side*(h+34);d.text((8,y+7),f'{["Left","Right"][side]} alone / peak {stat["peak"]/120:.3f}s / rebound {stat["rebound"]/120:.3f}s',font=small,fill='white')
        for col,phase in enumerate(['rest','peak','rebound','settled']):sheet.paste(frame(backend,char,side,phase).crop(crops[side]),(col*w,y+34))
    jpeg(sheet,f'study-{backend}-{char}.jpg','native-established-character-comparison')

sources={'ember':HERE/'assets/reference-ember.webp','midnight':HERE/'assets/reference-midnight.webp',
         'aurelia':ROOT/'peach-physics/v8/assets/aurelia-frost.jpg','holly':ROOT/'peach-physics/v8/assets/holly-heartbreaker.jpg'}
for name,maskname in [('ember','ember'),('midnight','midnight'),('aurelia','aurelia'),('holly','r6'),('holly-trial','simple')]:
    data=json.loads((RAW/f'mask-{maskname}.json').read_text());x,y,w,h=data['box'];a=np.array(data['pixels'],dtype=np.uint8).reshape(h,w)
    im=Image.open(sources['holly' if name.startswith('holly') else name]).convert('RGB').crop((x,y,x+w,y+h))
    rgb=np.array(im,dtype=float);alpha=a[:,:,None]/255*.52
    overlay=Image.fromarray(np.rint(rgb*(1-alpha)+np.array([40,240,140])*alpha).astype('uint8'))
    sheet=Image.new('RGB',(w*2,h+70),'#14231e');d=ImageDraw.Draw(sheet)
    d.text((8,6),f'{name} / native source geometry',font=title,fill='white');d.text((8,36),'Original crop',font=small,fill='white')
    d.text((w+8,36),'Green = WebGL support weight (not displacement)',font=small,fill='white')
    sheet.paste(im,(0,70));sheet.paste(overlay,(w,70));jpeg(sheet,f'geometry-{name}.jpg','native-source-support-overlay')

# Four portraits provide composition context. Only this overview is resized;
# diagnostic motion comparisons and geometry crops retain native pixels.
overview=Image.new('RGB',(1200,600),'#14231e');d=ImageDraw.Draw(overview)
for col,(name,path) in enumerate(sources.items()):
    im=Image.open(path).convert('RGB');im.thumbnail((300,560));overview.paste(im,(col*300+(300-im.width)//2,40));d.text((col*300+8,9),name.title(),font=title,fill='white')
jpeg(overview,'portrait-context.jpg','resized-composition-overview')

# Source-photo boxes from the preserved boundary suite; report changes, do not
# turn containment into a success score. Counts alone cannot classify occlusion.
boxes=[[[201,480,207,510],[210,520,217,532],[218,548,223,560],[225,576,231,585],[239,607,249,618]],
       [[608,498,614,503],[610,510,617,531],[608,535,615,542],[597,552,608,562],[586,575,597,584],[563,607,574,617],[575,454,584,467]]]
checks={'rest':[],'adjacentPhotoBoxes':[],'warning':'Changed pixels and stationary samples are diagnostics, not natural-motion acceptance.'}
for backend in ['webgl','canvas']:
    a=np.array(frame(backend,'r6',0,'rest'));b=np.array(frame(backend,'simple',0,'rest'))
    assert np.array_equal(a,b),'conservative trial must preserve resting image'
    checks['rest'].append({'backend':backend,'changedChannels':int(np.count_nonzero(a!=b))})
    for variant in variants:
        rest=np.array(frame(backend,variant,0,'rest'))
        for side in [0,1]:
            for phase in ['peak','rebound']:
                posed=np.array(frame(backend,variant,side,phase));rows=[]
                for box in boxes[side]:
                    differences=[]
                    for y in range(box[1],box[3]):
                        for x in range(box[0],box[2]):
                            px=round(x/720*390*2);py=round((70+y/720*390)*2)
                            differences.append(np.max(np.abs(posed[py,px].astype(int)-rest[py,px].astype(int))))
                    rows.append({'sourceBox':box,'samples':len(differences),'changed':int(sum(v>0 for v in differences)),'maximumChannelDifference':int(max(differences))})
                checks['adjacentPhotoBoxes'].append({'backend':backend,'variant':variant,'side':side,'phase':phase,'boxes':rows})
(OUT/'image-checks.json').write_text(json.dumps(checks,indent=2)+'\n')
(OUT/'assets.json').write_text(json.dumps({'limitBytes':LIMIT,'noMotionCropResampling':True,'files':files},indent=2)+'\n')
base='https://raw.githubusercontent.com/zy65h95wjn-netizen/shop-fractions/refs/heads/experiment/holly-artwork-compatibility/peach-physics/experiments/holly-artwork-compatibility/evidence/'
index=['# Holly artwork compatibility: visual review','',
 '**No accepted visual fix.** The contour trial preserves motion amplitude but also deforms adjacent photographic features. No revised portrait was produced: the image editor rejected the edit. See [FINDINGS.md](../FINDINGS.md) and the [specific artwork recommendation](../ARTWORK_SPEC.md).','',
 'Holly columns: original r5, original r6, conservative contour trial using the same original JPEG. All three receive exactly the same recorded states at 390×844 CSS px, DPR 2. Temporal rows include impact, loading, peak, return, rebound and recorded settled state. Left and right gestures are independent.','',
 'The established-character sheets use each character’s own unchanged Natural response, with per-side extrema labeled. They do not imply identical spring settings or identical WebGL/Canvas algorithms. Green geometry overlays show WebGL support weights, not material mattes or displacement.','',
 'All motion crops and source geometry crops retain native pixels. Only the full-portrait context overview is resized. Every review image is below 700 KiB; PNGs are lossless and JPEGs use 4:4:4 chroma. Direct raw links and byte sizes follow.','',
 '| Image | Bytes | Format / purpose |','| --- | ---: | --- |']
for q in files:index.append(f'| [{q["file"]}]({base}{q["file"]}) | {q["bytes"]:,} | {q["kind"]} |')
index+=['','[Image hashes and encoding](assets.json) · [Recorded pose measurements](measurements.json) · [Rest and adjacent-feature checks](image-checks.json) · [Trajectory/legacy isolation and adjacent mapping](isolation-and-adjacency.json) · [Artwork attempt status](artwork-attempt.json)','']
(OUT/'README.md').write_text('\n'.join(index))
print(json.dumps({'reviewImages':len(files),'largestBytes':max(q['bytes'] for q in files),'totalBytes':sum(q['bytes'] for q in files),'rest':checks['rest']}))
