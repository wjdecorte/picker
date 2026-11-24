import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSchedule,loadSchedule,gameTeamForm} from '../app/team-form.ts';
const header='game_id,season,game_type,week,gameday,away_team,away_score,home_team,home_score,spread_line,away_rest,home_rest';
const csv=[header,
 '2026_01_BUF_KC,2026,REG,1,2026-09-13,BUF,20,KC,27,3,7,7',
 '2026_02_KC_LV,2026,REG,2,2026-09-20,KC,24,LV,24,-6.5,7,7',
 '2026_02_MIA_BUF,2026,REG,2,2026-09-20,MIA,10,BUF,31,7,7,7',
 '2026_03_LV_BUF,2026,REG,3,2026-09-27,LV,,BUF,,NA,7,7',
 '2026_03_KC_DEN,2026,REG,3,2026-09-27,KC,,DEN,,2.5,6,7',
 '2025_01_BUF_KC,2025,REG,1,2025-09-07,BUF,99,KC,0,3,7,7',
 '2026_19_BUF_KC,2026,POST,19,2027-01-10,BUF,0,KC,0,3,7,7'].join('\n')+'\n';
test('schedule rows validate schema, season, regular season, scores, lines and team codes',()=>{
 const rows=parseSchedule(csv,2026);assert.equal(rows.length,5);assert.equal(rows[3].spreadLine,null);assert.equal(rows[3].awayScore,null);
 assert.throws(()=>parseSchedule('bad\nrow',2026));
 assert.throws(()=>parseSchedule(header+'\n2026_01_X_KC,2026,REG,1,2026-09-13,XXX,1,KC,2,3,7,7\n',2026));
 assert.throws(()=>parseSchedule(header+'\n2026_01_BUF_KC,2026,REG,1,2026-09-13,BUF,1,KC,,3,7,7\n',2026));
});
test('team form uses only completed games before kickoff, with ATS from each side of the line',()=>{
 const e={source:'nflverse',sourceUrl:'x',license:'y',season:2026,fetchedAt:'t',publishedAt:'t',sha256:'h',status:'available',warning:'ok.',rows:parseSchedule(csv,2026)};
 const f=gameTeamForm(e,'Las Vegas Raiders','Buffalo Bills','2026-09-27T17:00:00Z');
 assert.equal(f.status,'available');assert.equal(f.throughDate,'2026-09-20');
 const [lv,buf]=f.teams;
 // BUF lost 20-27 as a 3-point underdog (no cover), then won 31-10 laying 7 (cover).
 assert.deepEqual([buf.code,buf.record,buf.ats,buf.pointDiffPerGame,buf.restDays],['BUF',{wins:1,losses:1,ties:0},{covers:1,failures:1,pushes:0,noLine:0},7,7]);
 assert.deepEqual(buf.recent.map(g=>g.coverMargin),[-4,14]);
 // LV tied KC 24-24 as a 6.5-point underdog: a tie and a cover.
 assert.deepEqual([lv.record,lv.ats.covers,lv.home.ties],[{wins:0,losses:0,ties:1},1,1]);
 // Games on the kickoff date itself are never included.
 const early=gameTeamForm(e,'Buffalo Bills','Kansas City Chiefs','2026-09-13T20:00:00Z');assert.equal(early.status,'unavailable');assert.equal(early.teams[0].games,0);
 assert.equal(gameTeamForm({...e,status:'unavailable',rows:[]},'Las Vegas Raiders','Buffalo Bills','2026-09-27T17:00:00Z').teams.length,0);
 assert.match(gameTeamForm(e,'Miami Dolphins','Buffalo Bills','2026-09-27T17:00:00Z').warning,/Matchup not found/);
});
test('schedule loader records provenance, staleness and safe failures',async()=>{
 const now=Date.parse('2026-09-26T18:00:00Z');
 const fetcher=async url=>String(url).includes('api.github.com')?Response.json({assets:[{name:'games.csv',size:csv.length,updated_at:'2026-09-26T07:00:00Z'}]}):new Response(csv);
 const e=await loadSchedule(2026,fetcher,now);assert.equal(e.status,'available');assert.match(e.sha256,/^[a-f0-9]{64}$/);assert.equal(e.rows.length,5);
 assert.equal((await loadSchedule(2026,fetcher,now+48*3600000)).status,'stale');
 assert.equal((await loadSchedule(2026,async()=>{throw Error('network')},now)).status,'unavailable');
 const huge=async url=>String(url).includes('api.github.com')?Response.json({assets:[{name:'games.csv',size:9e6,updated_at:'2026-09-26T07:00:00Z'}]}):new Response(csv);
 assert.equal((await loadSchedule(2026,huge,now)).status,'unavailable');
});
