import type {
  ConciergeAction,
  ConciergeActionCommand,
  ConciergeActionId,
  ConciergeReceipt,
  ConciergeReply,
} from "@/domain/kiosk/concierge";

// Mock kiosk Concierge: scripted keyword matching, no AI model. Stands in for
// Paul's POST /api/v1/kiosk/concierge until we have it. Answers are synthetic.

export const ACTIONS: Record<ConciergeActionId, ConciergeAction> = {
  "request-trial": {
    id: "request-trial",
    title: "Request a free trial class",
    willHappen: [
      "The front desk gets your request with your first name and the class",
      "A staff member comes to meet you before class",
    ],
    willNotHappen: [
      "No payment, and no account is created",
      "Nothing about you is shown on this screen after you're done",
    ],
    confirmLabel: "Send request",
    needsTrialDetails: true,
  },
  "call-staff": {
    id: "call-staff",
    title: "Ask a staff member to come over",
    willHappen: ["The front desk gets a notification to come to this kiosk"],
    willNotHappen: ["No details about you are sent"],
    confirmLabel: "Call staff",
    needsTrialDetails: false,
  },
};

// Never answered on a shared screen (Paul's v1.2.0 kiosk AI restrictions)
const PRIVATE_WORDS = [
  "owe", "balance", "bill", "pay", "invoice", "refund", "card",
  "contract", "waiver", "medical", "injury", "rank", "belt", "password",
];

const includesAny = (text: string, words: string[]) => {
  return words.some((word) => text.includes(word));
};

export function replyTo(question: string): ConciergeReply {
  const text = question.toLowerCase();

  // Privacy first: a private question never reaches any other match
  if (includesAny(text, PRIVATE_WORDS)) {
    return {
      kind: "privateHandoff",
      title: "Let's keep that private",
      lines: [
        "Account, payment and personal details aren't shown on this shared screen.",
        "Please ask at the front desk, or check your member app.",
      ],
    };
  }

  // Checking in always goes through Check In: suggest it, never do it from here
  // "check in", "check-in", and with a name in between: "check Reese in"
  const isCheckIn = /\b(check|sign)\b.*\bin\b/.test(text) || text.includes("check-in") || text.includes("checkin");
  if (isCheckIn) {
    return {
      kind: "goTo",
      target: "checkIn",
      title: "Let's get you checked in",
      lines: ["Checking in always goes through Check In, so you confirm it yourself."],
    };
  }

  if (includesAny(text, ["try", "trial", "first class", "free class", "guest"])) {
    return { kind: "action", action: ACTIONS["request-trial"] };
  }

  if (includesAny(text, ["staff", "help me", "someone", "instructor", "front desk"])) {
    return { kind: "action", action: ACTIONS["call-staff"] };
  }

  if (includesAny(text, ["class", "schedule", "today", "tonight", "time"])) {
    return { kind: "schedule", title: "Today's classes" };
  }

  if (includesAny(text, ["join", "member", "sign up", "price", "cost"])) {
    return {
      kind: "answer",
      title: "Joining the school",
      lines: [
        "Most people start with a free trial class.",
        "After that, staff at the front desk can go through membership options with you.",
      ],
      action: ACTIONS["request-trial"],
    };
  }

  if (includesAny(text, ["restroom", "bathroom", "toilet", "changing", "locker"])) {
    return {
      kind: "answer",
      title: "Restrooms and changing rooms",
      lines: [
        "Down the hall past the front desk, on the left.",
        "Changing rooms and lockers are right next to them.",
      ],
    };
  }

  if (includesAny(text, ["access", "wheelchair", "step", "hearing", "quiet"])) {
    return {
      kind: "answer",
      title: "Accessibility",
      lines: [
        "The entrance, front desk and main training floor are step-free.",
        "Staff can help with seating for parents, or a quieter spot to wait.",
      ],
      action: ACTIONS["call-staff"],
    };
  }

  return { kind: "notUnderstood" };
}

// Returns null if the body isn't shaped like an action command
export function readActionCommand(body: unknown): ConciergeActionCommand | null {
  if (typeof body !== "object" || body === null) return null;
  const command = body as Partial<ConciergeActionCommand>;

  if (typeof command.idempotencyKey !== "string") return null;
  if (typeof command.correlationId !== "string") return null;
  if (command.actionId !== "request-trial" && command.actionId !== "call-staff") {
    return null;
  }

  const trial = command.trial;
  if (command.actionId === "request-trial") {
    if (typeof trial !== "object" || trial === null) return null;
    if (typeof trial.firstName !== "string" || trial.firstName.trim() === "") return null;
    if (typeof trial.sessionId !== "string") return null;
    if (typeof trial.sessionTitle !== "string") return null;
    if (typeof trial.startsAt !== "string") return null;
  }

  return {
    idempotencyKey: command.idempotencyKey,
    correlationId: command.correlationId,
    actionId: command.actionId,
    trial: command.actionId === "request-trial" && trial ? trial : null,
  };
}

// The receipt for a confirmed action. The real service would have created a
// trial lead or a staff notification in Odoo; the mock only says what it did.
export function receiptFor(command: ConciergeActionCommand, id: string): ConciergeReceipt {
  const at = new Date().toISOString();

  if (command.actionId === "request-trial" && command.trial) {
    return {
      id,
      actionId: command.actionId,
      headline: "Trial request sent",
      details: [
        { label: "Name", value: command.trial.firstName.trim() },
        { label: "Class", value: command.trial.sessionTitle },
        { label: "Next", value: "Staff will meet you before class" },
      ],
      at,
    };
  }

  return {
    id,
    actionId: command.actionId,
    headline: "Staff are on their way",
    details: [{ label: "Next", value: "Please wait here, someone will be right over" }],
    at,
  };
}

// The mock's memory of confirmed actions, so a retry with the same key gets the
// original receipt. In memory only, on globalThis so both routes share it.
type ConciergeStore = {
  usedKeys: Map<string, { actionId: ConciergeActionId; receipt: ConciergeReceipt }>;
  nextReceiptNumber: number;
};

const serverMemory = globalThis as typeof globalThis & {
  conciergeStore?: ConciergeStore;
};

export function getConciergeStore(): ConciergeStore {
  if (!serverMemory.conciergeStore) {
    serverMemory.conciergeStore = { usedKeys: new Map(), nextReceiptNumber: 1 };
  }
  return serverMemory.conciergeStore;
}

// Demo only. A connected kiosk must never receive a simulated action receipt.
export async function conciergeMockRoute(
  handleRequest: () => Response | Promise<Response>,
): Promise<Response> {
  const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  const isOdooTest = process.env.DOJANG_INTEGRATION_MODE === "odoo-test";
  if (!isDemo || isOdooTest) {
    return Response.json(
      { error: "Concierge is not connected in this workspace." },
      { status: 501 },
    );
  }

  await new Promise((resolve) => setTimeout(resolve, 500));
  return handleRequest();
}
