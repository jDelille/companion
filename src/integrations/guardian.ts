import type { RecordId } from "@/contracts/kiosk-attendance";

export type GuardianStudent = { memberId: RecordId; displayName: string; onRoster: boolean; attendanceState: string | null };
export type GuardianVerified = { guardianToken: string; expiresInSeconds: number; guardian: string; students: GuardianStudent[] };
export type GuardianCommand = { idempotencyKey: string; correlationId: string; payload: { memberId: RecordId; sessionId: RecordId } };
export type GuardianAnswer<T> = { kind: "ok"; value: T } | { kind: "problem"; code: string; title: string } | { kind: "noAnswer" };

async function post<T>(url: string, body: unknown, accept: (value: unknown) => value is T): Promise<GuardianAnswer<T>> {
  let response: Response;
  try {
    response = await fetch(url, { method: "POST", cache: "no-store", headers: { "content-type": "application/json" },
      body: JSON.stringify(body), signal: AbortSignal.timeout(12000) });
  } catch {
    return { kind: "noAnswer" };
  }
  const value: unknown = await response.json().catch(() => null);
  if (response.ok && accept(value)) return { kind: "ok", value };
  if (!response.ok && value && typeof value === "object" && typeof (value as { code?: unknown }).code === "string")
    return { kind: "problem", code: (value as { code: string }).code, title: String((value as { title?: unknown }).title || "Please see the front desk") };
  return { kind: "noAnswer" };
}

const isVerified = (value: unknown): value is GuardianVerified =>
  !!value && typeof value === "object" && typeof (value as GuardianVerified).guardianToken === "string" && Array.isArray((value as GuardianVerified).students);
const isReceipt = (value: unknown): value is { receipt: { status: string; alreadyRecorded: boolean; memberId: string } } =>
  !!value && typeof value === "object" && typeof (value as { receipt?: { status?: unknown } }).receipt?.status === "string";

export const verifyGuardian = (phone: string, pin: string, sessionId: RecordId) =>
  post("/api/v2/guardian/verify", { phone, pin, sessionId }, isVerified);

export const guardianCheckIn = (guardianToken: string, command: GuardianCommand) =>
  post("/api/v2/guardian/check-ins", { guardianToken, command }, isReceipt);

export const newGuardianCommand = (memberId: RecordId, sessionId: RecordId): GuardianCommand => ({
  idempotencyKey: `guardian-${crypto.randomUUID()}`, correlationId: `guardian-${crypto.randomUUID()}`, payload: { memberId, sessionId } });
