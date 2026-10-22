import pg from 'pg';
import { isDeepStrictEqual } from 'node:util';
import { readFile } from 'node:fs/promises';
const path=process.argv[2];
if (!path) throw Error('Usage: npm run db:import -- /path/to/legacy-export.json');
if (!process.env.DATABASE_URL) throw Error('DATABASE_URL is required');
const data=JSON.parse(await readFile(path,'utf8'));
const tables=['dashboard','games','pick_cards','pick_versions','pick_results','actual_bets'];
for (const table of tables) if (!Array.isArray(data[table])) throw Error(`Missing table: ${table}`);
if (data.dashboard.length!==1||data.dashboard[0].id!=='main'||JSON.parse(data.dashboard[0].payload).schemaVersion!==2) throw Error('Expected a normalized schemaVersion 2 export');
const client=new pg.Client({connectionString:process.env.DATABASE_URL});
await client.connect();
try {
  await client.query('BEGIN');
  await client.query('LOCK TABLE dashboard IN EXCLUSIVE MODE');
  if ((await client.query('SELECT 1 FROM dashboard LIMIT 1')).rowCount) throw Error('Import refused: database already contains dashboard data. Use a fresh database; existing picks were preserved.');
  const columns={dashboard:['id','payload','version'],games:['id','season','week','game_date','away_team','home_team','external_id','kickoff_time','away_score','home_score','status','completed_at','official_version_id','payload'],pick_cards:['id','season','week','card_type','analysis_date','immutable','payload'],pick_versions:['id','game_id','pick_card_id','pick_team','pick_spread','confidence','classification','analysis_timestamp','reference_version_id','payload'],pick_results:['id','pick_version_id','ats_result','cover_margin','graded_at'],actual_bets:['id','game_id','pick_version_id','payload']};
  for (const table of tables) for (const row of data[table]) {
    const names=columns[table];
    await client.query(`INSERT INTO ${table}(${names.join(',')}) VALUES(${names.map((_,i)=>'$'+(i+1)).join(',')})`,names.map(k=>k==='immutable'?!!row[k]:row[k]??null));
  }
  // Compare every original field, including complete JSON payloads, before commit.
  for (const table of tables) {
    const rows=(await client.query(`SELECT * FROM ${table}`)).rows;
    if (rows.length!==data[table].length) throw Error(`Count mismatch: ${table}`);
    for (const old of data[table]) {
      const row=rows.find(r=>r.id===old.id);
      for (const name of columns[table]) {
        let expected=old[name]??null, actual=row[name];
        if (name==='payload') { expected=JSON.parse(expected); actual=JSON.parse(JSON.stringify(actual)); }
        else if (name==='immutable') expected=!!expected;
        else if (actual instanceof Date) { actual=name==='game_date'||name==='analysis_date'?actual.toISOString().slice(0,10):actual.toISOString(); if(expected)expected=name==='game_date'||name==='analysis_date'?String(expected).slice(0,10):new Date(expected).toISOString(); }
        if (!isDeepStrictEqual(actual,expected)) throw Error(`Field mismatch: ${table}.${old.id}.${name}`);
      }
    }
  }
  await client.query('COMMIT');
  console.log('Import verified field by field:',Object.fromEntries(tables.map(t=>[t,data[t].length])));
} catch(e) { await client.query('ROLLBACK'); throw e; }
finally { await client.end(); }
