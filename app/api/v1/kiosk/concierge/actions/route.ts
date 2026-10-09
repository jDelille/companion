// PROVISIONAL: our own path and shape until Paul's Concierge contract exists.
import type { ConciergeActionReply } from "@/domain/kiosk/concierge";
import {
  conciergeMockRoute,
  getConciergeStore,
  readActionCommand,
  receiptFor,
} from "@/integrations/mock/concierge";

const problem = (code: string, detail: string, status: number) => {
  return Response.json(
    { code, detail },
    { status, headers: { "content-type": "application/problem+json" } },
  );
};

export async function POST(request: Request) {
  return conciergeMockRoute(async () => {
    const command = readActionCommand(await request.json().catch(() => null));
    if (!command) {
      return problem("INVALID_COMMAND", "Expected a ConciergeActionCommand.", 400);
    }

    const store = getConciergeStore();

    // Key's been used before: same action gets the original receipt back, anything else is a conflict
    const usedKey = store.usedKeys.get(command.idempotencyKey);
    if (usedKey) {
      if (usedKey.actionId !== command.actionId) {
        return problem("IDEMPOTENCY_CONFLICT", "This key was used for a different action.", 409);
      }
      const replay: ConciergeActionReply = {
        receipt: usedKey.receipt,
        replayed: true,
        correlationId: command.correlationId,
      };
      return Response.json(replay);
    }

    // All good, "run" it
    const receipt = receiptFor(command, `concierge-receipt-${store.nextReceiptNumber}`);
    store.nextReceiptNumber += 1;
    store.usedKeys.set(command.idempotencyKey, { actionId: command.actionId, receipt });

    const reply: ConciergeActionReply = {
      receipt,
      replayed: false,
      correlationId: command.correlationId,
    };
    return Response.json(reply, { status: 201 });
  });
}
