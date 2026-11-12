import json
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
data=json.loads(Path('/tmp/kelvinlet-plot.json').read_text())
fig,axes=plt.subplots(2,2,figsize=(12,7),layout='constrained')
for ax,p in zip(axes.flat,data['plots']):
    pts=p['points'];nx=len(set(q['x'] for q in pts));ny=len(set(q['y'] for q in pts))
    get=lambda k:np.array([q[k] for q in pts]).reshape(ny,nx)
    x,y=get('x'),get('y');im=ax.pcolormesh(x,y,get('stretch'),shading='nearest',vmin=1,vmax=3.6,cmap='magma')
    ax.quiver(x[::3,::3],y[::3,::3],get('dx')[::3,::3],get('dy')[::3,::3],color='cyan',angles='xy',scale_units='xy',scale=1,width=.002)
    for poly in data['contours']:
        q=np.array(poly+[poly[0]]);ax.plot(q[:,0],q[:,1],color='white',linewidth=.7)
    ax.set_title(f"{p['mode']} • {'strong tap' if p['time']<3 else 'hold'} • t={p['time']:.3f}s")
    ax.set(xlim=(250,570),ylim=(550,395),xlabel='Source x (px)',ylabel='Source y (px)');ax.set_aspect('equal')
fig.colorbar(im,ax=axes,label='Maximum local forward principal stretch (× rest)')
fig.suptitle('Final masked composition: displacement vectors and local stretch\nCyan vectors show output minus sampled-source position; white contour is the fixed skin support.')
dest=Path(__file__).resolve().parent.parent/'evidence/field-quality.png';fig.savefig(dest,dpi=150)
