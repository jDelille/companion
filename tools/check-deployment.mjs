#!/usr/bin/env node
// Read-only release check. The sole POST pairs an authorized staff test session.
// Supply DOJANG_STAFF_PAIR_KEY through your secret manager/environment, never argv.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
export async function checkDeployment(origin, expectedSha, pairKey, fetcher=fetch) {
  const url=new URL(origin);
  if(url.protocol!=='https:' || url.origin!==origin || url.username || url.password) throw Error('Use an HTTPS origin with no path or credentials.');
  if(!/^[a-f0-9]{40}$/.test(expectedSha)) throw Error('Provide the full expected release commit SHA.');
  if(!pairKey || pairKey.length<32) throw Error('Set DOJANG_STAFF_PAIR_KEY in the operator environment.');
  const get=async(path,headers={})=>fetcher(origin+path,{headers,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(45000)});
  const healthResponse=await get('/api/health');
  if(!healthResponse.ok) throw Error('The deployed build does not expose the release check.');
  const health=await healthResponse.json();
  assert.equal(health.service,'dojang-companion','Unexpected service.');
  assert.equal(health.mode,'odoo-test','Deployment is not in connected test mode.');
  assert.equal(health.revision,expectedSha,'Deployed source does not match the expected commit.');
  const paired=await fetcher(origin+'/api/integration/pair',{method:'POST',redirect:'manual',headers:{origin,'content-type':'application/json'},body:JSON.stringify({role:'staff',pairKey}),signal:AbortSignal.timeout(15000)});
  const raw=paired.headers.get('set-cookie')||'';
  if(paired.status!==303 || !/^dojang_staff_test=[A-Za-z0-9_.-]+;/.test(raw)) throw Error('Staff pairing failed.');
  const readyResponse=await get('/api/integration/readiness',{cookie:raw.split(';',1)[0]});
  if(!readyResponse.ok) throw Error('Connected checks failed; verify both gateway roles, fixture scope and follow-up enablement.');
  const ready=await readyResponse.json();
  assert.equal(ready.revision,expectedSha,'Release changed during the check.');
  assert.equal(ready.status,'connected_test_ready','Backend is not ready for the bounded test.');
  assert.equal(ready.backend,'verified_read_round_trip','No verified backend read.');
  assert.equal(ready.productionReady,false,'Unexpected readiness contract.');
  for(const key of ['kioskRead','staffRead','companionRead']) assert.equal(ready.checks?.[key],true,'Missing '+key+' verification.');
  return {origin,revision:expectedSha,status:ready.status,backend:ready.backend,capabilities:ready.capabilities,productionReady:false};
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
 const [origin,expectedSha]=process.argv.slice(2);
 if(!origin || !expectedSha){console.error('Usage: node companion/tools/check-deployment.mjs https://your-staging-host FULL_COMMIT_SHA');process.exitCode=1;}
 else checkDeployment(origin,expectedSha,process.env.DOJANG_STAFF_PAIR_KEY).then(result=>console.log(JSON.stringify(result,null,2))).catch(()=>{console.error('Deployment verification failed. Check the HTTPS origin, expected revision, staff pairing key and server readiness. No secrets or raw provider responses were logged.');process.exitCode=1;});
}
