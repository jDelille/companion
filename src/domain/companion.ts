export type Risk = "low" | "medium" | "high";

export type Suggestion = {
  id: string;
  title: string;                                  // "Call Parker trial"
  explanation: string;                            // the evidence, in one line
  actionLabel: string;                            // "Prepare call"
  capability: string;                             // "crm.lead.prepare_follow_up"
  risk: Risk;
  preview: { label: string; value: string }[];    // what will happen, field by field
};

// Comes back from the approvals route. Never built in the browser.
export type Receipt = {
  id: string;
  suggestionId: string; // the task it completed
  summary: string;      // "Send waiver reminder"
  actor: string;        // "Jamie · via Companion"
  at: string;           // ISO time; the browser formats it as "2:14 PM"
};

// What the Companion shows for one page (front desk, or one member)
export type CompanionContext = {
  label?: string;
  heading?: string;
  suggestions: Suggestion[];
  intel?: { label: string; value: string }[];
  featured?: { suggestion: Suggestion; summary: string };
};

// ---------------------------------------------------------------------------
// PROVISIONAL: everything below is our own shape for the mock routes in
// app/api/v2/companion. There's no agreed contract with the real AI and
// automation services yet, so these will change when one exists.
// ---------------------------------------------------------------------------

// Which page the Companion is looking at. Results always go back to the
// page they started on, never to whatever page is open when they arrive.
export type CompanionView = {
  key: string;             // "front-desk" or "member:5001"
  memberId: string | null; // null on the front desk
};

// POST /api/v2/companion/requests: a typed or spoken request
export type CompanionRequestBody = {
  text: string;
  memberId: string | null;
  onScreenIds: string[]; // tasks already showing, so "review the waiver" can open one
};

export type CompanionRequestReply =
  | { outcome: "newTask"; suggestion: Suggestion }
  | { outcome: "existingTask"; suggestionId: string }
  | { outcome: "notUnderstood" };

// What the integration layer hands back: the route's reply, or "unavailable"
// for anything we couldn't get or couldn't read (offline, timeout, 503)
export type CompanionRequestAnswer =
  | CompanionRequestReply
  | { outcome: "unavailable" };

// POST /api/v2/companion/approvals: run one approved task
export type ApprovalCommand = {
  idempotencyKey: string; // same key on a retry, so the action can't run twice
  correlationId: string;
  suggestionId: string;
  memberId: string | null;
};

export type ApprovalReply = {
  receipt: Receipt;
  replayed: boolean; // true when the key was seen before and this is the original receipt
  correlationId: string;
};

export type CompanionProblemCode =
  | "INVALID_COMMAND"
  | "UNKNOWN_SUGGESTION"
  | "IDEMPOTENCY_CONFLICT"
  | "ACTION_REJECTED";

export type CompanionProblem = {
  code: CompanionProblemCode;
  detail: string;
  correlationId: string;
};

// done: the route returned a receipt for this task
// failed: the route said no. Nothing ran, so the next try is a new attempt
// notConfirmed: no usable answer. It may or may not have run, so the retry
//   resends the same command and key
export type ApprovalAnswer =
  | { outcome: "done"; receipt: Receipt }
  | { outcome: "failed" }
  | { outcome: "notConfirmed" };

export type ContextAnswer =
  | { outcome: "loaded"; context: CompanionContext }
  | { outcome: "unavailable" };

// PROVISIONAL: not agreed yet. How long a Companion call may take before we
// stop waiting. A timed-out approval may still have run, hence notConfirmed.
export const COMPANION_TIMEOUT_SECONDS = 15;

// Built once, on the first approve. A notConfirmed retry reuses it as-is.
export function createApprovalCommand(
  suggestionId: string,
  memberId: string | null,
): ApprovalCommand {
  return {
    idempotencyKey: `companion-${crypto.randomUUID()}`,
    correlationId: `companion-${crypto.randomUUID()}`,
    suggestionId,
    memberId,
  };
}
