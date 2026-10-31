import {randomBytes,randomUUID,createHash,timingSafeEqual} from 'node:crypto';
import {mkdir,readFile,writeFile,rename,chmod,rm,stat} from 'node:fs/promises';
import path from 'node:path';
import {createLocalJWKSet,jwtVerify} from 'jose';

const issuer='https://auth.openai.com',resource='https://api.openai.com/v1';
const scope='openid profile email offline_access resource.invoke chatgpt.tokens.use.direct';
type Model={slug:string;displayName:string};
type Account={id:string;clientId:string;subject:string;email:string;accessToken?:string;refreshToken?:string;idToken?:string;expiresAt:number;earliestRefreshAt?:number;scopes:string[];models:Model[];model:string;issue?:string};
type Pending={state:string;nonce:string;verifier:string;redirectUri:string;accountId?:string;clientId?:string;expiresAt:number};
type Store={hostId:string;accounts:Account[];activeId?:string;mode:'chatgpt'|'api';pending?:Pending;lastError?:string};
const directory=()=>process.env.CHATGPT_AUTH_DIR||path.join(process.cwd(),'.picker-private','chatgpt');
const filename=()=>path.join(directory(),'connections.json');
const fresh=():Store=>({hostId:'urn:uuid:'+randomUUID(),accounts:[],mode:'chatgpt'});
async function read():Promise<Store>{try{return JSON.parse(await readFile(filename(),'utf8'));}catch(e:any){if(e.code==='ENOENT')return fresh();throw Error('ChatGPT connection storage could not be read. Check its volume permissions.');}}
async function write(s:Store){const tmp=filename()+'.'+randomUUID();try{await writeFile(tmp,JSON.stringify(s),{mode:0o600,flag:'wx'});await rename(tmp,filename());await chmod(filename(),0o600);}finally{await rm(tmp,{force:true});}}
// The volume lock serializes rotating tokens across requests and app processes.
async function locked<T>(fn:(s:Store)=>Promise<T>):Promise<T>{
 await mkdir(directory(),{recursive:true,mode:0o700});await chmod(directory(),0o700);
 const lock=path.join(directory(),'.lock'),until=Date.now()+15000;let held=false;
 while(!held){try{await mkdir(lock,{mode:0o700});held=true;}catch(e:any){if(e.code!=='EEXIST')throw e;const age=Date.now()-(await stat(lock).catch(()=>({mtimeMs:Date.now()}))).mtimeMs;if(age>180000){await rm(lock,{recursive:true,force:true});continue;}if(Date.now()>until)throw Error('ChatGPT connection is busy. Try again shortly.');await new Promise(r=>setTimeout(r,75));}}
 try{return await fn(await read());}finally{await rm(lock,{recursive:true,force:true});}
}
function equal(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
function endpoint(value:string){const u=new URL(value);if(u.origin!==issuer||u.username||u.password)throw Error('OpenAI returned an unexpected authentication endpoint.');return u.href;}
async function request(url:string,init:RequestInit={},fetcher:typeof fetch=fetch){try{return await fetcher(url,{...init,redirect:'error',signal:AbortSignal.timeout(15000)});}catch{throw Error('OpenAI could not be reached. Your connection has been kept; try again later.');}}
async function discovery(fetcher:typeof fetch){const r=await request(issuer+'/.well-known/openid-configuration',{},fetcher);if(!r.ok)throw Error('OpenAI sign-in is temporarily unavailable.');const d=await r.json();if(d.issuer!==issuer)throw Error('OpenAI identity issuer did not match.');return {jwks:endpoint(d.jwks_uri),revoke:endpoint(d.revocation_endpoint)};}
export function callbackUri(){const origin=new URL(process.env.APP_ORIGIN||'http://localhost:3000');const local=['localhost','127.0.0.1','[::1]'].includes(origin.hostname);const port=process.env.CHATGPT_CALLBACK_PORT||(local?(origin.port||'80'):'8757');if(!/^\d+$/.test(port)||+port<1||+port>65535)throw Error('CHATGPT_CALLBACK_PORT must be a valid port.');return `http://127.0.0.1:${port}/auth/callback`;}
export async function chatgptStatus(){const s=await read(),a=s.accounts.find(a=>a.id===s.activeId);return {provider:s.mode,connected:!!a?.accessToken&&!a.issue,activeId:s.activeId||'',accounts:s.accounts.map((a,i)=>({id:a.id,label:`${a.email||'ChatGPT account'} · connection ${i+1}`,connected:!!a.accessToken&&!a.issue,issue:a.issue||''})),models:a?.models||[],model:a?.model||'',pending:!!s.pending&&s.pending.expiresAt>Date.now(),lastError:s.lastError||'',callbackUri:callbackUri(),tunnelCommand:`ssh -N -L ${new URL(callbackUri()).port}:127.0.0.1:${new URL(process.env.APP_ORIGIN||'http://localhost:3000').port||'80'} YOUR_NAS_USER@${new URL(process.env.APP_ORIGIN||'http://localhost:3000').hostname}`,requiresTunnel:!['localhost','127.0.0.1','[::1]'].includes(new URL(process.env.APP_ORIGIN||'http://localhost:3000').hostname)||new URL(callbackUri()).port!==(new URL(process.env.APP_ORIGIN||'http://localhost:3000').port||'80')};}
export async function beginSignIn(accountId?:string){return locked(async s=>{
 if(s.pending&&s.pending.expiresAt>Date.now())throw Error('A sign-in is already open. Finish it or cancel it before starting again.');
 const a=accountId?s.accounts.find(a=>a.id===accountId):undefined;if(accountId&&!a)throw Error('Choose a saved ChatGPT account.');
 const p:Pending={state:randomBytes(32).toString('base64url'),nonce:randomBytes(32).toString('base64url'),verifier:randomBytes(48).toString('base64url'),redirectUri:callbackUri(),accountId:a?.id,clientId:a?.clientId,expiresAt:Date.now()+600000};
 s.pending=p;s.lastError='';await write(s);
 const u=new URL(issuer+'/api/accounts/authorize');const params:Record<string,string>={client_id:a?.clientId||'dynamic_agent_client',ext_agent_host_id:s.hostId,response_type:'code',redirect_uri:p.redirectUri,scope,resource,state:p.state,nonce:p.nonce,code_challenge_method:'S256',code_challenge:createHash('sha256').update(p.verifier).digest('base64url')};
 if(!a)params.agent_name_hint='NFL Picks Dashboard';else{if(a.idToken)params.id_token_hint=a.idToken;if(a.email)params.login_hint=a.email;if(!a.scopes.includes('chatgpt.tokens.use.direct'))params.prompt='consent';}
 for(const [k,v] of Object.entries(params))u.searchParams.set(k,v);return u.href;
});}
function credentials(d:any,prior?:Account){
 if(d.token_type?.toLowerCase()!=='bearer'||typeof d.access_token!=='string'||!d.access_token||!Number.isFinite(d.expires_in)||d.expires_in<=0)throw Error('OpenAI returned incomplete connection credentials.');
 const scopes=typeof d.scope==='string'?d.scope.split(/\s+/):prior?.scopes||[];
 return {accessToken:d.access_token,refreshToken:typeof d.refresh_token==='string'?d.refresh_token:prior?.refreshToken,idToken:typeof d.id_token==='string'?d.id_token:prior?.idToken,expiresAt:Date.now()+d.expires_in*1000,earliestRefreshAt:typeof d.earliest_refresh_at==='number'?d.earliest_refresh_at*1000:undefined,scopes};
}
export async function finishSignIn(url:URL,host:string,fetcher:typeof fetch=fetch){return locked(async s=>{
 const p=s.pending;if(!p||p.expiresAt<Date.now()||!equal(url.searchParams.get('state')||'',p.state))throw Error('This sign-in link is invalid or expired. Start again in Settings.');
 if(host!==new URL(p.redirectUri).host)throw Error('The callback must use the configured 127.0.0.1 loopback address.');
 delete s.pending;await write(s); // Consume the attempt before the one-use code exchange.
 try{
  if(url.searchParams.has('error'))throw Error('ChatGPT sign-in was declined. No existing connection was changed.');
  const clientId=url.searchParams.get('client_id')||p.clientId,code=url.searchParams.get('code');
  if(!code||!clientId||clientId==='dynamic_agent_client'||(p.clientId&&clientId!==p.clientId))throw Error('ChatGPT registration was incomplete or the account registration changed. Start again.');
  // Retain an issued registration even if its one-use code expires before exchange.
  if(!p.accountId&&!s.accounts.some(a=>a.clientId===clientId)){s.accounts.push({id:randomUUID(),clientId,subject:'',email:'',expiresAt:0,scopes:[],models:[],model:'',issue:'Registration needs sign-in. Select this connection and continue with ChatGPT.'});await write(s);}
  const r=await request(issuer+'/api/accounts/oauth/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',client_id:clientId,code,code_verifier:p.verifier,redirect_uri:p.redirectUri,resource})},fetcher);
  if(!r.ok){const error=await r.json().catch(()=>({}));if(error.error==='invalid_grant')throw Error('OpenAI sign-in code expired. Select the saved connection in Settings and continue again.');throw Error('OpenAI could not complete sign-in. Start a new sign-in from Settings.');}
  const d=await r.json();if(typeof d.id_token!=='string')throw Error('OpenAI did not return a signed identity.');const config=await discovery(fetcher),keys=await request(config.jwks,{},fetcher);if(!keys.ok)throw Error('OpenAI identity keys could not be checked.');
  const {payload}=await jwtVerify(d.id_token,createLocalJWKSet(await keys.json()),{issuer,audience:clientId,algorithms:['RS256'],requiredClaims:['sub','exp','iat','nonce']});
  if(payload.nonce!==p.nonce||!payload.sub)throw Error('OpenAI identity validation did not match this sign-in.');
  const prior=p.accountId?s.accounts.find(a=>a.id===p.accountId):s.accounts.find(a=>a.clientId===clientId&&(!a.subject||a.subject===payload.sub));
  if(p.accountId&&(!prior||(prior.subject&&prior.subject!==payload.sub)))throw Error('The signed-in account does not match the selected connection.');
  const c=credentials(d);const a:Account={id:prior?.id||randomUUID(),clientId,subject:payload.sub,email:typeof payload.email==='string'?payload.email:'',...c,models:prior?.models||[],model:prior?.model||''};
  if(!c.scopes.includes('chatgpt.tokens.use.direct')||!c.scopes.includes('resource.invoke'))a.issue='ChatGPT plan permission was not granted. Reconnect to enable it.';
  if(prior)s.accounts[s.accounts.indexOf(prior)]=a;else s.accounts.push(a);s.activeId=a.id;s.mode='chatgpt';s.lastError='';await write(s);return a.id;
 }catch(e:any){s.lastError=knownError(e);await write(s);throw Error(s.lastError);}
});}
function knownError(e:any){return /^(OpenAI|ChatGPT|The signed-in|This sign-in)/.test(e.message||'')?e.message:'ChatGPT identity could not be verified. Start a new sign-in in Settings.';}
const terminalRefresh=new Set(['invalid_grant','invalid_refresh_token','token_expired','refresh_token_expired','refresh_token_invalidated','refresh_token_reused']);
async function token(s:Store,a:Account,fetcher:typeof fetch){
 if(a.issue||!a.accessToken||(!a.scopes.includes('chatgpt.tokens.use.direct')||!a.scopes.includes('resource.invoke')))throw Error(a.issue||'Connect your ChatGPT account in Settings.');
 if(a.expiresAt>Date.now()+60000)return a.accessToken;
 if(a.earliestRefreshAt&&a.earliestRefreshAt>Date.now()){if(a.expiresAt>Date.now())return a.accessToken;throw Error('ChatGPT renewal is not available yet. Try again shortly.');}
 if(!a.refreshToken)throw Error('Reconnect ChatGPT in Settings to renew access.');
 const r=await request(issuer+'/api/accounts/oauth/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',client_id:a.clientId,refresh_token:a.refreshToken,resource})},fetcher);
 if(!r.ok){const d=await r.json().catch(()=>({}));const code=typeof d.error==='string'?d.error:d.error?.code;if(terminalRefresh.has(code)){delete a.accessToken;delete a.refreshToken;delete a.idToken;a.issue='ChatGPT authorization expired or was disconnected. Reconnect in Settings.';await write(s);throw Error(a.issue);}throw Error('OpenAI could not renew the connection. Try again later.');}
 Object.assign(a,credentials(await r.json(),a));if(!a.scopes.includes('chatgpt.tokens.use.direct')||!a.scopes.includes('resource.invoke'))a.issue='ChatGPT plan permission is missing. Reconnect in Settings.';await write(s);if(a.issue)throw Error(a.issue);return a.accessToken!;
}
async function catalog(accessToken:string,fetcher:typeof fetch){const r=await request(resource+'/models',{headers:{Authorization:'Bearer '+accessToken}},fetcher);if(!r.ok)throw Error('OpenAI could not load your ChatGPT models. Check your connection and retry.');const d=await r.json();const models:Model[]=(Array.isArray(d.models)?d.models:[]).filter((m:any)=>m.visibility==='list'&&typeof m.slug==='string'&&typeof m.display_name==='string').map((m:any)=>({slug:m.slug,displayName:m.display_name}));if(!models.length)throw Error('OpenAI returned no available ChatGPT models for this account.');return models;}
export async function refreshModels(fetcher:typeof fetch=fetch){return locked(async s=>{const a=s.accounts.find(a=>a.id===s.activeId);if(!a)throw Error('Connect ChatGPT in Settings first.');a.models=await catalog(await token(s,a,fetcher),fetcher);if(!a.models.some(m=>m.slug===a.model))a.model=a.models[0].slug;await write(s);return a.models;});}
export async function chatgptCredential(fetcher:typeof fetch=fetch){return locked(async s=>{const a=s.accounts.find(a=>a.id===s.activeId);if(s.mode!=='chatgpt'||!a)throw Error('Connect ChatGPT in Settings first.');const accessToken=await token(s,a,fetcher);a.models=await catalog(accessToken,fetcher);if(!a.models.some(m=>m.slug===a.model)){await write(s);throw Error('Your selected ChatGPT model is no longer available. Choose a model in Settings.');}await write(s);return {accessToken,model:a.model};});}
export async function updateConnection(d:any,fetcher:typeof fetch=fetch){return locked(async s=>{
 if(d.action==='cancel'){delete s.pending;s.lastError='';}
 else if(d.action==='provider'){if(!['chatgpt','api'].includes(d.provider))throw Error('Choose ChatGPT or API billing.');s.mode=d.provider;}
 else if(d.action==='select'){const a=s.accounts.find(a=>a.id===d.accountId);if(!a)throw Error('Choose a saved account.');s.activeId=a.id;s.mode='chatgpt';}
 else if(d.action==='model'){const a=s.accounts.find(a=>a.id===s.activeId);if(!a?.models.some(m=>m.slug===d.model))throw Error('Choose a model from your ChatGPT account.');a.model=d.model;}
 else if(d.action==='disconnect'){
  const a=s.accounts.find(a=>a.id===s.activeId);if(!a)throw Error('No active ChatGPT connection.');let revoked=false;
  if(a.refreshToken){for(let i=0;i<2&&!revoked;i++){try{const config=await discovery(fetcher);const r=await request(config.revoke,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token:a.refreshToken,token_type_hint:'refresh_token',client_id:a.clientId})},fetcher);revoked=r.ok;if(r.status<500)break;}catch{}}}
  delete a.accessToken;delete a.refreshToken;delete a.idToken;a.issue='Signed out. Reconnect to use this account.';s.mode='chatgpt';delete s.pending;await write(s);return revoked?'ChatGPT disconnected.':'Signed out locally. Remote revocation could not be confirmed; disconnect the app in ChatGPT Settings → Usage.';
 }else throw Error('Unknown connection action.');
 await write(s);return 'Connection settings updated.';
});}
