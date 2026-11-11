"""Serve a temporary whitelist of public review files on localhost only."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from tempfile import TemporaryDirectory
import shutil

repair = Path(__file__).resolve().parents[1]
repo = repair.parents[3]
lab = repair.parent
files = [lab / name for name in ['r6.html', 'bootstrap.js', 'renderer.js']]
files += [repair / 'index.html', repair / 'renderer.js']
files += list((repair / 'assets').glob('*'))
files += [repo / 'peach-physics/v8' / name for name in [
    'assets/holly-heartbreaker.jpg', 'assets/aurelia-frost.jpg',
    'apple-touch-icon.png',
]]

if __name__ == '__main__':
    with TemporaryDirectory(prefix='holly-source-repair-') as staging:
        for source in files:
            if not source.is_file():
                raise FileNotFoundError(source)
            target = Path(staging) / source.relative_to(repo)
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)
        handler = partial(SimpleHTTPRequestHandler, directory=staging)
        with ThreadingHTTPServer(('127.0.0.1', 8000), handler) as server:
            print('Local only: http://127.0.0.1:8000/peach-physics/experiments/'
                  'holly-layered/reconstruction/index.html', flush=True)
            try:
                server.serve_forever()
            except KeyboardInterrupt:
                pass
