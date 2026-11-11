"""Assemble browser captures/field data; never writes or retouches portrait assets."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json, math, subprocess, sys

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'evidence'; RAW=OUT/'raw'; SEQUENCES=json.loads((OUT/'states.json').read_text())
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
def font(n):
    return ImageFont.truetype(FONT,n)
SIZES={375:667,390:844,430:932,440:956}
LABELS=['r5','r6','layered']
def crop(name,width=390,target=(450,310)):
    im=Image.open(RAW/(name+'.png')).convert('RGB')
    height=SIZES[width]; top=max(70,height*.078); scale=min(width/720,(height-top)/1280*1.14)
    left=(width-720*scale)/2
    box=tuple(round(v*2) for v in (left+180*scale,top+365*scale,left+630*scale,top+675*scale))
    return im.crop(box).resize(target,Image.Resampling.LANCZOS)
def label(draw,xy,text,n=18,fill='#e9f2ec'):draw.text(xy,text,font=font(n),fill=fill)

for backend in ([] if '--field-only' in sys.argv else ['webgl','canvas']):
    # One sheet per phone viewport, each 3 columns by 8 phase rows.
    for width in SIZES:
        cw,ch=360,248; sheet=Image.new('RGB',(cw*3,ch*8+36*9),'#13221f');d=ImageDraw.Draw(sheet)
        for col,title in enumerate(['r5 · fixed photo warp','r6 · pinned perimeter','Layered · missing pixels marked']):label(d,(col*cw+8,8),title,16)
        row=0
        for side in [0,1]:
            for phase in ['impact','peak','rebound','settled']:
                y=36+row*(ch+36); step={'impact':0,'peak':SEQUENCES[side]['peakStep'],'rebound':SEQUENCES[side]['reboundStep'],'settled':960}[phase]
                label(d,(8,y),f'{backend.upper()} / {width} CSS px / {"Left" if side==0 else "Right"} / {phase} / {step/120:.3f}s',15)
                for col,name in enumerate(LABELS):sheet.paste(crop(f'{backend}-{width}-{name}-{side}-{phase}',width,(cw,ch)),(col*cw,y+36))
                row+=1
        sheet.save(OUT/f'phases-{backend}-{width}.png',optimize=True)
        if width==390:sheet.save(OUT/f'phases-{backend}.png',optimize=True)
    movie=RAW/f'movie-{backend}';movie.mkdir(exist_ok=True)
    frame_id=0
    for side in [0,1]:
        # 0.5s original rest, 1.5s real-time dynamics, 0.5s fully settled hold.
        for step in [-1]*15+list(range(46))+[960]*15:
            frame=Image.new('RGB',(1350,388),'#13221f');d=ImageDraw.Draw(frame)
            phase='rest' if step==-1 else 'settled (8s)' if step==960 else f't = {step*4/120:.3f}s'
            label(d,(12,8),f'{backend.upper()} · 390×844 CSS px · Natural · link 0 · {"Left" if side==0 else "Right"} tap · {phase}',18)
            for col,name in enumerate(LABELS):
                file=f'{backend}-390-{name}-rest' if step==-1 else f'{backend}-390-{name}-{side}-settled' if step==960 else f'movie-{backend}-{name}-{side}-{step:03d}'
                frame.paste(crop(file),(col*450,70));label(d,(col*450+12,42),['r5','r6','Layered: pink = unknown source'][col],18)
            frame.save(movie/f'{frame_id:04d}.png');frame_id+=1
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-framerate','30','-i',str(movie/'%04d.png'),'-c:v','libx264','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',str(OUT/f'comparison-{backend}.mp4')],check=True)

data=json.loads((OUT/'field.json').read_text())
# Diagnostic diagram uses the captured resting render, not altered source art.
photo=crop('webgl-390-layered-rest',target=(900,620))
sheet=Image.new('RGB',(1800,740),'#13221f');sheet.paste(photo,(0,70));sheet.paste(photo,(900,70));d=ImageDraw.Draw(sheet)
label(d,(12,10),'Material ownership and stationary attachments',24)
label(d,(912,10),'Displacement from inverse field · right peak (arrows × 2)',22)
def pos(x,y,panel=0):return ((x-180)*2+panel*900,70+(y-365)*2)
for side,edge in enumerate(data['edges']):
    p=[pos(x,y) for y,x in edge if 365<=y<=675]
    d.line(p,fill=['#44efca','#ffca79'][side],width=3)
for v in data['vectors']:
    if v['material']<.5:continue
    x,y=pos(v['x'],v['y'],1); dx=v['dx']*4;dy=v['dy']*4
    if abs(dx)+abs(dy)<.3:continue
    d.line((x,y,x+dx,y+dy),fill='#45f2ca',width=2)
    angle=math.atan2(dy,dx)
    d.polygon([(x+dx,y+dy),(x+dx-5*math.cos(angle-.5),y+dy-5*math.sin(angle-.5)),(x+dx-5*math.cos(angle+.5),y+dy-5*math.sin(angle+.5))],fill='#45f2ca')
for y,text in [(374,'Neck attachment begins'),(446,'Full upper support'),(550,'Lower garment support begins'),(658,'Lower corset stationary')]:
    a=pos(180,y);b=pos(630,y);d.line((*a,*b),fill='#faf1d0',width=1);label(d,(a[0]+8,a[1]+2),text,15)
label(d,(12,705),'Outlines identify material. They DO NOT pin its motion. Hair above fur remains foreground.',18)
label(d,(912,705),f"Newly uncovered at this peak: {data['missingAreaSourcePixels']} source pixels (alpha > 0.5)",18)
sheet.save(OUT/'field.png',optimize=True)
print('Saved motion videos, four-size phase sheets and field visualization.')
