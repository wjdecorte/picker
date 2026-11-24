// Client-safe helpers for choosing the season and week to show by default.
type ScheduledGame={season:number;week:number;date:string;kickoff:string|null;status:string};
export const regularSeasonWeeks=18;

// The NFL season is named for the year it starts; January and February games belong to the prior season.
export function nflSeason(now=Date.now()){const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'numeric'}).formatToParts(new Date(now)).map(x=>[x.type,x.value]));return Number(p.month)>=3?Number(p.year):Number(p.year)-1;}

const startMs=(g:ScheduledGame)=>g.kickoff&&Number.isFinite(Date.parse(g.kickoff))?Date.parse(g.kickoff):Date.parse(g.date+'T17:00:00Z');
// A game counts as unfinished until it is final, or five hours after kickoff if a score never arrived.
const unfinished=(g:ScheduledGame,now:number)=>g.status!=='Complete'&&startMs(g)+5*3600000>now;

// The current week is the earliest week with an unfinished game. Before the season it is
// the first week; after the last game it is the final loaded week.
export function defaultWeek(games:ScheduledGame[],season:number,now=Date.now()):number|null{
 const gs=games.filter(g=>g.season===season&&g.week>=1&&g.week<=regularSeasonWeeks&&Number.isFinite(startMs(g)));
 if(!gs.length)return null;
 const open=gs.filter(g=>unfinished(g,now)).map(g=>g.week);
 return open.length?Math.min(...open):Math.max(...gs.map(g=>g.week));
}

export function missingWeeks(games:{season:number;week:number}[],season:number){const have=new Set(games.filter(g=>g.season===season).map(g=>g.week));return Array.from({length:regularSeasonWeeks},(_,i)=>i+1).filter(w=>!have.has(w));}
