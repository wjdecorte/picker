import {createHash} from 'node:crypto';
import {parseCSV,teams} from './injuries';

// Season-to-date team results from the nflverse schedule file. Results and records are
// already priced into the market; this is context, not an edge.
export type ScheduleRow={gameId:string;season:number;week:number;date:string;away:string;home:string;awayScore:number|null;homeScore:number|null;spreadLine:number|null;awayRest:number|null;homeRest:number|null};
export type Split={wins:number;losses:number;ties:number};
export type AtsSplit={covers:number;failures:number;pushes:number;noLine:number};
export type TeamResult={week:number;date:string;opponent:string;home:boolean;pointsFor:number;pointsAgainst:number;line:number|null;coverMargin:number|null};
export type TeamForm={team:string;code:string;games:number;record:Split;home:Split;away:Split;pointsForPerGame:number|null;pointsAgainstPerGame:number|null;pointDiffPerGame:number|null;ats:AtsSplit;avgCoverMargin:number|null;last4:{record:Split;pointDiffPerGame:number|null;ats:AtsSplit};opponentPointDiffPerGame:number|null;restDays:number|null;recent:TeamResult[]};
type Base={source:'nflverse';sourceUrl:string;license:string;season:number;fetchedAt:string;publishedAt:string|null;sha256:string|null;status:'available'|'stale'|'unavailable';warning:string};
export type ScheduleEvidence=Base&{rows:ScheduleRow[]};
export type TeamFormEvidence=Base&{throughDate:string|null;teams:TeamForm[]};

const sourceUrl='https://github.com/nflverse/nflverse-data/releases/download/schedules/games.csv';
const license='https://creativecommons.org/licenses/by/4.0/';
const maxBytes=8000000;
const codes=new Set(Object.values(teams));
const round=(n:number)=>Math.round(n*10)/10;
const etDate=(iso:string)=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(iso));

export function parseSchedule(text:string,season:number):ScheduleRow[]{
 const [header,...rows]=parseCSV(text.replace(/^﻿/,''));
 const required=['game_id','season','game_type','week','gameday','away_team','away_score','home_team','home_score','spread_line','away_rest','home_rest'];
 if(!header||required.some(k=>!header.includes(k)))throw Error('Schedule schema changed');
 const num=(s:string)=>!s||s==='NA'?null:Number(s);
 const out:ScheduleRow[]=[];
 for(const row of rows){
  if(row.every(v=>!v))continue;if(row.length!==header.length)throw Error('Invalid schedule row');
  const v=Object.fromEntries(header.map((k,i)=>[k,row[i]]));if(Number(v.season)!==season||v.game_type!=='REG')continue;
  const week=Number(v.week),awayScore=num(v.away_score),homeScore=num(v.home_score),spreadLine=num(v.spread_line),awayRest=num(v.away_rest),homeRest=num(v.home_rest);
  if(!Number.isInteger(week)||week<1||week>18||!/^\d{4}-\d{2}-\d{2}$/.test(v.gameday)||!codes.has(v.away_team)||!codes.has(v.home_team)||v.away_team===v.home_team)throw Error('Invalid schedule identity');
  if((awayScore===null)!==(homeScore===null)||[awayScore,homeScore].some(x=>x!==null&&(!Number.isInteger(x)||x<0||x>150)))throw Error('Invalid schedule score');
  if(spreadLine!==null&&(!Number.isFinite(spreadLine)||Math.abs(spreadLine)>60))throw Error('Invalid schedule line');
  if([awayRest,homeRest].some(x=>x!==null&&(!Number.isInteger(x)||x<0||x>30)))throw Error('Invalid rest days');
  out.push({gameId:v.game_id,season,week,date:v.gameday,away:v.away_team,home:v.home_team,awayScore,homeScore,spreadLine,awayRest,homeRest});
 }
 return out;
}

const cache=new Map<string,{until:number;value:Promise<ScheduleEvidence>}>();
export async function loadSchedule(season:number,fetcher:typeof fetch=fetch,now=Date.now()):Promise<ScheduleEvidence>{
 if(!Number.isInteger(season)||season<2000||season>2100)throw Error('Invalid schedule season');
 const key=String(season),old=cache.get(key);if(fetcher===fetch&&old&&old.until>now)return old.value;
 const task=(async()=>{
  const base={source:'nflverse' as const,sourceUrl,license,season,fetchedAt:new Date(now).toISOString(),publishedAt:null as string|null,sha256:null as string|null};
  try{
   const meta=await fetcher('https://api.github.com/repos/nflverse/nflverse-data/releases/tags/schedules',{signal:AbortSignal.timeout(15000),cache:'no-store',headers:{Accept:'application/vnd.github+json'}});if(!meta.ok)throw Error();
   const asset=((await meta.json()) as {assets?:{name:string;size:number;updated_at:string}[]}).assets?.find(a=>a.name==='games.csv');
   if(!asset||asset.size>maxBytes||!Number.isFinite(Date.parse(asset.updated_at))||Date.parse(asset.updated_at)>now+300000)throw Error();
   base.publishedAt=asset.updated_at;
   const response=await fetcher(sourceUrl,{signal:AbortSignal.timeout(20000),cache:'no-store'});if(!response.ok)throw Error();
   const reader=response.body?.getReader();if(!reader)throw Error();let size=0;const chunks:Uint8Array[]=[];
   try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>maxBytes)throw Error();chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}
   const text=Buffer.concat(chunks).toString('utf8');base.sha256=createHash('sha256').update(text).digest('hex');
   const rows=parseSchedule(text,season),stale=now-Date.parse(base.publishedAt!)>36*3600000;
   return {...base,rows,status:!rows.length?'unavailable' as const:stale?'stale' as const:'available' as const,warning:!rows.length?'No schedule rows for this season.':stale?'Schedule file is over 36 hours old. Recent results may be missing.':'Season-to-date results from the nflverse schedule file.'};
  }catch{return {...base,rows:[],status:'unavailable' as const,warning:'Team results feed unavailable or failed validation. Team performance is unknown.'};}
 })();
 if(fetcher===fetch){if(cache.size>16)cache.clear();cache.set(key,{until:now+3600000,value:task});task.then(v=>{if(v.status==='unavailable')cache.set(key,{until:now+300000,value:task});});}
 return task;
}

const split=():Split=>({wins:0,losses:0,ties:0});
const atsSplit=():AtsSplit=>({covers:0,failures:0,pushes:0,noLine:0});
function results(rows:ScheduleRow[],code:string):TeamResult[]{
 return rows.filter(r=>r.away===code||r.home===code).sort((a,b)=>a.date.localeCompare(b.date)).map(r=>{
  const home=r.home===code,pf=(home?r.homeScore:r.awayScore)!,pa=(home?r.awayScore:r.homeScore)!;
  // nflverse spread_line is positive when the home team is favored.
  const line=r.spreadLine===null?null:home?-r.spreadLine:r.spreadLine;
  return {week:r.week,date:r.date,opponent:home?r.away:r.home,home,pointsFor:pf,pointsAgainst:pa,line,coverMargin:line===null?null:pf-pa+line};
 });
}
function tally(games:TeamResult[]){
 const record=split(),ats=atsSplit();
 for(const g of games){if(g.pointsFor>g.pointsAgainst)record.wins++;else if(g.pointsFor<g.pointsAgainst)record.losses++;else record.ties++;
  if(g.coverMargin===null)ats.noLine++;else if(g.coverMargin>0)ats.covers++;else if(g.coverMargin<0)ats.failures++;else ats.pushes++;}
 const diff=games.length?round(games.reduce((t,g)=>t+g.pointsFor-g.pointsAgainst,0)/games.length):null;
 return {record,ats,diff};
}
export function summarizeTeam(rows:ScheduleRow[],code:string,name:string,restDays:number|null):TeamForm{
 const games=results(rows,code),all=tally(games),last=tally(games.slice(-4));
 const lined=games.filter(g=>g.coverMargin!==null);
 const opponentDiff=(opp:string)=>tally(results(rows,opp)).diff;
 const opp=games.map(g=>opponentDiff(g.opponent)).filter((x):x is number=>x!==null);
 return {team:name,code,games:games.length,record:all.record,home:tally(games.filter(g=>g.home)).record,away:tally(games.filter(g=>!g.home)).record,
  pointsForPerGame:games.length?round(games.reduce((t,g)=>t+g.pointsFor,0)/games.length):null,
  pointsAgainstPerGame:games.length?round(games.reduce((t,g)=>t+g.pointsAgainst,0)/games.length):null,
  pointDiffPerGame:all.diff,ats:all.ats,avgCoverMargin:lined.length?round(lined.reduce((t,g)=>t+g.coverMargin!,0)/lined.length):null,
  last4:{record:last.record,pointDiffPerGame:last.diff,ats:last.ats},opponentPointDiffPerGame:opp.length?round(opp.reduce((a,b)=>a+b,0)/opp.length):null,
  restDays,recent:games.slice(-4)};
}

// Only completed games dated before the upcoming kickoff's ET date are used, so a
// recheck can never see results from the game being picked or anything after it.
export function gameTeamForm(e:ScheduleEvidence,away:string,home:string,kickoff:string):TeamFormEvidence{
 const {rows,...base}=e,awayCode=teams[away],homeCode=teams[home];
 const empty=(warning:string):TeamFormEvidence=>({...base,status:'unavailable',warning,throughDate:null,teams:[]});
 if(e.status==='unavailable')return empty(e.warning);
 if(!awayCode||!homeCode||!Number.isFinite(Date.parse(kickoff)))return empty('Team identity or kickoff unknown. Team performance is unknown.');
 const day=etDate(kickoff),done=rows.filter(r=>r.awayScore!==null&&r.homeScore!==null&&r.date<day);
 const upcoming=rows.find(r=>r.away===awayCode&&r.home===homeCode&&r.date===day);
 const forms=[summarizeTeam(done,awayCode,away,upcoming?.awayRest??null),summarizeTeam(done,homeCode,home,upcoming?.homeRest??null)];
 if(forms.some(f=>!f.games))return {...empty('No completed games yet for at least one team. Team performance is unknown.'),teams:forms};
 const through=done.filter(r=>[awayCode,homeCode].includes(r.away)||[awayCode,homeCode].includes(r.home)).map(r=>r.date).sort().at(-1)||null;
 return {...base,throughDate:through,teams:forms,warning:e.warning+' Lines are nflverse-reported lines, not the app’s sportsbook quotes. The market already prices these results; single-season samples are small. Results only, no efficiency statistics.'+(upcoming?'':' Matchup not found in the nflverse schedule; rest days unknown.')};
}
