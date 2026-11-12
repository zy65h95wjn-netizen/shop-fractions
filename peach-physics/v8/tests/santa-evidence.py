"""Package actual browser captures into compact review sheets and 30fps clips.
No source artwork is edited. Run after santa.cjs and santa-runtime.cjs.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import subprocess, shutil
source = Path('/tmp/peach-v8-tests/santa')
out = Path(__file__).parent / 'captures/santa'
out.mkdir(parents=True, exist_ok=True)
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 18)
small = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 14)
phases = ['rest', 'impact', 'peak', 'rebound', 'settling', 'settled']
# 390x844 at DPR2; source-space belly crop converted using final Santa framing.
scale = (390-32)/700
ox = (390-1024*scale)/2
oy = max(70,844*.078)+(844-max(70,844*.078)-max(28,844*.036)-1280*scale)/2
crop = tuple(round(v*2) for v in (ox+158*scale,oy+510*scale,ox+794*scale,oy+1045*scale))
for backend in ['webgl','canvas']:
 sheet = Image.new('RGB',(1800,930),'#101a19')
 draw = ImageDraw.Draw(sheet)
 for row,preset in enumerate(['natural','playful','chaos']):
  for col,phase in enumerate(phases):
   im=Image.open(source/f'{backend}-{preset}-{phase}.png').convert('RGB').crop(crop)
   im.thumbnail((296,254));sheet.paste(im,(col*300,row*310+44))
   draw.text((col*300+8,row*310+10), f'{preset.title()} · {phase}',font=small,fill='#f3dab0')
 sheet.save(out/f'{backend}-phases.jpg',quality=92)
 for preset in ['natural','playful','chaos']:
  subprocess.run(['ffmpeg','-y','-loglevel','error','-framerate','30','-i',str(source/f'{backend}-{preset}-motion/%03d.png'),'-vf','scale=390:844','-c:v','libx264','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',str(out/f'{backend}-{preset}.mp4')],check=True)
# Final application screenshots, including real controls and blurred background.
for backend in ['webgl','canvas']:
 p=source.parent/f'santa-{backend}-phone.png'
 if p.exists():
  Image.open(p).convert('RGB').save(out/f'{backend}-phone.jpg',quality=90)
# Full-canvas framing reference across the four portrait viewports and landscape.
frames=Image.new('RGB',(1500,900),'#101a19');draw=ImageDraw.Draw(frames)
for col,size in enumerate(['375x667','390x844','430x932','440x956','844x390']):
 im=Image.open(source/f'webgl-framing-{size}.png').convert('RGB');im.thumbnail((294,800));frames.paste(im,(col*300,55));draw.text((col*300+10,15),size,font=font,fill='#f3dab0')
frames.save(out/'framing.jpg',quality=89)
shutil.copyfile(source/'results.json',out/'results.json')
print(out)
