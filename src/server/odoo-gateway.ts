/** Node-only transport for an explicitly scoped Odoo TEST environment.
 * No browser-supplied tenant, host, credential, role or database becomes authority.
 */
import { createHash, createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import type { CheckInResult, ProblemCode, ProblemDetails } from "../contracts/kiosk-attendance";

export type Role = "kiosk" | "staff";
export interface GatewayConfig {
  origin: string;
  backend: string;
  token: string;
  cookieSecret: string;
  kioskKey: string;
  staffKey: string;
  kioskPairKey: string;
  staffPairKey: string;
}
export type Fetcher = typeof fetch;
const headers = { "cache-control": "private, no-store", "vary": "Cookie", "x-dojang-data-source": "odoo-test" };
const recordId = (value: unknown): value is string => typeof value === "string" && /^[1-9][0-9]{0,9}$/.test(value) && Number(value) <= 2147483647;
const key = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_.:-]{15,127}$/.test(value);
const hash = (value: string) => createHash("sha256").update(value).digest();
const equal = (a: string, b: string) => timingSafeEqual(hash(a), hash(b));
const object = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const codes: ProblemCode[] = ["INVALID_COMMAND", "FORBIDDEN", "SESSION_UNAVAILABLE", "SESSION_NOT_OPEN", "MEMBER_UNAVAILABLE", "NOT_ON_ROSTER", "ELIGIBILITY_REVIEW_REQUIRED", "ATTENDANCE_REVIEW_REQUIRED", "VERSION_CONFLICT", "IDEMPOTENCY_CONFLICT", "CONCURRENT_RETRY", "CAPABILITY_DISABLED"];
const messages: Record<ProblemCode, string> = {
  INVALID_COMMAND: "Invalid request", FORBIDDEN: "This device is not authorized",
  SESSION_UNAVAILABLE: "Session unavailable", SESSION_NOT_OPEN: "Session not open for check-in",
  MEMBER_UNAVAILABLE: "Member unavailable", NOT_ON_ROSTER: "Please see the front desk",
  ELIGIBILITY_REVIEW_REQUIRED: "Please see the front desk", ATTENDANCE_REVIEW_REQUIRED: "Please see the front desk",
  VERSION_CONFLICT: "The session changed. Please select it again", IDEMPOTENCY_CONFLICT: "The request does not match its original attempt",
  CONCURRENT_RETRY: "Please retry the same check-in", CAPABILITY_DISABLED: "The connection is unavailable"
};
const uncertain = (operation: string, correlation: string) => operation === "checkin"
  ? new Response(null, {status: 503, headers: {...headers, "retry-after": "1"}})
  : fail("CAPABILITY_DISABLED", correlation);
const cookieName = (role: Role) => `dojang_${role}_test`;
const scope = (c: GatewayConfig, role: Role) => hash(c.token + ":" + (role === "staff" ? c.staffKey : c.kioskKey)).toString("hex");
const sign = (data: string, secret: string) => createHmac("sha256", secret).update(data).digest("base64url");

export function configFrom(env: NodeJS.ProcessEnv): GatewayConfig {
  if (env.DOJANG_INTEGRATION_MODE !== "odoo-test" || env.NEXT_PUBLIC_DEMO_MODE === "true") throw new Error("Integration not enabled");
  const origin = new URL(env.DOJANG_PUBLIC_ORIGIN || "");
  const backend = new URL(env.DOJANG_ODOO_URL || "");
  for (const url of [origin, backend]) {
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if ((url.protocol !== "https:" && !(url.protocol === "http:" && local)) || url.username || url.password || url.search || url.hash || url.pathname !== "/") throw new Error("Invalid integration origin");
  }
  const required = (name: string, minimum = 32) => {
    const value = env[name];
    if (!value || value.length < minimum || value.length > 256 || /[\r\n]/.test(value)) throw new Error("Missing integration configuration");
    return value;
  };
  const config = { origin: origin.origin, backend: backend.origin,
    token: required("DOJANG_KIOSK_TOKEN", 20), cookieSecret: required("DOJANG_COOKIE_SECRET"),
    kioskKey: required("DOJANG_KIOSK_GATEWAY_KEY"), staffKey: required("DOJANG_STAFF_GATEWAY_KEY"),
    kioskPairKey: required("DOJANG_KIOSK_PAIR_KEY"), staffPairKey: required("DOJANG_STAFF_PAIR_KEY") };
  if (equal(config.kioskKey, config.staffKey) || equal(config.kioskPairKey, config.staffPairKey)) throw new Error("Separate role credentials required");
  return config;
}

export function mintCookie(c: GatewayConfig, role: Role, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ role, scope: scope(c, role), expiresAt: now + 2 * 60 * 60 * 1000 })).toString("base64url");
  return `${payload}.${sign(payload, c.cookieSecret)}`;
}

export function authorized(c: GatewayConfig, role: Role, cookieHeader: string, now = Date.now()): boolean {
  const matches = cookieHeader.split(";").map(v => v.trim()).filter(v => v.startsWith(cookieName(role) + "="));
  if (matches.length !== 1) return false;
  const value = matches[0].slice(cookieName(role).length + 1);
  if (value.length > 2048) return false;
  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra || !equal(signature, sign(payload, c.cookieSecret))) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString());
    return parsed.role === role && parsed.scope === scope(c, role) && Number.isSafeInteger(parsed.expiresAt) && parsed.expiresAt > now && parsed.expiresAt <= now + 2 * 60 * 60 * 1000;
  } catch { return false; }
}

export function fail(code: ProblemCode, correlationId = `gateway-${randomUUID()}`, status = 503): Response {
  const title = code === "FORBIDDEN" ? "This device is not authorized" : code === "INVALID_COMMAND" ? "Invalid request" : "The connection is unavailable. Please retry or contact staff.";
  const value: ProblemDetails = { type: `urn:dojang:problem:${code}`, code, status, title, detail: title, correlationId };
  return Response.json(value, { status, headers: { ...headers, "content-type": "application/problem+json" } });
}

async function readBody(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) return null;
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 8192) { await reader.cancel(); throw new Error("Body limit"); }
    chunks.push(value);
  }
  const raw = Buffer.concat(chunks).toString();
  return request.headers.get("content-type")?.includes("application/x-www-form-urlencoded") ? Object.fromEntries(new URLSearchParams(raw)) : JSON.parse(raw);
}

export async function pair(request: Request, c: GatewayConfig): Promise<Response> {
  if (request.headers.get("origin") !== c.origin) return fail("FORBIDDEN", undefined, 403);
  let body;
  try { body = await readBody(request); } catch { return fail("INVALID_COMMAND", undefined, 400); }
  if (!object(body) || !["kiosk", "staff"].includes(String(body.role)) || typeof body.pairKey !== "string") return fail("FORBIDDEN", undefined, 403);
  const role = body.role as Role;
  const expected = role === "staff" ? c.staffPairKey : c.kioskPairKey;
  if (!equal(body.pairKey, expected)) return fail("FORBIDDEN", undefined, 403);
  const destination = role === "staff" ? "/integration/members" : "/kiosk";
  return new Response(null, { status: 303, headers: { ...headers, "location": destination,
    "set-cookie": `${cookieName(role)}=${mintCookie(c, role)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=7200${c.origin.startsWith("https:") ? "; Secure" : ""}` } });
}

const paths = { sessions: "/kiosk/v2/sessions", roster: "/kiosk/v2/session/roster", checkin: "/kiosk/v2/attendance/check-ins", member: "/kiosk/v2/staff/member", members: "/kiosk/v2/staff/members" } as const;
export type Operation = keyof typeof paths;

function validCommand(value: unknown): value is Record<string, unknown> {
  if (!object(value) || Object.keys(value).some(k => !["payload", "idempotencyKey", "correlationId", "expectedVersion"].includes(k))) return false;
  const p = value.payload;
  return key(value.idempotencyKey) && key(value.correlationId) && object(p) && Object.keys(p).length === 2 && recordId(p.sessionId) && recordId(p.memberId) && (value.expectedVersion === undefined || (Number.isSafeInteger(value.expectedVersion) && Number(value.expectedVersion) >= 0));
}

function validResult(value: unknown, command: Record<string, unknown>): value is CheckInResult {
  if (!object(value) || !object(value.receipt) || !object(command.payload)) return false;
  const r = value.receipt;
  return value.correlationId === command.correlationId && typeof value.replayed === "boolean" &&
    recordId(r.attendanceId) && r.memberId === command.payload.memberId && r.sessionId === command.payload.sessionId &&
    typeof r.checkedInAt === "string" && /^\d{4}-\d\d-\d\dT.*Z$/.test(r.checkedInAt) && Number.isFinite(Date.parse(r.checkedInAt)) &&
    ["present", "late"].includes(String(r.status)) && typeof r.alreadyRecorded === "boolean" && key(r.correlationId) &&
    (value.replayed === true || r.correlationId === command.correlationId);
}

function publicPayload(operation: Operation, value: Record<string, unknown>, id?: string): unknown {
  const text = (v: unknown): v is string => typeof v === "string";
  const integer = (v: unknown) => Number.isSafeInteger(v) && Number(v) >= 0;
  const time = (v: unknown): v is string => text(v) && /^\d{4}-\d\d-\d\dT.*Z$/.test(v) && Number.isFinite(Date.parse(v));
  const invalid = (): never => { throw new Error("Invalid backend contract"); };
  if (operation === "checkin") {
    const r = value.receipt as Record<string, unknown>;
    return { receipt: {attendanceId:r.attendanceId, memberId:r.memberId, sessionId:r.sessionId,
      checkedInAt:r.checkedInAt, status:r.status, alreadyRecorded:r.alreadyRecorded, correlationId:r.correlationId},
      replayed:value.replayed, correlationId:value.correlationId };
  }
  if (operation === "sessions") {
    if (!Array.isArray(value.sessions)) return invalid();
    return value.sessions.map((s: unknown) => {
      if (!object(s) || !recordId(s.sessionId) || !text(s.title) || !time(s.startsAt) || !time(s.endsAt) || !integer(s.version) || !integer(s.capacity) || !integer(s.seatsTaken)) return invalid();
      return {sessionId:s.sessionId,title:s.title,startsAt:s.startsAt,endsAt:s.endsAt,version:s.version,capacity:s.capacity,seatsTaken:s.seatsTaken};
    });
  }
  if (operation === "roster") {
    if (!Array.isArray(value.roster)) return invalid();
    return value.roster.map((m: unknown) => {
      if (!object(m) || !recordId(m.memberId) || !text(m.displayName) || m.enrollmentStatus !== "registered" || !["pending","present","absent","excused"].includes(String(m.attendanceState))) return invalid();
      return {memberId:m.memberId,displayName:m.displayName,enrollmentStatus:m.enrollmentStatus,attendanceState:m.attendanceState};
    });
  }
  if (operation === "members") {
    if (!Array.isArray(value.members)) return invalid();
    return value.members.map((m: unknown) => {
      if (!object(m) || !recordId(m.id) || !text(m.name)) return invalid();
      return {id:m.id,name:m.name};
    });
  }
  const m=value.member, a=value.attendance;
  if (!object(m) || m.id !== id || !text(m.tenantId) || !text(m.memberNumber) || !text(m.name) || !["lead","trial","active","paused","cancelled"].includes(String(m.membershipState)) || !object(m.rank) || !text(m.rank.name) || !integer(m.rank.stripes) || typeof m.attendanceRate !== "number" || !Number.isFinite(m.attendanceRate) || m.attendanceRate<0 || m.attendanceRate>1 || !object(a) || !integer(a.lastSevenDays)) return invalid();
  const latest=a.latest;
  if (latest !== null && (!object(latest) || !text(latest.sessionTitle) || !time(latest.checkedInAt) || typeof latest.late !== "boolean")) return invalid();
  return {member:{id:m.id,tenantId:m.tenantId,memberNumber:m.memberNumber,name:m.name,membershipState:m.membershipState,
    rank:{name:m.rank.name,stripes:m.rank.stripes},attendanceRate:m.attendanceRate},
    attendance:{lastSevenDays:a.lastSevenDays,latest:latest === null ? null : {sessionTitle:(latest as Record<string,unknown>).sessionTitle,checkedInAt:(latest as Record<string,unknown>).checkedInAt,late:(latest as Record<string,unknown>).late}}};
}

export async function handle(request: Request, c: GatewayConfig, operation: Operation, id?: string, fetcher: Fetcher = fetch): Promise<Response> {
  const role: Role = ["member", "members"].includes(operation) ? "staff" : "kiosk";
  if (!authorized(c, role, request.headers.get("cookie") || "")) return fail("FORBIDDEN", undefined, 403);
  let correlation = `gateway-${randomUUID()}`;
  const params: Record<string, unknown> = { token: c.token };
  if (operation === "roster" || operation === "member") {
    if (!recordId(id)) return fail("INVALID_COMMAND", correlation, 400);
    params[operation === "roster" ? "sessionId" : "memberId"] = id;
  }
  if (operation === "checkin") {
    if (request.headers.get("origin") !== c.origin || !request.headers.get("content-type")?.includes("application/json")) return fail("FORBIDDEN", correlation, 403);
    let command;
    try { command = await readBody(request); } catch { return fail("INVALID_COMMAND", correlation, 400); }
    if (!validCommand(command)) return fail("INVALID_COMMAND", correlation, 400);
    correlation = command.correlationId as string;
    params.command = command;
  }
  try {
    const response = await fetcher(c.backend + paths[operation], { method: "POST", cache: "no-store", redirect: "error",
      headers: { "content-type": "application/json", "authorization": `Bearer ${role === "staff" ? c.staffKey : c.kioskKey}` },
      body: JSON.stringify({ jsonrpc: "2.0", id: correlation, method: "call", params }), signal: AbortSignal.timeout(10000) });
    if (!response.ok) return uncertain(operation, correlation);
    const envelope: unknown = await response.json();
    if (!object(envelope) || envelope.error || !object(envelope.result)) return uncertain(operation, correlation);
    const result = envelope.result;
    if (object(result.problem)) {
      const p = result.problem;
      if (!codes.includes(p.code as ProblemCode) || typeof p.status !== "number" || p.status < 400 || p.status > 599) return fail("CAPABILITY_DISABLED", correlation);
      const safe = { type: `urn:dojang:problem:${p.code}`, code: p.code, status: p.status,
        title: messages[p.code as ProblemCode], detail: messages[p.code as ProblemCode], correlationId: correlation };
      return Response.json(safe, { status: p.status, headers: { ...headers, "content-type": "application/problem+json" } });
    }
    if (operation === "checkin" && !validResult(result, params.command as Record<string, unknown>)) return uncertain(operation, correlation);
    const body = publicPayload(operation, result, id);
    if (["sessions", "roster", "members"].includes(operation) && !Array.isArray(body)) return fail("CAPABILITY_DISABLED", correlation);
    return Response.json(body, { status: operation === "checkin" && !result.replayed && !(result.receipt as { alreadyRecorded?: boolean })?.alreadyRecorded ? 201 : 200, headers });
  } catch { return uncertain(operation, correlation); }
}
