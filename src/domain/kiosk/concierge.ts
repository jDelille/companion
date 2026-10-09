import type { RecordId } from "@/contracts/kiosk-attendance";

// Kiosk AI Concierge ("Do For Me" on the kiosk).
//
// From Paul's v1.2.0 release notes: bounded help with the schedule, trial and
// guest visits, joining, wayfinding, accessibility and staff assistance. Private
// questions ("How much do I owe?") are never answered on the shared kiosk, they
// get a private handoff instead. Check-in works the same with the Concierge off.
//
// PROVISIONAL: Paul's endpoint is POST /api/v1/kiosk/concierge, but we don't have
// his contract. Every shape below is our own until his arrives.

// One-tap questions on the Concierge screen
export type ConciergeTopic = {
  id: string;
  label: string; // what the chip says
  question: string; // what gets sent, same as typing it
};

export const CONCIERGE_TOPICS: ConciergeTopic[] = [
  { id: "classes", label: "What classes are on today?", question: "What classes are on today?" },
  { id: "trial", label: "I want to try a class", question: "I want to try a class" },
  { id: "joining", label: "How do I join?", question: "How do I join?" },
  { id: "restrooms", label: "Where are the restrooms?", question: "Where are the restrooms?" },
  { id: "accessibility", label: "Accessibility help", question: "Accessibility help" },
  { id: "staff", label: "I need help from staff", question: "I need help from staff" },
];

// Something the Concierge can do for the visitor, after they confirm it
export type ConciergeActionId = "request-trial" | "call-staff";

export type ConciergeAction = {
  id: ConciergeActionId;
  title: string; // "Request a free trial class"
  willHappen: string[]; // shown before confirming
  willNotHappen: string[]; // also shown, so nothing surprising happens
  confirmLabel: string; // "Send request"
  needsTrialDetails: boolean; // asks for a first name and a class first
};

// POST /api/v1/kiosk/concierge
export type ConciergeQuestion = {
  question: string;
  correlationId: string; // matches the reply to the question that asked it
};

export type ConciergeReply =
  | { kind: "answer"; title: string; lines: string[]; action?: ConciergeAction }
  | { kind: "schedule"; title: string } // the kiosk shows today's sessions itself
  | { kind: "action"; action: ConciergeAction }
  // A clickable page suggestion (Miro 11): "check me in" opens the normal
  // Check In, the assistant never checks anyone in itself
  | { kind: "goTo"; target: "checkIn"; title: string; lines: string[] }
  | { kind: "privateHandoff"; title: string; lines: string[] }
  | { kind: "notUnderstood" };

// What the integration layer hands back: the reply, or "unavailable" for
// anything we couldn't get or couldn't read
export type ConciergeAnswer = ConciergeReply | { kind: "unavailable" };

// The trial request's details. First name only: nothing else personal is
// typed into a shared screen.
export type TrialDetails = {
  firstName: string;
  sessionId: RecordId;
  sessionTitle: string;
  startsAt: string;
};

// POST /api/v1/kiosk/concierge/actions: run one confirmed action
export type ConciergeActionCommand = {
  idempotencyKey: string; // same key on a retry, so it can't run twice
  correlationId: string;
  actionId: ConciergeActionId;
  trial: TrialDetails | null; // only for request-trial
};

export type ConciergeReceipt = {
  id: string;
  actionId: ConciergeActionId;
  headline: string; // "Trial request sent"
  details: { label: string; value: string }[];
  at: string; // ISO time
};

export type ConciergeActionReply = {
  receipt: ConciergeReceipt;
  replayed: boolean; // true when the key was seen before
  correlationId: string;
};

// done: the route returned a receipt for this action
// failed: the route said no. Nothing ran.
// notConfirmed: no usable answer. It may have run, so the retry resends the same command.
export type ConciergeActionAnswer =
  | { outcome: "done"; receipt: ConciergeReceipt }
  | { outcome: "failed" }
  | { outcome: "notConfirmed" };

// What "Get help from staff" asks for, so it goes through the same route as typing it
export const STAFF_HELP_QUESTION = "I need help from staff";

export function createQuestion(question: string): ConciergeQuestion {
  return { question, correlationId: `concierge-${crypto.randomUUID()}` };
}

// Built once, on the first confirm. A notConfirmed retry reuses it as-is.
export function createActionCommand(
  actionId: ConciergeActionId,
  trial: TrialDetails | null,
): ConciergeActionCommand {
  return {
    idempotencyKey: `concierge-${crypto.randomUUID()}`,
    correlationId: `concierge-${crypto.randomUUID()}`,
    actionId,
    trial,
  };
}
