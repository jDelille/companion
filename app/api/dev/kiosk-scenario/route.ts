// Dev-only controls for the mock kiosk API (404 in production)
//   GET     see the current scenario and the options
//   PUT     { "scenario": "slow" } to switch
//   DELETE  reset check-ins and used keys back to the seed data

import {
  getScenario,
  isKioskScenario,
  kioskScenarios,
  scenarioSwitchEnabled,
  setScenario,
} from "@/integrations/mock/kiosk-scenario";
import { resetStore } from "@/integrations/mock/kiosk-store";

const notFound = () => new Response(null, { status: 404 });

export function GET() {
  if (!scenarioSwitchEnabled) return notFound();
  return Response.json({ scenario: getScenario(), scenarios: kioskScenarios });
}

export async function PUT(request: Request) {
  if (!scenarioSwitchEnabled) return notFound();

  const body = await request.json().catch(() => null);
  const requested = body?.scenario;
  if (!isKioskScenario(requested)) {
    return Response.json(
      { error: "Unknown scenario.", scenarios: kioskScenarios },
      { status: 400 },
    );
  }

  setScenario(requested);
  return Response.json({ scenario: getScenario() });
}

export function DELETE() {
  if (!scenarioSwitchEnabled) return notFound();
  resetStore();
  return new Response(null, { status: 204 });
}
