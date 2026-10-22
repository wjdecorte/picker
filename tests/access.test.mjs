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
