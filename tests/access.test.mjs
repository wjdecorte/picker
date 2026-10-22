import test from 'node:test';
import assert from 'node:assert/strict';
import {writeAllowed} from '../app/write-access.ts';
test('Local writes enforce origin; remote writes require a service token and reject old Sites identity headers',()=>{
 const original={origin:process.env.APP_ORIGIN,key:process.env.RESULTS_SERVICE_KEY};
 try {
  process.env.APP_ORIGIN='http://localhost:3000';process.env.RESULTS_SERVICE_KEY='fixture-only';
  assert(writeAllowed(new Request('http://localhost:3000/api/data',{headers:{origin:'http://localhost:3000'}})));
  assert(!writeAllowed(new Request('http://localhost:3000/api/data',{headers:{origin:'https://untrusted.example'}})));
  assert(writeAllowed(new Request('http://0.0.0.0:3000/api/data',{headers:{host:'localhost:3000',origin:'http://localhost:3000'}})));
  assert(!writeAllowed(new Request('http://0.0.0.0:3000/api/data',{headers:{host:'untrusted.example',origin:'http://localhost:3000'}})));
  process.env.APP_ORIGIN='https://picker.example';
  assert(!writeAllowed(new Request('https://picker.example/api/data',{headers:{origin:'https://picker.example','oai-authenticated-user-id':'spoofed'}})));
  assert(writeAllowed(new Request('https://picker.example/api/results',{headers:{authorization:'Bearer fixture-only'}})));
 }finally{if(original.origin===undefined)delete process.env.APP_ORIGIN;else process.env.APP_ORIGIN=original.origin;if(original.key===undefined)delete process.env.RESULTS_SERVICE_KEY;else process.env.RESULTS_SERVICE_KEY=original.key;}
});
test('Trusted LAN access requires explicit opt-in, configured origin and matching Host',()=>{
 const original={origin:process.env.APP_ORIGIN,lan:process.env.ALLOW_LAN_ACCESS,key:process.env.RESULTS_SERVICE_KEY};
 const request=(host,origin=`http://${host}`,extra={})=>new Request('http://0.0.0.0:3000/api/data',{headers:{host,origin,...extra}});
 try {
  delete process.env.RESULTS_SERVICE_KEY;delete process.env.ALLOW_LAN_ACCESS;
  process.env.APP_ORIGIN='http://192.168.1.20:8756';
  assert(!writeAllowed(request('192.168.1.20:8756')));
  process.env.ALLOW_LAN_ACCESS='true';
  for(const host of ['192.168.1.20','10.0.0.20','172.16.0.20','172.31.0.20','nas.local','nas.lan','nas.home.arpa','synology','[fd12::20]']) {
   process.env.APP_ORIGIN=`http://${host}:8756`;assert(writeAllowed(request(`${host}:8756`)),host);
  }
  process.env.APP_ORIGIN='http://192.168.1.20:8756';
  assert(!writeAllowed(request('192.168.1.20:8756','https://untrusted.example')));
  assert(!writeAllowed(request('192.168.1.21:8756','http://192.168.1.20:8756')));
  assert(!writeAllowed(request('192.168.1.20:3000','http://192.168.1.20:8756')));
  assert(!writeAllowed(request('untrusted.example','http://192.168.1.20:8756',{'x-forwarded-host':'192.168.1.20:8756'})));
  for(const host of ['picker.example','8.8.8.8','172.32.0.20','192.169.1.20']) {
   process.env.APP_ORIGIN=`http://${host}:8756`;assert(!writeAllowed(request(`${host}:8756`)),host);
  }
  process.env.APP_ORIGIN='not a URL';assert(!writeAllowed(request('192.168.1.20:8756')));
 }finally{for(const [key,value] of Object.entries({APP_ORIGIN:original.origin,ALLOW_LAN_ACCESS:original.lan,RESULTS_SERVICE_KEY:original.key})){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
});
