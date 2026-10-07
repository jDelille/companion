import type {
  AttendanceReceipt,
  CheckInResult,
  ProblemCode,
  ProblemDetails,
} from "@/contracts/kiosk-attendance";
import type { CheckInCommand } from "./checkInCommand";

// What came back from a check-in request, before deciding what it means
export type CheckInAnswer =
  | { kind: "result"; result: CheckInResult } // the server recorded it (or already had)
  | { kind: "problem"; problem: ProblemDetails } // the server said no, with a reason code
  | { kind: "noAnswer" }; // network down, timed out, or a reply we can't read

// What the Result screen (K06) shows. Never carries a reason for a refusal.
export type CheckInOutcome =
  | { kind: "success"; receipt: AttendanceReceipt } // present or late
  | { kind: "alreadyCheckedIn"; receipt: AttendanceReceipt }
  | { kind: "seeFrontDesk" }
  | { kind: "chooseAnotherClass" }
  | { kind: "kioskUnavailable" }
  | { kind: "notConfirmed" }; // may still have been saved: retry with the same command

type RefusalOutcome = "seeFrontDesk" | "chooseAnotherClass" | "kioskUnavailable" | "notConfirmed";

// PROVISIONAL: how each refusal is presented is partly Jodi's call (on the
// questions list). The first eight come from CLAUDE.md's K06 states; the last
// four aren't listed there and are our picks.
// Being a Record means a new code in the contract won't compile until it's placed here.
const outcomeForProblem: Record<ProblemCode, RefusalOutcome> = {
  NOT_ON_ROSTER: "seeFrontDesk",
  ELIGIBILITY_REVIEW_REQUIRED: "seeFrontDesk",
  ATTENDANCE_REVIEW_REQUIRED: "seeFrontDesk",
  SESSION_UNAVAILABLE: "chooseAnotherClass",
  SESSION_NOT_OPEN: "chooseAnotherClass",
  VERSION_CONFLICT: "chooseAnotherClass",
  FORBIDDEN: "kioskUnavailable",
  CAPABILITY_DISABLED: "kioskUnavailable",
  // Not in CLAUDE.md: something a student can't fix themselves
  INVALID_COMMAND: "seeFrontDesk",
  IDEMPOTENCY_CONFLICT: "seeFrontDesk",
  MEMBER_UNAVAILABLE: "seeFrontDesk",
  // Not in CLAUDE.md: the same check-in is still being processed, so retrying it is safe
  CONCURRENT_RETRY: "notConfirmed",
};

export function outcomeFor(answer: CheckInAnswer, command: CheckInCommand): CheckInOutcome {
  if (answer.kind === "noAnswer") {
    return { kind: "notConfirmed" };
  }

  if (answer.kind === "problem") {
    return { kind: outcomeForProblem[answer.problem.code] };
  }

  // Only call it success if the receipt is for the student and class we sent.
  // Anything else isn't a confirmation of this check-in.
  const { receipt } = answer.result;
  const isForThisCheckIn =
    receipt.sessionId === command.payload.sessionId &&
    receipt.memberId === command.payload.memberId;
  if (!isForThisCheckIn) {
    return { kind: "seeFrontDesk" };
  }

  if (receipt.alreadyRecorded) {
    return { kind: "alreadyCheckedIn", receipt };
  }
  return { kind: "success", receipt };
}
