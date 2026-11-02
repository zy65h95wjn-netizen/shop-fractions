"""Refresh factual release metadata; never execute upstream JavaScript or delete saved IDs."""
import json, re, urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://www.fnsprites.info/'
CATALOG = ROOT / 'island/data/sprites.json'
DETAILS = ROOT / 'island/data/sprite-details.json'

def fetch(path):
    req = urllib.request.Request(BASE + path, headers={'User-Agent': 'MoonlitDrop-CatalogSync/1.0'})
    with urllib.request.urlopen(req, timeout=30) as res:
        body = res.read(2_000_001)
    if len(body) > 2_000_000:
        raise ValueError('Source too large')
    return body.decode('utf-8-sig')

def parse_catalog(text, season):
    match = re.search(r'window\.SPRITES_BY_SEASON\['+str(season)+r'\]\s*=\s*\[([\s\S]*?)\];', text)
    if not match:
        raise ValueError('Catalog format changed')
    # Only JSON-style literals are accepted; no eval, imports or executable source.
    raw = re.sub(r'//[^\n]*', '', match[1])
    raw = re.sub(r'(?<=[{,])\s*([A-Za-z][A-Za-z0-9_]*)\s*:', r'"\1":', raw)
    raw = re.sub(r',\s*([}\]])', r'\1', '['+raw+']')
    rows = json.loads(raw)
    ids = set()
    for row in rows:
        if not isinstance(row, dict) or not re.fullmatch(r'[a-z0-9_]{1,80}', row.get('id','')):
            raise ValueError('Invalid sprite ID')
        if row['id'] in ids or type(row.get('unreleased')) is not bool:
            raise ValueError('Duplicate ID or missing release flag')
        ids.add(row['id'])
        for k in ('name', 'theme', 'rarity'):
            if not isinstance(row.get(k),str) or not 1 <= len(row[k]) <= 100:
                raise ValueError('Invalid sprite metadata')
    if not 10 <= len(rows) <= 300:
        raise ValueError('Unexpected catalog size')
    return rows

def apply_details(out, details):
    """Apply reviewed family facts to every finish, including existing entries."""
    if not isinstance(details, dict) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}', details.get('reviewed','')):
        raise ValueError('Missing detail review date')
    seasons = details.get('seasons')
    if not isinstance(seasons,dict):
        raise ValueError('Invalid reviewed details')
    for group in out['groups']:
        season = seasons.get(str(group.get('sourceSeason')), {})
        variant = season.get('variants',{}).get(group['name'])
        if variant:
            if not isinstance(variant.get('bonus'),str) or not variant['bonus']:
                raise ValueError('Missing variant bonus')
            group['bonus'] = variant['bonus']
    for sprite in out['sprites']:
        season = seasons.get(str(sprite.get('sourceSeason')), {})
        family = sprite.get('sourceId','').rsplit('_',1)[0]
        facts = season.get('families',{}).get(family)
        if not facts:
            continue
        for key in ('does',):
            if not isinstance(facts.get(key),str) or not 1<=len(facts[key])<=600:
                raise ValueError('Invalid reviewed ability')
        finding = season.get('finding')
        if not isinstance(finding,str) or not finding:
            raise ValueError('Missing finding instructions')
        sprite['does'] = facts['does']
        if facts.get('levels'):
            sprite['levels'] = facts['levels']
        else:
            sprite.pop('levels',None)
        sprite['how'] = finding + (' '+facts['findingExtra'] if facts.get('findingExtra') else '')
        sprite['infoReviewed'] = details['reviewed']
        sprite['infoSources'] = season['sources']

def merge(old, rows, releases, now, season=5, title='Treasure Hunters', details=None):
    if not isinstance(releases.get('releasedIds'),list) or not isinstance(releases.get('unreleasedIds'),list):
        raise ValueError('Invalid release override payload')
    released, hidden = set(releases['releasedIds']), set(releases['unreleasedIds'])
    live = [r for r in rows if (not r['unreleased'] or r['id'] in released) and r['id'] not in hidden and (not r.get('comingLater',False) or r['id'] in released)]
    if len(live)<10:
        raise ValueError('Unexpectedly empty live roster')
    out = json.loads(json.dumps(old))
    existing = {s['id']:s for s in out['sprites']}
    if len(existing)!=len(out['sprites']):
        raise ValueError('Existing IDs are not unique')
    source_ids = {r['id'] for r in rows}
    known = [s for s in out['sprites'] if s.get('sourceSeason')==season]
    if any(s['sourceId'] not in source_ids for s in known):
        raise ValueError('Source removed existing entries; review required')
    old_live = sum(s.get('available',True) for s in known)
    if old_live and len(live) < old_live*.8:
        raise ValueError('Large release rollback; review required')
    live_ids = {r['id'] for r in live}
    for s in out['sprites']:
        s.setdefault('sourceSeason',4)
        s['archived'] = s['sourceSeason'] != season
        if s.get('sourceSeason')==season:
            s['available'] = s.get('sourceId') in live_ids
    group_ids = {g['id'] for g in out['groups']}
    for r in live:
        ident = 'fn-s'+str(season)+'-'+r['id']
        group = 'fn-s'+str(season)+'-'+re.sub('[^a-z0-9]','',r['theme'].lower())
        if group not in group_ids:
            out['groups'].append({'id':group,'name':r['theme'],'sourceSeason':season})
            group_ids.add(group)
        if ident not in existing:
            s = {'id':ident,'name':r['name']+' Sprite','group':group,'rarity':r['rarity'].lower(),
                 'added':now[:10], 'sourceId':r['id'],'sourceSeason':season,
                 'img':BASE+'spriteimg/'+r['id']+'.png',
                 'how':'Finding instructions are awaiting verification.'}
            out['sprites'].append(s); existing[ident]=s
        existing[ident].update(archived=False,available=True)
    if details is not None:
        apply_details(out, details)
    if not set(s['id'] for s in old['sprites']).issubset(existing):
        raise ValueError('Collection IDs lost')
    out.update(season=title,currentSeason=season,lastChecked=now,
               source=BASE, schemaVersion=2)
    # Content-update date stays distinct from a successful check with no new releases.
    if out['sprites'] != old['sprites'] or out['groups'] != old['groups']:
        out['updated']=now[:10]
    return out

def main():
    registry = fetch('seasons.js')
    headers = re.findall(r'\b(\d+):\s*\{\s*id:\s*\d+,([\s\S]*?)storage:', registry)
    current = [(int(i),h) for i,h in headers if re.search(r'current:\s*true',h)]
    if len(current)!=1: raise ValueError('Cannot determine current season')
    season, header = current[0]
    name = re.search(r"name:\s*'([^']+)'",header)
    if not name: raise ValueError('Missing season title')
    rows = parse_catalog(fetch('sprites-data-s'+str(season)+'.js'),season)
    releases = json.loads(fetch('api/releases.php'))
    old = json.loads(CATALOG.read_text())
    out = merge(old,rows,releases,datetime.now(timezone.utc).isoformat(timespec='seconds'),season,name[1],details=json.loads(DETAILS.read_text()))
    tmp = CATALOG.with_suffix('.tmp')
    tmp.write_text(json.dumps(out,ensure_ascii=False,indent=1)+'\n')
    tmp.replace(CATALOG)
    print(f"Catalog checked: {len(out['sprites'])} preserved total; {sum(not s['archived'] and s.get('available',True) for s in out['sprites'])} current.")

if __name__=='__main__': main()
