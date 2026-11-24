import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultWeek,nflSeason,missingWeeks} from '../app/season.ts';
import {syncSeason,syncWeek} from '../app/pick-workflow.ts';
const g=(week,kickoff,status='Pending')=>({season:2026,week,date:kickoff.slice(0,10),kickoff,status});
const games=[g(11,'2026-11-19T01:15:00Z','Complete'),g(11,'2026-11-22T18:00:00Z','Complete'),g(11,'2026-11-24T01:15:00Z'),g(12,'2026-11-26T01:15:00Z'),g(12,'2026-11-29T18:00:00Z')];
test('the default week is the earliest week with an unfinished game',()=>{
 assert.equal(defaultWeek(games,2026,Date.parse('2026-11-23T15:00:00Z')),11); // Monday night game still to play
 assert.equal(defaultWeek(games,2026,Date.parse('2026-11-24T03:00:00Z')),11); // in progress
 assert.equal(defaultWeek(games.map(x=>x.week===11?{...x,status:'Complete'}:x),2026,Date.parse('2026-11-24T05:00:00Z')),12);
 assert.equal(defaultWeek(games,2026,Date.parse('2026-11-24T07:00:00Z')),12); // score never arrived: moves on five hours after kickoff
 assert.equal(defaultWeek(games,2026,Date.parse('2026-08-01T00:00:00Z')),11); // before any loaded game
 assert.equal(defaultWeek(games,2026,Date.parse('2027-02-01T00:00:00Z')),12); // after the last game
 assert.equal(defaultWeek(games,2025,Date.now()),null);
});
test('seasons roll over in March, and missing weeks are listed',()=>{
 assert.equal(nflSeason(Date.parse('2027-01-15T12:00:00Z')),2026);assert.equal(nflSeason(Date.parse('2027-03-02T12:00:00Z')),2027);assert.equal(nflSeason(Date.parse('2026-11-23T12:00:00Z')),2026);
 assert.deepEqual(missingWeeks(games,2026).length,16);assert.deepEqual(missingWeeks([],2026)[17],18);
});
const state=()=>({eventGames:[],pickCards:[],pickVersions:[],pickResults:[],actualBets:[],meta:{},version:1,integration:{provider:'',lastAttemptAt:null,lastSuccessAt:null,lastError:null,pending:0,conflicts:[],unattendedEnabled:false}});
const ev=(week,id,kickoff)=>({externalId:id,season:2026,week,away:'Buffalo Bills',home:'Kansas City Chiefs',kickoff,complete:false,awayScore:null,homeScore:null,state:'pre'});
test('a season load keeps good weeks and reports failed weeks without partial changes',async()=>{
 const s=state();const {state:next,loaded,failed}=await syncSeason(s,2026,async(season,week)=>{if(week===5)throw Error('fetch failed');return [ev(week,'w'+week,`2026-09-${String(10+week).padStart(2,'0')}T17:00:00Z`)];},'2026-09-01T00:00:00Z');
 assert.equal(loaded.length,17);assert.deepEqual(failed,[{week:5,error:'Schedule provider unavailable.'}]);assert.equal(next.eventGames.length,17);assert.equal(s.eventGames.length,0);assert.deepEqual(next.meta.weeks.length,17);
});
test('a game without picks follows a rescheduled kickoff; a game with picks does not',()=>{
 const s=state();syncWeek(s,[ev(15,'x','2026-12-20T18:00:00Z')],2026,15,'2026-12-01T00:00:00Z');
 syncWeek(s,[ev(15,'x','2026-12-21T01:20:00Z')],2026,15,'2026-12-01T00:00:00Z');assert.equal(s.eventGames[0].kickoff,'2026-12-21T01:20:00Z');assert.equal(s.eventGames[0].date,'2026-12-20');
 s.pickVersions.push({id:'p',gameId:s.eventGames[0].id});
 assert.throws(()=>syncWeek(s,[ev(15,'x','2026-12-21T21:25:00Z')],2026,15,'2026-12-01T00:00:00Z'),/changed kickoff/);
});
