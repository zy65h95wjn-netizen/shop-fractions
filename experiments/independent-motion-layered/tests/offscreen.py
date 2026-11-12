"""Render the actual app shaders with Mesa EGL, without starting a browser.

This validates shader compilation and compositing only. It does not establish
browser integration, Safari support, touch behavior, or physical device speed.
Run: node tests/export-fields.mjs && python3 tests/offscreen.py
"""
import ctypes as C
import json
import os
from pathlib import Path
import re
from PIL import Image, ImageChops, ImageStat

os.environ.setdefault('LIBGL_ALWAYS_SOFTWARE', '1')
os.environ.setdefault('MESA_SHADER_CACHE_DIR','/tmp/layered-qa/mesa-cache')
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
attrs=(I*13)(0x3033,1,0x3040,4,0x3024,8,0x3023,8,0x3022,8,0x3021,8,0x3038)
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

root=Path(__file__).resolve().parent.parent
source=(root/'dist/renderer.js').read_text()
vertex=re.search(r'const vertex=`(.*?)`;',source,re.S)[1]
common=re.search(r'const common=`(.*?)`;',source,re.S)[1]
base=common+re.search(r'const baseFragment=common\+`(.*?)`;',source,re.S)[1]
layer=common+re.search(r'const layerFragment=common\+`(.*?)`;',source,re.S)[1]
def make_shader(kind,text):
    s=create_shader(kind);b=C.c_char_p(text.encode());shader_source(s,1,C.byref(b),None);compile_shader(s)
    ok=I();shader_iv(s,0x8B81,C.byref(ok))
    if not ok.value:
        log=C.create_string_buffer(8192);shader_log(s,8192,None,log);raise RuntimeError(log.value.decode())
    return s
def program(fragment):
    p=create_program();attach(p,make_shader(0x8B31,vertex));attach(p,make_shader(0x8B30,fragment));link(p)
    ok=I();program_iv(p,0x8B82,C.byref(ok));assert ok.value,'shader linking failed'
    return p
base_program=program(base);layer_program=program(layer)
image=Image.open(root/'dist/assets/portrait-original.jpg').convert('RGBA')
textures=[image.tobytes()]+[(Path('/tmp/layered-qa')/f'field-{i}.rgba').read_bytes() for i in range(2)]
for unit,data in enumerate(textures):
    active_texture(0x84C0+unit);t=U();gen_texture(1,C.byref(t));bind_texture(0x0DE1,t.value)
    for key,val in [(0x2802,0x812F),(0x2803,0x812F),(0x2801,0x2601),(0x2800,0x2601)]:tex_parameter(0x0DE1,key,val)
    buf=C.create_string_buffer(data);tex_image(0x0DE1,0,0x1908,756,1280,0,0x1908,0x1401,buf)
vertices=(F*12)(-1,-1,1,-1,-1,1,-1,1,1,-1,1,1)
buffer=U();gen_buffer(1,C.byref(buffer));bind_buffer(0x8892,buffer.value);buffer_data(0x8892,C.sizeof(vertices),vertices,0x88E4)
for p in [base_program,layer_program]:
    use(p)
    for unit,name in enumerate([b'uImage',b'uLeftField',b'uRightField']):uniform1i(uniform_location(p,name),unit)
def set_program(p):
    use(p);a=attribute(p,b'aPosition');enable_attribute(a);vertex_pointer(a,2,0x1406,0,0,None)
def render(name,left,right):
    viewport(0,0,756,1280);disable(0x0BE2);set_program(base_program);draw(4,0,6)
    enable(0x0BE2);blend(0x0302,0x0303);set_program(layer_program)
    for side,body in enumerate([left,right]):
        uniform1f(uniform_location(layer_program,b'uSide'),side)
        uniform4f(uniform_location(layer_program,b'uBody'),*body);draw(4,0,6)
    assert get_error()==0
    pixels=(B*(756*1280*4))();read(0,0,756,1280,0x1908,0x1401,pixels)
    result=Image.frombytes('RGBA',(756,1280),bytes(pixels)).transpose(Image.Transpose.FLIP_TOP_BOTTOM)
    result.convert('RGB').save(f'/tmp/layered-qa/{name}.png')
    return result
zero=[0,0,0,0]
idle=render('idle',zero,zero)
right=render('right-inward',zero,[-16,8,-10,5])
outward=render('right-outward',zero,[6,-8,4,-5])
both=render('opposed',[-12,8,-8,5],[6,-8,4,-5])
def difference(a,b,box=None):
    d=ImageChops.difference(a.convert('RGB'),b.convert('RGB'))
    if box:d=d.crop(box)
    return {'maximum':max(v[1] for v in d.getextrema()),'mean':sum(ImageStat.Stat(d).mean)/3}
metrics={'idle_vs_source':difference(idle,image),
         'right_motion_unchanged_left_core':difference(right,idle,(165,825,235,945)),
         'right_motion_background':difference(right,idle,(0,0,756,750)),
         'right_motion_stockings':difference(right,idle,(0,1060,756,1280)),
         'outward_motion_left_core':difference(outward,idle,(165,825,235,945))}
assert metrics['idle_vs_source']['maximum']<=1
for name,m in metrics.items():
    if name!='idle_vs_source':assert m['maximum']==0,(name,m)
Path('/tmp/layered-qa/graphics-results.json').write_text(json.dumps(metrics,indent=2))
print(json.dumps(metrics,indent=2))
