"""Blender-built Holly form study with reference projection UVs. No artwork regeneration."""
import bpy, math, random, json, struct, hashlib
from pathlib import Path
from mathutils import Vector
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
random.seed(17)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
S=180; H=1280; objects=[]
COLORS={'skin':(.69,.46,.36),'green':(.055,.22,.13),'red':(.36,.016,.035),'fur':(.86,.79,.67),'hair':(.43,.135,.036),'gold':(.65,.40,.13),'boot':(.075,.024,.019),'eye':(.85,.85,.76),'iris':(.12,.31,.17),'pupil':(.009,.014,.009),'lip':(.42,.11,.09)}
POLYS=[[(264,419),(305,402),(350,411),(383,438),(407,480),(411,519),(397,550),(359,543),(312,524),(270,509),(239,504),(239,467)],[(438,413),(478,402),(522,416),(553,448),(573,483),(573,506),(541,516),(492,537),(447,553),(424,533),(419,491),(424,449)]]
def smooth(t):
 t=max(0,min(1,t));return t*t*(3-2*t)
def weight(side,x,y):
 d=1
 p=POLYS[side]
 for i,(ax,ay) in enumerate(p):
  bx,by=p[(i+1)%len(p)];length=math.hypot(bx-ax,by-ay)
  d=min(d,(-(by-ay)*(x-ax)+(bx-ax)*(y-ay))/length/18)
 return smooth(d)
def coord(x,y,depth):return ((x-377)/S,depth,(H-y)/S)
def mesh(name,vertices,faces,kind,side=-1,photo=True):
 m=bpy.data.meshes.new(name);m.from_pydata(vertices,[],faces);m.update()
 o=bpy.data.objects.new(name,m);bpy.context.collection.objects.link(o);o['kind']=kind;o['side']=side;o['photo']=photo
 mat=bpy.data.materials.get(kind)
 if not mat:
  mat=bpy.data.materials.new(kind);mat.diffuse_color=(*COLORS[kind],1);mat.use_nodes=True;mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(*COLORS[kind],1)
 m.materials.append(mat)
 for poly in m.polygons:poly.use_smooth=True
 uv=m.uv_layers.new(name='PortraitProjection')
 for poly in m.polygons:
  for li in poly.loop_indices:
   v=m.vertices[m.loops[li].vertex_index].co;x=v.x*S+377;y=H-v.z*S
   uv.data[li].uv=(x/754,1-y/1280)
 objects.append(o);return o

def ellipsoid(name,c,r,kind,side=-1,photo=True,n=40,k=24,face=False):
 verts=[];faces=[]
 for j in range(k+1):
  phi=math.pi*j/k
  for i in range(n):
   t=2*math.pi*i/n
   x=c[0]+r[0]*math.sin(phi)*math.sin(t);y=c[1]+r[1]*math.cos(phi);dep=c[2]-r[2]*math.sin(phi)*math.cos(t)
   if face and math.cos(t)>0:
    bump=.18*math.exp(-((x-380)/14)**2-((y-244)/28)**2)+.035*math.exp(-((x-379)/37)**2-((y-286)/10)**2)
    bump-=.035*(math.exp(-((x-342)/22)**2-((y-214)/13)**2)+math.exp(-((x-421)/22)**2-((y-214)/13)**2))
    dep-=bump*max(0,math.cos(t))
   verts.append(coord(x,y,dep))
 for j in range(k):
  for i in range(n):
   a=j*n+i;b=j*n+(i+1)%n;faces.append((a,b,b+n,a+n))
 return mesh(name,verts,faces,kind,side,photo)

def rings(name,profiles,kind,n=48,photo=True,pleats=0):
 verts=[];faces=[]
 for j,(cx,py,rx,dep,ry) in enumerate(profiles):
  if 'Supported corset' in name:rx+=11;ry+=.055
  for i in range(n):
   t=2*math.pi*i/n;r=1+pleats*math.cos(t*16)*(j/(len(profiles)-1))
   x=cx+rx*math.sin(t)*r;y=py
   if 'Supported corset' in name and j==0:y=565-55*abs(math.sin(t))
   if kind=='red' and 'skirt' in name:y+=13*math.cos(t*4)*(j/(len(profiles)-1))
   verts.append(coord(x,y,dep-ry*math.cos(t)*r))
 for j in range(len(profiles)-1):
  for i in range(n):
   a=j*n+i;b=j*n+(i+1)%n;faces.append((a,a+n,b+n,b))
 if 'corset' not in name and 'skirt' not in name and 'Stocking' not in name:
  faces.append(tuple(range(n-1,-1,-1)));faces.append(tuple((len(profiles)-1)*n+i for i in range(n)))
 return mesh(name,verts,faces,kind,photo=photo)

def tube(name,points,radius,kind,photo=True,n=8):
 pts=[Vector(coord(*p)) for p in points];verts=[];faces=[]
 for j,p in enumerate(pts):
  tangent=(pts[min(j+1,len(pts)-1)]-pts[max(j-1,0)]).normalized();axis=Vector((0,1,0))
  if abs(tangent.dot(axis))>.9:axis=Vector((1,0,0))
  u=tangent.cross(axis).normalized();v=tangent.cross(u).normalized()
  for i in range(n):
   t=2*math.pi*i/n;q=p+radius*(math.cos(t)*u+math.sin(t)*v);verts.append(tuple(q))
 for j in range(len(pts)-1):
  for i in range(n):
   a=j*n+i;b=j*n+(i+1)%n;faces.append((a,b,b+n,a+n))
 return mesh(name,verts,faces,kind,photo=photo)

# Anatomical volumes follow the approved front portrait. Hidden surfaces are a study.
rings('Torso',[(380,297,36,0,.21),(386,344,60,0,.28),(399,367,178,.05,.30),(406,399,185,.04,.32),(409,456,165,.04,.34),(410,525,159,.04,.35),(410,590,144,.04,.34),(408,670,128,.04,.32),(403,750,146,.05,.35),(394,822,175,.08,.42)],'skin')
ellipsoid('Head',(378,225,-.01),(96,106,.48),'skin',n=56,k=36,face=True)
ellipsoid('Hair back',(378,230,.30),(125,180,.46),'hair',photo=False,n=40,k=24)
for side,(cx,cy) in enumerate([(323,474),(495,477)]):ellipsoid('Soft region '+str(side),(cx,cy,-.37),(88,82,.43),'skin',side=side,n=52,k=32)
rings('Supported corset',[(409,555,168,.03,.37),(410,595,149,.03,.38),(410,645,133,.03,.355),(408,700,128,.04,.34),(403,755,145,.04,.38),(394,817,170,.07,.435)],'green')
# Curved upper support follows the V-shaped garment line in the portrait.
for side,points in enumerate([[(237,511,-.48),(270,514,-.61),(310,529,-.70),(357,550,-.63),(405,568,-.36)],[(418,568,-.36),(451,550,-.64),(494,532,-.72),(539,516,-.62),(576,510,-.48)]]):
 tube('Cup fur '+str(side),points,.025,'fur',photo=False,n=8)
# Gold lacing and firm seams stay separate from the moving skin.
for i in range(10):
 y=580+i*22;half=31-(i/9)*9
 tube('Lace '+str(i),[(410-half,y,-.46),(410+half,y+22,-.46)],.008,'gold',photo=False,n=6)
for x in [293,330,479,519]:tube('Corset seam '+str(x),[(x,586,-.34),(410+(x-410)*.80,704,-.34),(398+(x-410)*.95,805,-.35)],.006,'gold',photo=False,n=6)
rings('Pleated skirt',[(395,775,151,.10,.40),(394,810,184,.10,.47),(389,857,222,.10,.54),(383,910,227,.10,.57)],'red',n=80,pleats=.055)
# Skirt hem has a continuous pale edge, with the same pleated silhouette.
pts=[]
for i in range(81):
 t=2*math.pi*i/80;r=1+.055*math.cos(t*16)
 pts.append((383+227*math.sin(t)*r,910+13*math.cos(t*4),.10-.57*math.cos(t)*r))
tube('Skirt hem',pts,.025,'fur',photo=False,n=6)
for side,sgn in [(0,-1),(1,1)]:
 if side==0:arm=[(218,350,12,.05,.10),(215,380,39,.05,.27),(204,470,38,.04,.25),(174,591,33,.00,.22),(149,706,28,-.02,.18),(129,825,23,-.02,.15),(137,924,22,-.01,.13),(151,1002,6,.02,.05)]
 else:arm=[(577,350,12,.10,.10),(585,387,35,.10,.26),(601,480,34,.10,.23),(614,593,31,.08,.21),(629,706,26,.04,.17),(636,821,23,.01,.14),(621,925,21,.00,.13),(603,1005,6,.02,.05)]
 rings('Arm and hand '+str(side),arm,'skin',n=28)
 cx=277 if side==0 else 503
 rings('Leg '+str(side),[(cx,888,115,.12,.42),(cx,975,119,.12,.44),(cx+(12 if side==0 else -8),1090,93,.13,.36),(cx+sgn*4,1125,84,.16,.36)],'skin',n=36)
 # Modeled lower legs extend beyond the cropped photo. Alternate cloth stripes.
 for j in range(7):
  y0=1125+j*53;y1=y0+53;rx0=max(36,85-(y0-1125)*.145);rx1=max(35,85-(y1-1125)*.145)
  rings('Stocking '+str(side)+' '+str(j),[(cx+sgn*4,y0,rx0,.16,rx0/S*.78),(cx+sgn*7,y1,rx1,.18,rx1/S*.78)],'red' if j%2==0 else 'fur',n=28,photo=False)
 ellipsoid('Boot '+str(side),(cx+sgn*10,1535,-.10),(48,67,.43),'boot',photo=False,n=28,k=16)
 # Elf ears: front and rear faces with a tapered tip.
 ex=293 if side==0 else 484;tip=255 if side==0 else 532
 vertices=[coord(ex,184,-.18),coord(tip,172,-.08),coord(ex+sgn*9,233,-.14),coord(ex-sgn*7,224,-.25),coord(ex,205,.04)]
 mesh('Elf ear '+str(side),vertices,[(0,1,2,3),(4,3,2),(4,2,1),(4,1,0),(4,0,3)],'skin')
# Soft drooping hat; its reverse is deliberately simple, not a photograph of unseen detail.
rings('Drooping hat',[(371,131,119,.10,.49),(360,84,123,.11,.48),(336,32,102,.12,.42),(299,-8,65,.12,.30),(258,24,43,.06,.23),(228,100,25,-.02,.16),(219,199,15,-.09,.11),(220,220,5,-.10,.04)],'red',n=48)
pts=[]
for i in range(65):
 t=2*math.pi*i/64;pts.append((371+119*math.sin(t),127-17*math.sin(t),.10-.50*math.cos(t)))
tube('Hat fur brim',pts,.048,'fur',photo=False,n=8)
ellipsoid('Pom pom',(220,235,-.10),(29,30,.17),'fur',photo=False,n=20,k=14)
# A few modeled locks carry the silhouette around the head without inventing a new hairstyle.
for j in range(9):
 x=275+j*6
 tube('Left hair lock '+str(j),[(x+40,112,.00),(x,165,-.23),(x-8,231,-.20),(x+12,311,-.05),(x-7,390,.07),(x+8,460,.12)],.018+random.random()*.014,'hair',photo=False,n=7)
for j in range(8):
 x=472+j*4
 tube('Right hair lock '+str(j),[(x-45,107,.08),(x,169,.03),(x+5,239,.08),(x-3,315,.18),(x+9,399,.24)],.018+random.random()*.015,'hair',photo=False,n=7)
# Add a sculpted holly sprig on the hat.
for cx,cy,angle in [(319,63,-.5),(340,49,.2),(337,82,.6)]:
 verts=[coord(cx,cy,-.49),coord(cx-10,cy-22,-.47),coord(cx-7,cy-7,-.51),coord(cx-21,cy,-.47),coord(cx-7,cy+6,-.51),coord(cx-7,cy+21,-.47),coord(cx+8,cy+7,-.51),coord(cx+18,cy+1,-.47),coord(cx+7,cy-7,-.51),coord(cx+10,cy-20,-.47)]
 mesh('Holly leaf',verts,[(0,i,1 if i==9 else i+1) for i in range(1,10)],'green',photo=False)
for x,y in [(321,78),(331,77),(326,88)]:ellipsoid('Berry',(x,y,-.55),(6,6,.035),'red',photo=False,n=10,k=8)
# Simple modeled facial features for the clean form study (no photo required).
for cx in [342,420]:
 ellipsoid('Eye white',(cx,215,-.445),(16,8,.074),'eye',photo=False,n=24,k=12)
 ellipsoid('Green iris',(cx,215,-.513),(6,6,.014),'iris',photo=False,n=20,k=10)
 ellipsoid('Pupil',(cx,215,-.526),(2.8,3.6,.006),'pupil',photo=False,n=12,k=8)
 ellipsoid('Eye glint',(cx-1.8,213,-.535),(1.4,1.4,.003),'eye',photo=False,n=8,k=6)
 tube('Upper eyelid',[(cx-16,215,-.48),(cx-9,208,-.505),(cx+5,208,-.51),(cx+16,215,-.48)],.009,'skin',photo=False,n=6)
 tube('Brow',[(cx-18,199,-.43),(cx-7,194,-.455),(cx+7,196,-.455),(cx+17,202,-.425)],.012,'hair',photo=False,n=6)
tube('Upper lip',[(356,281,-.414),(369,278,-.454),(379,281,-.47),(388,278,-.454),(402,281,-.414)],.012,'lip',photo=False,n=7)
tube('Lower lip',[(356,282,-.416),(369,288,-.447),(384,289,-.455),(402,282,-.416)],.014,'lip',photo=False,n=7)
for j in range(14):
 tube('Swept fringe '+str(j),[(294+j*2,179,.00),(287+j*3,136,-.25),(310+j*4,107,-.30),(350+j*5,102,-.30),(382+j*5,131,-.26)],.016+random.random()*.012,'hair',photo=False,n=7)
# Join and remesh static skin to remove hard shoulder/neck intersections.
static=[o for o in objects if o.name=='Torso' or o.name=='Head' or o.name.startswith('Arm and hand')]
bpy.ops.object.select_all(action='DESELECT')
for o in static:o.select_set(True)
bpy.context.view_layer.objects.active=static[0]
for o in static:objects.remove(o)
bpy.ops.object.join();body=bpy.context.object;body.name='Unified skin';body['kind']='skin';body['side']=-1;body['photo']=True
remesh=body.modifiers.new('Continuous shoulders and neck','REMESH');remesh.mode='VOXEL';remesh.voxel_size=.028;remesh.use_smooth_shade=True
bpy.ops.object.modifier_apply(modifier=remesh.name)
smoothmod=body.modifiers.new('Soft joins','SMOOTH');smoothmod.factor=.6;smoothmod.iterations=3;bpy.ops.object.modifier_apply(modifier=smoothmod.name)
decimate=body.modifiers.new('Phone mesh budget','DECIMATE');decimate.ratio=.28;bpy.ops.object.modifier_apply(modifier=decimate.name)
for poly in body.data.polygons:poly.use_smooth=True
objects.append(body)
# Classify projected pixels so the scenery never becomes part of skin or cloth.
import numpy as np
portrait=bpy.data.images.load(str(ROOT/'peach-physics/v8/assets/holly-heartbreaker.png'))
pixels=np.array(portrait.pixels[:],dtype=np.float32).reshape(1280,754,4)[::-1]
def valid_photo(kind,x,y,side):
 if not(0<=x<754 and 0<=y<1280):return False
 red,green,blue,_=pixels[int(y),int(x)]
 if kind=='skin':
  if side>=0 and y>(508+(x-238)*.335 if side==0 else 566-(x-418)*.36):return green>red*.65 and red<.48
  return red>green*1.13 and green>blue*1.06 and red>.28 and (red-green)>.07
 if kind=='red':return red>green*1.35 and red>blue*1.1
 if kind=='green':return green>red*.70 and red<.55
 return True
# Export a compact interleaved mesh buffer for the offline browser renderer.
# Blender Z-up -> browser Y-up; front faces +Z.
binary=bytearray();parts=[];total_v=0;total_t=0
for o in objects:
 m=o.data;m.calc_loop_triangles();offset=len(binary);kind=o['kind'];side=o['side'];front=o['photo'];color=COLORS[kind]
 for v in m.vertices:
  p=v.co;n=v.normal;x=p.x*S+377;y=H-p.z*S
  base=color
  if side>=0 and y>(508+(x-238)*.335 if side==0 else 566-(x-418)*.36):base=COLORS['green']
  if kind=='skin' and 'Torso' in o.name and y>530:base=COLORS['green']
  photoWeight=smooth((-n.y-.05)/.58) if front and 0<=x<=754 and 0<=y<=1280 else 0
  if not valid_photo(kind,x,y,side):photoWeight=0
  w=weight(side,x,y)*smooth((-n.y-.1)/.5) if side>=0 else 0
  values=[p.x,p.z,-p.y,n.x,n.z,-n.y,x/754,1-y/1280,*base,photoWeight,w]
  binary.extend(struct.pack('<13f',*values))
 if side>=0:
  group=o.vertex_groups.new(name='Supported soft region '+str(side))
  for v in m.vertices:
   x=v.co.x*S+377;y=H-v.co.z*S;w=weight(side,x,y)*smooth((-v.normal.y-.1)/.5)
   if w>0:group.add([v.index],w,'REPLACE')
 count=len(m.vertices);indexOffset=len(binary)
 for tri in m.loop_triangles:binary.extend(struct.pack('<3I',*tri.vertices))
 parts.append({'name':o.name,'kind':kind,'side':side,'vertexOffset':offset,'vertexCount':count,'indexOffset':indexOffset,'indexCount':len(m.loop_triangles)*3})
 total_v+=count;total_t+=len(m.loop_triangles)
(HERE/'holly.bin').write_bytes(binary)
(HERE/'holly.json').write_text(json.dumps({'version':1,'stride':13,'parts':parts,'vertices':total_v,'triangles':total_t,'source':'Blender '+bpy.app.version_string,'referenceSHA256':hashlib.sha256((ROOT/'peach-physics/v8/assets/holly-heartbreaker.png').read_bytes()).hexdigest(),'note':'Stylized form study; likeness unfinished. Reference UVs retained for research, not rendered. Hidden surfaces and lower legs are approximate.'},separators=(',',':')))
# Editable Blender source, kept locally rather than required for web playback.
scene=bpy.context.scene;scene.unit_settings.system='METRIC'
for o in objects:o['reference']='Approved Holly portrait; projection in browser, geometry editable here.'
out=ROOT/'peach-physics/experiments/holly-3d';out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'Holly-3D-study.blend'))
print('MODEL_OK',total_v,total_t,len(binary))
