import { timingSafeEqual } from 'node:crypto';
function sameSecret(a:string,b:string) { const x=Buffer.from(a), y=Buffer.from(b); return x.length===y.length&&timingSafeEqual(x,y); }
export function writeAllowed(req:Request) {
  const url=new URL(req.url), origin=req.headers.get('origin');
  const configured=new URL(process.env.APP_ORIGIN||url.origin).origin;
  if (origin&&origin!==configured) return false;
  const secret=process.env.RESULTS_SERVICE_KEY;
  if (secret&&sameSecret(req.headers.get('authorization')||'',`Bearer ${secret}`)) return true;
  const local=(s:string)=>['localhost','127.0.0.1','[::1]'].includes(new URL(s).hostname);
  // Personal local deployment only. Remote deployments need explicit authentication.
  const browserHost=new URL(url.protocol+'//'+(req.headers.get('host')||url.host));
  return local(configured)&&local(browserHost.origin)&&browserHost.host===new URL(configured).host;
}
