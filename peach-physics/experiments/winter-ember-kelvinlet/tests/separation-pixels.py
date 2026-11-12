from pathlib import Path
import json,numpy as np
from PIL import Image,ImageDraw
p=Path(__file__).resolve().parent.parent/'evidence/separation'
r=json.loads((p/'browser.json').read_text());f=r['framing'];rest=np.array(Image.open(p/'rest.png'))
y,x=np.indices(rest.shape[:2]);sx=(x+.5-f['ox'])*941/f['drawW'];sy=(y+.5-f['oy'])*1671/f['drawH']
t=np.clip((sy-1060)/170,0,1);u=np.clip((sy-1005)/55,0,1);crease=365+67*t*t+7*(1-u*u*(3-2*u));rows=[]
for case in r['cases']:
 mode=case['mode'].replace('+','P');side=case['side'];key=f"{mode}-{side}-{case['direction']}";before=np.array(Image.open(p/(key+'-before.png')));after=np.array(Image.open(p/(key+'-after.png')));returned=np.array(Image.open(p/(key+'-return.png')))
 strip=(sy>1030)&(sy<1190)&((sx>crease+8)&(sx<crease+70) if side==0 else (sx<crease-8)&(sx>crease-70))
 count=lambda im:int((np.any(im!=rest,axis=2)&strip).sum())
 item={**case,'oppositeStripPixels':int(strip.sum()),'beforeChangedPixels':count(before),'afterChangedPixels':count(after),'returnChangedPixels':int(np.any(returned!=rest,axis=2).sum())};rows.append(item)
 assert item['afterChangedPixels']==0,item
 assert item['returnChangedPixels']==0,item
(p/'pixels.json').write_text(json.dumps(rows,indent=2));print([(v['mode'],v['side'],v['direction'],v['beforeChangedPixels'],v['afterChangedPixels']) for v in rows])
# Representative inward pull on the left: same spring state, guard off/on.
ims=[Image.open(p/('B-0-1-'+suffix+'.png')).crop((90,470,270,630)).resize((540,480)) for suffix in ['before','after']]
sheet=Image.new('RGB',(1080,516),'#181820');d=ImageDraw.Draw(sheet);d.text((12,10),'Before: left drag crosses crease',fill='white');d.text((552,10),'After: right inner strip anchored',fill='white')
for i,im in enumerate(ims):sheet.paste(im,(540*i,36))
sheet.save(p/'comparison.jpg')
