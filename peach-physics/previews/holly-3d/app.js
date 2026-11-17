import * as THREE from './vendor/three.module.min.js';
const stage=document.querySelector('#stage'),loading=document.querySelector('#loading');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let renderer,ready=false,auto=true,mode='touch',view=0,clock=0,previous=0,acc=0,quietUntil=0;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(30,1,.1,80),root=new THREE.Group();scene.add(root);
const nodes=[0,1].map(()=>({p:new THREE.Vector3(),v:new THREE.Vector3()}));
const moving=[],parts=[],holds=new Map();let orbit=null,azimuth=0,elevation=.015,radius=14,targetY=3.58;
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),plane=new THREE.Plane(),temp=new THREE.Vector3();
const references={};let geometryInfo;
const hemi=new THREE.HemisphereLight(0xfff1dc,0x314138,1.65);scene.add(hemi);
const key=new THREE.DirectionalLight(0xfff0dd,2.0);key.position.set(-4,9,6);scene.add(key);
const rim=new THREE.DirectionalLight(0xaad5df,1.8);rim.position.set(4,6,-5);scene.add(rim);
const fill=new THREE.DirectionalLight(0xffe8d1,.35);fill.position.set(3,4,5);scene.add(fill);
const pedestal=new THREE.Mesh(new THREE.CylinderGeometry(1.6,1.72,.14,64),new THREE.MeshStandardMaterial({color:0x203d31,roughness:.38,metalness:.4}));pedestal.position.y=-1.97;scene.add(pedestal);
const ring=new THREE.Mesh(new THREE.TorusGeometry(1.62,.017,6,64),new THREE.MeshStandardMaterial({color:0xc7a26c,roughness:.3,metalness:.65}));ring.rotation.x=Math.PI/2;ring.position.y=-1.89;scene.add(ring);
function cameraUpdate(){camera.position.set(Math.sin(azimuth)*radius,targetY+Math.sin(elevation)*radius,Math.cos(azimuth)*radius);camera.lookAt(0,targetY,0);camera.updateMatrixWorld()}
function resize(){if(!renderer)return;const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();cameraUpdate()}
function makeMaterial(){return new THREE.MeshStandardMaterial({vertexColors:true,roughness:.82,metalness:0,side:THREE.DoubleSide})}
function batchStatic(){
 const statics=parts.filter(m=>m.userData.side<0),count=statics.reduce((n,m)=>n+m.geometry.attributes.position.count,0),g=new THREE.BufferGeometry();
 for(const name of ['position','normal','uv','color','photoWeight']){const size=statics[0].geometry.attributes[name].itemSize,array=new Float32Array(count*size);let offset=0;for(const m of statics){array.set(m.geometry.attributes[name].array,offset);offset+=m.geometry.attributes[name].array.length}g.setAttribute(name,new THREE.BufferAttribute(array,size))}
 const indices=new Uint32Array(statics.reduce((n,m)=>n+m.geometry.index.count,0));let at=0,base=0;
 for(const m of statics){for(const i of m.geometry.index.array)indices[at++]=i+base;base+=m.geometry.attributes.position.count;root.remove(m)}
 g.setIndex(new THREE.BufferAttribute(indices,1));g.computeBoundingSphere();const combined=new THREE.Mesh(g,statics[0].material);combined.name='Fixed body and clothing';root.add(combined);
}
function reset(){for(const n of nodes){n.p.set(0,0,0);n.v.set(0,0,0)}holds.clear();quietUntil=clock+.6}
function bounce(side,power=1){nodes[side].v.y+=.92*power;nodes[side].v.z+=.45*power;nodes[side].v.x+=(side?1:-1)*.13*power;quietUntil=clock+1.2}
function step(dt){
 clock+=dt;
 for(let side=0;side<2;side++){
  const n=nodes[side],hold=[...holds.values()].find(h=>h.side===side),omega=2*Math.PI*(side?2.65:2.52),k=omega*omega;
  if(hold&&hold.drag){n.p.lerp(hold.target,1-Math.exp(-dt*28));n.v.set(0,0,0);continue}
  const force=n.p.clone().multiplyScalar(-k).addScaledVector(n.v,-2*omega*.26);
  if(auto&&clock>quietUntil&&!holds.size){force.y+=k*.032*Math.sin(clock*6.6+side*1.5);force.z+=k*.018*Math.sin(clock*6.6+side*1.5+.5);force.x+=k*.008*Math.sin(clock*4.3+side*2)}
  n.v.addScaledVector(force,dt);n.p.addScaledVector(n.v,dt);
  const length=n.p.length();if(length>.14){n.p.multiplyScalar(.14/length);n.v.multiplyScalar(.5)}
 }
}
function deform(){
 for(const m of moving){const {base,weights}=m.userData,n=nodes[m.userData.side],p=m.geometry.attributes.position.array;
  for(let i=0;i<weights.length;i++){const w=weights[i],at=i*3;p[at]=base[at]+n.p.x*w;p[at+1]=base[at+1]+n.p.y*w;p[at+2]=base[at+2]+n.p.z*w}
  m.geometry.attributes.position.needsUpdate=true;m.geometry.computeVertexNormals();m.geometry.computeBoundingSphere();
 }
}
function draw(){if(!ready)return;deform();cameraUpdate();renderer.render(scene,camera)}
function pointRay(e){const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height*2-1));raycaster.setFromCamera(pointer,camera)}
function activePoint(e,hold){pointRay(e);return raycaster.ray.intersectPlane(hold.plane,temp)?temp.clone():null}
function down(e){
 if(!ready||e.button>0)return;e.preventDefault();pointRay(e);
 const hits=raycaster.intersectObjects(moving,false),hit=hits.find(h=>h.face&&h.object.userData.weights[h.face.a]+h.object.userData.weights[h.face.b]+h.object.userData.weights[h.face.c]>.18);
 try{renderer.domElement.setPointerCapture(e.pointerId)}catch{}
 if(mode==='touch'&&hit){const side=hit.object.userData.side;if([...holds.values()].some(h=>h.side===side))return;const normal=camera.getWorldDirection(new THREE.Vector3());const hold={side,plane:new THREE.Plane().setFromNormalAndCoplanarPoint(normal,hit.point),start:hit.point.clone(),base:nodes[side].p.clone(),target:nodes[side].p.clone(),last:hit.point.clone(),at:performance.now(),lastAt:performance.now(),velocity:new THREE.Vector3(),drag:false};holds.set(e.pointerId,hold);quietUntil=clock+1.2}
 else if(!holds.size)orbit={id:e.pointerId,x:e.clientX,y:e.clientY};
}
function move(e){
 const h=holds.get(e.pointerId);if(h){e.preventDefault();const p=activePoint(e,h);if(!p)return;const delta=p.clone().sub(h.start),now=performance.now(),dt=Math.max(.012,(now-h.lastAt)/1000);h.drag=h.drag||delta.length()>.025;h.target.copy(h.base).addScaledVector(delta,.55);h.target.clampLength(0,.14);h.velocity.copy(p).sub(h.last).multiplyScalar(.20/dt).clampLength(0,1.5);h.last.copy(p);h.lastAt=now;return}
 if(orbit?.id===e.pointerId){azimuth-=(e.clientX-orbit.x)*.008;elevation=clamp(elevation+(e.clientY-orbit.y)*.004,-.22,.35);orbit.x=e.clientX;orbit.y=e.clientY;document.querySelector('#viewLabel').textContent='3D view · drag to turn'}
}
function up(e){const h=holds.get(e.pointerId);if(h){holds.delete(e.pointerId);quietUntil=clock+1.2;if(e.type==='pointerup'){if(!h.drag&&performance.now()-h.at<450)bounce(h.side);else if(h.drag&&performance.now()-h.lastAt<100)nodes[h.side].v.copy(h.velocity)}}if(orbit?.id===e.pointerId)orbit=null}
function cancel(){holds.clear();orbit=null;previous=0;acc=0;quietUntil=clock+1.2}
function setMode(next){mode=next;cancel();for(const id of ['touch','turn'])document.querySelector('#'+id).setAttribute('aria-pressed',id===mode);document.querySelector('#hint').textContent=mode==='turn'?'Drag to turn the model. Front view restores her portrait angle.':'Tap or drag the moving regions. Drag elsewhere to turn.'}
function setView(next){view=next;if(view===0){radius=14;targetY=3.58}else if(view===1){radius=8.2;targetY=4.6}else{radius=19.6;targetY=2.65}cameraUpdate();document.querySelector('#view').textContent=['Closer look','Full figure','Portrait'][view];document.querySelector('#viewLabel').textContent=['Front portrait','Closer look','Full figure · modeled lower legs'][view]}
function loop(now){if(!previous)previous=now;if(ready&&!document.hidden){acc+=Math.min(.05,(now-previous)/1000);while(acc>=1/120){step(1/120);acc-=1/120}draw()}previous=now;requestAnimationFrame(loop)}
async function start(){
 try{
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;stage.prepend(renderer.domElement);
  const [info,buffer]=await Promise.all([fetch('./holly.json').then(r=>{if(!r.ok)throw Error('Model metadata unavailable');return r.json()}),fetch('./holly.bin').then(r=>{if(!r.ok)throw Error('Model mesh unavailable');return r.arrayBuffer()})]);geometryInfo=info;
  const mat=makeMaterial();
  for(const part of info.parts){const data=new Float32Array(buffer,part.vertexOffset,part.vertexCount*13),positions=new Float32Array(part.vertexCount*3),normals=new Float32Array(part.vertexCount*3),uvs=new Float32Array(part.vertexCount*2),colors=new Float32Array(part.vertexCount*3),photo=new Float32Array(part.vertexCount),weights=new Float32Array(part.vertexCount);
   for(let i=0;i<part.vertexCount;i++){positions.set(data.subarray(i*13,i*13+3),i*3);normals.set(data.subarray(i*13+3,i*13+6),i*3);uvs.set(data.subarray(i*13+6,i*13+8),i*2);const col=new THREE.Color(data[i*13+8],data[i*13+9],data[i*13+10]).convertSRGBToLinear();colors.set([col.r,col.g,col.b],i*3);photo[i]=data[i*13+11];weights[i]=data[i*13+12]}
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(positions,3));g.setAttribute('normal',new THREE.BufferAttribute(normals,3));g.setAttribute('uv',new THREE.BufferAttribute(uvs,2));g.setAttribute('color',new THREE.BufferAttribute(colors,3));g.setAttribute('photoWeight',new THREE.BufferAttribute(photo,1));g.setIndex(new THREE.BufferAttribute(new Uint32Array(buffer,part.indexOffset,part.indexCount),1));g.computeBoundingSphere();
   const mesh=new THREE.Mesh(g,mat);mesh.name=part.name;mesh.userData={side:part.side,base:positions.slice(),weights};root.add(mesh);parts.push(mesh);if(part.side>=0)moving.push(mesh);
  }
  batchStatic();ready=true;resize();loading.hidden=true;document.querySelectorAll('button').forEach(b=>b.disabled=false);renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);for(const type of ['pointerup','pointercancel','lostpointercapture'])renderer.domElement.addEventListener(type,up);renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();radius=clamp(radius+e.deltaY*.01,6.5,23)},{passive:false});
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();ready=false;loading.hidden=false;loading.textContent='3D graphics paused. Reload to resume.'});
  requestAnimationFrame(loop);
 }catch(e){console.error(e);loading.hidden=false;loading.textContent='The 3D view could not start. Try reopening in Safari with a connection.'}
}
for(const id of ['touch','turn'])document.querySelector('#'+id).onclick=()=>setMode(id);
document.querySelector('#auto').onclick=()=>{auto=!auto;document.querySelector('#auto').textContent=auto?'Auto on':'Auto off';document.querySelector('#auto').setAttribute('aria-pressed',auto)};
document.querySelector('#bounce').onclick=()=>{bounce(0);bounce(1,.9)};
document.querySelector('#front').onclick=()=>{azimuth=0;elevation=.015;cameraUpdate();document.querySelector('#viewLabel').textContent='Front view'};
document.querySelector('#view').onclick=()=>setView((view+1)%3);document.querySelector('#reset').onclick=()=>reset();
window.addEventListener('resize',resize);window.addEventListener('blur',cancel);document.addEventListener('visibilitychange',cancel);
window.__holly3d={ready:()=>ready,snapshot:()=>({auto,mode,view,clock,azimuth,elevation,radius,holds:holds.size,nodes:nodes.map(n=>({p:n.p.toArray(),v:n.v.toArray()})),vertices:geometryInfo?.vertices,triangles:geometryInfo?.triangles,parts:parts.length,drawCalls:renderer?.info.render.calls,webgl2:renderer?.capabilities.isWebGL2}),step,draw,reset,bounce,setAuto:value=>{auto=value},turn:a=>{azimuth=a;cameraUpdate()},setView,project:side=>{const mesh=moving[side],p=new THREE.Vector3(side?(.655):(-.30),(1280-475)/180,.77).project(camera),r=renderer.domElement.getBoundingClientRect();return{x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2}},geometry:()=>moving.map(m=>({base:Array.from(m.userData.base),positions:Array.from(m.geometry.attributes.position.array),weights:Array.from(m.userData.weights),normals:Array.from(m.geometry.attributes.normal.array)}))};
document.querySelector('#reference').onclick=()=>{const el=document.querySelector('#referenceImage');el.hidden=!el.hidden;document.querySelector('#reference').setAttribute('aria-pressed',!el.hidden)};
start();
if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{});
