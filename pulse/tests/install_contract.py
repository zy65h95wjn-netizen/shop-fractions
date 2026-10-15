#!/usr/bin/env python3
"""Offline installation contract. Run: python3 pulse/tests/install_contract.py."""
import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://zy65h95wjn-netizen.github.io/shop-fractions/pulse/'

class Head(HTMLParser):
    def __init__(self):
        super().__init__()
        self.meta, self.links = {}, {}
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'meta':
            self.meta[attrs.get('name', attrs.get('http-equiv'))] = attrs.get('content')
        if tag == 'link':
            self.links[attrs.get('rel')] = attrs

head = Head()
head.feed((ROOT / 'index.html').read_text())

def local(ref, base=BASE):
    assert ref.startswith('./'), ref
    url = urljoin(base, ref)
    assert url.startswith(BASE), url
    path = ROOT / urlparse(url).path.removeprefix(urlparse(BASE).path)
    assert path.exists(), path
    return path

manifest = json.loads(local(head.links['manifest']['href']).read_text())
assert manifest['name'] == manifest['short_name'] == 'Resting Beast'
assert manifest['display'] == 'standalone'
assert all(urljoin(BASE, manifest[k]) == BASE for k in ['id', 'scope', 'start_url'])
assert manifest['theme_color'] == head.meta['theme-color'] == '#100d0b'
assert manifest['background_color'] == '#090a0c'
assert head.meta['apple-mobile-web-app-capable'] == 'yes'
assert head.meta['apple-mobile-web-app-title'] == 'Resting Beast'
assert head.meta['apple-mobile-web-app-status-bar-style'] == 'black-translucent'
assert 'viewport-fit=cover' in head.meta['viewport']
assert head.links['apple-touch-icon']['sizes'] == '180x180'
assert local(head.links['apple-touch-icon']['href']).name == 'apple-touch-icon.png'
local(head.links['icon']['href'])
for icon in manifest['icons']:
    path = local(icon['src'])
    with Image.open(path) as im:
        assert icon['sizes'] == f'{im.width}x{im.height}'
    assert icon['type'] == 'image/png' and icon['purpose'] == 'any'
assert {i['sizes'] for i in manifest['icons']} == {'192x192', '512x512'}
for name, size in [('beasts-crest-1024.png', 1024), ('apple-touch-icon.png', 180),
                   ('icon-192.png', 192), ('icon-512.png', 512)]:
    with Image.open(ROOT / name) as im:
        assert im.size == (size, size) and im.mode == 'RGB' and im.format == 'PNG'
        im.verify()
csp = dict((p.strip().split(' ', 1) + [''])[:2]
           for p in head.meta['Content-Security-Policy'].split(';') if p.strip())
assert csp['manifest-src'] == "'self'"
assert csp['default-src'] == "'none'"
assert csp['img-src'] == "'self' data:"
assert csp['connect-src'] == 'https://wosfukbzxrykwarxobfw.supabase.co'
assert csp['script-src'] == csp['style-src'] == "'self'"
css = (ROOT / 'nightshift-iron-v8.css').read_text()
assert 'env(safe-area-inset-top, 0px)' in css
assert 'env(safe-area-inset-bottom, 0px)' in css
assert 'var(--dock-space)' in css
print('PASS: opaque PNG dimensions/decoding, manifest, Pages scope/start/id, local paths, Apple metadata, restricted CSP and existing safe-area rules')
