"""Compare the captured CPU/GL fields and phase crop pixels, without editing them."""
import json
from pathlib import Path
from PIL import Image

p=Path(__file__).resolve().parents[1]/'evidence'
results=json.loads((p/'metrics.json').read_text())
def key(row):return (row['width'],row['side'],row.get('phase'),tuple(row.get('pose',[])))
a={key(r):r for r in results['fields'] if r['backend']=='webgl'}
b={key(r):r for r in results['fields'] if r['backend']=='canvas'}
assert a.keys()==b.keys()
for k in a:
    for name in ['minDet','maxTravel','minStretch','maxStretch']:assert a[k][name]==b[k][name]
rows=[]
for side in [0,1]:
    for phase in ['impact','peak','rebound','settled']:
        pixels=[Image.open(p/f'raw/{backend}-390-layered-{side}-{phase}.png').convert('RGB').crop((195,535,683,872)).tobytes() for backend in ['webgl','canvas']]
        histogram=[0]*256
        for x,y in zip(*pixels):histogram[abs(x-y)]+=1
        count=sum(histogram);total=0;p99=0
        for value,n in enumerate(histogram):
            total+=n
            if total>=count*.99:p99=value;break
        rows.append({'side':side,'phase':phase,'meanChannelDifference':sum(i*n for i,n in enumerate(histogram))/count,'p99ChannelDifference':p99,'maxChannelDifference':max(i for i,n in enumerate(histogram) if n)})
report={'exactFieldPairs':len(a),'note':'Identical coordinate fields; pixels include baseline GL/Canvas resampling. Large maximum differences occur on high-contrast diagnostic stripe thresholds. 390 CSS px phase crop, 8-bit channel units.','pixels':rows}
(p/'backend-parity.json').write_text(json.dumps(report,indent=2))
print(f'{len(a)} exact field pairs; saved phase pixel differences.')
