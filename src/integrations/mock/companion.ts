import type { CompanionContext, Suggestion } from "@/domain/companion";

// Only the mock Companion routes read this file. The rail gets it through
// src/integrations/companion.ts.

const frontDesk: CompanionContext = {
  label: "Front desk context",
  heading: "Three tasks due",
  suggestions: [
    {
      id: "fd-parker",
      title: "Call Parker trial",
      explanation:
        "Jordan's first class is at 4:15. Guardian hasn't confirmed.",
      actionLabel: "Prepare call",
      capability: "crm.lead.prepare_follow_up",
      risk: "low",
      preview: [
        { label: "Call", value: "Parker Family (guardian)" },
        { label: "Purpose", value: "Confirm 4:15 Pee Wee trial" },
        {
          label: "Talking points",
          value: "Arrival time · what to wear · waiver",
        },
      ],
    },
    {
      id: "fd-lee",
      title: "Review Lee waiver",
      explanation: "Riley's trial is at 5:00. Waiver is unsigned.",
      actionLabel: "Send waiver reminder",
      capability: "crm.trial.prepare",
      risk: "low",
      preview: [
        { label: "To", value: "Lee Family (guardian)" },
        { label: "Channel", value: "SMS" },
        {
          label: "Message",
          value:
            "Hi! Please sign Riley's waiver before today's 5:00 class: [link]",
        },
      ],
    },
    {
      id: "fd-testing",
      title: "Prepare testing form",
      explanation: "September test: 3 students at 85%+ readiness.",
      actionLabel: "Prepare testing roster",
      capability: "member.prepare_promotion",
      risk: "medium",
      preview: [
        { label: "Students", value: "Noah Patel · Maya Chen · Priya Shah" },
        { label: "Event", value: "September Test" },
        { label: "Approval", value: "Instructor sign-off required" },
      ],
    },
  ],
};

const members: Record<string, CompanionContext> = {
  "5001": {
    suggestions: [],
    intel: [
      { label: "Engagement", value: "Healthy" },
      { label: "Retention risk", value: "Low" },
      { label: "Testing readiness", value: "92%" },
    ],
    featured: {
      summary: "One remaining curriculum requirement blocks testing eligibility.",
      suggestion: {
        id: "maya-poomsae",
        title: "Complete Poomsae evaluation tonight.",
        explanation:
          "Maya meets the attendance requirement (82%) and has completed her other curriculum items. The Poomsae evaluation is the last requirement before she's testing eligible, and Master Kim teaches her 5:45 class tonight.",
        actionLabel: "Schedule evaluation",
        capability: "member.prepare_promotion",
        risk: "medium",
        preview: [
          { label: "Evaluation", value: "Poomsae (forms)" },
          { label: "When", value: "Tonight · 5:45 Children Advanced" },
          { label: "Evaluator", value: "Master Kim" },
          { label: "Approval", value: "Instructor sign-off" },
        ],
      },
    },
  },
};

// Members without their own context get the front desk, like before
export function getContextFor(memberId: string | null): CompanionContext {
  if (memberId && members[memberId]) {
    return members[memberId];
  }
  return frontDesk;
}

// Tasks the agent can create from a typed or spoken request
const emailRequest: Suggestion = {
  id: "req-email",
  title: "Draft email to Linda Chen",
  explanation: "About Maya's upcoming belt test.",
  actionLabel: "Send email",
  capability: "communication.prepare_email",
  risk: "medium",
  preview: [
    { label: "To", value: "Linda Chen (guardian)" },
    { label: "Subject", value: "Maya's belt test" },
    {
      label: "Draft",
      value:
        "Hi Linda, Maya's been doing great and is almost ready for her Purple Belt test…",
    },
  ],
};

// Every task the mock knows about, so the routes can look one up by id
// instead of trusting what the browser sends
function allSuggestions(): Suggestion[] {
  const everything = [...frontDesk.suggestions, emailRequest];
  for (const memberContext of Object.values(members)) {
    everything.push(...memberContext.suggestions);
    if (memberContext.featured) {
      everything.push(memberContext.featured.suggestion);
    }
  }
  return everything;
}

export function findSuggestion(id: string): Suggestion | null {
  const found = allSuggestions().find((suggestion) => suggestion.id === id);
  return found ?? null;
}

// Scripted responses for the "Ask the agent" box
export function matchRequest(text: string): Suggestion | null {
  const t = text.toLowerCase().replace(/-/g, "");
  if (t.includes("email") || t.includes("meeting") || t.includes("parents")) {
    return emailRequest;
  }
  return null;
}

// Words too generic to pick out one task ("prepare", "send", ...)
const GENERIC = new Set([
  "prepare",
  "send",
  "review",
  "form",
  "the",
  "for",
  "and",
]);
const keywords = (text: string) =>
  text
    .toLowerCase()
    .replace(/-/g, "")
    .match(/[a-z]+/g)
    ?.filter((w) => w.length > 2 && !GENERIC.has(w)) ?? [];

// Finds the task already on screen that a request is talking about
export function matchExisting(
  text: string,
  suggestions: Suggestion[],
): Suggestion | null {
  const asked = new Set(keywords(text));
  let best: Suggestion | null = null;
  let bestScore = 0;
  for (const s of suggestions) {
    const score = new Set(
      keywords(`${s.title} ${s.actionLabel}`).filter((w) => asked.has(w)),
    ).size;
    if (score > bestScore) {
      best = s;
      bestScore = score;
    }
  }
  return best;
}
