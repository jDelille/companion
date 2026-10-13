// "Decisions" for the Today page: things that need a staff decision, built only from real records.
// Paul's write-up: the dashboard is "a decision surface, not a reporting surface".

import { useEffect, useState } from "react";
import type { SessionOption } from "@/contracts/kiosk-attendance";
import { getStaffSessions } from "@/integrations/staff-sessions";

export type Decision = {
  key: string;
  tone: "warning" | "info"; // ⚠ needs action now, ● worth a look
  title: string;
  detail: string;
  href: string;
};

// What the Hub tells a signed-in owner or manager (only the parts used here)
type HubContext = {
  principal: { role: string };
  messages: { id: string; state: string }[];
  deliveries: { messageId: string; state: string }[];
};
type TodayReport = { unassignedSessions: number };

export type HubDecisions =
  | { kind: "signedOut" }
  | { kind: "unavailable" }
  | { kind: "loaded"; decisions: Decision[] };

async function readHub<T>(
  operation: string,
  payload: Record<string, unknown>,
  signal: AbortSignal,
): Promise<T> {
  const response = await fetch("/api/hub", {
    method: "POST",
    headers: { "content-type": "application/json" },
    cache: "no-store",
    signal,
    body: JSON.stringify({ operation, payload, requestKey: null }),
  });
  const value = await response.json();
  if (!response.ok) throw Error(value.error?.code || "UNAVAILABLE");
  return value as T;
}

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

// Classes with every seat booked: always available on a staff device
export function sessionDecisions(sessions: SessionOption[], now: number): Decision[] {
  return sessions
    .filter((s) => Date.parse(s.endsAt) > now && s.capacity > 0 && s.seatsTaken >= s.capacity)
    .map((s) => ({
      key: `full-${s.sessionId}`,
      tone: "info",
      title: `${s.title} is full`,
      detail: `${s.seatsTaken}/${s.capacity} booked · new bookings will be refused`,
      href: `/ops/sessions/${s.sessionId}`,
    }));
}

// Messages, deliveries and instructor coverage: need an individual Hub sign-in
export async function loadHubDecisions(today: string, signal: AbortSignal): Promise<HubDecisions> {
  let context: HubContext;
  try {
    context = await readHub<HubContext>("context", {}, signal);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    return { kind: code === "SIGN_IN_REQUIRED" ? "signedOut" : "unavailable" };
  }

  const decisions: Decision[] = [];
  const unmatched = context.messages.filter((m) => m.state === "unmatched").length;
  const needsClass = context.messages.filter((m) => m.state === "received").length;
  const answered = new Set(context.deliveries.map((d) => d.messageId));
  const readyToReply = context.messages.filter(
    (m) => m.state === "resolved" && !answered.has(m.id),
  ).length;
  const failed = context.deliveries.filter((d) => d.state === "failed" || d.state === "uncertain").length;

  if (failed) {
    decisions.push({
      key: "deliveries",
      tone: "warning",
      title: plural(failed, "reply didn’t go through", "replies didn’t go through"),
      detail: "Delivery failed or is uncertain",
      href: "/hub",
    });
  }
  if (unmatched) {
    decisions.push({
      key: "unmatched",
      tone: "warning",
      title: plural(unmatched, "message needs identity check", "messages need identity check"),
      detail: "Match the sender to a family before replying",
      href: "/hub",
    });
  }
  if (needsClass) {
    decisions.push({
      key: "needs-class",
      tone: "info",
      title: plural(needsClass, "message needs class review", "messages need class review"),
      detail: "Confirm the student and class",
      href: "/hub",
    });
  }
  if (readyToReply) {
    decisions.push({
      key: "ready",
      tone: "info",
      title: plural(readyToReply, "reply ready to prepare", "replies ready to prepare"),
      detail: "Draft and approve the follow-up",
      href: "/hub",
    });
  }

  // Instructor coverage comes from the operations report (owners and managers)
  if (["owner", "manager"].includes(context.principal.role)) {
    try {
      const report = await readHub<TodayReport>("operations_report", { fromDate: today, toDate: today }, signal);
      if (report.unassignedSessions > 0) {
        decisions.unshift({
          key: "coverage",
          tone: "warning",
          title: plural(report.unassignedSessions, "class has no instructor", "classes have no instructor"),
          detail: "Instructor coverage for today",
          href: "/hub?view=operations",
        });
      }
    } catch {
      // Coverage is left out if the report can't be read; the other decisions still show
    }
  }
  return { kind: "loaded", decisions };
}

// The same decisions for the Today page and the Companion panel, refreshed every minute.
// `enabled` is false in the demo (no Odoo), where there's nothing real to decide on.
export function useTodayDecisions(enabled: boolean) {
  const [sessions, setSessions] = useState<SessionOption[] | null>(null);
  const [hub, setHub] = useState<HubDecisions | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setRevision((n) => n + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    getStaffSessions(controller.signal)
      .then((list) => {
        if (!controller.signal.aborted) setSessions(list);
      })
      .catch(() => {
        if (!controller.signal.aborted) setSessions([]);
      });
    loadHubDecisions(new Date().toLocaleDateString("en-CA"), controller.signal).then((result) => {
      if (!controller.signal.aborted) setHub(result);
    });
    return () => controller.abort();
  }, [enabled, revision]);

  const decisions: Decision[] = [
    ...(hub?.kind === "loaded" ? hub.decisions : []),
    ...(sessions ? sessionDecisions(sessions, Date.now()) : []),
  ];
  return { decisions, hub, checking: enabled && (hub === null || sessions === null) };
}
