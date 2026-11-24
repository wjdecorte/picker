import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import {spawnSync} from 'node:child_process';
import {getPool,closeDatabase} from '../db/client.ts';
import {loadState} from '../app/repository.ts';
import {schedulerTick,schedulerEnabled} from '../app/scheduler.ts';
const base=process.env.DATABASE_URL;
test('scheduler is on in production unless AUTO_PICKS=false, and opt-in elsewhere',()=>{
 assert.equal(schedulerEnabled({NODE_ENV:'production'}),true);assert.equal(schedulerEnabled({NODE_ENV:'production',AUTO_PICKS:'false'}),false);
 assert.equal(schedulerEnabled({NODE_ENV:'development'}),false);assert.equal(schedulerEnabled({NODE_ENV:'development',AUTO_PICKS:'true'}),true);
});
test('scheduler loads the season, runs each slot once, retries failures and respects manual generations',{skip:!base},async()=>{
 const admin=new pg.Client({connectionString:base});await admin.connect();const schema='scheduler_test_'+Date.now();await admin.query(`CREATE SCHEMA ${schema}`);const url=new URL(base);url.searchParams.set('options','-c search_path='+schema);const old=process.env.DATABASE_URL;process.env.DATABASE_URL=url.href;
 try{
  const migration=spawnSync(process.execPath,['scripts/migrate.mjs'],{env:process.env,encoding:'utf8'});assert.equal(migration.status,0,migration.stderr);
  const teams=[['Buffalo Bills','Kansas City Chiefs'],['Detroit Lions','Chicago Bears'],['Miami Dolphins','New York Jets']];
  const retrieve=async(season,week)=>{const day=new Date(Date.UTC(2026,8,10)+(week-1)*7*86400000);const done=week<12;
   return week===12?[{externalId:'t',season,week,away:teams[1][0],home:teams[1][1],kickoff:'2026-11-26T17:30:00Z',complete:false,awayScore:null,homeScore:null,state:'pre'},{externalId:'s',season,week,away:teams[2][0],home:teams[2][1],kickoff:'2026-11-29T18:00:00Z',complete:false,awayScore:null,homeScore:null,state:'pre'}]
    :[{externalId:'w'+week,season,week,away:teams[0][0],home:teams[0][1],kickoff:day.toISOString(),complete:done,awayScore:done?20:null,homeScore:done?17:null,state:done?'post':'pre'}];};
  const calls=[];let fail=false;const deps={retrieve,configured:async()=>true,generate:async d=>{calls.push(d);return fail?{status:400,body:{error:'Model unavailable'}}:{status:200,body:{generation:{saved:2,retainedOverrides:1}}};}};
  const rows=async()=>(await getPool().query('SELECT slot,status,attempts,message FROM scheduled_runs ORDER BY slot')).rows;
  assert.equal(await schedulerTick(Date.parse('2026-11-24T12:00:00Z'),deps),null);
  const loaded=(await loadState()).eventGames.filter(g=>g.season===2026);assert.equal(new Set(loaded.map(g=>g.week)).size,18);assert.equal(loaded.filter(g=>g.week===12).length,2);assert.equal(calls.length,0);
  assert.deepEqual(await schedulerTick(Date.parse('2026-11-26T14:31:00Z'),deps),{slot:'2026-12-week-start',status:'completed'});
  assert.deepEqual([calls.length,calls[0].season,calls[0].week,calls[0].version],[1,2026,12,undefined]);
  assert.equal(await schedulerTick(Date.parse('2026-11-26T15:00:00Z'),deps),null);
  assert.deepEqual(await rows(),[{slot:'2026-12-week-start',status:'completed',attempts:1,message:'Saved 2 picks; kept 1 manual override.'}]);
  fail=true;assert.deepEqual(await schedulerTick(Date.parse('2026-11-29T16:00:00Z'),deps),{slot:'2026-12-sunday',status:'failed'});
  assert.equal(await schedulerTick(Date.parse('2026-11-29T16:10:00Z'),deps),null);
  fail=false;assert.deepEqual(await schedulerTick(Date.parse('2026-11-29T16:20:00Z'),deps),{slot:'2026-12-sunday',status:'completed'});
  assert.deepEqual((await rows()).find(r=>r.slot==='2026-12-sunday'),{slot:'2026-12-sunday',status:'completed',attempts:2,message:'Saved 2 picks; kept 1 manual override.'});
  // A Generate click inside the window counts; the schedule does not make a duplicate card.
  await getPool().query("DELETE FROM scheduled_runs WHERE slot='2026-12-sunday'");
  await getPool().query("INSERT INTO model_runs(id,season,week,status,model,created_at) VALUES($1,2026,12,'completed','qa','2026-11-29T16:05:00Z')",[crypto.randomUUID()]);
  assert.deepEqual(await schedulerTick(Date.parse('2026-11-29T16:30:00Z'),deps),{slot:'2026-12-sunday',status:'manual'});assert.equal(calls.length,3);
  // Not connected: recorded as a failed attempt without calling the model.
  await getPool().query("DELETE FROM scheduled_runs");await getPool().query("DELETE FROM model_runs");
  assert.deepEqual(await schedulerTick(Date.parse('2026-11-26T15:00:00Z'),{...deps,configured:async()=>false}),{slot:'2026-12-week-start',status:'failed'});assert.equal(calls.length,3);
  assert.match((await rows())[0].message,/not connected/);
 }finally{await closeDatabase();process.env.DATABASE_URL=old;await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.end();}
});
