// Kiosk check-in flow: which step we're on and how we move between them.
// Screens only report what happened (an action). This decides the next step.
//
// Order never changes:
// welcome -> session -> identify -> confirm -> sending -> result

import type { SessionOption } from "@/contracts/kiosk-attendance";

export type CheckInStep =
  | "welcome"
  | "session"
  | "identify"
  | "confirm"
  | "sending"
  | "result";

// Where today's session list is at while on the session step
export type SessionsLoad =
  | { status: "loading" }
  | { status: "ready"; list: SessionOption[] } 
  | { status: "unavailable" };

// Each step carries its own data. Later steps get theirs as their transitions are added.
export type CheckInFlowState =
  | { step: "welcome" }
  | { step: "session"; sessions: SessionsLoad }
  | { step: "identify"; session: SessionOption } // the picked session travels with the flow
  | { step: "confirm" }
  | { step: "sending" }
  | { step: "result" };

export type CheckInFlowAction =
  | { type: "start" } // Check In tapped on Welcome
  | { type: "sessionsLoaded"; sessions: SessionOption[] }
  | { type: "sessionsFailed" }
  | { type: "retrySessions" } // Try again after the list failed to load
  | { type: "selectSession"; session: SessionOption }
  | { type: "back" };

export const initialCheckInFlow: CheckInFlowState = { step: "welcome" };

export function checkInFlowReducer(
  state: CheckInFlowState,
  action: CheckInFlowAction,
): CheckInFlowState {
  switch (action.type) {
    case "start":
      // Only Welcome can start a check-in, so a stray tap elsewhere does nothing
      if (state.step !== "welcome") return state;
      return { step: "session", sessions: { status: "loading" } };

    case "sessionsLoaded":
      if (state.step !== "session") return state;
      return { step: "session", sessions: { status: "ready", list: action.sessions } };

    case "sessionsFailed":
      if (state.step !== "session") return state;
      return { step: "session", sessions: { status: "unavailable" } };

    case "retrySessions":
      if (state.step !== "session" || state.sessions.status !== "unavailable") return state;
      return { step: "session", sessions: { status: "loading" } };

    case "selectSession":
      // Always an explicit pick, even when only one class is running. Never guess the class.
      if (state.step !== "session") return state;
      return { step: "identify", session: action.session };

    case "back":
      if (state.step === "session") return { step: "welcome" };
      return state;

    default:
      return state;
  }
}
