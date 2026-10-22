import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { bootstrap,officialGames,cardGames } from '../app/history.ts';
import { categoryStats } from '../app/model.ts';
import { getPool,closeDatabase } from '../db/client.ts';
import { loadState,saveState,responseData } from '../app/repository.ts';
import { PUT,POST } from '../app/api/data/route.ts';
const base=process.env.DATABASE_URL;
test('PostgreSQL migration, historical import, immutable snapshots, CAS, rollback, and staged edits', {skip:!base},async()=>{
 const admin=new pg.Client({connectionString:base});await admin.connect();
 const schema=`picker_test_${Date.now()}_${Math.random().toString(16).slice(2)}`;
 await admin.query(`CREATE SCHEMA ${schema}`);
 const url=new URL(base);url.searchParams.set('options',`-c search_path=${schema}`);process.env.DATABASE_URL=url.href;
 const script=(path,args=[])=>{const r=spawnSync(process.execPath,[path,...args],{env:process.env,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout;};
 const call=(fn,data)=>fn(new Request('http://127.0.0.1:3000/api/data',{method:fn===PUT?'PUT':'POST',body:JSON.stringify(data)}));
 const origin=process.env.APP_ORIGIN;process.env.APP_ORIGIN='http://127.0.0.1:3000';
 try {
  script('scripts/migrate.mjs');script('scripts/migrate.mjs');
  assert.equal((await getPool().query('SELECT * FROM schema_migrations')).rowCount,1);
  // Optional real legacy backup import; all runs also exercise a deterministic fresh bootstrap.
  if(process.env.TEST_LEGACY_EXPORT) {
   script('scripts/import-legacy.mjs',[process.env.TEST_LEGACY_EXPORT]);
   const original=JSON.parse(await readFile(process.env.TEST_LEGACY_EXPORT,'utf8'));
   let imported=await loadState();assert.equal(imported.eventGames.length,original.games.length);assert.equal(imported.pickVersions.length,original.pick_versions.length);assert.equal(imported.actualBets.length,original.actual_bets.length);
   for(const old of original.pick_versions)assert.deepEqual(imported.pickVersions.find(p=>p.id===old.id),JSON.parse(old.payload));
  }
  let s=await loadState();assert.equal(s.pickVersions.length,41);assert.equal(categoryStats(officialGames(s),'All Picks').record,'12–14');
  await assert.rejects(getPool().query('UPDATE pick_versions SET confidence=9 WHERE id=$1',[s.pickVersions[0].id]),/immutable/);
  await assert.rejects(getPool().query('DELETE FROM pick_versions WHERE id=$1',[s.pickVersions[0].id]),/immutable/);
  await assert.rejects(getPool().query("UPDATE pick_cards SET payload='{}' WHERE id=$1",['2026-w6-initial']),/immutable/);
  const a=structuredClone(s),b=structuredClone(s);a.meta.reviews.concurrent='a';b.meta.reviews.concurrent='b';const raced=await Promise.all([saveState(a,s.version),saveState(b,s.version)]);assert.equal(raced.filter(Boolean).length,1);
  s=await loadState();const version=s.version;const broken=structuredClone(s);broken.eventGames[0].awayScore=-1;await assert.rejects(saveState(broken,version));assert.equal((await loadState()).version,version);
  const locked=responseData(s);locked.games[0].spread--;assert.equal((await call(PUT,locked)).status,423);
  const event=s.eventGames.filter(g=>g.week===7).at(-1),template=officialGames(s)[0];let g={...template,id:event.id,season:2026,week:7,date:event.date,time:'20:15',away:event.away,home:event.home,pick:event.away,spread:3,confidence:6,classification:'Play',status:'Pending',awayScore:null,homeScore:null,bet:undefined,notes:'',rationale:'Initial fixture',originalPick:'',revisions:[],pickTimestamp:null};
  let body={...responseData(s),games:[...officialGames(s),g],editedGameId:g.id,pickCardId:'2026-w7-initial'};
  assert.equal((await call(PUT,body)).status,200);s=await loadState();const initialId=s.eventGames.find(x=>x.id===event.id).officialVersionId;
  assert.equal((await call(POST,{action:'copy-initial',cardId:'2026-w7-final',version:s.version})).status,200);s=await loadState();
  g={...officialGames(s).find(x=>x.id===g.id),pick:event.home,spread:-3,rationale:'Final fixture'};
  body={...responseData(s),games:officialGames(s).map(x=>x.id===g.id?g:x),editedGameId:g.id,pickCardId:'2026-w7-final',revisionReasons:{[g.id]:'Test new evidence'}};
  assert.equal((await call(PUT,body)).status,200);s=await loadState();assert.equal(s.eventGames.find(x=>x.id===g.id).officialVersionId,initialId);assert.equal(cardGames(s,'2026-w7-final')[0].pick,event.home);assert.equal(cardGames(s,'2026-w7-initial')[0].pick,event.away);
  assert.equal((await call(POST,{action:'finalize-card',cardId:'2026-w7-final',version:s.version})).status,200);s=await loadState();assert.equal(officialGames(s).find(x=>x.id===g.id).pick,event.home);assert.equal(s.eventGames.filter(x=>x.id===g.id).length,1);
 } finally {await closeDatabase();process.env.DATABASE_URL=base;if(origin===undefined)delete process.env.APP_ORIGIN;else process.env.APP_ORIGIN=origin;await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.end();}
});
