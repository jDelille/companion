import type {
  CheckInResult,
  ProblemDetails,
  RecordId,
  RosterMember,
  SessionOption,
} from "@/contracts/kiosk-attendance";
import type { CheckInCommand } from "@/domain/kiosk/checkInCommand";
import type { CheckInAnswer } from "@/domain/kiosk/checkInOutcome";
import { CHECK_IN_TIMEOUT_SECONDS } from "@/domain/kiosk/kioskConfig";

import { saveUnconfirmedAttendance, clearConfirmedAttendance } from "./attendanceRecovery";

// The only place kiosk screens get data from. Calls the /api/v2 routes,
// which are mocks for now and will be Jodi's real backend later.

// Today's sessions. The server decides what "today" means.
export async function getSessions(
  signal?: AbortSignal, // aborted when the kiosk leaves the step (e.g. idle reset)
): Promise<SessionOption[]> {
  const response = await fetch("/api/v2/sessions", { cache: "no-store", signal });
  if (!response.ok) {
    throw new Error(`Sessions request failed (${response.status})`);
  }
  return response.json();
}

// The students registered for one session. Screens must never list this as-is:
// it's only searched, so a public kiosk doesn't show everyone's names.
export async function getRoster(
  sessionId: RecordId,
  signal?: AbortSignal, // aborted when the kiosk leaves the step (e.g. idle reset)
): Promise<RosterMember[]> {
  const response = await fetch(
    `/api/v2/sessions/${encodeURIComponent(sessionId)}/roster`,
    { cache: "no-store", signal },
  );
  if (!response.ok) {
    throw new Error(`Roster request failed (${response.status})`);
  }
  return response.json();
}

// Sends the check-in command. Never throws: whatever happens comes back as an
// answer, and anything we can't trust as a reply counts as "noAnswer" (not confirmed).
// Gives up after CHECK_IN_TIMEOUT_SECONDS. The request is actually cancelled then,
// so a very late reply can't arrive. The server may still have saved it, which the
// retry with the same idempotency key sorts out.
async function sendCheckIn(
  command: CheckInCommand,
  signal: AbortSignal, // aborted by the page if the kiosk leaves this step
): Promise<CheckInAnswer> {
  const timeout = AbortSignal.timeout(CHECK_IN_TIMEOUT_SECONDS * 1000);

  let response: Response;
  try {
    response = await fetch("/api/v2/attendance/check-ins", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(command),
      cache: "no-store",
      signal: AbortSignal.any([signal, timeout]),
    });
  } catch {
    return { kind: "noAnswer" }; // offline, cancelled or timed out
  }

  const body = await response.json().catch(() => null);

  if (response.ok && looksLikeCheckInResult(body)) {
    return { kind: "result", result: body };
  }
  if (!response.ok && looksLikeProblem(body)) {
    return { kind: "problem", problem: body };
  }
  return { kind: "noAnswer" }; // e.g. a bare 503, or a body that isn't either shape
}

const looksLikeCheckInResult = (body: unknown): body is CheckInResult => {
  const result = body as CheckInResult | null;
  return typeof result?.receipt?.attendanceId === "string";
};

const looksLikeProblem = (body: unknown): body is ProblemDetails => {
  const problem = body as ProblemDetails | null;
  return typeof problem?.code === "string";
};


// CONNECTED_ATTENDANCE_RECOVERY
// Reconcile the ORIGINAL command after uncertainty. Saved is not confirmed.
export async function checkIn(command: CheckInCommand, signal: AbortSignal): Promise<CheckInAnswer> {
  const answer = await sendCheckIn(command, signal);
  if (answer.kind === "result") await clearConfirmedAttendance(command);
  else if (answer.kind === "noAnswer") await saveUnconfirmedAttendance(command);
  return answer;
}
