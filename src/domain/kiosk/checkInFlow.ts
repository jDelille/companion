// Kiosk check-in flow: which step we're on and how we move between them.
// Screens only report what happened (an action). This decides the next step.
//
// Order never changes:
// welcome -> session -> identify -> confirm -> sending -> result

import type {
  RecordId,
  RosterMember,
  SessionOption,
} from "@/contracts/kiosk-attendance";

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

// Where the selected session's roster is at while on the identify step.
// Only ever searched, never shown as a list.
export type RosterLoad =
  | { status: "loading" }
  | { status: "ready"; list: RosterMember[] }
  | { status: "unavailable" };

// Each step carries its own data. Later steps get theirs as their transitions are added.
export type CheckInFlowState =
  | { step: "welcome" }
  | { step: "session"; sessions: SessionsLoad }
  | {
      step: "identify";
      session: SessionOption; // the picked session travels with the flow
      roster: RosterLoad;
      query: string; // search text lives here so the privacy reset clears it
    }
  | { step: "confirm"; session: SessionOption; member: RosterMember }
  | { step: "sending" }
  | { step: "result" };

export type CheckInFlowAction =
  | { type: "start" } // Check In tapped on Welcome
  | { type: "sessionsLoaded"; sessions: SessionOption[] }
  | { type: "sessionsFailed" }
  | { type: "retrySessions" } // Try again after the list failed to load
  | { type: "selectSession"; session: SessionOption }
  | { type: "rosterLoaded"; sessionId: RecordId; roster: RosterMember[] }
  | { type: "rosterFailed"; sessionId: RecordId }
  | { type: "retryRoster" } // Try again after the roster failed to load
  | { type: "searchChanged"; query: string }
  | { type: "selectMember"; member: RosterMember }
  | { type: "changeSession" } // "Change class" in the session header
  | { type: "back" };

export const initialCheckInFlow: CheckInFlowState = { step: "welcome" };

// Back to the session list with a fresh fetch, dropping the roster, the search
// text and any picked student along with the step they lived in
const backToSessionList = (): CheckInFlowState => ({
  step: "session",
  sessions: { status: "loading" },
});

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
      return {
        step: "session",
        sessions: { status: "ready", list: action.sessions },
      };

    case "sessionsFailed":
      if (state.step !== "session") return state;
      return { step: "session", sessions: { status: "unavailable" } };

    case "retrySessions":
      if (state.step !== "session" || state.sessions.status !== "unavailable") {
        return state;
      }
      return { step: "session", sessions: { status: "loading" } };

    case "selectSession":
      // Always an explicit pick, even when only one class is running. Never guess the class.
      if (state.step !== "session") return state;
      return {
        step: "identify",
        session: action.session,
        roster: { status: "loading" },
        query: "",
      };

    case "rosterLoaded":
      // Ignore a roster that arrives for a session we've already left
      if (state.step !== "identify") return state;
      if (state.session.sessionId !== action.sessionId) return state;
      return { ...state, roster: { status: "ready", list: action.roster } };

    case "rosterFailed":
      if (state.step !== "identify") return state;
      if (state.session.sessionId !== action.sessionId) return state;
      return { ...state, roster: { status: "unavailable" } };

    case "retryRoster":
      if (state.step !== "identify" || state.roster.status !== "unavailable") {
        return state;
      }
      return { ...state, roster: { status: "loading" } };

    case "searchChanged":
      if (state.step !== "identify") return state;
      return { ...state, query: action.query };

    case "selectMember": {
      // Only a student from this session's loaded roster can be picked
      if (state.step !== "identify" || state.roster.status !== "ready") {
        return state;
      }
      const isOnRoster = state.roster.list.some(
        (member) => member.memberId === action.member.memberId,
      );
      if (!isOnRoster) return state;
      return { step: "confirm", session: state.session, member: action.member };
    }

    case "changeSession":
      // Changing the class drops the student and anything decided about them
      if (state.step !== "identify" && state.step !== "confirm") return state;
      return backToSessionList();

    case "back":
      if (state.step === "session") return { step: "welcome" };
      if (state.step === "identify") return backToSessionList();
      return state;

    default:
      return state;
  }
}
