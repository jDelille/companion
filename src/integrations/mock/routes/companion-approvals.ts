// PROVISIONAL: our own path and shape until the real automation service has a contract.
// The real service's keys will live on the server, behind this route, never in the browser.
import type {
  ApprovalCommand,
  ApprovalReply,
  Receipt,
} from "@/domain/companion";
import { findSuggestion } from "@/integrations/mock/companion";
import { mockRoute, problem } from "@/integrations/mock/companion-http";
import { getScenario } from "@/integrations/mock/companion-scenario";
import { getStore } from "@/integrations/mock/companion-store";

// Returns null if the body isn't shaped like an approval command
function readCommand(body: unknown): ApprovalCommand | null {
  if (typeof body !== "object" || body === null) return null;
  const command = body as Partial<ApprovalCommand>;

  if (typeof command.idempotencyKey !== "string") return null;
  if (typeof command.correlationId !== "string") return null;
  if (typeof command.suggestionId !== "string") return null;
  if (command.memberId !== null && typeof command.memberId !== "string") return null;

  return {
    idempotencyKey: command.idempotencyKey,
    correlationId: command.correlationId,
    suggestionId: command.suggestionId,
    memberId: command.memberId,
  };
}

const approvalResponse = (
  receipt: Receipt,
  replayed: boolean,
  correlationId: string,
  status: number,
) => {
  const body: ApprovalReply = { receipt, replayed, correlationId };
  return Response.json(body, { status });
};

export async function POST(request: Request) {
  return mockRoute(async () => {
    const command = readCommand(await request.json().catch(() => null));
    if (!command) {
      return problem(
        "INVALID_COMMAND",
        `companion-${crypto.randomUUID()}`,
        "Expected an ApprovalCommand.",
      );
    }

    const { idempotencyKey, correlationId, suggestionId } = command;
    const store = getStore();

    // 1. Forced by the dev scenario
    if (getScenario() === "action-rejected") {
      return problem(
        "ACTION_REJECTED",
        correlationId,
        'Forced by the "action-rejected" dev scenario.',
      );
    }

    // 2. Key's been used before: same task gets the original receipt back, anything else is a conflict
    const usedKey = store.usedKeys.get(idempotencyKey);
    if (usedKey) {
      if (usedKey.suggestionId !== suggestionId) {
        return problem(
          "IDEMPOTENCY_CONFLICT",
          correlationId,
          "This idempotency key was used for a different task.",
        );
      }
      return approvalResponse(usedKey.receipt, true, correlationId, 200);
    }

    // 3. The task has to be one we know. The receipt is built from our copy,
    //    not from anything the browser sent.
    const suggestion = findSuggestion(suggestionId);
    if (!suggestion) {
      return problem(
        "UNKNOWN_SUGGESTION",
        correlationId,
        `No task ${suggestionId}.`,
      );
    }

    // 4. All good, "run" it
    const receipt: Receipt = {
      id: `receipt-${store.nextReceiptNumber}`,
      suggestionId,
      summary: suggestion.actionLabel,
      actor: "via Companion",
      at: new Date().toISOString(),
    };
    store.nextReceiptNumber += 1;
    store.usedKeys.set(idempotencyKey, { suggestionId, receipt });

    return approvalResponse(receipt, false, correlationId, 201);
  });
}
