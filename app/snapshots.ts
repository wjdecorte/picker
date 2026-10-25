import {type Card,type EventGame,type HistoryState,type PickVersion,type ProviderEvent,eventDate} from './history';
export type Proposal={gameId:string;team:string;spread:number;confidence:number|null;classification:string;rationale:string;reportedStatus?:string};
export type SnapshotEvidence={originalVersionId:string;originalSpread:number;revisedSpread:number;kickoffTimestamp:string;oddsTimestamp:null;oddsSource:string;validationTimestamp:string;validationSource:string;observedMarket:{homeSpread:number;awaySpread:number;bookmaker:string}|null};
export type SnapshotAudit={kind:'ats-snapshot';label:string;source:'User-supplied historical proposals';oddsTimestamp:null;oddsSource:string;validatedAt:string;validationSource:string;proposals:(Proposal&{eligible:boolean;exclusionReason:string|null;kickoff:string;verifiedStatus:string;awayScore:number|null;homeScore:number|null})[]};
export const proposalSource='User-supplied historical proposal; quoted odds and original odds timestamp unverified';
export function snapshotAudit(c:Card,versions:PickVersion[]=[]):SnapshotAudit|null {try{const v=JSON.parse(c.reason||'null');if(v?.kind==='ats-snapshot')return v;}catch{}for(const p of versions.filter(p=>p.cardId===c.id)){try{const a=JSON.parse(p.notes)?.snapshotAudit;if(a?.kind==='ats-snapshot')return a;}catch{}}return null;}
export function snapshotLabel(c:Card,versions:PickVersion[]=[]){return snapshotAudit(c,versions)?.label||c.label;}
export function snapshotEvidence(p:PickVersion):SnapshotEvidence|null {if(p.snapshotEvidence)return p.snapshotEvidence;try{const n=JSON.parse(p.notes);return n?.snapshotEvidence||null;}catch{return null;}}
export function validateProposals(s:HistoryState,season:number,week:number,rows:Proposal[],events:ProviderEvent[],now:string,label:string):SnapshotAudit {
 if(!Number.isFinite(Date.parse(now)))throw Error('Invalid snapshot timestamp');
 if(!Number.isInteger(season)||!Number.isInteger(week)||!Array.isArray(rows)||!rows.length||rows.length>32||!label?.trim()||label.length>120)throw Error('Supply season, week, label and 1–32 proposals.');
 if(new Set(rows.map(r=>r.gameId)).size!==rows.length)throw Error('Duplicate proposed game IDs.');
 const proposals=rows.map(r=>{
  const g=s.eventGames.find(g=>g.id===r.gameId&&g.season===season&&g.week===week);
  if(!g||![g.home,g.away].includes(r.team)||!Number.isFinite(r.spread)||Math.abs(r.spread)>100||!(r.confidence===null||(Number.isFinite(r.confidence)&&r.confidence>=1&&r.confidence<=10))||!['Best Bet','Play','Pick','Lean','Conditional','Pass','Avoid','Locked'].includes(r.classification)||typeof r.rationale!=='string'||r.rationale.length>10000)throw Error('Invalid proposal fields or game identity.');
  const original=s.pickVersions.find(p=>p.gameId===g.id&&s.pickCards.some(c=>c.id===p.cardId&&c.type==='INITIAL'));
  if(!original)throw Error('Every recheck requires an original saved selection.');
  const matches=events.filter(e=>e.externalId===g.externalId&&e.season===season&&e.week===week&&e.home===g.home&&e.away===g.away&&eventDate(e.kickoff)===g.date);
  if(matches.length!==1||!g.kickoff||Date.parse(matches[0].kickoff)!==Date.parse(g.kickoff))throw Error('Kickoff or provider identity could not be validated. Refresh the schedule before saving.');
  const e=matches[0];if(g.status==='Complete'&&(!e.complete||g.awayScore!==e.awayScore||g.homeScore!==e.homeScore))throw Error('Stored final differs from verified provider final. Review scores first.');
  const eligible=e.state==='pre'&&!e.complete&&g.status!=='Complete'&&g.status!=='In progress'&&Date.parse(e.kickoff)>Date.parse(now)&&r.classification!=='Locked';
  return {...r,eligible,exclusionReason:eligible?null:r.classification==='Locked'?'Supplied as locked; original retained':'Kickoff passed, game underway or final; original retained',kickoff:e.kickoff,verifiedStatus:e.complete?'Final':e.state==='in'?'In progress':'Pregame',awayScore:e.awayScore,homeScore:e.homeScore};
 });
 return {kind:'ats-snapshot',label:label.trim(),source:'User-supplied historical proposals',oddsTimestamp:null,oddsSource:proposalSource,validatedAt:now,validationSource:'ESPN scoreboard · season/week, event ID, teams, kickoff and final scores checked',proposals};
}
export function evidenceFor(s:HistoryState,r:Proposal,e:ProviderEvent,now:string):SnapshotEvidence {
 const original=s.pickVersions.find(p=>p.gameId===r.gameId&&s.pickCards.some(c=>c.id===p.cardId&&c.type==='INITIAL'))!;
 return {originalVersionId:original.id,originalSpread:original.spread,revisedSpread:r.spread,kickoffTimestamp:e.kickoff,oddsTimestamp:null,oddsSource:proposalSource,validationTimestamp:now,validationSource:'ESPN scoreboard',observedMarket:e.market||null};
}
export function addSnapshot(s:HistoryState,season:number,week:number,rows:Proposal[],events:ProviderEvent[],now:string,label:string,id:string){
 const audit=validateProposals(s,season,week,rows,events,now,label);
 if(s.pickCards.some(c=>c.id===id))throw Error('Snapshot already exists.');
 const card:Card={id,season,week,type:'REVISION',label:audit.label,analysisDate:eventDate(now),createdAt:now,finalizedAt:now,immutable:true,status:'Historical',reason:JSON.stringify(audit)};
 s.pickCards.push(card);
 for(const r of audit.proposals.filter(p=>p.eligible)){
  const e=events.find(e=>e.externalId===s.eventGames.find(g=>g.id===r.gameId)!.externalId)!;
  s.pickVersions.push({id:crypto.randomUUID(),cardId:id,gameId:r.gameId,team:r.team,spread:r.spread,confidence:r.confidence,classification:r.classification,rationale:r.rationale,analysisDate:eventDate(now),analysisTimestamp:now,recordedAt:now,isLocked:true,revisionReason:'Separate historical proposed recheck; original snapshot preserved',notes:'Historical proposed selection; not verified current odds or an actual wager.',snapshotEvidence:evidenceFor(s,r,e,now)});
 }
 // A comparison snapshot does not replace the official card or any wager.
 return card;
}
