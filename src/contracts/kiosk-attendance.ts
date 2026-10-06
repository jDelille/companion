/**
 * THIS IS COPIED FROM JODI'S REVIEW BUNDLE. DO NOT MODIFY DIRECTLY.
 * Session-first kiosk contract. A trusted BFF supplies identity/device scope.
 * Browser-side types are not authorization. No raw Odoo model methods here.
 */

export type RecordId = string;

export interface CommandEnvelope<T> {
  idempotencyKey: string;
  correlationId: string;
  expectedVersion?: number;
  payload: T;
}

export interface CheckInPayload {
  memberId: RecordId;
  sessionId: RecordId;
}

export interface AttendanceReceipt {
  attendanceId: RecordId;
  memberId: RecordId;
  sessionId: RecordId;
  checkedInAt: string;
  status: "present" | "late";
  alreadyRecorded: boolean;
  /** Original command correlation. Kept unchanged on replay. */
  correlationId: string;
}

export interface CheckInResult {
  receipt: AttendanceReceipt;
  replayed: boolean;
  /** Current transport attempt's correlation ID. */
  correlationId: string;
}

export type ProblemCode =
  | "INVALID_COMMAND"
  | "FORBIDDEN"
  | "SESSION_UNAVAILABLE"
  | "SESSION_NOT_OPEN"
  | "MEMBER_UNAVAILABLE"
  | "NOT_ON_ROSTER"
  | "ELIGIBILITY_REVIEW_REQUIRED"
  | "ATTENDANCE_REVIEW_REQUIRED"
  | "VERSION_CONFLICT"
  | "IDEMPOTENCY_CONFLICT"
  | "CONCURRENT_RETRY"
  | "CAPABILITY_DISABLED";

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  code: ProblemCode;
  detail: string;
  correlationId: string;
}

/** Public class metadata only. Version protects session attributes. */
export interface SessionOption {
  sessionId: RecordId;
  title: string;
  startsAt: string;
  endsAt: string;
  version: number;
  capacity: number;
  seatsTaken: number;
}

/** Only returned AFTER the server has resolved a permitted member scope. */
export interface RosterMember {
  memberId: RecordId;
  displayName: string;
  enrollmentStatus: "registered";
  attendanceState: "pending" | "present" | "absent" | "excused";
}

export function buildCheckIn(
  session: SessionOption,
  member: RosterMember,
  ids: { idempotencyKey: string; correlationId: string },
): CommandEnvelope<CheckInPayload> {
  // Caller supplies IDs so retries preserve the ORIGINAL key. Never mint a new
  // key when a request times out; first retry the same operation with that key.
  if (
    !/^[1-9][0-9]{0,9}$/.test(session.sessionId) ||
    !/^[1-9][0-9]{0,9}$/.test(member.memberId) ||
    Number(session.sessionId) > 2147483647 ||
    Number(member.memberId) > 2147483647 ||
    !Number.isSafeInteger(session.version) ||
    session.version < 0 ||
    !/^[A-Za-z0-9][A-Za-z0-9_.:-]{15,127}$/.test(ids.idempotencyKey) ||
    !/^[A-Za-z0-9][A-Za-z0-9_.:-]{15,127}$/.test(ids.correlationId)
  ) {
    throw new Error("Invalid attendance command inputs.");
  }
  if (member.enrollmentStatus !== "registered") {
    throw new Error("Choose a student registered for this session.");
  }
  return {
    idempotencyKey: ids.idempotencyKey,
    correlationId: ids.correlationId,
    expectedVersion: session.version,
    payload: { memberId: member.memberId, sessionId: session.sessionId },
  };
}

/** Core UI state must not silently retain a student when the session changes. */
export type CheckInState =
  | { step: "session" }
  | { step: "member"; session: SessionOption }
  | { step: "confirm"; session: SessionOption; member: RosterMember }
  | { step: "sending"; command: CommandEnvelope<CheckInPayload> }
  | { step: "success"; result: CheckInResult }
  | { step: "problem"; problem: ProblemDetails };

export function selectSession(session: SessionOption): CheckInState {
  return { step: "member", session };
}

export function clearCheckIn(): CheckInState {
  return { step: "session" };
}
