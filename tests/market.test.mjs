import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseSpreadQuote,applyMarket,marketForTeam} from '../app/market.ts';
import {parseScoreboard,applyProviderEvents} from '../app/score-service.ts';
import {bootstrap,projectVersion} from '../app/history.ts';
const now='2026-10-22T16:00:00.000Z';
const fixture=JSON.parse(fs.readFileSync('tests/fixtures/espn-odds.json','utf8'));
const seed=JSON.parse(fs.readFileSync('app/seed.json','utf8'));
const state=()=>bootstrap({games:structuredClone(seed),reviews:{},weeks:[5,6],cards:[{season:2026,week:5},{season:2026,week:6}]},now);
const odds=(h,a)=>[{provider:{id:'100',name:'DraftKings'},pointSpread:{home:{close:{line:h}},away:{close:{line:a}}}}];
test('Parse actual Week 7 feed, including home and away favorites, without treating openings as current',()=>{
 const events=parseScoreboard(fixture,2026,7);assert.equal(events.filter(e=>e.market).length,14);
 const ne=events.find(e=>e.away==='New England Patriots');assert.equal(ne.market.awaySpread,3);assert.equal(ne.market.homeSpread,-3);
 const pit=events.find(e=>e.away==='Pittsburgh Steelers');assert.equal(pit.market.awaySpread,-3.5);assert.equal(pit.market.bookmaker,'DraftKings');
 assert.equal(events.find(e=>e.away==='Cincinnati Bengals').market.awaySpread,1.5);
});
test('Reject missing, contradictory or malformed spreads; accept pick-em and signed half points',()=>{
 assert.equal(parseSpreadQuote(undefined),undefined);assert.equal(parseSpreadQuote([]),undefined);
 for(const [h,a] of [[null,null],['',''],['-3','+2.5'],['wrong','+3'],['-101','+101']])assert.equal(parseSpreadQuote(odds(h,a)),undefined);
 assert.equal(parseSpreadQuote(odds('0','0')).homeSpread,0);
 assert.equal(parseSpreadQuote(odds('-3.5','+3.5')).awaySpread,3.5);
 assert.equal(parseSpreadQuote([{provider:{name:'Book'},spread:2.5,homeTeamOdds:{favorite:false},awayTeamOdds:{favorite:true}}]).homeSpread,2.5);
 assert.equal(parseSpreadQuote([{provider:{name:'Book'},spread:2.5,homeTeamOdds:{favorite:false},awayTeamOdds:{favorite:false}}]),undefined);
});
test('Live imports match games exactly and never mutate saved selections, wagers, scores or closing spreads',()=>{
 const s=state(),before=JSON.stringify(s.pickVersions),bets=JSON.stringify(s.actualBets),old=s.eventGames.filter(g=>g.week<7).map(g=>JSON.stringify(g));
 const events=parseScoreboard(fixture,2026,7),r=applyProviderEvents(s,events,now);assert.equal(r.marketsUpdated,14);
 assert.equal(JSON.stringify(s.pickVersions),before);assert.equal(JSON.stringify(s.actualBets),bets);
 // Existing historical game payloads are untouched by this Week 7 feed.
 assert.deepEqual(s.eventGames.filter(g=>g.week<7).map(g=>JSON.stringify(g)),old);
 for(const g of s.eventGames.filter(g=>g.week===7)){assert.equal(g.context.closingSpread,null);assert.equal(g.awayScore,null);assert.equal(g.market.source,'ESPN');assert.equal(g.market.checkedAt,now);}
 const ne=s.eventGames.find(g=>g.week===7&&g.away==='New England Patriots');
 const version={id:'fixture',gameId:ne.id,cardId:'2026-w7-initial',team:ne.away,spread:2.5,confidence:5,classification:'Lean',analysisDate:'2026-10-22',analysisTimestamp:null,rationale:'',revisionReason:'fixture',notes:'',recordedAt:now,isLocked:true};
 const a=projectVersion(s,ne,version),b=projectVersion(s,ne,{...version,team:ne.home,spread:-2.5});
 assert.equal(a.currentSpread,3);assert.equal(b.currentSpread,-3);assert.equal(a.spread,2.5);assert.equal(b.spread,-2.5);
 const cached=JSON.stringify(ne.market);assert.equal(applyMarket(ne,{...events[0],state:'in'},now),false);assert.equal(JSON.stringify(ne.market),cached);
 assert.equal(applyMarket(ne,events[0],'2026-10-23T00:15:00Z'),false);assert.equal(JSON.stringify(ne.market),cached);
 assert.equal(applyMarket(ne,{...events[0],market:undefined},now),false);assert.equal(JSON.stringify(ne.market),cached);
 const bad={...events[0],externalId:'wrong-id'};const mismatch=state();assert.equal(applyProviderEvents(mismatch,[bad],now).marketsUpdated,0);
});
