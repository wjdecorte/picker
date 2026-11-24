import {randomUUID} from 'node:crypto';
import {getPool} from '../db/client';
import {loadState,saveState} from './repository';
import {retrieveWeek} from './score-service';
import {generationConfig} from './llm';
import {syncSeason} from './pick-workflow';
import {generateWeek,type GenerateRequest,type GenerateResult} from './generate';
import {defaultWeek,missingWeeks,nflSeason} from './season';
import {dueSlot,upcomingSlots,type SlotRecord} from './pick-schedule';

const tickMs=5*60000,seasonRetryMs=3600000;
export function schedulerEnabled(env=process.env){return env.AUTO_PICKS!=='false'&&(env.NODE_ENV==='production'||env.AUTO_PICKS==='true');}

type Deps={generate:(d:GenerateRequest)=>Promise<GenerateResult>;configured:()=>Promise<boolean>;retrieve:typeof retrieveWeek};
const defaults:Deps={generate:generateWeek,configured:async()=>(await generationConfig()).configured,retrieve:retrieveWeek};
let lastSeasonLoad=0;

async function records(season:number){
 const rows=(await getPool().query('SELECT slot,status,attempts,updated_at FROM scheduled_runs WHERE season=$1',[season])).rows;
 return new Map<string,SlotRecord>(rows.map(r=>[r.slot,{status:r.status,attempts:r.attempts,updatedAt:new Date(r.updated_at).getTime()}]));
}
async function manualRuns(season:number){
 // Completed generations that the schedule did not start, by week.
 const rows=(await getPool().query("SELECT week,created_at FROM model_runs WHERE season=$1 AND status='completed' AND id NOT IN (SELECT run_id FROM scheduled_runs WHERE run_id IS NOT NULL)",[season])).rows;
 const out=new Map<number,number[]>();for(const r of rows)out.set(r.week,[...(out.get(r.week)||[]),new Date(r.created_at).getTime()]);return out;
}
async function record(slot:{id:string;season:number;week:number;kind:string;runAt:number},status:string,message:string,runId:string|null,attempt:boolean,now:number){
 await getPool().query(`INSERT INTO scheduled_runs(slot,season,week,kind,run_at,status,attempts,run_id,message,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
  ON CONFLICT(slot) DO UPDATE SET status=$6,attempts=scheduled_runs.attempts+$7,run_id=COALESCE($8,scheduled_runs.run_id),message=$9,run_at=$5,updated_at=$10`,[slot.id,slot.season,slot.week,slot.kind,new Date(slot.runAt).toISOString(),status,attempt?1:0,runId,message.slice(0,500),new Date(now).toISOString()]);
}

// One pass: make sure the season is loaded, then run at most one due slot.
export async function schedulerTick(now=Date.now(),deps:Deps=defaults){
 const client=await getPool().connect();let held=false;
 try{
  held=(await client.query("SELECT pg_try_advisory_lock(hashtext('picker:scheduler')) AS locked")).rows[0].locked;if(!held)return null;
  const season=nflSeason(now);let s=await loadState();
  if(missingWeeks(s.eventGames,season).length&&now-lastSeasonLoad>seasonRetryMs){
   lastSeasonLoad=now;const r=await syncSeason(s,season,deps.retrieve,new Date(now).toISOString());
   if(r.loaded.length&&await saveState(r.state,s.version))s=await loadState();
  }
  const week=defaultWeek(s.eventGames,season,now);if(!week)return null;
  const decision=dueSlot(upcomingSlots(s.eventGames,season,week,now),await records(season),await manualRuns(season),now);if(!decision)return null;
  const {slot}=decision;
  if(decision.action==='manual'){await record(slot,'manual','Picks were generated from the dashboard inside this window.',null,false,now);return {slot:slot.id,status:'manual'};}
  if(!await deps.configured()){await record(slot,'failed','Model is not connected. Connect ChatGPT or add an API key in Settings.',null,true,now);return {slot:slot.id,status:'failed'};}
  const requestId=randomUUID();await record(slot,'running','Generating picks.',requestId,true,now);
  const r=await deps.generate({season:slot.season,week:slot.week,requestId});
  const ok=r.status===200,g=r.body?.generation;
  const message=ok?`Saved ${g?.saved??0} picks${g?.retainedOverrides?`; kept ${g.retainedOverrides} manual override${g.retainedOverrides===1?'':'s'}`:''}.`:String(r.body?.error||'Generation failed.');
  await record(slot,ok?'completed':'failed',message,requestId,false,now);
  console.log(`[picker] scheduled ${slot.kind} picks for ${slot.season} week ${slot.week}: ${message}`);
  return {slot:slot.id,status:ok?'completed':'failed'};
 }finally{try{if(held)await client.query("SELECT pg_advisory_unlock(hashtext('picker:scheduler'))");}finally{client.release();}}
}

const g=globalThis as typeof globalThis&{pickerScheduler?:NodeJS.Timeout};
export function startScheduler(){
 if(g.pickerScheduler)return;
 const tick=()=>schedulerTick().catch(e=>console.error('[picker] pick schedule failed:',e?.message||e));
 g.pickerScheduler=setInterval(tick,tickMs);g.pickerScheduler.unref?.();setTimeout(tick,30000).unref?.();
 console.log('[picker] automatic pick updates enabled');
}

// What Settings shows: the next run and the latest outcome.
export async function scheduleStatus(now=Date.now()){
 const enabled=schedulerEnabled();
 try{
  const s=await loadState(),season=nflSeason(now),week=defaultWeek(s.eventGames,season,now);
  const done=await records(season);
  const next=week?upcomingSlots(s.eventGames,season,week,now).find(x=>x.runAt>now||!['completed','manual'].includes(done.get(x.id)?.status||''))||null:null;
  const last=(await getPool().query('SELECT slot,week,kind,status,message,updated_at FROM scheduled_runs ORDER BY updated_at DESC LIMIT 1')).rows[0];
  return {enabled,next:next&&{week:next.week,kind:next.kind,runAt:new Date(next.runAt).toISOString(),kickoff:new Date(next.kickoff).toISOString()},last:last?{week:last.week,kind:last.kind,status:last.status,message:last.message,at:new Date(last.updated_at).toISOString()}:null};
 }catch{return {enabled,next:null,last:null};}
}
