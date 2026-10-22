export type Revision = {at:string|null;pick:string;spread:number;revisedPick?:string;revisedSpread?:number;reason?:string;confidence?:number|null;classification?:string;pickTimestamp?:string|null};
export type Bet={placed:boolean;team?:string;sportsbook:string;line:number|null;odds:number;stake:number;placedAt?:string|null};
export type Game = { id:string; season:number; week:number; date:string; time:string; away:string; home:string; pick:string; spread:number; confidence:number|null; classification:string; awayScore:number|null; homeScore:number|null; status:string; currentSpread:number|null; closingSpread:number|null; pickTimestamp:string|null; rationale:string; injuryNotes:string; weatherNotes:string; lineNotes:string; notes:string; originalPick:string; originalTeam?:string; originalSpread?:number; revisions:Revision[]; conditionalActive?:boolean; bet?:Bet; spreadsCheckedAt?:string|null; injuriesCheckedAt?:string|null; weatherCheckedAt?:string|null; scoresCheckedAt?:string|null; changeTypes?:string[]; officialVersionId?:string|null; analysisDate?:string|null; adminUnlocked?:boolean;lockEvents?:{action:string;at:string;reason:string}[] };
export const classes=['Best Bet','Play','Pick','Lean','Conditional','Pass','Avoid','Lean/Avoid'];
export const categories=['All Picks','Recommended Plays','Best Bets','Actual Bets'] as const;
export type Category=typeof categories[number];
export function normalizeGame(raw:Game):Game {const g={...raw,revisions:[...(raw.revisions||[])]};if(g.originalTeam===undefined){const first=g.revisions[0];g.originalTeam=first?.pick||g.pick;g.originalSpread=first?.spread??g.spread;
// The workbook provides this prior selection, but no exact change timestamp or reason.
if(g.notes==='Changed from WAS -3.5 on Thursday.'&&!first){g.originalTeam='Washington Commanders';g.originalSpread=-3.5;g.revisions=[{at:null,pick:'Washington Commanders',spread:-3.5,revisedPick:g.pick,revisedSpread:g.spread,reason:'Not recorded in workbook. Source note: Changed from WAS -3.5 on Thursday.'}];}}
if(g.bet?.placed&&!g.bet.team)g.bet={...g.bet,team:g.pick};return g;}
export function grade(g:Game,team=g.pick,line=g.spread){if(g.status!=='Complete'||g.awayScore===null||g.homeScore===null)return {result:'Pending',margin:null};const margin=(team===g.away?g.awayScore-g.homeScore:g.homeScore-g.awayScore)+line;return {result:margin>0?'Win':margin<0?'Loss':'Push',margin};}
export function recommended(g:Game){return ['Best Bet','Play','Pick'].includes(g.classification)||(g.classification==='Conditional'&&g.conditionalActive===true);}
export function selectCategory(gs:Game[],category:Category){return gs.filter(g=>category==='All Picks'||category==='Recommended Plays'&&recommended(g)||category==='Best Bets'&&g.classification==='Best Bet'||category==='Actual Bets'&&g.bet?.placed);}
export function potentialWin(b:Bet){return b.odds>0?b.stake*b.odds/100:b.stake*100/Math.abs(b.odds);}
export function betGrade(g:Game){if(!g.bet?.placed||g.bet.line===null)return {result:'Pending',margin:null};return grade(g,g.bet.team||g.pick,g.bet.line);}
export function betProfit(g:Game){if(!g.bet?.placed)return null;const r=betGrade(g).result;return r==='Pending'?null:r==='Win'?potentialWin(g.bet):r==='Loss'?-g.bet.stake:0;}
export function stats(gs:Game[],_legacy?:boolean,actual=false){let w=0,l=0,p=0,units=0;for(const g of gs){const {result}=actual?betGrade(g):grade(g);if(result==='Win')w++;if(result==='Loss')l++;if(result==='Push')p++;if(actual)units+=betProfit(g)??0;else if(recommended(g)){if(result==='Win')units+=1/1.1;if(result==='Loss')units-=1;}}return {w,l,p,record:`${w}–${l}${p?'–'+p:''}`,pct:w+l?w/(w+l)*100:null,units};}
export function categoryStats(gs:Game[],c:Category){return stats(selectCategory(gs,c),true,c==='Actual Bets');}
export function clv(g:Game){return g.closingSpread===null?null:g.spread-g.closingSpread;}
export function movement(g:Game){const value=g.currentSpread===null?null:g.currentSpread-g.spread;return {value,label:value===null?'Not checked':value>0?'Better':value<0?'Worse':'No change'};}
export function signed(n:number|null|undefined){return n===null||n===undefined?'—':n>0?`+${n}`:String(n);}
export function etTime(value:string|null|undefined){return value?new Date(value).toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})+' ET':'Not recorded';}
export function kickoffMs(g:Game){if(!g.time)return null;const desired=Date.parse(g.date+'T'+g.time+':00Z');if(!Number.isFinite(desired))return null;let guess=desired;for(let i=0;i<3;i++){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(guess));const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));const actual=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);guess+=desired-actual;}return guess;}
export function isLocked(g:Game,now=Date.now()){return !g.adminUnlocked&&(g.status==='Complete'||g.status==='Locked'||g.status==='In progress'||(kickoffMs(g)!==null&&kickoffMs(g)!<=now));}
export function displayStatus(g:Game,now=Date.now()){return g.status==='Complete'?'Final':isLocked(g,now)?'Locked':'Pending';}
export const protectedFields=['season','week','date','time','away','home','pick','spread','confidence','classification','conditionalActive','pickTimestamp','rationale'] as const;
export function pickChanged(a:Game,b:Game){return a.pick!==b.pick||a.spread!==b.spread;}
export function changed(g:Game){return !!g.changeTypes?.some(t=>t!=='UNCHANGED')|| g.pick!==(g.originalTeam||g.pick)||g.spread!==(g.originalSpread??g.spread)||g.revisions.some(r=>r.pick!==(r.revisedPick||g.pick)||r.spread!==(r.revisedSpread??g.spread));}
export function originalGrade(g:Game){return grade(g,g.originalTeam||g.pick,g.originalSpread??g.spread);}
export function validGame(g:Game){const b=g.bet;return Number.isInteger(g.season)&&g.season>=2000&&Number.isInteger(g.week)&&g.week>=1&&g.week<=22&&/^\d{4}-\d{2}-\d{2}$/.test(g.date)&&(!g.time||/^\d{2}:\d{2}$/.test(g.time))&&!!g.away&&!!g.home&&g.away!==g.home&&[g.away,g.home].includes(g.pick)&&Number.isFinite(g.spread)&&(g.confidence===null||Number.isFinite(g.confidence)&&g.confidence>=1&&g.confidence<=10)&&classes.includes(g.classification)&&['Pending','Locked','In progress','Complete'].includes(g.status)&&[g.currentSpread,g.closingSpread].every(x=>x===null||Number.isFinite(x))&&[g.awayScore,g.homeScore].every(x=>x===null||Number.isInteger(x)&&x>=0)&&(g.status!=='Complete'||g.awayScore!==null&&g.homeScore!==null)&&(!b?.placed||(!b.team||[g.away,g.home].includes(b.team))&&Number.isFinite(b.line)&&Number.isFinite(b.odds)&&(b.odds<=-100||b.odds>=100)&&Number.isFinite(b.stake)&&b.stake>0);}

export type FeedKind='spreads'|'injuries'|'weather'|'scores';
export type FreshnessState='LIVE'|'UPDATED'|'MANUAL'|'STALE'|'NOT CHECKED';
export function freshness(gs:Game[],kind:FeedKind,now=Date.now(),connection={connected:false,live:false}){
 const stamp={spreads:'spreadsCheckedAt',injuries:'injuriesCheckedAt',weather:'weatherCheckedAt',scores:'scoresCheckedAt'}[kind] as 'spreadsCheckedAt'|'injuriesCheckedAt'|'weatherCheckedAt'|'scoresCheckedAt';
 const checked=gs.map(g=>g[stamp]).filter((s):s is string=>!!s&&Number.isFinite(Date.parse(s))).sort();const at=checked.at(-1)||null;
 const imported=kind==='scores'&&gs.some(g=>g.awayScore!==null&&g.homeScore!==null);
 if(!at)return {state:(imported?'MANUAL':'NOT CHECKED') as FreshnessState,label:imported?'Manual':'Not checked',at,count:0,note:imported?'Imported scores · check time not recorded':'No recorded checks'};
 const minutes=Math.max(0,Math.floor((now-Date.parse(at))/60000));const threshold={spreads:360,injuries:1440,weather:720,scores:120}[kind];
 const state:FreshnessState=minutes>threshold?'STALE':connection.connected?(connection.live&&minutes<2?'LIVE':'UPDATED'):'MANUAL';
 const label=state==='UPDATED'?`Updated ${minutes} min ago`:state==='LIVE'?'Live':state==='STALE'?'Stale':'Manual';
 return {state,label,at,count:checked.length,note:connection.connected?'Automatic source':'Manual check'};
}
export function lineWatchRelevant(g:Game){return g.currentSpread!==null&&(g.classification==='Best Bet'||Math.abs(g.currentSpread-g.spread)>=0.5);}
