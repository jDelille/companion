// Dev-only controls for the mock Companion API (404 in production)
//   GET     see the current scenario and the options
//   PUT     { "scenario": "slow" } to switch
//   DELETE  forget used idempotency keys and receipts

import {
  companionScenarios,
  getScenario,
  isCompanionScenario,
  scenarioSwitchEnabled,
  setScenario,
} from "@/integrations/mock/companion-scenario";
import { resetStore } from "@/integrations/mock/companion-store";

const notFound = () => new Response(null, { status: 404 });

export function GET() {
  if (!scenarioSwitchEnabled) return notFound();
  return Response.json({ scenario: getScenario(), scenarios: companionScenarios });
}

export async function PUT(request: Request) {
  if (!scenarioSwitchEnabled) return notFound();

  const body = await request.json().catch(() => null);
  const requested = body?.scenario;
  if (!isCompanionScenario(requested)) {
    return Response.json(
      { error: "Unknown scenario.", scenarios: companionScenarios },
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
