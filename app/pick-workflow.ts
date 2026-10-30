import {type HistoryState,type EventGame,type ProviderEvent,type PickVersion,type Card,eventDate,recalculate} from './history';
import {applyProviderEvents} from './score-service';
export const pickClasses=['Best Bet','Play','Lean','Conditional','Pass','Avoid'] as const;
export type ModelInput={gameId:string;away:string;home:string;kickoff:string;homeSpread:number;awaySpread:number;bookmaker:string;checkedAt:string};
export type ModelPick={gameId:string;team:string;confidence:number;classification:string;rationale:string};
export function validateWeek(season:unknown,week:unknown){if(!Number.isInteger(season)||Number(season)<2000||Number(season)>2100||!Number.isInteger(week)||Number(week)<1||Number(week)>18)throw Error('Choose a valid season and regular-season week (1–18).');}
export function editable(g:EventGame,now=Date.now()){return !!g.kickoff&&Number.isFinite(Date.parse(g.kickoff))&&Date.parse(g.kickoff)>now&&!['Complete','In progress'].includes(g.status)&&g.providerState!=='in'&&g.providerState!=='post';}
export function syncWeek(s:HistoryState,events:ProviderEvent[],season:number,week:number,now:string){
 validateWeek(season,week);
 for(const e of events){
  if(e.season!==season||e.week!==week)throw Error('Schedule does not match the requested week.');
  const existing=s.eventGames.find(g=>g.externalId===e.externalId)||s.eventGames.find(g=>g.season===season&&g.week===week&&g.away===e.away&&g.home===e.home&&g.date===eventDate(e.kickoff));
  if(existing){if(existing.season!==season||existing.week!==week||existing.away!==e.away||existing.home!==e.home)throw Error('Provider game identity changed. Existing picks were preserved.');if(existing.kickoff&&Date.parse(existing.kickoff)!==Date.parse(e.kickoff)&&s.pickVersions.some(p=>p.gameId===existing.id))throw Error('A saved game has a changed kickoff. Review the schedule before generating.');}
  else s.eventGames.push({id:'espn:'+e.externalId,season,week,date:eventDate(e.kickoff),away:e.away,home:e.home,kickoff:e.kickoff,externalId:e.externalId,status:'Pending',awayScore:null,homeScore:null,completedAt:null,officialVersionId:null,context:{currentSpread:null,closingSpread:null}});
 }
 const applied=applyProviderEvents(s,events,now);if(applied.conflicts.length)throw Error(applied.conflicts.join(' '));
 s.meta.weeks=[...new Set([...(s.meta.weeks||[]),week])].sort((a,b)=>a-b);
 if(!(s.meta.cards||[]).some((c:any)=>c.season===season&&c.week===week))s.meta.cards=[...(s.meta.cards||[]),{season,week}];
 return applied;
}
export function modelInputs(s:HistoryState,season:number,week:number,now:string):ModelInput[]{return s.eventGames.filter(g=>g.season===season&&g.week===week&&editable(g,Date.parse(now))&&g.market&&Date.parse(now)-Date.parse(g.market.checkedAt)<=600000).map(g=>({gameId:g.id,away:g.away,home:g.home,kickoff:g.kickoff!,homeSpread:g.market!.homeSpread,awaySpread:g.market!.awaySpread,bookmaker:g.market!.bookmaker,checkedAt:g.market!.checkedAt}));}
export function validateModelPicks(value:unknown,inputs:ModelInput[]):ModelPick[]{
 const rows=(value as any)?.picks;if(!Array.isArray(rows)||rows.length!==inputs.length||new Set(rows.map(r=>r?.gameId)).size!==inputs.length)throw Error('The model did not return one valid pick per eligible game. Nothing was saved.');
 for(const r of rows){const g=inputs.find(g=>g.gameId===r.gameId);if(!g||![g.home,g.away].includes(r.team)||!Number.isFinite(r.confidence)||r.confidence<1||r.confidence>10||r.confidence*2%1!==0||!pickClasses.includes(r.classification)||typeof r.rationale!=='string'||!r.rationale.trim()||r.rationale.length>2400)throw Error('The model returned an invalid pick. Nothing was saved.');}
 return rows.map(r=>({gameId:r.gameId,team:r.team,confidence:r.confidence,classification:r.classification,rationale:r.rationale.trim()}));
}
function newCard(s:HistoryState,season:number,week:number,now:string,label:string,origin:'llm'|'manual'):Card {
 const hasVersions=s.pickVersions.some(p=>s.eventGames.some(g=>g.id===p.gameId&&g.season===season&&g.week===week));
 const empty=s.pickCards.find(c=>c.season===season&&c.week===week&&c.type==='INITIAL'&&!c.immutable&&!s.pickVersions.some(p=>p.cardId===c.id));
 const c:Card=empty&&!hasVersions?empty:{id:crypto.randomUUID(),season,week,type:hasVersions?'REVISION':'INITIAL',label,analysisDate:eventDate(now),createdAt:now,finalizedAt:now,immutable:true,status:'Final'};
 Object.assign(c,{label,analysisDate:eventDate(now),finalizedAt:now,immutable:true,status:'Final',origin});
 if(!s.pickCards.some(p=>p.id===c.id))s.pickCards.push(c);return c;
}
export function saveModelPicks(s:HistoryState,inputs:ModelInput[],rows:ModelPick[],season:number,week:number,now:string,run:{id:string;model:string;responseId:string}){
 const eligible=rows.filter(r=>{const g=s.eventGames.find(g=>g.id===r.gameId);return g&&editable(g,Date.parse(now));});
 if(!eligible.length)throw Error('All eligible games have started. No predictions were saved.');
 const card=newCard(s,season,week,now,'AI picks · '+eventDate(now),'llm');let retained=0;
 for(const r of eligible){const g=s.eventGames.find(g=>g.id===r.gameId)!,quote=inputs.find(i=>i.gameId===r.gameId)!;const spread=r.team===g.home?quote.homeSpread:quote.awaySpread;
  const p:PickVersion={id:crypto.randomUUID(),gameId:g.id,cardId:card.id,team:r.team,spread,confidence:r.confidence,classification:r.classification,analysisDate:eventDate(now),analysisTimestamp:now,rationale:r.rationale,revisionReason:'Generated inside the app from fetched pregame lines',notes:'AI assessment based on schedule and sportsbook lines only; no verified injury or weather feed. Confidence is a model assessment, not a calibrated win probability.',recordedAt:now,isLocked:true,conditionalActive:false,origin:'llm',model:run.model,runId:run.id,responseId:run.responseId,oddsSource:'ESPN · '+quote.bookmaker,oddsTimestamp:quote.checkedAt,kickoffTimestamp:quote.kickoff};
  s.pickVersions.push(p);const prior=s.pickVersions.find(p=>p.id===g.officialVersionId);if(prior?.origin==='manual')retained++;else g.officialVersionId=p.id;
 }
 recalculate(s,now);return {cardId:card.id,saved:eligible.length,skipped:rows.length-eligible.length,retainedOverrides:retained};
}
export function saveManualPick(s:HistoryState,d:{gameId:string;team:string;spread:number;confidence:number|null;classification:string;rationale:string;reason:string;conditionalActive?:boolean},now:string){
 const g=s.eventGames.find(g=>g.id===d.gameId);if(!g||!editable(g,Date.parse(now)))throw Error('This game is locked at kickoff. Saved predictions cannot be changed.');
 if(![g.away,g.home].includes(d.team)||!Number.isFinite(d.spread)||Math.abs(d.spread)>100||d.spread*2%1!==0||!(d.confidence===null||Number.isFinite(d.confidence)&&d.confidence>=1&&d.confidence<=10)||!pickClasses.includes(d.classification as any)||typeof d.rationale!=='string'||d.rationale.length>2400||typeof d.reason!=='string'||!d.reason.trim()||d.reason.length>1200)throw Error('Check the pick, spread, confidence, classification and override reason.');
 const prior=s.pickVersions.find(p=>p.id===g.officialVersionId),ai=s.pickVersions.filter(p=>p.gameId===g.id&&p.origin==='llm').at(-1),card=newCard(s,g.season,g.week,now,prior?'Manual override · '+eventDate(now):'Manual picks · '+eventDate(now),'manual');
 const p:PickVersion={id:crypto.randomUUID(),gameId:g.id,cardId:card.id,team:d.team,spread:d.spread,confidence:d.confidence,classification:d.classification,analysisDate:eventDate(now),analysisTimestamp:now,rationale:d.rationale.trim(),revisionReason:d.reason.trim(),notes:'Saved manually in the app. No actual wager implied.',recordedAt:now,isLocked:true,conditionalActive:d.classification==='Conditional'&&d.conditionalActive===true,origin:'manual',supersedesId:prior?.id||null,overrideOf:ai?.id||null,oddsSource:'Manually entered pick line',oddsTimestamp:null,kickoffTimestamp:g.kickoff};
 s.pickVersions.push(p);g.officialVersionId=p.id;return p;
}
