import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {importInitialCard} from '../scripts/import-initial-cards.mjs';
const base=process.env.DATABASE_URL;
test('Week 8 historical INITIAL import is atomic, sealed, source-dated, idempotent and never records wagers',{skip:!base},async()=>{
 const admin=new pg.Client({connectionString:base});await admin.connect();const schema='initial_test_'+Date.now();await admin.query(`CREATE SCHEMA ${schema}`);const url=new URL(base);url.searchParams.set('options','-c search_path='+schema);const c=new pg.Client({connectionString:url.href});await c.connect();
 try{
  const run=spawnSync(process.execPath,['scripts/migrate.mjs'],{env:{...process.env,DATABASE_URL:url.href},encoding:'utf8'});assert.equal(run.status,0,run.stderr);
  const d=JSON.parse(await readFile('db/imports/2026-w8-initial.json','utf8'));
  assert.equal(await importInitialCard(c,d),'deferred: normalized dashboard not initialized');
  await c.query("INSERT INTO dashboard(id,payload,version) VALUES('main',$1,3)",[JSON.stringify({schemaVersion:2,weeks:[7],cards:[{season:2026,week:7}],reviews:{'2026-7':'Keep this'}})]);
  const old={id:'original',season:2026,week:7,type:'INITIAL',immutable:true};await c.query("INSERT INTO pick_cards(id,season,week,card_type,immutable,payload) VALUES('original',2026,7,'INITIAL',true,$1)",[JSON.stringify(old)]);
  assert.match(await importInitialCard(c,d),/imported 14/);
  const card=(await c.query('SELECT payload,immutable FROM pick_cards WHERE id=$1',[d.id])).rows[0];assert(card.immutable);assert.equal(card.payload.type,'INITIAL');assert.equal(card.payload.analysisDate,'2026-10-28');assert.equal(card.payload.oddsTimestamp,'2026-10-28T18:25:00Z');assert.deepEqual((await c.query("SELECT payload FROM pick_cards WHERE id='original'")).rows[0].payload,old);
  const rows=(await c.query('SELECT payload FROM pick_versions ORDER BY ordinal')).rows.map(r=>r.payload);assert.equal(rows.length,14);
  for(let i=0;i<14;i++){const p=rows[i],r=d.games[i];assert.equal(p.team,r.team);assert.equal(p.spread,r.spread);assert.equal(p.confidence,r.confidence);assert.equal(p.classification,r.classification);assert.equal(p.analysisTimestamp,null);assert.equal(p.oddsTimestamp,d.oddsTimestamp);assert(p.recordedAt>d.oddsTimestamp);assert(p.isLocked);assert(p.historicalImport);}
  assert.equal((await c.query('SELECT count(*)::int AS n FROM actual_bets')).rows[0].n,0);assert.equal((await c.query('SELECT count(*)::int AS n FROM pick_results')).rows[0].n,0);
  const before=(await c.query("SELECT payload,version FROM dashboard WHERE id='main'")).rows[0];assert.equal(await importInitialCard(c,d),'already imported');assert.deepEqual((await c.query("SELECT payload,version FROM dashboard WHERE id='main'")).rows[0],before);
  const changed=structuredClone(d);changed.games[0].spread=-4;await assert.rejects(importInitialCard(c,changed),/already exists/);assert.deepEqual((await c.query("SELECT payload,version FROM dashboard WHERE id='main'")).rows[0],before);
  await assert.rejects(c.query("UPDATE pick_versions SET pick_spread=0 WHERE pick_card_id=$1",[d.id]),/immutable/);await assert.rejects(c.query('UPDATE pick_cards SET immutable=false WHERE id=$1',[d.id]),/immutable/);
 }finally{await c.end();await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.end();}
});
