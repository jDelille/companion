import type { ProblemCode, ProblemDetails } from "@/contracts/kiosk-attendance";
import { getScenario } from "./kiosk-scenario";

// Helpers shared by the mock kiosk routes

const NORMAL_DELAY = 400; // ms, long enough to actually see loading states
const SLOW_DELAY = 2500; // ms, for the "slow" scenario

const wait = (milliseconds: number) => {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

// PROVISIONAL: the contract has the codes but not the HTTP status or title for each.
// These are guesses for now, so the UI should check `code`, not `status`.
const problemInfo: Record<ProblemCode, { status: number; title: string }> = {
  INVALID_COMMAND: { status: 400, title: "Invalid command" },
  FORBIDDEN: { status: 403, title: "Forbidden" },
  SESSION_UNAVAILABLE: { status: 404, title: "Session unavailable" },
  SESSION_NOT_OPEN: { status: 409, title: "Session not open for check-in" },
  MEMBER_UNAVAILABLE: { status: 404, title: "Member unavailable" },
  NOT_ON_ROSTER: { status: 422, title: "Not on roster" },
  ELIGIBILITY_REVIEW_REQUIRED: {
    status: 422,
    title: "Eligibility review required",
  },
  ATTENDANCE_REVIEW_REQUIRED: {
    status: 409,
    title: "Attendance review required",
  },
  VERSION_CONFLICT: { status: 409, title: "Session changed" },
  IDEMPOTENCY_CONFLICT: { status: 409, title: "Idempotency key reused" },
  CONCURRENT_RETRY: { status: 409, title: "Retry already in progress" },
  CAPABILITY_DISABLED: { status: 503, title: "Capability disabled" },
};

// Error response in the contract's ProblemDetails shape
export function problem(
  code: ProblemCode,
  correlationId: string,
  detail: string,
): Response {
  const { status, title } = problemInfo[code];
  const body: ProblemDetails = {
    type: `urn:dojang:problem:${code}`, // PROVISIONAL: contract doesn't say what this should look like
    title,
    status,
    code,
    detail,
    correlationId,
  };
  return Response.json(body, {
    status,
    headers: { "content-type": "application/problem+json" },
  });
}

// Fallback for when there's no correlationId in the body
export function correlationIdFrom(request: Request): string {
  const fromHeader = request.headers.get("x-correlation-id");
  if (fromHeader) return fromHeader;
  return `kiosk-${crypto.randomUUID()}`;
}

// Every mock route goes through this: demo mode check, fake delay, and the
// network-failure scenario (the work still happens, the response just gets swapped for a 503)
export async function mockRoute(
  handleRequest: () => Response | Promise<Response>,
): Promise<Response> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
    return Response.json(
      { error: "Kiosk mock API is only available in demo mode." },
      { status: 501 },
    );
  }

  const scenario = getScenario();
  await wait(scenario === "slow" ? SLOW_DELAY : NORMAL_DELAY);

  const response = await handleRequest();

  if (getScenario() === "network-failure") {
    return new Response(null, { status: 503 });
  }
  return response;
}
