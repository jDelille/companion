// PROVISIONAL: not in Jodi's contract yet, so the path and response shape might change
import { todaysSessions } from "@/integrations/mock/kiosk";
import { mockRoute } from "@/integrations/mock/kiosk-http";
import { getScenario } from "@/integrations/mock/kiosk-scenario";

// Today's sessions (SessionOption[])
export function GET() {
  return mockRoute(() => {
    if (getScenario() === "no-sessions") {
      return Response.json([]);
    }
    return Response.json(todaysSessions());
  });
}
