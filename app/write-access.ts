import { timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
function sameSecret(a:string,b:string) { const x=Buffer.from(a), y=Buffer.from(b); return x.length===y.length&&timingSafeEqual(x,y); }
function local(host:string) { return ['localhost','127.0.0.1','[::1]'].includes(host); }
function privateLan(host:string) {
  const ip=host.replace(/^\[|\]$/g,'');
  if(isIP(ip)===4) { const [a,b]=ip.split('.').map(Number); return a===10||(a===172&&b>=16&&b<=31)||(a===192&&b===168); }
  if(isIP(ip)===6) return /^f[cd][0-9a-f]{2}:/i.test(ip);
  return host.endsWith('.local')||host.endsWith('.lan')||host.endsWith('.home.arpa')||(!host.includes('.')&&/^[a-z0-9-]+$/i.test(host));
}
export function writeAllowed(req:Request) {
  try {
    const url=new URL(req.url), configured=new URL(process.env.APP_ORIGIN||url.origin);
    if(!['http:','https:'].includes(configured.protocol))return false;
    const origin=req.headers.get('origin');
    if(origin&&origin!==configured.origin)return false;
    const secret=process.env.RESULTS_SERVICE_KEY;
    if(secret&&sameSecret(req.headers.get('authorization')||'',`Bearer ${secret}`))return true;
    // Compare the browser-facing Host, not Next.js's internal container address.
    const browserHost=new URL(url.protocol+'//'+(req.headers.get('host')||url.host));
    if(browserHost.host!==configured.host)return false;
    if(local(configured.hostname)&&local(browserHost.hostname))return true;
    // Explicitly enabled trusted-LAN use; never accept forwarded-host or Sites headers.
    return process.env.ALLOW_LAN_ACCESS==='true'&&privateLan(configured.hostname);
  } catch { return false; }
}
