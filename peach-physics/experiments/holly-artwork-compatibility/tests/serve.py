"""Temporary public-artifact whitelist, localhost only; no deployment."""
from pathlib import Path
from functools import partial
from tempfile import TemporaryDirectory
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
import shutil
HERE=Path(__file__).resolve().parents[1];ROOT=HERE.parents[2]
files=[HERE/'index.html',HERE/'r5.html',HERE.parent/'holly-layered/bootstrap.js']
files+=list((HERE/'assets').glob('reference-*.webp'))
files+=[ROOT/'peach-physics/v8'/p for p in ['assets/holly-heartbreaker.jpg','assets/aurelia-frost.jpg','apple-touch-icon.png']]
if __name__=='__main__':
 with TemporaryDirectory(prefix='holly-art-review-') as staging:
  for p in files:
   target=Path(staging)/p.relative_to(ROOT);target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,target)
  with ThreadingHTTPServer(('127.0.0.1',8000),partial(SimpleHTTPRequestHandler,directory=staging)) as server:
   print('Local isolated runner on 127.0.0.1:8000',flush=True)
   try:server.serve_forever()
   except KeyboardInterrupt:pass
