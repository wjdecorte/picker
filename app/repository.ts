import { getPool } from '../db/client';
import seed from './seed.json';
import { HistoryState, bootstrap, recalculate, officialGames } from './history';

export async function loadState(): Promise<HistoryState> {
  const client = await getPool().connect();
  let s: HistoryState | undefined;
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const row = (await client.query('SELECT payload,version FROM dashboard WHERE id=$1', ['main'])).rows[0];
    const meta = row?.payload ?? { games: seed, reviews: {}, weeks: [5,6], cards: [{season:2026,week:5},{season:2026,week:6}] };
    if (meta.schemaVersion !== 2) {
      await client.query('COMMIT');
      s = bootstrap({...meta, version: row?.version ?? 0});
    } else {
      const read = async (table: string) => (await client.query(`SELECT payload FROM ${table} ORDER BY ordinal`)).rows.map(r => r.payload);
      const eventGames = await read('games'), pickCards = await read('pick_cards'), pickVersions = await read('pick_versions');
      const results = (await client.query('SELECT * FROM pick_results ORDER BY id')).rows;
      const actualBets = await read('actual_bets');
      await client.query('COMMIT');
      return { eventGames, pickCards, pickVersions, pickResults: results.map(r => ({id:r.id, versionId:r.pick_version_id, result:r.ats_result, margin:r.cover_margin, gradedAt:r.graded_at.toISOString()})), actualBets, meta, version:row.version, integration:meta.integration };
    }
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
  if (await saveState(s!, s!.version)) { s!.version++; return s!; }
  return loadState();
}

export function responseData(s: HistoryState) {
  const { writerToken: _internal, ...meta } = s.meta;
  return {...meta, games:officialGames(s), reviews:s.meta.reviews||{}, weeks:s.meta.weeks||[], cards:s.meta.cards||[], pickCards:s.pickCards, pickVersions:s.pickVersions, pickResults:s.pickResults, schedule:s.eventGames, actualBets:s.actualBets, integration:s.integration, version:s.version};
}

export async function saveState(s: HistoryState, expected: number): Promise<boolean> {
  recalculate(s);
  const client = await getPool().connect();
  const { writerToken: _internal, ...base } = s.meta;
  const meta = {...base, schemaVersion:2, integration:s.integration};
  try {
    await client.query('BEGIN');
    const saved = expected === 0
      ? await client.query('INSERT INTO dashboard(id,payload,version) VALUES($1,$2,1) ON CONFLICT(id) DO NOTHING RETURNING version', ['main', JSON.stringify(meta)])
      : await client.query('UPDATE dashboard SET payload=$1,version=version+1 WHERE id=$2 AND version=$3 RETURNING version', [JSON.stringify(meta),'main',expected]);
    if (!saved.rowCount) { await client.query('ROLLBACK'); return false; }
    for (const g of s.eventGames) await client.query(`INSERT INTO games(id,season,week,game_date,away_team,home_team,external_id,kickoff_time,away_score,home_score,status,completed_at,official_version_id,payload)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      ON CONFLICT(id) DO UPDATE SET external_id=excluded.external_id,kickoff_time=excluded.kickoff_time,away_score=excluded.away_score,home_score=excluded.home_score,status=excluded.status,completed_at=excluded.completed_at,official_version_id=excluded.official_version_id,payload=excluded.payload
      WHERE games.payload IS DISTINCT FROM excluded.payload`, [g.id,g.season,g.week,g.date,g.away,g.home,g.externalId,g.kickoff,g.awayScore,g.homeScore,g.status,g.completedAt,g.officialVersionId,JSON.stringify(g)]);
    for (const c of s.pickCards) {
      await client.query('INSERT INTO pick_cards(id,season,week,card_type,analysis_date,immutable,payload) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO NOTHING', [c.id,c.season,c.week,c.type,c.analysisDate,c.immutable,JSON.stringify(c)]);
      await client.query('UPDATE pick_cards SET immutable=$1,analysis_date=$2,payload=$3 WHERE id=$4 AND immutable=false AND payload IS DISTINCT FROM $3::jsonb', [c.immutable,c.analysisDate,JSON.stringify(c),c.id]);
    }
    for (const p of s.pickVersions) await client.query('INSERT INTO pick_versions(id,game_id,pick_card_id,pick_team,pick_spread,confidence,classification,analysis_timestamp,reference_version_id,payload) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(id) DO NOTHING', [p.id,p.gameId,p.cardId,p.team,p.spread,p.confidence,p.classification,p.analysisTimestamp,p.referenceVersionId||null,JSON.stringify(p)]);
    for (const r of s.pickResults) await client.query(`INSERT INTO pick_results(id,pick_version_id,ats_result,cover_margin,graded_at) VALUES($1,$2,$3,$4,$5)
      ON CONFLICT(pick_version_id) DO UPDATE SET ats_result=excluded.ats_result,cover_margin=excluded.cover_margin,graded_at=excluded.graded_at
      WHERE pick_results.ats_result IS DISTINCT FROM excluded.ats_result OR pick_results.cover_margin IS DISTINCT FROM excluded.cover_margin`, [r.id,r.versionId,r.result,r.margin,r.gradedAt]);
    for (const b of s.actualBets) await client.query('INSERT INTO actual_bets(id,game_id,pick_version_id,payload) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload WHERE actual_bets.payload IS DISTINCT FROM excluded.payload', [b.id,b.gameId,b.versionId,JSON.stringify(b)]);
    await client.query('COMMIT'); s.meta = meta; return true;
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
}
