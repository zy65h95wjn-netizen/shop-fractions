"""Render the actual app shaders with Mesa EGL, without starting a browser.

This validates shader compilation and compositing only. It does not establish
browser integration, Safari support, touch behavior, or physical device speed.
Run: node tests/export-proof.mjs && python3 tests/render-proof.py
"""
import ctypes as C
import json
import math
import os
from pathlib import Path
import re
from PIL import Image, ImageChops, ImageStat

os.environ.setdefault('LIBGL_ALWAYS_SOFTWARE', '1')
os.environ.setdefault('MESA_SHADER_CACHE_DIR','/tmp/surface-3d-qa/mesa-cache')
E=C.CDLL('libEGL.so.1')
P=C.c_void_p; I=C.c_int; U=C.c_uint; F=C.c_float; B=C.c_ubyte
def egl(name,restype,args):
    f=getattr(E,name); f.restype=restype; f.argtypes=args; return f
getproc=egl('eglGetProcAddress',P,[C.c_char_p])
platform=C.CFUNCTYPE(P,U,P,P)(getproc(b'eglGetPlatformDisplayEXT'))
display=platform(0x31DD,None,None)
major=I();minor=I()
assert egl('eglInitialize',U,[P,P,P])(display,C.byref(major),C.byref(minor)), 'EGL could not initialize'
assert egl('eglBindAPI',U,[U])(0x30A0)
attrs=(I*15)(0x3033,1,0x3040,4,0x3024,8,0x3023,8,0x3022,8,0x3021,8,0x3025,24,0x3038)
config=P();count=I()
assert egl('eglChooseConfig',U,[P,P,P,I,P])(display,attrs,C.byref(config),1,C.byref(count)) and count.value
surfaceattrs=(I*5)(0x3057,756,0x3056,1280,0x3038)
surface=egl('eglCreatePbufferSurface',P,[P,P,P])(display,config,surfaceattrs)
contextattrs=(I*3)(0x3098,2,0x3038)
context=egl('eglCreateContext',P,[P,P,P,P])(display,config,None,contextattrs)
assert context and surface
assert egl('eglMakeCurrent',U,[P,P,P,P])(display,surface,surface,context)
def gl(name,restype,*args):
    return C.CFUNCTYPE(restype,*args)(getproc(name.encode()))
create_shader=gl('glCreateShader',U,U)
shader_source=gl('glShaderSource',None,U,I,P,P)
compile_shader=gl('glCompileShader',None,U)
shader_iv=gl('glGetShaderiv',None,U,U,P)
shader_log=gl('glGetShaderInfoLog',None,U,I,P,P)
create_program=gl('glCreateProgram',U)
attach=gl('glAttachShader',None,U,U)
link=gl('glLinkProgram',None,U)
program_iv=gl('glGetProgramiv',None,U,U,P)
use=gl('glUseProgram',None,U)
uniform_location=gl('glGetUniformLocation',I,U,C.c_char_p)
uniform1i=gl('glUniform1i',None,I,I)
uniform1f=gl('glUniform1f',None,I,F)
uniform4f=gl('glUniform4f',None,I,F,F,F,F)
active_texture=gl('glActiveTexture',None,U)
gen_texture=gl('glGenTextures',None,I,P)
bind_texture=gl('glBindTexture',None,U,U)
tex_parameter=gl('glTexParameteri',None,U,U,I)
tex_image=gl('glTexImage2D',None,U,I,I,I,I,I,U,U,P)
gen_buffer=gl('glGenBuffers',None,I,P)
bind_buffer=gl('glBindBuffer',None,U,U)
buffer_data=gl('glBufferData',None,U,C.c_ssize_t,P,U)
attribute=gl('glGetAttribLocation',I,U,C.c_char_p)
enable_attribute=gl('glEnableVertexAttribArray',None,U)
vertex_pointer=gl('glVertexAttribPointer',None,U,I,U,B,I,P)
draw=gl('glDrawArrays',None,U,I,I)
enable=gl('glEnable',None,U)
disable=gl('glDisable',None,U)
blend=gl('glBlendFunc',None,U,U)
viewport=gl('glViewport',None,I,I,I,I)
read=gl('glReadPixels',None,I,I,I,I,U,U,P)
get_error=gl('glGetError',U)

draw_elements=gl('glDrawElements',None,U,I,U,P)
clear=gl('glClear',None,U)
clear_depth=gl('glClearDepthf',None,F)
depth_mask=gl('glDepthMask',None,B)
depth_func=gl('glDepthFunc',None,U)
disable_attribute=gl('glDisableVertexAttribArray',None,U)
root=Path(__file__).resolve().parent.parent
dir=Path('/tmp/surface-3d-qa')
source=(root/'dist/renderer.js').read_text()
base_vertex=re.search(r'const baseVertex=`(.*?)`;',source,re.S)[1]
common=re.search(r'const common=`(.*?)`;',source,re.S)[1]
base_fragment=common+re.search(r'const baseFragment=common\+`(.*?)`;',source,re.S)[1]
mesh_vertex=re.search(r'const meshVertex=`(.*?)`;',source,re.S)[1]
mesh_fragment=re.search(r'const meshFragment=`(.*?)`;',source,re.S)[1]
def make_shader(kind,text):
    s=create_shader(kind);b=C.c_char_p(text.encode());shader_source(s,1,C.byref(b),None);compile_shader(s)
    ok=I();shader_iv(s,0x8B81,C.byref(ok))
    if not ok.value:
        log=C.create_string_buffer(8192);shader_log(s,8192,None,log);raise RuntimeError(log.value.decode())
    return s
def program(v,f):
    p=create_program();attach(p,make_shader(0x8B31,v));attach(p,make_shader(0x8B30,f));link(p)
    ok=I();program_iv(p,0x8B82,C.byref(ok));assert ok.value,'shader link failed'
    return p
base_program=program(base_vertex,base_fragment);mesh_program=program(mesh_vertex,mesh_fragment)
image=Image.open(root/'dist/assets/portrait-original.jpg').convert('RGBA')
textures=[image.tobytes()]+[(dir/f'field-{i}.rgba').read_bytes() for i in range(2)]
for unit,data in enumerate(textures):
    active_texture(0x84C0+unit);t=U();gen_texture(1,C.byref(t));bind_texture(0x0DE1,t.value)
    for key,val in [(0x2802,0x812F),(0x2803,0x812F),(0x2801,0x2601),(0x2800,0x2601)]:tex_parameter(0x0DE1,key,val)
    buf=C.create_string_buffer(data);tex_image(0x0DE1,0,0x1908,756,1280,0,0x1908,0x1401,buf)
quad=U();gen_buffer(1,C.byref(quad));bind_buffer(0x8892,quad.value)
vertices=(F*12)(-1,-1,1,-1,-1,1,-1,1,1,-1,1,1);buffer_data(0x8892,C.sizeof(vertices),vertices,0x88E4)
vbos=[];ibos=[]
for side in range(2):
    v=U();gen_buffer(1,C.byref(v));vbos.append(v.value)
    ib=U();gen_buffer(1,C.byref(ib));ibos.append(ib.value);bind_buffer(0x8893,ib.value)
    data=(dir/f'indices-{side}.bin').read_bytes();buffer_data(0x8893,len(data),C.create_string_buffer(data),0x88E4)
for p in [base_program,mesh_program]:
    use(p)
    for unit,name in enumerate([b'uImage',b'uLeftField',b'uRightField']):uniform1i(uniform_location(p,name),unit)
def attributes(p,fields,stride):
    for i in range(4):disable_attribute(i)
    for name,size,offset in fields:
        a=attribute(p,name.encode());enable_attribute(a);vertex_pointer(a,size,0x1406,0,stride,P(offset))
poses=json.loads((dir/'frames.json').read_text());results={}
for frame in poses['frames']:
    name=frame['name'];viewport(0,0,756,1280);depth_mask(1);clear_depth(1);clear(0x100)
    disable(0x0B71);disable(0x0BE2);use(base_program);bind_buffer(0x8892,quad.value)
    attributes(base_program,[('aPosition',2,0)],0);draw(4,0,6)
    enable(0x0B71);depth_func(0x0203);enable(0x0BE2);blend(0x0302,0x0303);use(mesh_program)
    uniform1f(uniform_location(mesh_program,b'uClay'),1 if frame['clay'] else 0)
    for side in range(2):
        data=(dir/f'{name}-{side}.bin').read_bytes();bind_buffer(0x8892,vbos[side]);buffer_data(0x8892,len(data),C.create_string_buffer(data),0x88E8)
        attributes(mesh_program,[('aPosition',3,0),('aProject',3,12),('aNormal',3,24),('aRestNormal',3,36)],48)
        bind_buffer(0x8893,ibos[side]);uniform1f(uniform_location(mesh_program,b'uSide'),side)
        draw_elements(4,poses['counts'][side],0x1403,None)
    assert get_error()==0,name
    pixels=(B*(756*1280*4))();read(0,0,756,1280,0x1908,0x1401,pixels)
    result=Image.frombytes('RGBA',(756,1280),bytes(pixels)).transpose(Image.Transpose.FLIP_TOP_BOTTOM).convert('RGB')
    result.save(dir/f'{name}.png')
    if name in ['idle','right-inward','right-outward','right-down','right-up','opposed']:results[name]=result

def difference(a,b,box=None):
    d=ImageChops.difference(a.convert('RGB'),b.convert('RGB'))
    if box:d=d.crop(box)
    return {'maximum':max(v[1] for v in d.getextrema()),'mean':sum(ImageStat.Stat(d).mean)/3}
metrics={'idle_vs_source':difference(results['idle'],image)}
for pose in ['right-inward','right-outward','right-down','right-up']:
    for label,box in [('left_core',(165,825,235,945)),('background',(0,0,756,750)),('stockings',(0,1060,756,1280))]:
        metrics[pose+'_'+label]=difference(results[pose],results['idle'],box)
(dir/'graphics-results.json').write_text(json.dumps(metrics,indent=2));print(json.dumps(metrics,indent=2))
assert all(v['maximum']==0 for v in metrics.values()), 'Fixed regions or resting source changed'
