import {
  COMPANION_TIMEOUT_SECONDS,
  type ApprovalAnswer,
  type ApprovalCommand,
  type ApprovalReply,
  type CompanionContext,
  type CompanionProblem,
  type CompanionRequestAnswer,
  type CompanionRequestBody,
  type CompanionRequestReply,
  type CompanionView,
  type ContextAnswer,
} from "@/domain/companion";

// The only place the Companion rail gets data from. Calls the
// /api/v2/companion routes, backed by scoped Odoo in integration mode. None of these throw: whatever
// happens comes back as an answer.

// Which page the Companion is looking at
export function viewFromPath(pathname: string): CompanionView {
  const sessionId = pathname.match(/^\/ops\/sessions\/([1-9][0-9]*)$/)?.[1];
  if (sessionId) return {key: `session:${sessionId}`, memberId: null, sessionId};
  const memberId = pathname.match(/^\/people\/([^/]+)/)?.[1];
  if (memberId) {
    return { key: `member:${memberId}`, memberId };
  }
  return { key: "front-desk", memberId: null };
}

// Stops waiting after COMPANION_TIMEOUT_SECONDS, or when the caller cancels
const timeoutSignal = (signal?: AbortSignal) => {
  const timeout = AbortSignal.timeout(COMPANION_TIMEOUT_SECONDS * 1000);
  if (!signal) return timeout;
  return AbortSignal.any([signal, timeout]);
};

// The suggestions, intel and featured card for the page at `pathname`
export async function getCompanionContext(
  pathname: string,
  signal?: AbortSignal, // aborted when the page changes
): Promise<ContextAnswer> {
  const view = viewFromPath(pathname);
  let url = "/api/v2/companion/context";
  if (view.sessionId) url += `?sessionId=${encodeURIComponent(view.sessionId)}`;
  if (view.memberId) {
    url += `?memberId=${encodeURIComponent(view.memberId)}`;
  }

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: timeoutSignal(signal),
    });
    const body = await response.json().catch(() => null);
    if (response.ok && looksLikeContext(body)) {
      return { outcome: "loaded", context: body };
    }
  } catch {
    // offline, cancelled or timed out
  }
  return { outcome: "unavailable" };
}

// A typed or spoken request
export async function sendRequest(
  request: CompanionRequestBody,
): Promise<CompanionRequestAnswer> {
  try {
    const response = await fetch("/api/v2/companion/requests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
      cache: "no-store",
      signal: timeoutSignal(),
    });
    const body = await response.json().catch(() => null);
    if (response.ok && looksLikeRequestReply(body)) {
      return body;
    }
  } catch {
    // offline or timed out
  }
  return { outcome: "unavailable" };
}

// Runs one approved task. Only a receipt for this exact task counts as done.
// Anything we can't trust as a reply is notConfirmed: the task may have run,
// so the caller retries with the same command and key.
export async function sendApproval(
  command: ApprovalCommand,
): Promise<ApprovalAnswer> {
  let response: Response;
  try {
    response = await fetch("/api/v2/companion/approvals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(command),
      cache: "no-store",
      signal: timeoutSignal(),
    });
  } catch {
    return { outcome: "notConfirmed" }; // offline or timed out
  }

  const body = await response.json().catch(() => null);

  if (response.ok && looksLikeApprovalReply(body)) {
    if (body.receipt.suggestionId === command.suggestionId && body.correlationId === command.correlationId) {
      return { outcome: "done", receipt: body.receipt };
    }
  }
  if (!response.ok && looksLikeProblem(body)) {
    return { outcome: "failed" };
  }
  return { outcome: "notConfirmed" }; // e.g. a bare 503, or a body that isn't either shape
}

const looksLikeContext = (body: unknown): body is CompanionContext => {
  const context = body as CompanionContext | null;
  return Array.isArray(context?.suggestions);
};

const looksLikeRequestReply = (body: unknown): body is CompanionRequestReply => {
  const reply = body as CompanionRequestReply | null;
  if (reply?.outcome === "answer") return typeof reply.answer === "string" && reply.answer.length <= 20000 && typeof reply.mode === "string";
  if (reply?.outcome === "newTask") return typeof reply.suggestion?.id === "string";
  if (reply?.outcome === "existingTask") return typeof reply.suggestionId === "string";
  return reply?.outcome === "notUnderstood";
};

const looksLikeApprovalReply = (body: unknown): body is ApprovalReply => {
  const reply = body as ApprovalReply | null;
  return (
    typeof reply?.receipt?.id === "string" &&
    typeof reply.receipt.suggestionId === "string"
  );
};

const looksLikeProblem = (body: unknown): body is CompanionProblem => {
  const problem = body as CompanionProblem | null;
  return typeof problem?.code === "string";
};
