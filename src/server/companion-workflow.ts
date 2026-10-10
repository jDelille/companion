import { authorized, fail, type Fetcher, type GatewayConfig } from './odoo-gateway';
import type { CompanionContext, Suggestion } from '../domain/companion';

export const workflowHeaders = {'cache-control': 'private, no-store', vary: 'Cookie', 'x-dojang-data-source': 'odoo-test'};
export const isRecordId = (v: unknown): v is string => typeof v === 'string' && /^[1-9][0-9]{0,9}$/.test(v) && Number(v) <= 2147483647;
const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown, max = 2000): v is string => typeof v === 'string' && v.length <= max;
const key = (v: unknown) => str(v, 128) && /^[A-Za-z0-9][A-Za-z0-9_.:-]{15,127}$/.test(v);
const time = (v: unknown) => str(v, 40) && /^\d{4}-\d\d-\d\dT.*Z$/.test(v) && Number.isFinite(Date.parse(v));
export type WorkflowData = {
  sessions: {sessionId: string; title: string; startsAt: string; endsAt: string; capacity: number; seatsTaken: number; version: number}[];
  roster: {memberId: string; displayName: string; enrollmentStatus: string; attendanceState: string}[];
  followUps: {id: string; memberId: string; sessionId: string; memberName: string; summary: string; replyDraft: string; at: string; status: string; mode: string}[];
  followUpEnabled: boolean; aiEnabled: boolean; sessionTitle: string | null;
};
export function validWorkflowData(v: unknown): v is WorkflowData {
  return obj(v) && typeof v.followUpEnabled === 'boolean' && typeof v.aiEnabled === 'boolean' && (v.sessionTitle === null || str(v.sessionTitle)) &&
    Array.isArray(v.sessions) && v.sessions.length <= 100 && v.sessions.every(s => obj(s) && isRecordId(s.sessionId) && str(s.title) && time(s.startsAt) && time(s.endsAt) && ['capacity','seatsTaken','version'].every(k=>Number.isSafeInteger(s[k]) && Number(s[k]) >= 0)) &&
    Array.isArray(v.roster) && v.roster.length <= 500 && v.roster.every(r => obj(r) && isRecordId(r.memberId) && str(r.displayName) && r.enrollmentStatus === 'registered' && ['pending','present','absent','excused'].includes(String(r.attendanceState))) &&
    Array.isArray(v.followUps) && v.followUps.length <= 50 && v.followUps.every(f => obj(f) && isRecordId(f.id) && isRecordId(f.memberId) && isRecordId(f.sessionId) && ['memberName','summary','replyDraft','status','mode'].every(k=>str(f[k])) && time(f.at));
}
export function validSuggestion(v: unknown): v is Suggestion {
  return obj(v) && str(v.id, 80) && /^followup:[1-9][0-9]{0,9}$/.test(v.id) && str(v.title) && str(v.explanation) && str(v.actionLabel) && v.risk === 'medium' && v.capability === 'followup.save_internal' && Array.isArray(v.preview) && v.preview.length <= 12 && v.preview.every(p=>obj(p) && str(p.label,100) && str(p.value));
}
export async function workflowCall(c: GatewayConfig, operation: string, payload: Record<string, unknown>, fetcher: Fetcher): Promise<Record<string, unknown>> {
  const res = await fetcher(c.backend + '/kiosk/v2/staff/companion-workflow', {method:'POST', redirect:'error', cache:'no-store', signal:AbortSignal.timeout(40000), headers:{'content-type':'application/json', authorization:`Bearer ${c.staffKey}`}, body:JSON.stringify({jsonrpc:'2.0',method:'call',params:{token:c.token, operation,payload}})});
  if (!res.ok) throw new Error('Workflow unavailable');
  const rpc: unknown = await res.json();
  if (!obj(rpc) || rpc.error || !obj(rpc.result)) throw new Error('Invalid workflow result');
  return rpc.result;
}
export function workflowProblem(result: Record<string, unknown>): Response | null {
  if (!obj(result.problem)) return null;
  const code = result.problem.code;
  if (code === 'FORBIDDEN') return fail(code, undefined,403);
  if (code === 'INVALID_COMMAND') return fail(code, undefined,400);
  if (code === 'VERSION_CONFLICT' || code === 'IDEMPOTENCY_CONFLICT' || code === 'ATTENDANCE_REVIEW_REQUIRED') return fail(code, undefined,409);
  return fail('CAPABILITY_DISABLED');
}
export async function workflowRequest(request: Request, c: GatewayConfig, body: Record<string,unknown>, fetcher: Fetcher): Promise<Response> {
  if (!authorized(c,'staff', request.headers.get('cookie') || '') || request.headers.get('origin') !== c.origin) return fail('FORBIDDEN',undefined,403);
  const {followUp, memberId} = body;
  if (Object.keys(body).sort().join() !== ['followUp','memberId','onScreenIds','text'].sort().join() || !isRecordId(memberId) || !obj(followUp) || Object.keys(followUp).sort().join() !== ['correlationId','idempotencyKey','message','sessionId'].sort().join() || !isRecordId(followUp.sessionId) || !str(followUp.message,1500) || !followUp.message.trim() || !key(followUp.idempotencyKey) || !key(followUp.correlationId)) return fail('INVALID_COMMAND',undefined,400);
  try {
    const result = await workflowCall(c,'prepare',{memberId,sessionId:followUp.sessionId,text:followUp.message,idempotencyKey:followUp.idempotencyKey,correlationId:followUp.correlationId},fetcher);
    const issue = workflowProblem(result); if (issue) return issue;
    if (result.outcome !== 'newTask' || !validSuggestion(result.suggestion)) throw new Error('Invalid proposal');
    return Response.json({outcome:'newTask',suggestion:result.suggestion},{headers:workflowHeaders});
  } catch { return new Response(null,{status:503,headers:workflowHeaders}); }
}
export async function workflowContext(c: GatewayConfig, memberId: string | null, sessionId: string | null, fetcher: Fetcher): Promise<CompanionContext> {
  const result = await workflowCall(c,'context',{...(memberId ? {memberId} : {}),...(sessionId ? {sessionId} : {})},fetcher);
  if (!validWorkflowData(result)) throw new Error('Invalid context');
  const records = sessionId ? result.roster.map(r=>({id:r.memberId,label:r.displayName,detail:r.attendanceState === 'pending' ? 'Not yet checked in' : r.attendanceState,href:`/people/${r.memberId}`})) : result.sessions.map(s=>({id:s.sessionId,label:s.title,detail:s.startsAt,href:`/ops/sessions/${s.sessionId}`}));
  return {label:'Connected Odoo records',heading:sessionId ? result.sessionTitle || 'Class roster' : memberId ? 'Member companion' : 'Staff companion',suggestions:[],records,
    sessions:result.sessions.map(s=>({sessionId:s.sessionId,title:s.title,startsAt:s.startsAt})),followUps:result.followUps.map(f=>({id:f.id,memberId:f.memberId,sessionId:f.sessionId,memberName:f.memberName,summary:f.summary,replyDraft:f.replyDraft,at:f.at,status:f.status,mode:f.mode})),followUpEnabled:result.followUpEnabled,
    intel:[{label:'Drafting',value:result.aiEnabled ? 'Configured AI provider; templates if unavailable' : 'Template mode; AI not enabled'}, {label:'Follow-up',value:'Internal review queue. No outbound messages or automatic bookings.'},...(sessionId ? [{label:'Not yet checked in',value:String(result.roster.filter(r=>r.attendanceState==='pending').length)}] : [])]};
}

export async function workflowAnswer(c: GatewayConfig, body: Record<string,unknown>, fetcher: Fetcher): Promise<Response> {
  if (typeof body.text !== 'string' || !body.text.trim() || body.text.length > 500 || (body.memberId != null && !isRecordId(body.memberId)) || (body.sessionId != null && !isRecordId(body.sessionId))) return fail('INVALID_COMMAND',undefined,400);
  try {
    const result = await workflowCall(c,'ask',{text:body.text,...(body.memberId ? {memberId:body.memberId} : {}),...(body.sessionId ? {sessionId:body.sessionId} : {})},fetcher);
    const issue = workflowProblem(result); if (issue) return issue;
    if (result.outcome === 'notUnderstood') return Response.json({outcome:'notUnderstood'},{headers:workflowHeaders});
    if (result.outcome !== 'answer' || !str(result.answer,1800) || !str(result.mode,200)) throw new Error('Invalid answer');
    return Response.json({outcome:'answer',answer:result.answer,mode:result.mode},{headers:workflowHeaders});
  } catch {return fail('CAPABILITY_DISABLED')}
}
