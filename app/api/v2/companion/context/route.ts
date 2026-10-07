// PROVISIONAL: our own path and shape until the real AI service has a contract
import { getContextFor } from "@/integrations/mock/companion";
import { mockRoute } from "@/integrations/mock/companion-http";

// What the Companion shows for one page (CompanionContext).
// ?memberId=5001 for a member's page, no memberId for the front desk.
export function GET(request: Request) {
  const memberId = new URL(request.url).searchParams.get("memberId");

  return mockRoute(() => {
    return Response.json(getContextFor(memberId));
  });
}
