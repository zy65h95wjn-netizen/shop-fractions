"""Build small, isolated runners from immutable release sources. No release writes."""
from pathlib import Path
import subprocess,re,base64,json,hashlib

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
ASSETS=HERE/'assets';ASSETS.mkdir(exist_ok=True)
refs={'r5.html':'8eb02d3','index.html':'ddf3456cc937c7f84f0b022f76f6824e59c2d079'}
report={'reference':'b7b5a2ba1c3784a8d9b5f9423405e6de8d954f2b','runners':{},'originalAssets':{}}
for filename,ref in refs.items():
    original=subprocess.check_output(['git','show',f'{ref}:peach-physics/v8/index.html'],cwd=ROOT).decode()
    html=original
    for key,name in [('IMAGE','reference-ember.webp'),('OTHER_IMAGE','reference-midnight.webp')]:
        match=re.search(r'const '+key+r'=([\"\'])data:image/([^;]+);base64,([^\"\']+)\1;',html)
        assert match,key
        data=base64.b64decode(match.group(3));(ASSETS/name).write_bytes(data)
        report['originalAssets'][name]=hashlib.sha256(data).hexdigest()
        html=html.replace(match.group(0),f"const {key}='./assets/{name}';",1)
    html=html.replace('./assets/aurelia-frost.jpg','../../v8/assets/aurelia-frost.jpg').replace('./assets/holly-heartbreaker.jpg','../../v8/assets/holly-heartbreaker.jpg')
    html=html.replace('<link rel="manifest" href="./manifest.webmanifest">','').replace('./apple-touch-icon.png','../../v8/apple-touch-icon.png')
    html=html.replace('peach-physics-v','holly-art-review-v').replace('let activeCharacterIndex=0;','let activeCharacterIndex=3;')
    html=html.replace('activeCharacterIndex=Math.max(0,CHARACTERS.findIndex(c=>c.id===saved));','if(saved)activeCharacterIndex=Math.max(0,CHARACTERS.findIndex(c=>c.id===saved));')
    html=html.replace("if('serviceWorker' in navigator && location.protocol==='https:')",'if(false)')
    html=html.replace('<script>','<script src="../holly-layered/bootstrap.js"></script>\n<script>',1)
    if filename=='index.html':
        html=html.replace('const HOLLY_CROP=[192,384,440,288];',
          "const HOLLY_CROP=new URLSearchParams(location.search).get('variant')==='simple'?[160,352,496,336]:[192,384,440,288];")
        # The existing raster mask needs a zero border around the expanded
        # contour. Change its storage rectangle, not the remapping algorithm.
        html=html.replace('vec2(192.0,384.0))/vec2(440.0,288.0)',
          'vec2(${HOLLY_CROP[0].toFixed(1)},${HOLLY_CROP[1].toFixed(1)}))/vec2(${HOLLY_CROP[2].toFixed(1)},${HOLLY_CROP[3].toFixed(1)})')
    # Keep the original motion-mask contribution to hit testing. The optional
    # visual calibration must not expand or shrink existing gesture targets.
    needle='const l=hollyMotionWeight(0,x,y),r=hollyMotionWeight(1,x,y);'
    assert html.count(needle)==1
    html=html.replace(needle,'const l=artInputWeight(0,x,y),r=artInputWeight(1,x,y);')
    adapter=(HERE/'adapter.js').read_text().replace('__BASELINE__', 'r5' if filename=='r5.html' else 'r6')
    html=html.replace('presentCharacter();\ngetPhoto',adapter+'\npresentCharacter();\ngetPhoto',1)
    (HERE/filename).write_text(html)
    report['runners'][filename]={'sourceRef':ref,'sourceSha256':hashlib.sha256(original.encode()).hexdigest()}
(HERE/'build-provenance.json').write_text(json.dumps(report,indent=2)+'\n')
print('Built two isolated runners; original portrait bytes, solver and rendering algorithms retained.')
