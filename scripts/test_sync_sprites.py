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
if __name__=='__main__':unittest.main()
