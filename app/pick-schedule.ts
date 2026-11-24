// Client-safe timing rules for automatic pick updates.
import {regularSeasonWeeks} from './season';

type ScheduledGame={season:number;week:number;kickoff:string|null};
export type SlotKind='week-start'|'sunday';
export type Slot={id:string;season:number;week:number;kind:SlotKind;runAt:number;kickoff:number};
export type SlotRecord={status:'running'|'completed'|'failed'|'manual';attempts:number;updatedAt:number};

const hour=3600000;
// Run three hours before the week's first kickoff, and two hours before the first Sunday kickoff.
export const leadHours:Record<SlotKind,number>={'week-start':3,sunday:2};
// Never start a run this close to the kickoff it is meant to beat.
export const cutoffMs=10*60000;
export const retryMs=15*60000;
export const maxAttempts=4;

const etWeekday=(ms:number)=>new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'short'}).format(new Date(ms));

export function weekSlots(games:ScheduledGame[],season:number,week:number):Slot[]{
 const kicks=games.filter(g=>g.season===season&&g.week===week&&g.kickoff&&Number.isFinite(Date.parse(g.kickoff))).map(g=>Date.parse(g.kickoff!)).sort((a,b)=>a-b);
 if(!kicks.length)return [];
 const slot=(kind:SlotKind,kickoff:number):Slot=>({id:`${season}-${week}-${kind}`,season,week,kind,kickoff,runAt:kickoff-leadHours[kind]*hour});
 const first=kicks[0],sunday=kicks.find(k=>etWeekday(k)==='Sun');
 // When the week opens on Sunday the two runs would target the same kickoff, so keep one.
 return sunday===undefined||sunday===first?[slot('week-start',first)]:[slot('week-start',first),slot('sunday',sunday)];
}

// Slots for this week and next that can still run, earliest first.
export function upcomingSlots(games:ScheduledGame[],season:number,week:number,now:number):Slot[]{
 return [week,week+1].filter(w=>w<=regularSeasonWeeks).flatMap(w=>weekSlots(games,season,w)).filter(s=>s.kickoff-cutoffMs>now).sort((a,b)=>a.runAt-b.runAt);
}

export type Decision={slot:Slot;action:'run'|'manual'}|null;
// A slot is due from its run time until shortly before its kickoff. It is skipped once it
// succeeded, once the user generated picks themselves inside the window, or after the
// retry budget is spent. A crashed "running" attempt is retried after the retry interval.
export function dueSlot(slots:Slot[],records:Map<string,SlotRecord>,manualRunTimes:Map<number,number[]>,now:number):Decision{
 for(const slot of slots){
  if(now<slot.runAt||now>=slot.kickoff-cutoffMs)continue;
  const r=records.get(slot.id);
  if(r&&(r.status==='completed'||r.status==='manual'||r.attempts>=maxAttempts||now-r.updatedAt<retryMs))continue;
  if((manualRunTimes.get(slot.week)||[]).some(t=>t>=slot.runAt&&t<=now))return {slot,action:'manual'};
  return {slot,action:'run'};
 }
 return null;
}
