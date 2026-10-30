export const runtime='nodejs';
export const maxDuration=120;
import {getPool} from '../../../../db/client';
import {loadState,saveState,responseData} from '../../../repository';
import {retrieveWeek} from '../../../score-service';
import {llmConfig,generatePicks} from '../../../llm';
import {validateWeek,syncWeek,modelInputs,validateModelPicks,saveModelPicks} from '../../../pick-workflow';
import {writeAllowed} from '../../../write-access';
export async function POST(req:Request){
 if(!writeAllowed(req))return Response.json({error:'Trusted local access is required.'},{status:403});
 const d=await req.json().catch(()=>null);try{validateWeek(d?.season,d?.week);if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(d?.requestId||''))throw Error('A valid generation request ID is required.');if(!llmConfig().configured)return Response.json({error:'OpenAI is not configured. Add OPENAI_API_KEY to the app environment, then restart.'},{status:503});}catch(e:any){return Response.json({error:e.message},{status:400});}
 const client=await getPool().connect(),lock='picker:generate:'+d.season+':'+d.week;let held=false,inserted=false,committed=false;
 try{
  held=(await client.query('SELECT pg_try_advisory_lock(hashtext($1)) AS locked',[lock])).rows[0].locked;if(!held)return Response.json({error:'Picks are already being generated for this week. Wait for that request to finish.'},{status:409});
  const old=(await client.query('SELECT * FROM model_runs WHERE id=$1',[d.requestId])).rows[0];
  if(old){if(old.season!==d.season||old.week!==d.week)throw Error('This request ID belongs to another week.');const saved=await loadState();if(old.status==='completed'||saved.pickVersions.some(p=>p.runId===d.requestId))return Response.json({...responseData(saved),generation:old.payload});return Response.json({error:'This request was already attempted. Refresh before starting a new generation.'},{status:409});}
  let s=await loadState();if(d.version!==s.version)return Response.json({error:'The dashboard changed. Refresh before generating.'},{status:409});
  const events=await retrieveWeek(d.season,d.week),start=new Date().toISOString();syncWeek(s,events,d.season,d.week,start);const inputs=modelInputs(s,d.season,d.week,start);if(!inputs.length)throw Error('No unstarted games have verified pregame lines. Refresh lines or choose another week.');
  await client.query("INSERT INTO model_runs(id,season,week,status,model,payload) VALUES($1,$2,$3,'running',$4,$5)",[d.requestId,d.season,d.week,llmConfig().model,JSON.stringify({games:inputs.length})]);inserted=true;
  const output=await generatePicks(inputs),rows=validateModelPicks(output.value,inputs);
  // Re-fetch after generation: a slow model must never create a pick after kickoff.
  const finalEvents=await retrieveWeek(d.season,d.week);s=await loadState();const at=new Date().toISOString();syncWeek(s,finalEvents,d.season,d.week,at);
  const result=saveModelPicks(s,inputs,rows,d.season,d.week,at,{id:d.requestId,model:output.model,responseId:output.responseId});
  if(!await saveState(s,s.version))throw Error('Another update completed during generation. No model picks were saved; refresh before retrying.');committed=true;s.version++;
  await client.query("UPDATE model_runs SET status='completed',payload=$1,finished_at=now() WHERE id=$2",[JSON.stringify({...result,at,model:output.model}),d.requestId]);
  return Response.json({...responseData(s),generation:result});
 }catch(e:any){if(inserted&&!committed)await client.query("UPDATE model_runs SET status='failed',payload=$1,finished_at=now() WHERE id=$2",[JSON.stringify({error:'Generation did not save predictions'}),d.requestId]).catch(()=>{});return Response.json({error:committed?'Picks were saved, but the completion acknowledgement failed. Refresh History before retrying.':e.message==='fetch failed'?'A provider could not be reached. No picks were saved; try again.':e.message||'Generation failed; no picks were saved.'},{status:400});}
 finally{try{if(held)await client.query('SELECT pg_advisory_unlock(hashtext($1))',[lock]);}finally{client.release();}}
}
