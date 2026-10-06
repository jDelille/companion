import {
  buildCheckIn,
  type AttendanceReceipt,
  type CheckInPayload,
  type CheckInResult,
  type CommandEnvelope,
  type ProblemCode,
  type RosterMember,
  type SessionOption,
} from "@/contracts/kiosk-attendance";
import { ineligibleMemberIds } from "@/integrations/mock/kiosk";
import {
  correlationIdFrom,
  mockRoute,
  problem,
} from "@/integrations/mock/kiosk-http";
import { getScenario } from "@/integrations/mock/kiosk-scenario";
import {
  checkInKey,
  findSession,
  getRoster,
  getStore,
} from "@/integrations/mock/kiosk-store";

// PROVISIONAL: made up for the mock, not a real rule. The contract just says a receipt
// can be "late", and when that happens is up to Jodi. Don't write UI copy around 10 minutes.
const PROVISIONAL_LATE_AFTER_MINUTES = 10;

// Scenarios that force every check-in to fail with a specific problem
const forcedProblems: Record<string, ProblemCode> = {
  "not-on-roster": "NOT_ON_ROSTER",
  "eligibility-review": "ELIGIBILITY_REVIEW_REQUIRED",
  "session-not-open": "SESSION_NOT_OPEN",
  "version-conflict": "VERSION_CONFLICT",
};

// Returns null if the body isn't shaped like a check-in command
function readCommand(body: unknown): CommandEnvelope<CheckInPayload> | null {
  if (typeof body !== "object" || body === null) return null;
  const command = body as Partial<CommandEnvelope<Partial<CheckInPayload>>>;

  if (typeof command.idempotencyKey !== "string") return null;
  if (typeof command.correlationId !== "string") return null;
  if (typeof command.payload?.sessionId !== "string") return null;
  if (typeof command.payload?.memberId !== "string") return null;
  if (
    command.expectedVersion !== undefined &&
    typeof command.expectedVersion !== "number"
  )
    return null;

  return {
    idempotencyKey: command.idempotencyKey,
    correlationId: command.correlationId,
    expectedVersion: command.expectedVersion,
    payload: {
      sessionId: command.payload.sessionId,
      memberId: command.payload.memberId,
    },
  };
}

// Reuses Jodi's buildCheckIn to validate the IDs and keys so we don't end up with our own rules.
// It only looks at the IDs, version and keys, the other fields are just filler.
function hasValidFormat(command: CommandEnvelope<CheckInPayload>): boolean {
  const session: SessionOption = {
    sessionId: command.payload.sessionId,
    version: command.expectedVersion ?? 0,
    title: "",
    startsAt: "",
    endsAt: "",
    capacity: 0,
    seatsTaken: 0,
  };
  const member: RosterMember = {
    memberId: command.payload.memberId,
    displayName: "",
    enrollmentStatus: "registered",
    attendanceState: "pending",
  };

  try {
    buildCheckIn(session, member, command);
    return true;
  } catch {
    return false;
  }
}

const isLate = (session: SessionOption, checkedInAt: Date) => {
  const lateFrom =
    Date.parse(session.startsAt) + PROVISIONAL_LATE_AFTER_MINUTES * 60 * 1000;
  return checkedInAt.getTime() > lateFrom;
};

const checkInResponse = (
  receipt: AttendanceReceipt,
  replayed: boolean,
  correlationId: string,
  status: number,
) => {
  const result: CheckInResult = { receipt, replayed, correlationId };
  return Response.json(result, { status });
};

export async function POST(request: Request) {
  return mockRoute(async () => {
    const body = await request.json().catch(() => null);
    const command = readCommand(body);
    if (!command) {
      return problem(
        "INVALID_COMMAND",
        correlationIdFrom(request),
        "Expected a CommandEnvelope<CheckInPayload>.",
      );
    }

    const { idempotencyKey, correlationId, expectedVersion } = command;
    const { sessionId, memberId } = command.payload;
    const thisCheckIn = checkInKey(sessionId, memberId);
    const store = getStore();

    if (!hasValidFormat(command)) {
      return problem(
        "INVALID_COMMAND",
        correlationId,
        "Invalid attendance command inputs.",
      );
    }

    const scenario = getScenario();
    const forcedProblem = forcedProblems[scenario];
    if (forcedProblem) {
      return problem(
        forcedProblem,
        correlationId,
        `Forced by the "${scenario}" dev scenario.`,
      );
    }

    // Key's been used before: same check-in gets the original receipt back, anything else is a conflict
    const usedKey = store.usedKeys.get(idempotencyKey);
    if (usedKey) {
      if (usedKey.checkIn !== thisCheckIn) {
        return problem(
          "IDEMPOTENCY_CONFLICT",
          correlationId,
          "This idempotency key was used for a different check-in.",
        );
      }
      return checkInResponse(usedKey.receipt, true, correlationId, 200);
    }

    const session = findSession(sessionId);
    if (!session) {
      return problem(
        "SESSION_UNAVAILABLE",
        correlationId,
        `No session ${sessionId} today.`,
      );
    }

    if (expectedVersion !== undefined && expectedVersion !== session.version) {
      return problem(
        "VERSION_CONFLICT",
        correlationId,
        "The session changed. Reload it and try again.",
      );
    }

    const roster = getRoster(sessionId) ?? [];
    const member = roster.find(
      (rosterMember) => rosterMember.memberId === memberId,
    );
    if (!member) {
      return problem(
        "NOT_ON_ROSTER",
        correlationId,
        "This student isn't registered for this session.",
      );
    }

    if (ineligibleMemberIds.includes(memberId)) {
      return problem(
        "ELIGIBILITY_REVIEW_REQUIRED",
        correlationId,
        "Eligibility needs staff review.",
      );
    }

    // Already checked in, so return the existing receipt instead of making a new one
    const existingReceipt = store.receipts.get(thisCheckIn);
    if (member.attendanceState === "present" && existingReceipt) {
      const receipt = { ...existingReceipt, alreadyRecorded: true };
      store.usedKeys.set(idempotencyKey, { checkIn: thisCheckIn, receipt });
      return checkInResponse(receipt, false, correlationId, 200);
    }

    if (member.attendanceState !== "pending") {
      return problem(
        "ATTENDANCE_REVIEW_REQUIRED",
        correlationId,
        "Attendance needs staff review.",
      );
    }

    // All good, record it
    const now = new Date();
    const receipt: AttendanceReceipt = {
      attendanceId: String(store.nextAttendanceId),
      memberId,
      sessionId,
      checkedInAt: now.toISOString(),
      status: isLate(session, now) ? "late" : "present",
      alreadyRecorded: false,
      correlationId,
    };
    store.nextAttendanceId += 1;
    store.attendance.set(thisCheckIn, "present");
    store.receipts.set(thisCheckIn, receipt);
    store.usedKeys.set(idempotencyKey, { checkIn: thisCheckIn, receipt });

    return checkInResponse(receipt, false, correlationId, 201);
  });
}
