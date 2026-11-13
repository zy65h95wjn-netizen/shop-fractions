from pathlib import Path
import subprocess,re,shutil
p=Path(__file__).resolve().parent;root=p.parents[2]
s=subprocess.check_output(['git','show','76cc6f11cff4cf77bd3d6e1eb34880246b23e9e7:peach-physics/v8/index.html'],cwd=root).decode()
s=s.replace('<title>Peach Physics — Elf Lab 0.0.8 r12</title>','<title>Peach Physics — R13.3 motion experiment</title>').replace('v0.0.8 · r12','R13.3 motion experiment')
s=s.replace('<link rel="manifest" href="./manifest.webmanifest">','').replace('<link rel="apple-touch-icon" href="./apple-touch-icon.png">','')
s=re.sub(r'<script>\s*if\(\'serviceWorker\'.*?</script>','',s,flags=re.S)
s=s.replace('.slap-audio[aria-pressed="true"]', '.slap-audio[aria-checked="true"],.slap-audio[aria-pressed="true"]')
s=s.replace('<div id="scrim"', '<p id="motionNotice" role="status" hidden style="position:absolute;z-index:5;pointer-events:none;top:max(12px,env(safe-area-inset-top));left:60px;right:60px;margin:0;padding:7px 10px;border-radius:12px;background:#07110fe8;color:#fff7eb;font-size:12px;text-align:center"></p><div id="scrim"')
s=s.replace('<button id="grabHold"', '''<section aria-label="Optional motion"><button id="shakeMotion" class="slap-audio" type="button" role="switch" aria-checked="false" aria-describedby="motionStatus">Shake to Jiggle: off</button><button id="autoMotion" class="slap-audio" type="button" role="switch" aria-checked="false" aria-describedby="motionStatus">Auto Jiggle: off</button><p id="motionStatus" style="font-size:13px;line-height:1.4">Optional motion effects</p></section><button id="grabHold"''')
s=s.replace('<script>\n(() => {','<script src="./motion.js"></script>\n<script>\n(() => {',1)
s=s.replace("'use strict';", """'use strict';
let motion=null;
const profileStorage={getItem:k=>localStorage.getItem('r13-preview:'+k)??localStorage.getItem(k),setItem:(k,v)=>localStorage.setItem('r13-preview:'+k,v)};
""",1)
s=s.replace('localStorage.','profileStorage.').replace("profileStorage.getItem('r13-preview:'", "localStorage.getItem('r13-preview:'").replace('??profileStorage.getItem(k)','??localStorage.getItem(k)').replace("profileStorage.setItem('r13-preview:'", "localStorage.setItem('r13-preview:'")
s=s.replace('step(1/120);accumulator-=1/120;', 'motion?.tick(1/120);step(1/120);accumulator-=1/120;')
s=s.replace('function reset(){','function reset(){motion?.interrupt();')
s=s.replace(' wake();\n pointers.set(', ' wake();motion?.interrupt();\n pointers.set(')
s=s.replace(' pointers.delete(e.pointerId);',' pointers.delete(e.pointerId);motion?.interrupt();')
s=s.replace('presentCharacter();\ngetPhoto', '''motion=new PeachMotion.MotionInput({character:()=>currentCharacter().id,nodes:()=>nodes,busy:()=>pointers.size>0||characterSwitchPending||webglLost||!img});
const motionUI=PeachMotion.attachUI(motion,{onEnable:()=>openPanel(false)});
window.__peachMotionDebug={snapshot:()=>({...motion.snapshot(),ui:motionUI.snapshot()})};
presentCharacter();
getPhoto''')
(p/'index.html').write_text(s)
shutil.copytree(root/'peach-physics/v8/assets',p/'assets',dirs_exist_ok=True)
