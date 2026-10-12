// PROVISIONAL: Paul's path (v1.2.0 release notes), our own shape until we have his contract.
import type { ConciergeQuestion } from "@/domain/kiosk/concierge";
import { conciergeMockRoute, replyTo } from "@/integrations/mock/concierge";
import { configFrom, fail } from "@/server/odoo-gateway";
import { odooTestMode } from "@/server/odoo-runtime";
import { conciergeQuestion } from "@/server/kiosk-concierge";

// Returns null if the body isn't shaped like a question
function readQuestion(body: unknown): ConciergeQuestion | null {
  if (typeof body !== "object" || body === null) return null;
  const question = body as Partial<ConciergeQuestion>;

  if (typeof question.question !== "string" || question.question.trim() === "") return null;
  if (typeof question.correlationId !== "string") return null;

  // Long text is cut, not rejected: a kiosk question is a sentence, not an essay
  return { question: question.question.slice(0, 200), correlationId: question.correlationId };
}

export async function POST(request: Request) {
  if (odooTestMode()) {
    try { return await conciergeQuestion(request, configFrom(process.env)); }
    catch { return fail("CAPABILITY_DISABLED"); }
  }
  return conciergeMockRoute(async () => {
    const question = readQuestion(await request.json().catch(() => null));
    if (!question) {
      return Response.json(
        { code: "INVALID_COMMAND", detail: "Expected a ConciergeQuestion." },
        { status: 400, headers: { "content-type": "application/problem+json" } },
      );
    }
    return Response.json(replyTo(question.question));
  });
}
