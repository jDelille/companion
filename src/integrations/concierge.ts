import type {
  ConciergeActionAnswer,
  ConciergeActionCommand,
  ConciergeActionReply,
  ConciergeAnswer,
  ConciergeQuestion,
  ConciergeReply,
} from "@/domain/kiosk/concierge";
import { CONCIERGE_TIMEOUT_SECONDS } from "@/domain/kiosk/kioskConfig";

// The only place the kiosk Concierge gets data from. Calls the
// /api/v1/kiosk/concierge routes. Connected questions use read-only school help
// and the real Odoo schedule; trial/staff writes remain unavailable. None throw.

// Stops waiting after CONCIERGE_TIMEOUT_SECONDS, or when the kiosk leaves the view
const timeoutSignal = (signal: AbortSignal) => {
  const timeout = AbortSignal.timeout(CONCIERGE_TIMEOUT_SECONDS * 1000);
  return AbortSignal.any([signal, timeout]);
};

// A chip or a typed question
export async function askConcierge(
  question: ConciergeQuestion,
  signal: AbortSignal,
): Promise<ConciergeAnswer> {
  try {
    const response = await fetch("/api/v1/kiosk/concierge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(question),
      cache: "no-store",
      signal: timeoutSignal(signal),
    });
    const body = await response.json().catch(() => null);
    if (response.ok && looksLikeReply(body)) {
      return body;
    }
    if (response.status === 401 || response.status === 403) return {kind: "unavailable", reason: "pairing"};
    if (response.status === 501) return {kind: "unavailable", reason: "notConfigured"};
  } catch {
    // offline, cancelled or timed out
  }
  return { kind: "unavailable" };
}

// Runs one confirmed action. Only a receipt for this exact action counts as done.
// Anything we can't trust as a reply is notConfirmed: it may have run, so the
// caller retries with the same command and key.
export async function runConciergeAction(
  command: ConciergeActionCommand,
  signal: AbortSignal,
): Promise<ConciergeActionAnswer> {
  let response: Response;
  try {
    response = await fetch("/api/v1/kiosk/concierge/actions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(command),
      cache: "no-store",
      signal: timeoutSignal(signal),
    });
  } catch {
    return { outcome: "notConfirmed" }; // offline or timed out
  }

  const body = await response.json().catch(() => null);

  if (response.ok && looksLikeActionReply(body)) {
    if (body.receipt.actionId === command.actionId) {
      return { outcome: "done", receipt: body.receipt };
    }
  }
  if (!response.ok && looksLikeProblem(body)) {
    return { outcome: "failed" };
  }
  return { outcome: "notConfirmed" }; // e.g. a bare 503, or a body that isn't either shape
}

const replyKinds = ["answer", "schedule", "action", "goTo", "privateHandoff", "notUnderstood"];

const looksLikeReply = (body: unknown): body is ConciergeReply => {
  const reply = body as ConciergeReply | null;
  return typeof reply?.kind === "string" && replyKinds.includes(reply.kind);
};

const looksLikeActionReply = (body: unknown): body is ConciergeActionReply => {
  const reply = body as ConciergeActionReply | null;
  return (
    typeof reply?.receipt?.id === "string" &&
    typeof reply.receipt.actionId === "string" &&
    Array.isArray(reply.receipt.details)
  );
};

const looksLikeProblem = (body: unknown): body is { code: string } => {
  const problem = body as { code?: unknown } | null;
  return typeof problem?.code === "string";
};
