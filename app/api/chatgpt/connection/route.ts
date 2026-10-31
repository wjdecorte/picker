import {refreshModels,updateConnection} from '../../../chatgpt';
import {writeAllowed} from '../../../write-access';
export const runtime='nodejs';
export async function POST(req:Request){
 if(!writeAllowed(req))return Response.json({error:'Trusted local access is required.'},{status:403});
 try{const d=await req.json();if(d.action==='models'){await refreshModels();return Response.json({message:'Available ChatGPT models refreshed.'},{headers:{'Cache-Control':'no-store'}});}return Response.json({message:await updateConnection(d)},{headers:{'Cache-Control':'no-store'}});}catch(e:any){return Response.json({error:e.message||'Connection could not be updated.'},{status:400});}
}
