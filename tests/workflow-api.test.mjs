import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {updateConnection} from '../app/chatgpt.ts';
import {getPool,closeDatabase} from '../db/client.ts';
import {loadState} from '../app/repository.ts';
import {POST as generate} from '../app/api/picks/generate/route.ts';
import {POST as savePick} from '../app/api/picks/route.ts';
import {POST as loadWeek} from '../app/api/weeks/route.ts';
import {GET as config} from '../app/api/config/route.ts';
const base=process.env.DATABASE_URL;
test('App workflow persists AI cards, idempotency, independent manual overrides, errors and kickoff locks in PostgreSQL',{skip:!base},async()=>{
 const admin=new pg.Client({connectionString:base});await admin.connect();const schema='workflow_test_'+Date.now();await admin.query(`CREATE SCHEMA ${schema}`);const url=new URL(base);url.searchParams.set('options','-c search_path='+schema);
 const authDir=await mkdtemp(path.join(os.tmpdir(),'picker-workflow-auth-'));
 const env={CHATGPT_AUTH_DIR:process.env.CHATGPT_AUTH_DIR,DATABASE_URL:process.env.DATABASE_URL,APP_ORIGIN:process.env.APP_ORIGIN,OPENAI_API_KEY:process.env.OPENAI_API_KEY},realFetch=globalThis.fetch,RealDate=globalThis.Date;
 process.env.CHATGPT_AUTH_DIR=authDir;process.env.DATABASE_URL=url.href;process.env.APP_ORIGIN='http://127.0.0.1:3000';process.env.OPENAI_API_KEY='workflow-qa-not-real';
 globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:['2026-10-22T12:00:00Z']));}static now(){return RealDate.parse('2026-10-22T12:00:00Z');}};
 let modelCalls=0,refusal=false,subscription=false,streamFailure=false;
 const raw=JSON.parse(await readFile('tests/fixtures/espn-odds.json','utf8'));
 globalThis.fetch=async(url,init)=>{if(String(url).startsWith('https://site.api.espn.com/'))return Response.json(raw);if(url==='https://api.openai.com/v1/models')return Response.json({models:[{slug:'fixture',display_name:'Fixture',visibility:'list'}]});assert.equal(url,'https://api.openai.com/v1/responses');modelCalls++;if(refusal)return Response.json({status:'completed',output:[{content:[{type:'refusal'}]}]});const payload=JSON.parse(init.body);if(subscription){assert.equal(init.headers.Authorization,'Bearer subscription-qa-only');assert.equal(payload.stream,true);assert(!('max_output_tokens'in payload));if(streamFailure)return new Response('data: '+JSON.stringify({type:'response.failed',response:{error:{code:'subscription_sharing_usage_limit_exceeded'}}})+'\n\n',{headers:{'Content-Type':'text/event-stream','x-request-id':'request_qa'}});}const rows=JSON.parse(subscription?payload.input[0].content:payload.input).games.map((g,i)=>({gameId:g.gameId,team:g.away,confidence:5.5,classification:i===0?'Play':'Lean',rationale:'Mock response for database integration testing; not a live recommendation.'}));const completed={id:'resp_qa_'+modelCalls,model:'fixture',status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({picks:rows})}]}]};return subscription?new Response('data: '+JSON.stringify({type:'response.completed',response:completed})+'\n\n',{headers:{'Content-Type':'text/event-stream'}}):Response.json(completed);};
 const request=body=>new Request('http://127.0.0.1:3000/api/picks',{method:'POST',body:JSON.stringify(body)});
 try{
  await updateConnection({action:'provider',provider:'api'});
  const migration=spawnSync(process.execPath,['scripts/migrate.mjs'],{env:process.env,encoding:'utf8'});assert.equal(migration.status,0,migration.stderr);
  let s=await loadState();const initial=JSON.parse(JSON.stringify(s.pickVersions)),id=crypto.randomUUID();const r=await generate(request({season:2026,week:7,version:s.version,requestId:id}));assert.equal(r.status,200,await r.clone().text());let d=await r.json();assert.equal(d.generation.saved,14);assert.equal(modelCalls,1);assert(!JSON.stringify(d).includes('workflow-qa-not-real'));
  const again=await generate(request({season:2026,week:7,version:0,requestId:id}));assert.equal(again.status,200);assert.equal(modelCalls,1);
  const p=d.pickVersions.find(p=>p.runId===id),g=d.schedule.find(g=>g.id===p.gameId);const manual=await savePick(request({action:'override',version:d.version,gameId:g.id,team:g.home,spread:-3,confidence:6,classification:'Play',rationale:'Personal adjustment',reason:'QA override'}));assert.equal(manual.status,200,await manual.clone().text());d=await manual.json();const mid=d.schedule.find(x=>x.id===g.id).officialVersionId;assert.equal(d.pickVersions.find(v=>v.id===mid).overrideOf,p.id);
  const recheck=await generate(request({season:2026,week:7,version:d.version,requestId:crypto.randomUUID()}));assert.equal(recheck.status,200,await recheck.clone().text());d=await recheck.json();assert.equal(d.generation.retainedOverrides,1);assert.equal(d.schedule.find(x=>x.id===g.id).officialVersionId,mid);
  s=await loadState();for(const v of initial)assert.deepEqual(s.pickVersions.find(x=>x.id===v.id),v);assert.equal(s.actualBets.length,0);assert.equal((await getPool().query("SELECT count(*)::int n FROM model_runs WHERE status='completed'")).rows[0].n,2);
  refusal=true;const count=s.pickVersions.length;const bad=await generate(request({season:2026,week:7,version:s.version,requestId:crypto.randomUUID()}));assert.equal(bad.status,400);assert.equal((await loadState()).pickVersions.length,count);
  const saved=(await loadState());const ended=saved.eventGames.find(g=>g.status==='Complete');assert.equal((await savePick(request({action:'override',version:saved.version,gameId:ended.id,reason:'Too late'}))).status,400);
  assert.equal((await loadWeek(request({season:2026,week:99,version:saved.version}))).status,400);
  const settings=await (await config()).json();assert.equal(settings.llm.configured,true);assert(!JSON.stringify(settings).includes('workflow-qa-not-real'));
  // OAuth itself is signature-tested separately; this fixture exercises subscription streaming through the real PostgreSQL route.
  refusal=false;subscription=true;await writeFile(path.join(authDir,'connections.json'),JSON.stringify({hostId:'urn:uuid:qa',mode:'chatgpt',activeId:'qa',accounts:[{id:'qa',clientId:'oaiapp_qa',subject:'qa',email:'qa@example.test',accessToken:'subscription-qa-only',expiresAt:Date.now()+3600000,scopes:['resource.invoke','chatgpt.tokens.use.direct'],models:[{slug:'fixture',displayName:'Fixture'}],model:'fixture'}]}));
  s=await loadState();const sub=await generate(request({season:2026,week:7,version:s.version,requestId:crypto.randomUUID()}));assert.equal(sub.status,200,await sub.clone().text());const sd=await sub.json();assert.equal(sd.generation.saved,14);assert(!JSON.stringify(sd).includes('subscription-qa-only'));assert.equal(sd.schedule.find(x=>x.id===g.id).officialVersionId,mid);
  s=await loadState();streamFailure=true;const before=s.pickVersions.length;const limited=await generate(request({season:2026,week:7,version:s.version,requestId:crypto.randomUUID()}));assert.equal(limited.status,400);const failure=await limited.json();assert.equal(failure.providerError.code,'subscription_sharing_usage_limit_exceeded');assert.equal(failure.providerError.requestId,'request_qa');assert.equal((await loadState()).pickVersions.length,before);
  const denied=new Request('https://attacker.example/api/picks',{method:'POST',headers:{origin:'https://attacker.example'},body:'{}'});assert.equal((await generate(denied)).status,403);
 }finally{globalThis.fetch=realFetch;globalThis.Date=RealDate;await closeDatabase();for(const [key,v] of Object.entries(env))if(v===undefined)delete process.env[key];else process.env[key]=v;await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.end();await rm(authDir,{recursive:true,force:true});}
});
