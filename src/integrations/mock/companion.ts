import { Suggestion } from "@/domain/companion";

type CompanionContext = { label: string; heading: string; suggestions: Suggestion[] };

const frontDesk: CompanionContext = {
  label: "Front desk context",
  heading: "Three tasks due",
  suggestions: [
    {
      id: "fd-parker", title: "Call Parker trial",
      explanation: "Jordan's first class is at 4:15. Guardian hasn't confirmed.",
      actionLabel: "Prepare call", capability: "crm.lead.prepare_follow_up", risk: "low",
      preview: [
        { label: "Call", value: "Parker Family (guardian)" },
        { label: "Purpose", value: "Confirm 4:15 Pee Wee trial" },
        { label: "Talking points", value: "Arrival time · what to wear · waiver" },
      ],
    },
    {
      id: "fd-lee", title: "Review Lee waiver",
      explanation: "Riley's trial is at 5:00. Waiver is unsigned.",
      actionLabel: "Send waiver reminder", capability: "crm.trial.prepare", risk: "low",
      preview: [
        { label: "To", value: "Lee Family (guardian)" },
        { label: "Channel", value: "SMS" },
        { label: "Message", value: "Hi! Please sign Riley's waiver before today's 5:00 class: [link]" },
      ],
    },
    {
      id: "fd-testing", title: "Prepare testing form",
      explanation: "September test: 3 students at 85%+ readiness.",
      actionLabel: "Prepare testing roster", capability: "member.prepare_promotion", risk: "medium",
      preview: [
        { label: "Students", value: "Noah Patel · Maya Chen · Priya Shah" },
        { label: "Event", value: "September Test" },
        { label: "Approval", value: "Instructor sign-off required" },
      ],
    },
  ],
};

const members: Record<string, CompanionContext> = {
  "m-001": {
    label: "Maya Chen context",
    heading: "Suggested for Maya",
    suggestions: [
      {
        id: "m1-promo", title: "Maya is 92% test-ready",
        explanation: "3 evaluations passed · 88% attendance · test window in 2 weeks.",
        actionLabel: "Prepare promotion review", capability: "member.prepare_promotion", risk: "medium",
        preview: [
          { label: "Member", value: "Maya Chen" },
          { label: "From → to", value: "Blue Belt → Purple Belt" },
          { label: "Approval", value: "Sensei Ortiz (instructor) required" },
        ],
      },
    ],
  },
};

export function getCompanionContext(pathname: string): CompanionContext {
  const memberId = pathname.match(/^\/people\/([^/]+)/)?.[1];
  return (memberId && members[memberId]) || frontDesk;
}

// Scripted responses for the "Ask the agent" box
export function matchRequest(text: string): Suggestion | null {
  const t = text.toLowerCase();
  if (t.includes("email") || t.includes("meeting")) {
    return {
      id: "req-email", title: "Draft email to Linda Chen",
      explanation: "About Maya's upcoming belt test.",
      actionLabel: "Send email", capability: "communication.prepare_email", risk: "medium",
      preview: [
        { label: "To", value: "Linda Chen (guardian)" },
        { label: "Subject", value: "Maya's belt test" },
        { label: "Draft", value: "Hi Linda, Maya's been doing great and is almost ready for her Purple Belt test…" },
      ],
    };
  }
  return null;
}