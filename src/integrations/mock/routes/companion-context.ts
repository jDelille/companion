// PROVISIONAL: our own path and shape until the real AI service has a contract
import { getContextFor, scopedSuggestion } from "../companion";
import { mockRoute } from "../companion-http";
import { getStore } from "../companion-store";

// What the Companion shows for one page (CompanionContext).
// ?memberId=5001 for a member's page, no memberId for the front desk.
export function GET(request: Request) {
  const memberId = new URL(request.url).searchParams.get("memberId");

  return mockRoute(() => {
    const context = getContextFor(memberId);
    const receipts = [...getStore().usedKeys.values()]
      .filter((item) => item.memberId === memberId)
      .map((item) => item.receipt)
      .filter(
        (receipt) => scopedSuggestion(receipt.suggestionId, memberId) !== null,
      );
    return Response.json({ ...context, receipts });
  });
}
