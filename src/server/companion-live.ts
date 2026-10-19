import { workflowAnswer, workflowContext, workflowRequest, workflowCall, workflowProblem, isRecordId } from "./companion-workflow";
import { randomUUID } from "node:crypto";
import type { CompanionContext, Suggestion } from "../domain/companion";
import { authorized, fail, handle, type Fetcher, type GatewayConfig } from "./odoo-gateway";

const responseHeaders = { "cache-control": "private, no-store", "vary": "Cookie", "x-dojang-data-source": "odoo-test" };
const recordId = (value: unknown): value is string => typeof value === "string" && /^[1-9][0-9]{0,9}$/.test(value) && Number(value) <= 2147483647;
const key = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_.:-]{15,127}$/.test(value);
const object = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

async function readJson(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.byteLength;
    if (size > 8192) { await reader.cancel(); throw new Error("Request too large"); }
    chunks.push(part.value);
  }
  return JSON.parse(Buffer.concat(chunks).toString());
}

function suggestion(memberId: string, data: Record<string, unknown>): Suggestion {
  const attendance = data.attendance as {latest: {sessionTitle: string; checkedInAt: string} | null; lastSevenDays: number};
  return {
    id: `attendance-review:${memberId}`, title: "Review verified attendance",
    explanation: "Read the selected member's attendance from Odoo and save a review receipt. No membership, billing, rank, or messages will change.",
    actionLabel: "Verify attendance", capability: "attendance.read", risk: "low",
    preview: [
      {label: "Source", value: "Odoo test database"},
      {label: "Check-ins in 7 days", value: String(attendance.lastSevenDays)},
      {label: "Latest class", value: attendance.latest?.sessionTitle || "No recorded check-in"},
      {label: "Model mode", value: "Guided lookup, not generative AI"},
    ],
  };
}

/** One bounded live tool, deliberately not an unrestricted AI or message sender. */
export async function liveCompanion(request: Request, config: GatewayConfig, kind: "context" | "request" | "approval", fetcher: Fetcher = fetch): Promise<Response> {
  if (!authorized(config, "staff", request.headers.get("cookie") || "")) return fail("FORBIDDEN", undefined, 403);
  const correlation = `companion-${randomUUID()}`;
  let body: unknown = null;
  if (kind !== "context") {
    if (request.headers.get("origin") !== config.origin || !request.headers.get("content-type")?.includes("application/json")) return fail("FORBIDDEN", correlation, 403);
    try { body = await readJson(request); } catch { return fail("INVALID_COMMAND", correlation, 400); }
    if (!object(body)) return fail("INVALID_COMMAND", correlation, 400);
  }
  const memberId = kind === "context" ? new URL(request.url).searchParams.get("memberId") : (body as Record<string, unknown>).memberId;
  const sessionId = kind === "context" ? new URL(request.url).searchParams.get("sessionId") : (body as Record<string, unknown>).sessionId;
  if (sessionId != null && (!isRecordId(sessionId) || memberId != null)) return fail("INVALID_COMMAND", correlation, 400);
  if (kind === "context") {
    if (memberId !== null && !recordId(memberId)) return fail("INVALID_COMMAND", correlation, 400);
    try {
      const context = await workflowContext(config, memberId as string | null, sessionId as string | null, fetcher);
      if (memberId) {
        const response = await handle(request, config, "member", memberId as string, fetcher);
        if (!response.ok) return response;
        context.suggestions = [suggestion(memberId as string, await response.json())];
      }
      return Response.json(context, {headers: responseHeaders});
    } catch { return fail("CAPABILITY_DISABLED", correlation); }
  }
  if (kind === "request" && object(body) && body.followUp !== undefined) return workflowRequest(request, config, body, fetcher);
  if (kind === "request" && sessionId) {
    const input = body as Record<string, unknown>;
    if (typeof input.text !== "string" || input.text.length > 500 || !Array.isArray(input.onScreenIds)) return fail("INVALID_COMMAND", correlation, 400);
    // Class answers use Odoo facts, never change pending students to absent.
    if (!/^(?:who|show|summarize|review|check).*(?:check|roster|class|attendance)/i.test(input.text)) return workflowAnswer(config, input, fetcher);
    try {
      const context = await workflowContext(config, null, sessionId as string, fetcher);
      const missingOnly = /not|n.t|missing|yet/i.test(input.text);
      const rows = (context.records || []).filter(r=>!missingOnly || r.detail === "Not yet checked in");
      return Response.json({outcome:"answer", answer: rows.map(r => `${r.label}: ${r.detail}`).join("\n") || (missingOnly ? "No pending check-ins in this authorized roster." : "No registered students in this authorized session."), mode:"Verified Odoo roster"}, {headers:responseHeaders});
    } catch { return fail("CAPABILITY_DISABLED",correlation); }
  }
  if (kind === "request" && memberId === null) return workflowAnswer(config, body as Record<string,unknown>, fetcher);
  if (!recordId(memberId)) return fail("INVALID_COMMAND", correlation, 400);
  if (kind === "approval") {
    const command = body as Record<string, unknown>;
    if (Object.keys(command).sort().join() !== ["correlationId", "idempotencyKey", "memberId", "suggestionId"].sort().join() ||
        !key(command.idempotencyKey) || !key(command.correlationId) || (command.suggestionId !== `attendance-review:${memberId}` && !(typeof command.suggestionId === "string" && /^followup:[1-9][0-9]{0,9}$/.test(command.suggestionId)))) return fail("INVALID_COMMAND", correlation, 400);
    try {
      if (String(command.suggestionId).startsWith("followup:")) {
        const result = await workflowCall(config, "approve", command, fetcher);
        const issue = workflowProblem(result); if (issue) return issue;
        const r = result.receipt, e = result.evidence;
        if (!object(r) || !recordId(r.id) || r.suggestionId !== command.suggestionId || typeof r.summary !== "string" || r.summary.length > 2000 || typeof r.actor !== "string" || typeof r.at !== "string" || !Number.isFinite(Date.parse(r.at)) || result.correlationId !== command.correlationId || typeof result.replayed !== "boolean" || !object(e) || e.memberId !== memberId || e.source !== "odoo-test") throw new Error("Invalid receipt");
        return Response.json({receipt:r,replayed:result.replayed,correlationId:result.correlationId},{headers:responseHeaders});
      }
      const upstream = await fetcher(config.backend + "/kiosk/v2/staff/companion-review", {
        method: "POST", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(10000),
        headers: {"content-type": "application/json", authorization: `Bearer ${config.staffKey}`},
        body: JSON.stringify({jsonrpc: "2.0", method: "call", id: command.correlationId, params: {token: config.token, command}}),
      });
      if (!upstream.ok) return new Response(null, {status: 503, headers: responseHeaders});
      const rpc: unknown = await upstream.json();
      if (!object(rpc) || rpc.error || !object(rpc.result)) return new Response(null, {status: 503, headers: responseHeaders});
      const result = rpc.result;
      if (object(result.problem)) return fail(result.problem.code === "FORBIDDEN" ? "FORBIDDEN" : "CAPABILITY_DISABLED", String(command.correlationId), result.problem.code === "FORBIDDEN" ? 403 : 503);
      const receipt = result.receipt, evidence = result.evidence;
      if (!object(receipt) || !recordId(receipt.id) || receipt.suggestionId !== command.suggestionId || typeof receipt.summary !== "string" || receipt.summary.length > 2000 || typeof receipt.actor !== "string" || typeof receipt.at !== "string" || !/^\d{4}-\d\d-\d\dT.*Z$/.test(receipt.at) || !Number.isFinite(Date.parse(receipt.at)) || typeof result.replayed !== "boolean" || result.correlationId !== command.correlationId || !object(evidence) || evidence.memberId !== memberId || evidence.source !== "odoo-test") return new Response(null, {status: 503, headers: responseHeaders});
      return Response.json({receipt: {id: receipt.id, suggestionId: receipt.suggestionId, summary: receipt.summary, actor: receipt.actor, at: receipt.at}, replayed: result.replayed, correlationId: result.correlationId}, {headers: responseHeaders});
    } catch { return new Response(null, {status: 503, headers: responseHeaders}); }
  }
  if (kind === "request") {
    const input = body as Record<string, unknown>;
    if (typeof input.text !== "string" || input.text.length > 500 || !Array.isArray(input.onScreenIds) || input.onScreenIds.length > 20 || input.onScreenIds.some(id => typeof id !== "string")) return fail("INVALID_COMMAND", correlation, 400);
    // Guided attendance lookup stays available without a model. Other questions
    // use a read-only explanation over server-scoped records, never ORM tools.
    if (!/^(?:(?:show|check|review|verify|view|summarize)\s+)?(?:(?:the|this member's|my)\s+)?(?:attendance|check[ -]?ins|latest check[ -]?in)(?:\s+please)?[.!?]*$/i.test(input.text.trim())) {
      return workflowAnswer(config, input, fetcher);
    }
  }
  const response = await handle(request, config, "member", memberId, fetcher);
  if (!response.ok) return response;
  const data = await response.json() as Record<string, unknown>;
  const task = suggestion(memberId, data);
  if (kind === "request") return Response.json({outcome: "newTask", suggestion: task}, {headers: responseHeaders});
  const context: CompanionContext = {label: "Live Odoo test data", heading: "Attendance review", suggestions: [task], intel: [{label: "Tool", value: "attendance.read"}, {label: "Mode", value: "Guided lookup, not generative AI"}]};
  return Response.json(context, {headers: responseHeaders});
}
