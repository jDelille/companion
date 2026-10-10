import type {
  CompanionProblem,
  CompanionProblemCode,
} from "@/domain/companion";
import { getScenario } from "./companion-scenario";

// Helpers shared by the mock Companion routes. Same idea as kiosk-http.ts,
// kept separate so the two mocks can change on their own.

const NORMAL_DELAY = 400; // ms, long enough to actually see "Thinking…" and "Working…"
const SLOW_DELAY = 2500; // ms, for the "slow" scenario

const wait = (milliseconds: number) => {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

// PROVISIONAL: our own guesses. The UI checks `code`, not `status`.
const problemStatus: Record<CompanionProblemCode, number> = {
  INVALID_COMMAND: 400,
  UNKNOWN_SUGGESTION: 404,
  IDEMPOTENCY_CONFLICT: 409,
  ACTION_REJECTED: 422,
};

export function problem(
  code: CompanionProblemCode,
  correlationId: string,
  detail: string,
): Response {
  const body: CompanionProblem = { code, detail, correlationId };
  return Response.json(body, {
    status: problemStatus[code],
    headers: { "content-type": "application/problem+json" },
  });
}

// Every mock route goes through this: demo mode check, fake delay, and the
// "unavailable" and "response-lost" scenarios
export async function mockRoute(
  handleRequest: () => Response | Promise<Response>,
): Promise<Response> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
    return Response.json(
      { error: "Companion mock API is only available in demo mode." },
      { status: 501 },
    );
  }

  const scenario = getScenario();
  await wait(scenario === "slow" ? SLOW_DELAY : NORMAL_DELAY);

  // The service is down: nothing runs
  if (scenario === "unavailable") {
    return new Response(null, { status: 503 });
  }

  const response = await handleRequest();

  // The work happened, but the answer never reaches the browser
  if (getScenario() === "response-lost") {
    return new Response(null, { status: 503 });
  }
  return response;
}
