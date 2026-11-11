"""Deterministic, localized source-layer reconstruction. Never edit the JPEG.

No generative model, random fill, full-frame inpaint or physics adjustment.
All donors and inferred regions are recorded as source-coordinate images.
"""
from pathlib import Path
import json,hashlib
import numpy as np
from scipy.ndimage import map_coordinates,gaussian_filter
from PIL import Image,ImageDraw

HERE=Path(__file__).resolve().parent; OUT=HERE/'assets';OUT.mkdir(exist_ok=True)
SOURCE=HERE.parents[2]/'v8/assets/holly-heartbreaker.jpg'
EXPECTED='0ad0a1cad2273d038b1953587ecfd43857897f7627c91d8f2a02a989ffe2ba97'
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==EXPECTED
photo=np.asarray(Image.open(SOURCE).convert('RGB'),dtype=float)
X0,Y0,W,H=160,352,496,336
yy,xx=np.mgrid[Y0:Y0+H,X0:X0+W]; x=xx+.5;y=yy+.5
original=photo[Y0:Y0+H,X0:X0+W].copy()
def smooth(a):
    a=np.clip(a,0,1);return a*a*a*(a*(a*6-15)+10)
def sample(sx,sy):return np.stack([map_coordinates(photo[:,:,k],[sy-.5,sx-.5],order=1,mode='nearest') for k in range(3)],axis=2)
def rgba(rgb,alpha):return np.dstack([np.clip(np.rint(rgb),0,255).astype('uint8'),np.rint(np.clip(alpha,0,1)*255).astype('uint8')])
def save(name,array):Image.fromarray(array.astype('uint8')).save(OUT/name,optimize=True)

# Guides identify an unknown trimap band. Photographic colors refine the matte
# within that band; the guide is not a zero-displacement boundary.
edges=[
 [[352,347],[380,326],[400,304],[420,277],[440,252],[456,236],[466,223],[478,211],[490,207],[506,209],[522,216],[538,222],[558,228],[578,236],[596,246],[610,260],[626,277],[650,298],[688,315]],
 [[352,479],[380,500],[400,515],[420,530],[440,549],[460,565],[476,580],[488,597],[505,605],[520,606],[535,600],[550,590],[570,579],[590,565],[610,543],[630,513],[650,477],[688,460]]]
# Cup-to-bodice seam: material ownership changes here, not the velocity field.
seams=[[[210,552],[228,574],[248,599],[275,614],[305,619],[332,617],[356,610],[380,596],[402,581],[414,581]],
       [[414,582],[435,590],[454,609],[479,619],[506,620],[533,612],[557,595],[580,569],[608,543],[640,530]]]
fur_tops=[[[200,470],[225,459],[242,469],[260,479],[280,491],[300,501],[320,514],[340,529],[360,543],[380,555],[414,578]],
          [[414,579],[440,566],[460,555],[480,543],[500,530],[520,518],[540,505],[560,490],[580,477],[600,484],[640,510]]]
material=[];visible=[];premult=[];foreground=np.zeros((H,W));backing=original.copy()
inferred_skin=np.zeros((H,W));inferred_back=np.zeros((H,W));reports=[]
for side in [0,1]:
    direction=1 if side==0 else -1
    guide=np.array(edges[side]);border=np.interp(y,guide[:,0],guide[:,1])
    d=(x-border)*direction
    hem=np.interp(x,np.array(seams[side])[:,0],np.array(seams[side])[:,1])
    center=(1-smooth((x-413)/2)) if side==0 else smooth((x-413)/2)
    outer=smooth((d+.8)/1.6)
    # Trimap color projection, using local object/background samples. Narrow
    # bands preserve texture; no broad blur is used as an edge-hiding device.
    bg=sample(border-direction*7,y);fg=sample(border+direction*7,y)
    vector=fg-bg
    projected=np.clip(np.sum((original-bg)*vector,axis=2)/np.maximum(80,np.sum(vector*vector,axis=2)),0,1)
    fur=(smooth((y-(460 if side==0 else 474))/5)*(1-smooth((y-(532 if side==0 else 545))/7)))
    band=(1-smooth((np.abs(d)-1)/6))*fur
    outer=outer*(1-band)+projected*band
    outer=np.where(d>8,1,np.where(d < -8,0,outer))
    white_fur=smooth((original[:,:,2]-95)/50)*smooth((y-(451 if side==0 else 467))/6)*(1-smooth((y-550)/15))
    # Fur extends beyond the smooth guide. Include the photographed tips rather
    # than leave them baked into the stationary base outside the coarse outline.
    outer=np.maximum(outer,white_fur*fur*(1-smooth((-d-10)/6)))
    # The upper skin-to-hair boundary is a foreground occlusion, NOT a free edge.
    hair_zone=1-smooth((y-(455 if side==0 else 469))/22)
    # Projected soft coverage retains strands within the photographic trimap.
    skin_edge=smooth((d+1.5)/3)
    skin_band=1-smooth((np.abs(d)-1)/3)
    skin_edge=skin_edge*(1-skin_band)+projected*skin_band
    hair=(1-skin_edge)*hair_zone*center*(1-white_fur)
    foreground=np.maximum(foreground,hair)
    skin_extension=smooth((d+36)/6)*hair_zone
    lower=smooth((hem-y+1)/2)
    alpha=np.maximum(outer,skin_extension)*lower*center*smooth((y-355)/12)
    old_alpha=outer*lower*center*smooth((y-355)/12)
    moving=original.copy()
    # Clone skin from the same side, reflecting the unknown strip into observed
    # skin and constraining donors above fur. Extend 36 pixels below the hair.
    sx=border+direction*(20+np.maximum(0,-d))
    # Donors must be above the photographed fur. Otherwise the upper underlap
    # clones a detached white ridge into the hair/skin junction at peak.
    tops=np.array(fur_tops[side]);sy=np.minimum(y,np.interp(sx,tops[:,0],tops[:,1])-10)
    cloned_skin=sample(sx,sy)
    skin_fill=(1-smooth((d-1)/3))*smooth((d+40)/4)*hair_zone*center*(1-white_fur)
    moving=moving*(1-skin_fill[:,:,None])+cloned_skin*skin_fill[:,:,None]
    inferred_skin=np.maximum(inferred_skin,skin_fill)
    save(f'skin-underlap-{side}.png',rgba(cloned_skin,skin_fill))

    # Color padding from just inside the fur/cup removes sampled old-background
    # color from translucent edge texels. The material alpha remains unchanged.
    pad=(1-smooth((d+1)/5))*(1-smooth((-d-8)/4))*(1-hair_zone)*center*lower
    inside=sample(border+direction*(6+np.maximum(0,-d)),y)
    moving=moving*(1-pad[:,:,None])+inside*pad[:,:,None]
    save(f'garment-underlap-{side}.png',rgba(inside,pad*(np.abs(d)<10)))

    # Only the 28-pixel corridor beneath a receding free edge is reconstructed.
    # Clone observed adjacent hair/arm rather than repeat the original fur edge.
    exterior_x=border-direction*(18+np.maximum(d,0));exterior_y=y
    clone=sample(exterior_x,exterior_y)
    free=np.maximum(1-hair_zone,white_fur)*center*lower*outer*(1-smooth((d-24)/4))
    # Behind the lower cup, clone bodice texture from below its photographed
    # underwire. This avoids sampling the old raised-cup border as background.
    body=sample(x,hem+8+np.maximum(hem-y,0))
    body_region=center*outer*smooth((hem-y+2)/4)*(1-smooth((hem-y-24)/4))
    clone=clone*(1-body_region[:,:,None])+body*body_region[:,:,None]
    area=np.maximum(free,body_region)
    backing=backing*(1-area[:,:,None])+clone*area[:,:,None]
    inferred_back=np.maximum(inferred_back,area)
    save(f'backing-{side}.png',rgba(clone,area))
    visible.append(old_alpha);material.append(alpha)
    # Premultiplication BEFORE bilinear sampling prevents the old hair/arm RGB
    # outside the silhouette from bleeding through moving translucent pixels.
    pm=rgba(moving*alpha[:,:,None],alpha)
    save(f'material-{side}-premult.png',pm);premult.append(pm)
    reports.append({'side':side,'skinClonePixels':int(np.count_nonzero(skin_fill>.5)),
                    'backingPaintPixels':int(np.count_nonzero(area>.5)),
                    'skinUnderlapSourcePixels':36,'backingCorridorSourcePixels':28})

save('backing-composite.png',rgba(backing,np.ones((H,W))))
save('ownership.png',np.stack([np.rint(visible[0]*255),np.rint(visible[1]*255),np.rint(foreground*255),np.full((H,W),255)],axis=2).astype('uint8'))
save('inferred-regions.png',np.stack([inferred_skin*255,inferred_back*255,np.zeros((H,W)),np.full((H,W),255)],axis=2).astype('uint8'))
# Assets are reconstructible and their inferred pixels are explicitly named.
report={'sourceSha256':EXPECTED,'baseline':'55fdcd55bd74b33345c4b2fb6e2a1f1379041319','crop':[X0,Y0,W,H],
        'method':'Deterministic same-side skin cloning constrained above fur, adjacent hair/arm and below-seam bodice donors, trimap color projection, premultiplied material alpha; no generated image model.',
        'outerGuides':edges,'cupSeams':seams,'furTopsForDonorExclusion':fur_tops,'layers':reports,'limitations':['Hidden pixels are inferred, not recovered.','Fine hair/fur alpha is estimated from a flattened JPEG.','Preserving the displacement field preserves its remaining garment strain.']}
(OUT/'provenance.json').write_text(json.dumps(report,indent=2)+'\n')
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==EXPECTED
print(json.dumps(reports))
