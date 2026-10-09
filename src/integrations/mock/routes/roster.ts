// PROVISIONAL: not in Jodi's contract yet, so the path and response shape might change
import {
  correlationIdFrom,
  mockRoute,
  problem,
} from "@/integrations/mock/kiosk-http";
import { getRoster } from "@/integrations/mock/kiosk-store";

// Roster for one session (RosterMember[])
export async function GET(
  request: Request,
  context: RouteContext<"/api/v2/sessions/[sessionId]/roster">,
) {
  const { sessionId } = await context.params;

  return mockRoute(() => {
    const roster = getRoster(sessionId);
    if (!roster) {
      return problem(
        "SESSION_UNAVAILABLE",
        correlationIdFrom(request),
        `No session ${sessionId} today.`,
      );
    }
    return Response.json(roster);
  });
}
