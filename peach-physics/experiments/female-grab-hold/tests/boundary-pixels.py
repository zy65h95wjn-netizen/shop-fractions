from pathlib import Path
from PIL import Image,ImageDraw
import numpy as np,json,re
p=Path(__file__).resolve().parent.parent/'evidence/boundaries'
rows=json.loads((p/'browser.json').read_text());out=[]
for row in rows:
 if row['id']=='holly':continue
 before=np.array(Image.open(p/(row['key']+'-before.png')));after=np.array(Image.open(p/(row['key']+'-after.png')));rest=np.array(Image.open(p/(row['renderer']+'-'+row['id']+'-rest.png')))
 yy,xx=np.indices(rest.shape[:2]);f=row['framing'];W,H=row['image'];dpr=rest.shape[1]/390
 x=((xx+.5)/dpr-f['x'])*W/f['width'];y=((yy+.5)/dpr-f['y'])*H/f['height']
 if row['id']=='ember':
  t=np.clip((y-1060)/170,0,1);u=np.clip((y-1005)/55,0,1);crease=365+67*t*t+7*(1-u*u*(3-2*u));strip=(y>1030)&(y<1190)&((x>crease+8)&(x<crease+70) if row['side']==0 else (x<crease-8)&(x>crease-70))
 elif row['id']=='midnight':
  if row['side']!=0:continue
  crease=1300-.0012*(x-285)**2;strip=(x>210)&(x<420)&(y>crease+3)&(y<crease+30)
 else:
  if row['side']!=0:continue
  strip=(x>230)&(x<320)&(y>795)&(y<830)
 changed=lambda im:int((np.any(im!=rest,axis=2)&strip).sum())
 r={'key':row['key'],'probePixels':int(strip.sum()),'beforeChanged':changed(before),'afterChanged':changed(after)};out.append(r)
 assert r['afterChanged']==0,r
(p/'pixels.json').write_text(json.dumps(out,indent=2));print('Anchored probes:',len(out),'cases; all zero changed pixels after fix')
# Same-state close-ups, representative directions; keep original artwork unaltered.
choices=[('ember',1,'outward',[230,960,530,1260]),('midnight',0,'down',[170,1120,460,1370]),('aurelia',0,'down',[140,770,420,1030]),('aurelia',1,'inward',[390,800,650,1040])]
for id,side,direction,box in choices:
 row=next(r for r in rows if r['id']==id and r['renderer']=='webgl' and r['side']==side and r['direction']==direction);f=row['framing'];W,H=row['image'];dpr=row['canvas'][0]/390
 crop=tuple(round((f['x']+v/W*f['width'])*dpr) if i%2==0 else round((f['y']+v/H*f['height'])*dpr) for i,v in enumerate(box))
 ims=[Image.open(p/(row['key']+'-'+suffix+'.png')).crop(crop).resize((480,440)) for suffix in ['before','after']]
 sheet=Image.new('RGB',(960,476),'#17171c');draw=ImageDraw.Draw(sheet);draw.text((10,10),id+' before',fill='white');draw.text((490,10),'after: same held pose',fill='white')
 for i,im in enumerate(ims):sheet.paste(im,(i*480,36))
 sheet.save(p/(id+'-'+str(side)+'-comparison.jpg'))
