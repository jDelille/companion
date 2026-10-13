/** Real Odoo user sessions for the hub. Never upgrade a paired demo cookie. */
import {createCipheriv, createDecipheriv, createHash, randomBytes} from 'node:crypto';

type Fetcher = typeof fetch;
type Config = {origin:string; backend:string; database:string; siteId:string; secret:string};
const cookieName = 'dojang_hub_session';
const responseHeaders = {'cache-control':'private, no-store', vary:'Cookie'};
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const reads = new Set(['context','member_details','member_workspace','crm_context','lead_details','ai_settings','instructor_context','operations_report','session_roster','intake_context','intake_preview','archive_review','archived_members','course_roster','course_assignment_preview','attendance_sessions','attendance_sheet','trial_context','conversion_preview','testing_eligibility','testing_roster','promotion_preview','promotion_history','guardian_kiosk_access','consent_overview','broadcast_context','broadcast_preview','automation_overview','billing_ledger','refund_preview','waiver_context','setup_checklist','member_onboarding']);
const operations = new Set([...reads,'resolve','draft','approve_reply','checkout','book','change_class','update_member','rank','link_guardian','provision','create_lead','update_lead','create_task','complete_task','propose_stage','payment_link','enable_ai','add_lead_note','prepare_lead_action','assign_lead','instructor_clock','correct_timesheet','create_student','archive_member','restore_member','update_member_photo','assign_course_members','mark_attendance','reserve_trial','cancel_trial','record_trial_outcome','convert_trial','save_testing_roster','record_test_results','promote_test_results','reverse_promotion','set_guardian_kiosk_pin','revoke_guardian_kiosk_pin','record_consent','create_broadcast','approve_broadcast','cancel_broadcast','set_automation_active','request_refund','approve_refund','record_refund_payment','cancel_refund','sign_waiver']);
const writeStates:Record<string,string[]>={archive_member:['archived'],restore_member:['restored'],update_member_photo:['photo_updated','photo_removed'],assign_course_members:['course_roster_updated'],mark_attendance:['attendance_recorded'],reserve_trial:['trial_reserved'],cancel_trial:['trial_cancelled'],record_trial_outcome:['trial_attended','trial_no_show'],convert_trial:['trial_converted'],save_testing_roster:['testing_roster_saved'],record_test_results:['test_results_saved'],promote_test_results:['promotions_awarded'],reverse_promotion:['promotion_reversed'],set_guardian_kiosk_pin:['guardian_pin_set'],revoke_guardian_kiosk_pin:['guardian_pin_revoked'],record_consent:['consent_recorded'],create_broadcast:['broadcast_awaiting_approval'],approve_broadcast:['broadcast_approved'],cancel_broadcast:['broadcast_cancelled'],set_automation_active:['automation_paused','automation_resumed'],request_refund:['refund_requested'],approve_refund:['refund_approved'],record_refund_payment:['refund_payment_recorded'],cancel_refund:['refund_cancelled'],sign_waiver:['waiver_signed']};
const testingWrites=new Set(['save_testing_roster','record_test_results','promote_test_results']);
const largeOperations=new Set(['update_member_photo','sign_waiver']);
const trialWrites=new Set(['reserve_trial','cancel_trial','record_trial_outcome','convert_trial']);
const reject = (code:string,status=400) => Response.json({error:{code,status}},{status,headers:responseHeaders});

export function hubConfig(env: NodeJS.ProcessEnv): Config {
  if (env.DOJANG_HUB_ENABLED !== 'true' || env.NEXT_PUBLIC_DEMO_MODE === 'true') throw Error('Hub not enabled');
  const origin = new URL(env.DOJANG_PUBLIC_ORIGIN || '');
  const backend = new URL(env.DOJANG_ODOO_URL || '');
  for (const url of [origin,backend]) {
    if ((url.protocol !== 'https:' && !(url.protocol==='http:' && ['localhost','127.0.0.1','[::1]'].includes(url.hostname))) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw Error('Invalid origin');
  }
  const database=env.DOJANG_ODOO_DATABASE || '', siteId=env.DOJANG_HUB_SITE_ID || '', secret=env.DOJANG_COOKIE_SECRET || '';
  if (!/^[A-Za-z0-9_-]{1,63}$/.test(database) || !/^[1-9][0-9]{0,9}$/.test(siteId) || Number(siteId)>2147483647 || secret.length < 32 || secret.length > 256) throw Error('Invalid hub settings');
  return {origin:origin.origin,backend:backend.origin,database,siteId,secret};
}

function seal(c:Config, session:string) {
  const iv=randomBytes(12), key=createHash('sha256').update('dojang-hub-v1:'+c.secret).digest();
  const cipher=createCipheriv('aes-256-gcm',key,iv);
  const data=Buffer.from(JSON.stringify({session,scope:[c.origin,c.backend,c.database,c.siteId],expires:Date.now()+2*60*60*1000}));
  const encrypted=Buffer.concat([cipher.update(data),cipher.final()]);
  return Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString('base64url');
}

function sessionFrom(c:Config, request:Request): string | null {
  const matches=(request.headers.get('cookie') || '').split(';').map(s=>s.trim()).filter(s=>s.startsWith(cookieName+'='));
  if(matches.length!==1 || matches[0].length>2048) return null;
  try {
    const data=Buffer.from(matches[0].slice(cookieName.length+1),'base64url');
    const decipher=createDecipheriv('aes-256-gcm',createHash('sha256').update('dojang-hub-v1:'+c.secret).digest(),data.subarray(0,12));
    decipher.setAuthTag(data.subarray(12,28));
    const v:unknown=JSON.parse(Buffer.concat([decipher.update(data.subarray(28)),decipher.final()]).toString());
    if(!object(v) || !Number.isSafeInteger(v.expires) || Number(v.expires)<=Date.now() || Number(v.expires)>Date.now()+2*60*60*1000 || JSON.stringify(v.scope)!==JSON.stringify([c.origin,c.backend,c.database,c.siteId]) || typeof v.session!=='string' || !/^[A-Za-z0-9_-]{32,128}$/.test(v.session)) return null;
    return v.session;
  } catch {return null;}
}

async function body(request:Request, limit=16384) {
  if(!request.headers.get('content-type')?.startsWith('application/json')) throw Error('Invalid content type');
  const reader=request.body?.getReader();
  if(!reader) throw Error('Body missing');
  let size=0; const chunks:Uint8Array[]=[];
  while(true){const {done,value}=await reader.read(); if(done)break; size+=value.length; if(size>limit){await reader.cancel();throw Error('Body too large');}chunks.push(value);}
  return JSON.parse(Buffer.concat(chunks).toString()) as unknown;
}

async function rpc(c:Config, path:string, params:Record<string,unknown>, session:string|null, fetcher:Fetcher, timeout=45000) {
  const response=await fetcher(c.backend+path,{method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(timeout),
    headers:{'content-type':'application/json',...(session?{cookie:'session_id='+session}:{})},body:JSON.stringify({jsonrpc:'2.0',method:'call',params})});
  if(!response.ok) throw Error('Backend unavailable');
  const value:unknown=await response.json();
  if(!object(value) || value.error) throw Error('Backend rejected request');
  return {response,result:value.result};
}

/** Public-mode entry removes BOTH staff authorities, retaining only kiosk pairing.
 * This remains possible with an expired cookie or an unavailable Odoo backend.
 * A failed backend revocation is reported honestly; no raw session leaves here.
 */
export async function enterPublicMode(request:Request, env:NodeJS.ProcessEnv, fetcher:Fetcher=fetch) {
  let origin:URL;
  try {
    origin=new URL(env.DOJANG_PUBLIC_ORIGIN || '');
    if (origin.username || origin.password || origin.pathname!=='/' || origin.search || origin.hash ||
      (origin.protocol!=='https:' && !(origin.protocol==='http:' && ['localhost','127.0.0.1','[::1]'].includes(origin.hostname)))) throw Error();
  } catch {return reject('PUBLIC_MODE_NOT_CONFIGURED',503);}
  if(request.method!=='POST' || request.headers.get('origin')!==origin.origin)return reject('FORBIDDEN',403);
  let backendRevoked:boolean|null=null;
  try {
    const c=hubConfig(env), session=sessionFrom(c,request);
    if(session){backendRevoked=false;await rpc(c,'/web/session/destroy',{},session,fetcher,5000);backendRevoked=true;}
  } catch { /* Clearing this browser must not depend on backend availability. */ }
  const response=Response.json({staffContextCleared:true,backendRevoked},{headers:responseHeaders});
  for(const name of [cookieName,'dojang_staff_test'])response.headers.append('set-cookie',
    `${name}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${origin.protocol==='https:'?'; Secure':''}`);
  return response;
}

export async function hubPhotoRoute(request:Request, env:NodeJS.ProcessEnv, fetcher:Fetcher=fetch) {
  let c:Config;
  try {c=hubConfig(env);}catch{return reject('HUB_NOT_CONFIGURED',503);}
  if(request.method!=='POST' || request.headers.get('origin')!==c.origin) return reject('FORBIDDEN',403);
  let data:unknown;
  try {data=await body(request,450000);}catch{return reject('PHOTO_TOO_LARGE',413);}
  if(!object(data) || !largeOperations.has(String(data.operation)))return reject('INVALID_COMMAND');
  return hubRoute(request,env,fetcher,data);
}

export async function hubRoute(request:Request, env:NodeJS.ProcessEnv, fetcher:Fetcher=fetch, parsed?:Record<string,unknown>) {
  let c:Config;
  try {c=hubConfig(env);}catch{return reject('HUB_NOT_CONFIGURED',503);}
  if(request.method!=='POST' || request.headers.get('origin')!==c.origin) return reject('FORBIDDEN',403);
  let data:unknown=parsed;
  if(!parsed){try {data=await body(request);}catch{return reject('INVALID_COMMAND');}}
  if(!object(data) || typeof data.operation!=='string')return reject('INVALID_COMMAND');
  if(!parsed && largeOperations.has(data.operation))return reject('INVALID_COMMAND');
  const operation=data.operation;
  const cookie=(value:string,maxAge=7200)=>`${cookieName}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${c.origin.startsWith('https:')?'; Secure':''}`;
  if(operation==='login'){
    if(Object.keys(data).sort().join()!=='login,operation,password' || typeof data.login!=='string' || !data.login.trim() || data.login.length>200 || typeof data.password!=='string' || !data.password || data.password.length>1024)return reject('INVALID_COMMAND');
    try {
      const {response,result}=await rpc(c,'/web/session/authenticate',{db:c.database,login:data.login,password:data.password},null,fetcher);
      const session=/\bsession_id=([A-Za-z0-9_-]{32,128});/.exec(response.headers.get('set-cookie')||'')?.[1];
      if(!object(result) || !Number.isSafeInteger(result.uid) || Number(result.uid)<=0 || !session)return reject('SIGN_IN_FAILED_OR_MFA_REQUIRED',401);
      const context=await rpc(c,'/companion/hub/action',{siteId:c.siteId,operation:'context',payload:{}},session,fetcher);
      if(!object(context.result) || context.result.error || !object(context.result.principal))return reject('NO_SITE_ACCESS',403);
      return Response.json(context.result,{headers:{...responseHeaders,'set-cookie':cookie(seal(c,session))}});
    }catch{return reject('SIGN_IN_FAILED_OR_MFA_REQUIRED',401);}
  }
  const session=sessionFrom(c,request);
  if(!session)return reject('SIGN_IN_REQUIRED',401);
  if(operation==='logout'){
    if(Object.keys(data).join()!=='operation')return reject('INVALID_COMMAND');
    let revoked=true;
    try {await rpc(c,'/web/session/destroy',{},session,fetcher);}catch{revoked=false;}
    return Response.json({signedOut:true,backendRevoked:revoked},{headers:{...responseHeaders,'set-cookie':cookie('',0)}});
  }
  if(!operations.has(operation) || Object.keys(data).sort().join()!=='operation,payload,requestKey' || !object(data.payload) || (!reads.has(operation) && (typeof data.requestKey!=='string' || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{15,127}$/.test(data.requestKey))))return reject('INVALID_COMMAND');
  try {
    const {result}=await rpc(c,largeOperations.has(operation)?'/companion/hub/photo':'/companion/hub/action',{siteId:c.siteId,operation,payload:data.payload,requestKey:data.requestKey},session,fetcher);
    if(!object(result))throw Error('Invalid result');
    if(object(result.error)){
      const status=[400,401,403,404,409,422,503].includes(Number(result.error.status))?Number(result.error.status):503;
      return reject(typeof result.error.code==='string' && /^[A-Z_]{1,80}$/.test(result.error.code)?result.error.code:'BACKEND_UNAVAILABLE',status);
    }
    if(operation==='instructor_clock'||operation==='correct_timesheet'){
      const shift=result.shift;
      const expected=operation==='correct_timesheet'?'timesheet_corrected':data.payload.direction==='in'?'clocked_in':'clocked_out';
      if(result.state!==expected||!object(shift)||typeof shift.id!=='string'||!/^[1-9][0-9]*$/.test(shift.id)||
        typeof shift.checkIn!=='string'||!Number.isFinite(Date.parse(shift.checkIn))||
        (expected==='clocked_in'?shift.checkOut!==null:typeof shift.checkOut!=='string'||!Number.isFinite(Date.parse(shift.checkOut)))||
        (operation==='correct_timesheet'&&shift.id!==data.payload.shiftId)||
        (operation==='instructor_clock'&&data.payload.direction==='out'&&shift.id!==data.payload.currentShiftId))return reject('BACKEND_UNAVAILABLE_RETRY_SAME_ACTION',503);
    }
    if(operation==='create_student'){
      if(result.state!=='student_created'||typeof result.memberId!=='string'||!(/^[1-9][0-9]{0,9}$/).test(result.memberId)||
        typeof result.memberNumber!=='string'||!result.memberNumber||typeof result.replayed!=='boolean'||
        result.subscriptionCreated!==false||result.enrollmentCreated!==false||result.portalAccessGranted!==false||result.messageSent!==false)
        return reject('BACKEND_UNAVAILABLE_RETRY_SAME_ACTION',503);
    }
    if(writeStates[operation]){
      const subject=testingWrites.has(operation)?(typeof result.testId==='string'&&(data.payload.testId===null||result.testId===data.payload.testId)&&(operation!=='promote_test_results'||(result.messageSent===false&&result.invoiceCreated===false))):operation==='reverse_promotion'?result.rankHistoryId===data.payload.rankHistoryId:operation==='sign_waiver'?result.memberId===data.payload.memberId&&result.messageSent===false&&!JSON.stringify(result).includes('base64'):['request_refund','approve_refund','record_refund_payment','cancel_refund'].includes(operation)?typeof result.refundId==='string'&&(operation==='request_refund'?result.memberId===data.payload.memberId:result.refundId===data.payload.refundId)&&result.moneyReturned===(operation==='record_refund_payment'):operation==='record_consent'?result.memberId===data.payload.memberId&&result.partnerId===data.payload.partnerId&&result.consent===data.payload.state&&result.messageSent===false:['create_broadcast','approve_broadcast','cancel_broadcast'].includes(operation)?typeof result.broadcastId==='string'&&(operation==='create_broadcast'||result.broadcastId===data.payload.broadcastId)&&result.messageSent===false:operation==='set_automation_active'?result.automationId===data.payload.automationId&&result.state===(data.payload.active?'automation_resumed':'automation_paused'):operation==='set_guardian_kiosk_pin'||operation==='revoke_guardian_kiosk_pin'?result.memberId===data.payload.memberId&&result.guardianId===data.payload.guardianId&&result.messageSent===false&&!JSON.stringify(result).includes(String(data.payload.pin??'\u0000')):trialWrites.has(operation)?(operation==='reserve_trial'?result.leadId===data.payload.leadId&&result.memberId===data.payload.memberId&&result.sessionId===data.payload.sessionId:result.trialId===data.payload.trialId)&&result.messageSent===false&&result.stageChanged!==true&&result.paymentCollected!==true&&result.portalAccessGranted!==true:operation==='assign_course_members'?result.templateId===data.payload.templateId:result.memberId===data.payload.memberId&&(operation!=='mark_attendance'||(result.sessionId===data.payload.sessionId&&result.after===data.payload.status));
      if(!writeStates[operation].includes(String(result.state))||!subject||typeof result.replayed!=='boolean')
        return reject('BACKEND_UNAVAILABLE_RETRY_SAME_ACTION',503);
    }
    if(operation==='payment_link'){
      // Never let backend data navigate the browser to a different origin or
      // another invoice. Only the configured Odoo checkout is trusted.
      if(typeof result.checkoutUrl!=='string' || typeof result.invoiceId!=='string' ||
        result.invoiceId!==data.payload.invoiceId || result.memberId!==data.payload.memberId ||
        typeof result.amount!=='number' || !Number.isFinite(result.amount) || result.amount<=0 || result.amount!==data.payload.expectedAmount ||
        typeof result.currency!=='string' || !/^[A-Z]{3}$/.test(result.currency))return reject('PAYMENT_RESPONSE_INVALID',502);
      const checkout=new URL(result.checkoutUrl);
      checkout.pathname=checkout.pathname.replace(/^\/+/, '/');
      if(checkout.origin!==c.backend || checkout.username || checkout.password ||
        checkout.pathname!==`/my/invoices/${result.invoiceId}` || !checkout.searchParams.get('access_token') ||
        checkout.searchParams.get('move_id')!==result.invoiceId || !checkout.searchParams.get('payment_token'))return reject('PAYMENT_RESPONSE_INVALID',502);
      result.checkoutUrl=checkout.href;
    }
    return Response.json(result,{headers:responseHeaders});
  }catch{return reject('BACKEND_UNAVAILABLE_RETRY_SAME_ACTION',503);}
}
