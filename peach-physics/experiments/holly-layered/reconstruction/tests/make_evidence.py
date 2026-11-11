"""Native-pixel lossless before/after details and connector-sized temporal sheets."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import numpy as np,json,hashlib

ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'evidence';RAW=OUT/'raw'
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';title=ImageFont.truetype(font,17);small=ImageFont.truetype(font,14)
files=[];limit=700*1024;metrics={'rest':[],'stationarySamples':[],'artifactsAreNotAcceptance':True}
def record(p,kind):
    assert p.stat().st_size<limit,(p,p.stat().st_size)
    with Image.open(p) as im:im.verify()
    files.append({'file':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'kind':kind})
def crop(backend,variant,side,suffix):
    box=(195,535,461,872) if side==0 else (431,535,697,872)
    with Image.open(RAW/f'{backend}-{variant}-{side}-{suffix}.png') as im:return im.crop(box)
for backend in ['webgl','canvas']:
    before=np.array(Image.open(RAW/f'{backend}-before-rest.png'));after=np.array(Image.open(RAW/f'{backend}-after-rest.png'))
    metrics['rest'].append({'backend':backend,'changedChannels':int(np.count_nonzero(before!=after))})
    assert np.array_equal(before,after),'resting source must remain identical'
    for side,label in [(0,'left'),(1,'right')]:
        for phase in ['peak','rebound']:
            pair=Image.new('RGB',(532,377),'#14231e');d=ImageDraw.Draw(pair)
            for col,variant in enumerate(['before','after']):
                im=crop(backend,variant,side,phase)
                p=OUT/f'{backend}-{label}-{phase}-{variant}.png';im.save(p,optimize=True);record(p,'lossless-native-crop')
                pair.paste(im.convert('RGB'),(col*266,40));d.text((col*266+8,6),f'{variant} / {label} {phase}',font=small,fill='white')
                with Image.open(p) as saved:assert saved.tobytes()==im.tobytes()
            p=OUT/f'{backend}-{label}-{phase}-pair.png';pair.save(p,optimize=True);record(p,'lossless-native-pair')
        # Six rows, including exact peak/rebound and two intermediate states.
        rows=[('impact / 0 s','frame-00'),('loading / 0.067 s','frame-02'),('peak / 0.100 s','peak'),('return / 0.200 s','frame-06'),(f'rebound / {0.308 if side==0 else 0.292:.3f} s','rebound'),('settled / 8 s','settled')]
        sheet=Image.new('RGB',(532,64+6*369),'#14231e');d=ImageDraw.Draw(sheet)
        d.text((8,5),f'{backend.upper()} / {label} / same recorded motion',font=title,fill='white')
        d.text((8,35),'Before: missing source',font=small,fill='#ffc7e4');d.text((274,35),'After: inferred layers',font=small,fill='#c7ffe4')
        for row,(text,suffix) in enumerate(rows):
            y=64+row*369;d.text((8,y+6),text,font=small,fill='white')
            for col,variant in enumerate(['before','after']):
                pic=crop(backend,variant,side,suffix)
                sheet.paste(pic.convert('RGB'),(col*266,y+32))
        p=OUT/f'{backend}-{label}-temporal.jpg';sheet.save(p,quality=93,subsampling=0,optimize=True);record(p,'native-crop-jpeg-q93-444')
    # Independently chosen stationary features beyond any swept silhouette.
    source_points=[(176,520),(648,525),(191,575),(612,590),(400,680),(300,700),(335,300),(300,650),(500,650)]
    for side in [0,1]:
        for phase in ['peak','rebound']:
            posed=np.array(Image.open(RAW/f'{backend}-after-{side}-{phase}.png'))
            changes=[]
            for x,y in source_points:
                px=round(x/720*390*2);py=round((70+y/1280*(1280*390/720))*2)
                changes.append(int(np.max(abs(posed[py,px].astype(int)-after[py,px].astype(int)))))
            metrics['stationarySamples'].append({'backend':backend,'side':side,'phase':phase,'sourcePoints':source_points,'maximumChannelChanges':changes})
            assert max(changes)==0,'stationary source samples must remain fixed'

# A compact source-layer atlas at native resolution. Premultiplied textures
# are unassociated only for this explanatory view, not for the renderer.
assets=ROOT/'assets';original=Image.open(ROOT.parents[2]/'v8/assets/holly-heartbreaker.jpg').convert('RGB').crop((160,352,656,688))
views=[('Original crop',original),('Inferred stationary backing',Image.open(assets/'backing-composite.png').convert('RGB'))]
for side in [0,1]:
    data=np.array(Image.open(assets/f'material-{side}-premult.png'),dtype=float);a=data[:,:,3:]/255
    rgb=np.where(a>.001,data[:,:,:3]/np.maximum(a,.001),24);rgb=np.clip(rgb,0,255).astype('uint8')
    views.append((f'Moving material {side} / alpha',Image.fromarray(rgb)))
m=np.array(Image.open(assets/'ownership.png'));fg=np.repeat(m[:,:,2:3],3,axis=2)
views += [('Stationary foreground matte',Image.fromarray(fg)),('Inferred: red=skin, green=backing',Image.open(assets/'inferred-regions.png').convert('RGB'))]
atlas=Image.new('RGB',(1488,752),'#14231e');d=ImageDraw.Draw(atlas)
for i,(text,im) in enumerate(views):
    x=(i%3)*496;y=(i//3)*376;d.text((x+8,y+8),text,font=small,fill='white');atlas.paste(im,(x,y+40))
p=OUT/'source-layer-atlas.jpg';atlas.save(p,quality=92,subsampling=0,optimize=True);record(p,'native-source-layer-atlas')
(OUT/'image-validation.json').write_text(json.dumps(metrics,indent=2)+'\n')
(OUT/'assets.json').write_text(json.dumps({'baseline':'55fdcd55bd74b33345c4b2fb6e2a1f1379041319','noCropResampling':True,'allReviewImagesUnderBytes':limit,'files':files},indent=2)+'\n')
# Keep a readable index alongside the machine-readable byte/hash manifest.
by_name={f['file']:f for f in files}
raw='https://raw.githubusercontent.com/zy65h95wjn-netizen/shop-fractions/refs/heads/experiment/holly-layered-review/peach-physics/experiments/holly-layered/reconstruction/evidence/'
def link(name,label):return f'[{label}]({raw}{name}) ({by_name[name]["bytes"]:,} bytes)'
index=['# Holly source-repair visual review','',
       '**Not visually accepted.** The after images show inferred coverage, with remaining hair/fur wedges and cup-edge defects. Read [FINDINGS.md](../FINDINGS.md). The baseline and its earlier evidence are unchanged.','',
       'These direct raw GitHub links avoid video playback. Every image is below 700 KiB (716,800 bytes). Lossless PNG crops are 266×337 pixels; paired PNGs add labels outside those crops. The 390×844 CSS / DPR 2 captures supply native screenshot pixels with no resizing. Temporal JPEGs use quality 93 and 4:4:4 chroma.','',
       'Before = preserved layered renderer with pink missing-source diagnostics. After = source-layer reconstruction using exactly the same recorded states and deformation fields. Rows: impact, loading, peak, return, exact rebound, recorded settled pose at 8 s.','',
       '## Compact temporal comparisons','', '| Backend | Left | Right |','| --- | --- | --- |']
for backend in ['webgl','canvas']:
    index.append(f'| {backend.upper()} | '+link(f'{backend}-left-temporal.jpg','Left temporal')+' | '+link(f'{backend}-right-temporal.jpg','Right temporal')+' |')
index += ['', '## Lossless before/after pairs','', '| Backend | Side | Peak | Rebound |','| --- | --- | --- | --- |']
for backend in ['webgl','canvas']:
    for side in ['left','right']:
        index.append(f'| {backend.upper()} | {side} | '+link(f'{backend}-{side}-peak-pair.png','Peak pair')+' | '+link(f'{backend}-{side}-rebound-pair.png','Rebound pair')+' |')
index += ['', '## Individual lossless crops','', '| Backend | Side / pose | Before | After |','| --- | --- | --- | --- |']
for backend in ['webgl','canvas']:
    for side in ['left','right']:
        for phase in ['peak','rebound']:
            index.append(f'| {backend.upper()} | {side} / {phase} | '+link(f'{backend}-{side}-{phase}-before.png','Before')+' | '+link(f'{backend}-{side}-{phase}-after.png','After')+' |')
index += ['', '## Source layers and checks','',
          link('source-layer-atlas.jpg','Source-layer atlas')+'. Panels use native 496×336 source pixels. Inferred-region colors: red = cloned skin, green = reconstructed backing. These are not confidence scores.','',
          '[Matched states and field hashes](matched.json) · [Rest/stationary checks](image-validation.json) · [All image sizes and SHA-256 hashes](assets.json) · [Source provenance](../assets/provenance.json) · [Preserved field visualization](../../evidence/field.png)','']
(OUT/'README.md').write_text('\n'.join(index))
print(json.dumps({'reviewImages':len(files),'largestBytes':max(f['bytes'] for f in files),'rest':metrics['rest'],'stationaryPoseChecks':len(metrics['stationarySamples'])}))
