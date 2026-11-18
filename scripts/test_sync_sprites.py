import unittest
from sync_sprites import merge, parse_catalog
class CatalogTests(unittest.TestCase):
    def setUp(self):
        self.old={'updated':'2026-10-15','groups':[{'id':'season','name':'Base'}], 'sprites':[{'id':'jonesy','name':'Jonesy Sprite','group':'season','added':'2026-08-20'}]}
        self.rows=[{'id':f'test{i}_basic','name':f'Test {i}','theme':'Basic','rarity':'Rare','unreleased':False} for i in range(12)]
        self.release={'releasedIds':[],'unreleasedIds':[]}
    def test_preserves_catches_and_archives(self):
        out=merge(self.old,self.rows,self.release,'2026-11-01T17:00:00+00:00')
        self.assertEqual(out['sprites'][0]['id'],'jonesy')
        self.assertTrue(out['sprites'][0]['archived'])
        self.assertEqual(len(out['sprites']),13)
        again=merge(out,self.rows,self.release,'2026-11-02T17:00:00+00:00')
        self.assertEqual(out['sprites'],again['sprites'])
        self.assertEqual(again['updated'],'2026-11-01')
    def test_unreleased_stays_out(self):
        self.rows[0]['unreleased']=True
        self.rows[1]['comingLater']=True
        out=merge(self.old,self.rows,self.release,'2026-11-01T17:00:00+00:00')
        self.assertEqual(len(out['sprites']),11)
    def test_force_hidden_wins(self):
        self.release={'releasedIds':['test0_basic'],'unreleasedIds':['test0_basic']}
        out=merge(self.old,self.rows,self.release,'2026-11-01T17:00:00+00:00')
        self.assertNotIn('fn-s5-test0_basic',[s['id'] for s in out['sprites']])
    def test_lost_entries_rejected(self):
        out=merge(self.old,self.rows,self.release,'2026-11-01T17:00:00+00:00')
        with self.assertRaises(ValueError): merge(out,self.rows[1:],self.release,'2026-11-02T17:00:00+00:00')
    def test_code_never_executed(self):
        with self.assertRaises(ValueError): parse_catalog('window.SPRITES_BY_SEASON[5] = [process.exit()];',5)
    def test_new_season_retains_previous(self):
        out=merge(self.old,self.rows,self.release,'2026-11-01T17:00:00+00:00')
        nxt=merge(out,self.rows,self.release,'2026-12-01T17:00:00+00:00',6,'Next')
        self.assertEqual(len(nxt['sprites']),25)
        self.assertTrue(all(s['archived'] for s in nxt['sprites'][:13]))

class DetailTests(unittest.TestCase):
    def setUp(self):
        import json
        from pathlib import Path
        root=Path(__file__).resolve().parents[1]
        self.details=json.loads((root/'island/data/sprite-details.json').read_text())
        self.catalog=json.loads((root/'island/data/sprites.json').read_text())
    def test_reviewed_cards_keep_their_verified_details(self):
        from sync_sprites import apply_details
        apply_details(self.catalog, self.details)
        groups = {g['id']: g for g in self.catalog['groups']}
        for sprite in self.catalog['sprites']:
            if sprite.get('archived'):
                continue
            season = self.details['seasons'].get(str(sprite['sourceSeason']), {})
            family = sprite['sourceId'].rsplit('_', 1)[0]
            facts = season.get('families', {}).get(family)
            if facts is not None:
                self.assertEqual(sprite['does'], facts['does'])
                self.assertIn(season['finding'], sprite['how'])
                self.assertEqual(sprite['infoReviewed'], facts.get('reviewed', self.details['reviewed']))
            group = groups[sprite['group']]
            variant = season.get('variants', {}).get(group['name'])
            if variant is not None:
                self.assertEqual(group['bonus'], variant['bonus'])

    def test_unknown_family_does_not_block_this_or_next_refresh(self):
        rows = [{'id': f'new{i}_basic', 'name': f'New {i}', 'theme': 'Basic',
                 'rarity': 'Rare', 'unreleased': False} for i in range(12)]
        old = {'groups': [], 'sprites': [], 'updated': '2026-11-01'}
        release = {'releasedIds': [], 'unreleasedIds': []}
        first = merge(old, rows, release, '2026-11-18T09:00:00+00:00', details=self.details)
        rows.append(dict(rows[0], id='new12_basic', name='New 12'))
        again = merge(first, rows, release, '2026-11-18T15:00:00+00:00', details=self.details)
        self.assertEqual(again['sprites'][:12], first['sprites'])
        self.assertEqual(len(again['sprites']), 13)
        self.assertNotIn('does', again['sprites'][-1])
        self.assertNotIn('infoReviewed', again['sprites'][-1])
        self.assertEqual(again['lastChecked'], '2026-11-18T15:00:00+00:00')

    def test_existing_archived_information_and_ids_unchanged(self):
        from sync_sprites import apply_details
        import copy
        before=copy.deepcopy(self.catalog['sprites'])
        apply_details(self.catalog,self.details)
        self.assertEqual([s['id'] for s in before],[s['id'] for s in self.catalog['sprites']])
        self.assertEqual([s for s in before if s.get('archived')],[s for s in self.catalog['sprites'] if s.get('archived')])
    def test_refresh_restores_details_for_existing_and_new_variants(self):
        rows=[{'id':f'test{i}_basic','name':f'Test {i}','theme':'Basic','rarity':'Rare','unreleased':False} for i in range(10)]
        rows += [{'id':'halfpeeld_basic','name':"Halfpeel'd",'theme':'Basic','rarity':'Rare','unreleased':False}, {'id':'halfpeeld_fortune','name':"Fortune Halfpeel'd",'theme':'Fortune','rarity':'Special','unreleased':False}]
        old={'updated':'2026-10-15','sprites':[],'groups':[]}
        args=(rows,{'releasedIds':[],'unreleasedIds':[]},'2026-11-02T19:00:00+00:00')
        out=merge(old,*args,details=self.details)
        target=next(s for s in out['sprites'] if s['sourceId']=='halfpeeld_fortune')
        self.assertEqual(target['does'],self.details['seasons']['5']['families']['halfpeeld']['does'])
        target['how']='old placeholder'
        target.pop('does')
        again=merge(out,*args,details=self.details)
        fixed=next(s for s in again['sprites'] if s['sourceId']=='halfpeeld_fortune')
        self.assertIn('Wanted Poster',fixed['how'])
        self.assertIn('elimination',fixed['does'])
    def test_missing_ability_rejected(self):
        from sync_sprites import apply_details
        self.details['seasons']['5']['families']['halfpeeld']['does']=''
        with self.assertRaises(ValueError): apply_details(self.catalog,self.details)

if __name__=='__main__':unittest.main()
