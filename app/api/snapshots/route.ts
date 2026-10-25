export const runtime='nodejs';
export const dynamic='force-dynamic';
import {loadState,saveState,responseData} from '../../repository';
import {retrieveWeek,applyProviderEvents} from '../../score-service';
import {addSnapshot} from '../../snapshots';
import {writeAllowed} from '../../write-access';
export async function POST(req:Request){
 if(!writeAllowed(req))return Response.json({error:'Local access or a valid service token is required.'},{status:403});
 try{
  const d=await req.json(),s=await loadState();
  if(d.version!==s.version)return Response.json({error:'Another update completed. Reload before saving.'},{status:409});
  if(!Number.isInteger(d.season)||!Number.isInteger(d.week)||d.week<1||d.week>22)return Response.json({error:'Invalid season or week.'},{status:400});
  const events=await retrieveWeek(d.season,d.week),now=new Date().toISOString();
  // Clock comes from the server after provider retrieval; client-supplied times are never trusted.
  const c=addSnapshot(s,d.season,d.week,d.proposals,events,now,d.label,crypto.randomUUID());
  const applied=applyProviderEvents(s,events,now);if(applied.conflicts.length)throw Error(applied.conflicts.join(' '));
  // Recheck the wall clock immediately before persistence in case kickoff crossed during processing.
  if(s.pickVersions.some(p=>p.cardId===c.id&&Date.parse(p.snapshotEvidence!.kickoffTimestamp)<=Date.now()))throw Error('Kickoff crossed during validation. Retry to exclude newly locked games.');
  if(!await saveState(s,s.version))return Response.json({error:'Another update completed. Reload before saving.'},{status:409});
  s.version++;return Response.json({...responseData(s),snapshotId:c.id});
 }catch(e:any){return Response.json({error:e.message==='fetch failed'?'Could not reach the verification feed. Nothing was saved; try again.':e.message||'Snapshot validation failed; nothing was saved.'},{status:400});}
}
