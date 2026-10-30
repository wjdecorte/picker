import pg from 'pg';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
export async function importInitialCard(client,data){
 const fingerprint=createHash('sha256').update(JSON.stringify(data)).digest('hex');
 if(data.season!==2026||data.week!==8||data.id!=='2026-w8-initial'||data.games.length!==14||new Set(data.games.map(g=>g.externalId)).size!==14)throw Error('Invalid initial-card manifest');
 for(const g of data.games)if(![g.home,g.away].includes(g.team)||!Number.isFinite(g.spread)||!Number.isFinite(g.confidence)||g.confidence<1||g.confidence>10||!['Best Bet','Play','Lean','Conditional','Pass','Avoid'].includes(g.classification)||!Number.isFinite(Date.parse(g.kickoff))||Date.parse(g.kickoff)<=Date.parse(data.oddsTimestamp))throw Error('Invalid historical selection');
 await client.query('BEGIN');
 try{
  const row=(await client.query("SELECT payload,version FROM dashboard WHERE id='main' FOR UPDATE")).rows[0];
  if(!row||row.payload.schemaVersion!==2){await client.query('ROLLBACK');return 'deferred: normalized dashboard not initialized';}
  const old=(await client.query('SELECT payload FROM pick_cards WHERE id=$1',[data.id])).rows[0];
  if(old){if(old.payload.importFingerprint!==fingerprint)throw Error('Initial card already exists with different data; preserved');await client.query('COMMIT');return 'already imported';}
  if((await client.query('SELECT 1 FROM pick_cards WHERE season=$1 AND week=$2 AND card_type=$3',[data.season,data.week,'INITIAL'])).rowCount||(await client.query('SELECT 1 FROM games WHERE season=$1 AND week=$2',[data.season,data.week])).rowCount)throw Error('Week 8 data already exists; import refused to preserve existing records');
  const at=(await client.query('SELECT clock_timestamp() AS at')).rows[0].at.toISOString();
  const card={id:data.id,season:data.season,week:data.week,type:'INITIAL',label:'Initial card · October 28',analysisDate:data.analysisDate,createdAt:at,finalizedAt:at,immutable:true,status:'Historical',reason:'User-authorized historical INITIAL card import. Source odds time is not an independently verified prediction time.',importFingerprint:fingerprint,oddsTimestamp:data.oddsTimestamp,oddsSource:data.oddsSource};
  await client.query('INSERT INTO pick_cards(id,season,week,card_type,analysis_date,immutable,payload) VALUES($1,$2,$3,$4,$5,true,$6)',[card.id,card.season,card.week,card.type,card.analysisDate,JSON.stringify(card)]);
  const dateOf=iso=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(iso));
  for(const r of data.games){
   const id='espn:'+r.externalId,pid=data.id+':'+id,notes=`Historical initial card dated ${data.analysisDate}. Odds source: ${data.oddsSource}; source timestamp October 28, 2026, 2:25 PM ET. Exact prediction time was not supplied. Entered ${at}. No actual wager implied.`,context={currentSpread:null,closingSpread:null,notes,injuryNotes:'',weatherNotes:'',lineNotes:'Source quotation is user-reported; saved pick line is preserved independently of current market quotes.'};
   const g={id,season:data.season,week:data.week,date:dateOf(r.kickoff),away:r.away,home:r.home,kickoff:r.kickoff,externalId:r.externalId,status:Date.parse(r.kickoff)<=Date.parse(at)?'Locked':'Pending',awayScore:null,homeScore:null,completedAt:null,officialVersionId:pid,context,scoreSource:undefined};
   // A past kickoff is conservatively locked; scores/status are reconciled by the score adapter.
   const v={id:pid,gameId:id,cardId:data.id,team:r.team,spread:r.spread,confidence:r.confidence,classification:r.classification,analysisDate:data.analysisDate,analysisTimestamp:null,rationale:'No game-specific rationale supplied.',revisionReason:'Historical INITIAL card supplied by user',notes,recordedAt:at,isLocked:true,conditionalActive:false,oddsTimestamp:data.oddsTimestamp,oddsSource:data.oddsSource,kickoffTimestamp:r.kickoff,historicalImport:true};
   await client.query('INSERT INTO games(id,season,week,game_date,away_team,home_team,external_id,kickoff_time,status,official_version_id,payload) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[id,g.season,g.week,g.date,g.away,g.home,g.externalId,g.kickoff,g.status,pid,JSON.stringify(g)]);
   await client.query('INSERT INTO pick_versions(id,game_id,pick_card_id,pick_team,pick_spread,confidence,classification,analysis_timestamp,payload) VALUES($1,$2,$3,$4,$5,$6,$7,NULL,$8)',[pid,id,data.id,v.team,v.spread,v.confidence,v.classification,JSON.stringify(v)]);
  }
  const meta={...row.payload,weeks:[...new Set([...(row.payload.weeks||[]),data.week])],cards:[...(row.payload.cards||[]),{season:data.season,week:data.week}]};
  await client.query("UPDATE dashboard SET payload=$1,version=version+1 WHERE id='main'",[JSON.stringify(meta)]);
  await client.query('COMMIT');return 'imported 14 immutable INITIAL predictions; no wagers';
 }catch(e){await client.query('ROLLBACK');throw e;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const client=new pg.Client({connectionString:process.env.DATABASE_URL});await client.connect();try{const data=JSON.parse(await readFile(new URL('../db/imports/2026-w8-initial.json',import.meta.url),'utf8'));console.log('Week 8:',await importInitialCard(client,data));}finally{await client.end();}
}
