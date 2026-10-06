// Dev-only switch for forcing failures in the mock kiosk API.
// Always "normal" in production and can't be changed there.

export const kioskScenarios = [
  "normal",
  "no-sessions", // GET /sessions returns []
  "slow", // every route waits ~2.5s instead of 400ms
  "network-failure", // does the work, then returns a bare 503 like the response got lost
  "not-on-roster", // check-ins fail with NOT_ON_ROSTER
  "eligibility-review", // check-ins fail with ELIGIBILITY_REVIEW_REQUIRED
  "session-not-open", // check-ins fail with SESSION_NOT_OPEN
  "version-conflict", // check-ins fail with VERSION_CONFLICT
] as const;

export type KioskScenario = (typeof kioskScenarios)[number];

export const scenarioSwitchEnabled = process.env.NODE_ENV !== "production";

// On globalThis so all the routes see the same scenario
const serverMemory = globalThis as typeof globalThis & {
  kioskScenario?: KioskScenario;
};

export function isKioskScenario(value: unknown): value is KioskScenario {
  return kioskScenarios.some((scenario) => scenario === value);
}

export function getScenario(): KioskScenario {
  if (!scenarioSwitchEnabled) return "normal";
  return serverMemory.kioskScenario ?? "normal";
}

export function setScenario(scenario: KioskScenario) {
  if (!scenarioSwitchEnabled) throw new Error("Kiosk scenarios are dev-only.");
  serverMemory.kioskScenario = scenario;
}
