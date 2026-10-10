// PROVISIONAL: our own path and shape until the real AI service has a contract.
// The real service's keys will live on the server, behind this route, never in the browser.
import type {
  CompanionRequestBody,
  CompanionRequestReply,
  Suggestion,
} from "@/domain/companion";
import {
  findSuggestion,
  matchExisting,
  matchRequest,
} from "@/integrations/mock/companion";
import { mockRoute, problem } from "@/integrations/mock/companion-http";
import { getScenario } from "@/integrations/mock/companion-scenario";

// Returns null if the body isn't shaped like a request
function readBody(body: unknown): CompanionRequestBody | null {
  if (typeof body !== "object" || body === null) return null;
  const request = body as Partial<CompanionRequestBody>;

  if (typeof request.text !== "string") return null;
  if (request.memberId !== null && typeof request.memberId !== "string") return null;
  if (!Array.isArray(request.onScreenIds)) return null;

  const onScreenIds: string[] = [];
  for (const id of request.onScreenIds) {
    if (typeof id !== "string") return null;
    onScreenIds.push(id);
  }

  return { text: request.text, memberId: request.memberId, onScreenIds };
}

const reply = (body: CompanionRequestReply) => Response.json(body);

export async function POST(request: Request) {
  return mockRoute(async () => {
    const body = readBody(await request.json().catch(() => null));
    if (!body) {
      return problem(
        "INVALID_COMMAND",
        `companion-${crypto.randomUUID()}`,
        "Expected { text, memberId, onScreenIds }.",
      );
    }

    // 1. Forced by the dev scenario
    if (getScenario() === "not-understood") {
      return reply({ outcome: "notUnderstood" });
    }

    // 2. A request for a new task
    const newTask = matchRequest(body.text);
    if (newTask) {
      return reply({ outcome: "newTask", suggestion: newTask });
    }

    // 3. Otherwise, the task already on screen that it's asking about
    const onScreen: Suggestion[] = [];
    for (const id of body.onScreenIds) {
      const suggestion = findSuggestion(id);
      if (suggestion) onScreen.push(suggestion);
    }
    const existing = matchExisting(body.text, onScreen);
    if (existing) {
      return reply({ outcome: "existingTask", suggestionId: existing.id });
    }

    return reply({ outcome: "notUnderstood" });
  });
}
