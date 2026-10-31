'use client';
import {useEffect,useState} from 'react';
import {ExternalLink,RefreshCw} from 'lucide-react';
export default function ChatGPTSettings({config,onRefresh}:{config:any;onRefresh:()=>Promise<void>}){
 const c=config?.chatgpt,[busy,setBusy]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState(''),[waiting,setWaiting]=useState(false),[account,setAccount]=useState('');
 useEffect(()=>{setAccount(c?.activeId||'');},[c?.activeId]);
 useEffect(()=>{if(c?.connected&&!c.pending)setWaiting(false);},[c?.connected,c?.pending]);
 useEffect(()=>{const timer=setInterval(()=>{if(document.visibilityState==='visible')onRefresh().catch(()=>{});},4000);return()=>clearInterval(timer);},[onRefresh]);
 async function update(body:any){setBusy(body.action);setError('');setMessage('');try{const r=await fetch('/api/chatgpt/connection',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),d=await r.json();if(!r.ok)throw Error(d.error);setMessage(d.message);if(body.action==='cancel')setWaiting(false);await onRefresh();}catch(e:any){setError(e.message||'Could not update your connection.');}finally{setBusy('');}}
 const issue=c?.accounts?.find((a:any)=>a.id===c.activeId)?.issue;
 return <div className="chatgpt-connection">
 <p>Use your ChatGPT Plus plan for weekly picks. Sign in with OpenAI and authorize this app; your password stays with OpenAI.</p>
 <label>Generation billing<select value={c?.provider||'chatgpt'} disabled={!!busy||!c} onChange={e=>update({action:'provider',provider:e.target.value})}><option value="chatgpt">ChatGPT subscription</option><option value="api">OpenAI API key · separate billing</option></select></label>
 {error&&<p className="connection-error" role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
 {c?.provider==='chatgpt'&&<>
 <p className={'connection-state '+(c?.connected?'connected':'')}><span/>{c?.connected?'ChatGPT connected':'ChatGPT not connected'}</p>
 {c?.accounts?.length>0&&<div className="connection-account"><label>Saved ChatGPT account<select value={account} disabled={!!busy} onChange={e=>setAccount(e.target.value)}>{c.accounts.map((a:any)=><option key={a.id} value={a.id}>{a.label}{a.connected?'':' · signed out'}</option>)}<option value="">Add another account or workspace</option></select></label>{account&&account!==c.activeId&&<button className="control-button" disabled={!!busy} onClick={()=>update({action:'select',accountId:account})}>Use this account</button>}</div>}
 {c?.activeId&&<p>Active account: {c.accounts.find((a:any)=>a.id===c.activeId)?.label}</p>}
 {issue&&<p className="connection-error">{issue}</p>}
 {c?.requiresTunnel&&<details className="connection-tunnel" open={!c?.connected}><summary>Connect from your Synology NAS</summary><p>Open a terminal on the computer running this browser. Keep this SSH tunnel open during sign-in, then choose Continue with ChatGPT. Replace YOUR_NAS_USER with your NAS account. SSH must be enabled on the NAS.</p><pre><code>{c.tunnelCommand}</code></pre><p>OpenAI returns to {c.callbackUri}. The tunnel forwards that loopback callback to this app. Close the tunnel after sign-in; the NAS renews the connection itself. A phone can use the saved connection after you connect from a computer.</p></details>}
 <div className="connection-actions"><form method="post" action="/api/chatgpt/start" target="_blank" rel="noopener noreferrer" onSubmit={()=>{setWaiting(true);setError('');setMessage('Complete sign-in in the new tab, then return here.');}}><input type="hidden" name="accountId" value={account}/><button className="control-button chatgpt-signin" disabled={!!busy||c?.pending}>Continue with ChatGPT <ExternalLink size={15}/></button></form>{c?.connected&&<button className="quiet-button" disabled={!!busy} onClick={()=>update({action:'disconnect'})}>Disconnect ChatGPT</button>}{(waiting||c?.pending)&&<button className="quiet-button" disabled={!!busy} onClick={()=>update({action:'cancel'})}>Cancel sign-in</button>}</div>
 {c?.pending&&<p role="status">Waiting for OpenAI authorization. This page updates automatically.</p>}{c?.lastError&&<p className="connection-error" role="alert">{c.lastError}</p>}
 {c?.connected&&<div className="connection-model"><label>ChatGPT model<select value={c.model||''} disabled={!!busy||!c.models?.length} onChange={e=>update({action:'model',model:e.target.value})}>{!c.models?.length&&<option value="">Refresh available models</option>}{c.models?.map((m:any)=><option key={m.slug} value={m.slug}>{m.displayName}</option>)}</select></label><button className="control-button" disabled={!!busy} onClick={()=>update({action:'models'})}><RefreshCw size={15}/>{busy==='models'?'Refreshing…':'Refresh models'}</button></div>}
 <p>Generation uses the selected account’s plan limits. Plus usage is shared across connected apps. No request automatically falls back to paid API billing. <a href="https://chatgpt.com/settings/usage" target="_blank" rel="noreferrer">Manage usage and access <ExternalLink size={12}/></a></p>
 </>}
 {c?.provider==='api'&&<><p className={'connection-state '+(config?.llm?.configured?'connected':'')}><span/>{config?.llm?.configured?'API key configured':'API key not configured'}</p><p>This option uses separately billed API requests. Configure these variables on the NAS and recreate the app container. Keys stay on the server.</p><pre><code>{'OPENAI_API_KEY=your-api-key\nOPENAI_MODEL=gpt-4.1'}</code></pre><p>Current API model: {config?.llm?.model||'Not configured'}. To use Plus instead, select ChatGPT subscription above.</p></>}
 </div>;
}
