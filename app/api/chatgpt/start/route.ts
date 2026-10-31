import {beginSignIn} from '../../../chatgpt';
import {writeAllowed} from '../../../write-access';
export const runtime='nodejs';
export async function POST(req:Request){
 if(!writeAllowed(req))return new Response('Trusted local access is required.',{status:403});
 try{const form=await req.formData();const account=String(form.get('accountId')||'');return new Response(null,{status:303,headers:{Location:await beginSignIn(account||undefined),'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});}catch(e:any){return new Response(e.message||'Sign-in could not start. Return to Settings and try again.',{status:400,headers:{'Content-Type':'text/plain','Cache-Control':'no-store'}});}
}
