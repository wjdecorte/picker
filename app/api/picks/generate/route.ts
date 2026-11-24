export const runtime='nodejs';
export const maxDuration=180;
import {generateWeek} from '../../../generate';
import {writeAllowed} from '../../../write-access';
export async function POST(req:Request){
 if(!writeAllowed(req))return Response.json({error:'Trusted local access is required.'},{status:403});
 const d=await req.json().catch(()=>null);
 // The dashboard always sends its version; a missing one must not skip the stale-dashboard check.
 const r=await generateWeek({season:d?.season,week:d?.week,requestId:d?.requestId,version:typeof d?.version==='number'?d.version:-1});
 return Response.json(r.body,{status:r.status});
}
