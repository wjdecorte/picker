import test from 'node:test';
import assert from 'node:assert/strict';
import {weekSlots,upcomingSlots,dueSlot,maxAttempts,retryMs} from '../app/pick-schedule.ts';
const g=(week,kickoff)=>({season:2026,week,kickoff});
const H=3600000,at=s=>Date.parse(s);
// Week 12 of 2026: Thanksgiving opener Thursday 12:30 pm ET, Sunday slate from 1 pm ET.
const week12=[g(12,'2026-11-29T21:25:00Z'),g(12,'2026-11-26T17:30:00Z'),g(12,'2026-11-29T18:00:00Z'),g(12,'2026-11-27T01:20:00Z'),g(12,'2026-12-01T01:15:00Z')];

test('slots run 3h before the first kickoff and 2h before the first Sunday kickoff',()=>{
 const [start,sunday]=weekSlots(week12,2026,12);
 assert.equal(start.id,'2026-12-week-start');assert.equal(start.runAt,at('2026-11-26T17:30:00Z')-3*H);
 assert.equal(sunday.id,'2026-12-sunday');assert.equal(sunday.kickoff,at('2026-11-29T18:00:00Z'));assert.equal(sunday.runAt,at('2026-11-29T16:00:00Z'));
});
test('a Sunday 8:20 pm ET game is still Sunday; a week that opens on Sunday has one slot',()=>{
 assert.equal(weekSlots([g(3,'2026-09-28T00:20:00Z'),g(3,'2026-09-29T00:15:00Z')],2026,3).length,1);
 assert.deepEqual(weekSlots([g(3,'2026-09-27T17:00:00Z'),g(3,'2026-09-28T00:20:00Z')],2026,3).map(s=>s.kind),['week-start']);
 assert.deepEqual(weekSlots([],2026,3),[]);assert.deepEqual(weekSlots([g(3,null)],2026,3),[]);
});
test('upcoming slots cover this week and next and drop ones too close to kickoff',()=>{
 const games=[...week12,g(13,'2026-12-04T01:15:00Z'),g(13,'2026-12-06T18:00:00Z')];
 assert.deepEqual(upcomingSlots(games,2026,12,at('2026-11-24T12:00:00Z')).map(s=>s.id),['2026-12-week-start','2026-12-sunday','2026-13-week-start','2026-13-sunday']);
 assert.deepEqual(upcomingSlots(games,2026,12,at('2026-11-26T17:25:00Z')).map(s=>s.id),['2026-12-sunday','2026-13-week-start','2026-13-sunday']);
 assert.deepEqual(upcomingSlots(games,2026,18,at('2026-11-24T12:00:00Z')),[]);
});
test('due slot: window, success, retry spacing, retry budget and manual generations',()=>{
 const slots=weekSlots(week12,2026,12),[start]=slots,none=new Map();
 assert.equal(dueSlot(slots,none,none,start.runAt-1),null);
 assert.deepEqual(dueSlot(slots,none,none,start.runAt),{slot:start,action:'run'});
 assert.equal(dueSlot(slots,none,none,start.kickoff-5*60000),null);
 const t=start.runAt+H;
 assert.equal(dueSlot(slots,new Map([[start.id,{status:'completed',attempts:1,updatedAt:t-H}]]),none,t),null);
 assert.equal(dueSlot(slots,new Map([[start.id,{status:'failed',attempts:1,updatedAt:t-retryMs+1}]]),none,t),null);
 assert.equal(dueSlot(slots,new Map([[start.id,{status:'failed',attempts:1,updatedAt:t-retryMs}]]),none,t)?.action,'run');
 assert.equal(dueSlot(slots,new Map([[start.id,{status:'failed',attempts:maxAttempts,updatedAt:0}]]),none,t),null);
 assert.equal(dueSlot(slots,new Map([[start.id,{status:'running',attempts:1,updatedAt:t-retryMs}]]),none,t)?.action,'run');
 assert.deepEqual(dueSlot(slots,none,new Map([[12,[start.runAt+60000]]]),t),{slot:start,action:'manual'});
 assert.equal(dueSlot(slots,none,new Map([[12,[start.runAt-60000]]]),t)?.action,'run');
});
