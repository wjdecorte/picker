export const runtime='nodejs';
import {loadState,saveState,responseData} from '../../repository';
import {retrieveWeek} from '../../score-service';
import {validateWeek,syncWeek} from '../../pick-workflow';
import {writeAllowed} from '../../write-access';
export async function POST(req:Request){if(!writeAllowed(req))return Response.json({error:'Trusted local access is required.'},{status:403});try{const d=await req.json();validateWeek(d.season,d.week);const s=await loadState();if(d.version!==s.version)return Response.json({error:'The dashboard changed. Refresh and try again.'},{status:409});const events=await retrieveWeek(d.season,d.week);syncWeek(s,events,d.season,d.week,new Date().toISOString());if(!await saveState(s,s.version))return Response.json({error:'Another update completed. Refresh and try again.'},{status:409});s.version++;return Response.json(responseData(s));}catch(e:any){return Response.json({error:e.message==='fetch failed'?'Schedule provider unavailable. Try again.':e.message},{status:400});}}
