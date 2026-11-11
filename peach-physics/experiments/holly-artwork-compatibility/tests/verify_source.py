"""Check the source blocks and original portrait bytes protected by the task."""
from pathlib import Path
import subprocess,hashlib,json
HERE=Path(__file__).resolve().parents[1];ROOT=HERE.parents[2]
source=subprocess.check_output(['git','show','ddf3456cc937c7f84f0b022f76f6824e59c2d079:peach-physics/v8/index.html'],cwd=ROOT).decode()
runner=(HERE/'index.html').read_text()
ranges=[
 ('solver and loop','function step(dt){','function linkedImpulse('),
 ('Holly velocity','function hollyVelocity(x,y,side){','// Bilinear CPU texture remapping'),
 ('Canvas remap','function renderHollyFallback(sc){','function initGL(){'),
 ('gesture handlers, impulses and linked transfer','function linkedImpulse(','function savePrefs(){'),
 ('preset values','const PRESETS=Object.freeze','const currentPresets=')]
checks=[]
for name,start,end in ranges:
    a=source[source.index(start):source.index(end)];b=runner[runner.index(start):runner.index(end)]
    assert a==b,name
    checks.append({'block':name,'sha256':hashlib.sha256(a.encode()).hexdigest()})
expected=json.loads((ROOT/'peach-physics/v8/tests/artwork-sha256.json').read_text())
for key,path in [('IMAGE',HERE/'assets/reference-ember.webp'),('OTHER_IMAGE',HERE/'assets/reference-midnight.webp'),
                 ('aurelia',ROOT/'peach-physics/v8/assets/aurelia-frost.jpg'),('holly',ROOT/'peach-physics/v8/assets/holly-heartbreaker.jpg')]:
    assert hashlib.sha256(path.read_bytes()).hexdigest()==expected[key],key
(HERE/'evidence/preserved-code.json').write_text(json.dumps(checks,indent=2)+'\n')
print('Five protected source blocks and all four original portrait hashes match.')
