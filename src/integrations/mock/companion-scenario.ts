// Dev-only switch for forcing failures in the mock Companion API.
// Always "normal" in production and can't be changed there.

export const companionScenarios = [
  "normal",
  "slow", // every route waits ~2.5s instead of 400ms
  "not-understood", // every typed or spoken request comes back notUnderstood
  "action-rejected", // every approval fails with ACTION_REJECTED
  "unavailable", // every route returns a bare 503 before doing anything
  "response-lost", // does the work, then returns a bare 503 like the response got lost
] as const;

export type CompanionScenario = (typeof companionScenarios)[number];

export const scenarioSwitchEnabled = process.env.NODE_ENV !== "production";

// On globalThis so all the routes see the same scenario
const serverMemory = globalThis as typeof globalThis & {
  companionScenario?: CompanionScenario;
};

export function isCompanionScenario(value: unknown): value is CompanionScenario {
  return companionScenarios.some((scenario) => scenario === value);
}

export function getScenario(): CompanionScenario {
  if (!scenarioSwitchEnabled) return "normal";
  return serverMemory.companionScenario ?? "normal";
}

export function setScenario(scenario: CompanionScenario) {
  if (!scenarioSwitchEnabled) throw new Error("Companion scenarios are dev-only.");
  serverMemory.companionScenario = scenario;
}
