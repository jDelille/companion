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
import type { CheckInCommand } from "./checkInCommand";
import type { CheckInOutcome } from "./checkInOutcome";

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
  | {
      step: "confirm";
      session: SessionOption;
      member: RosterMember;
      query: string; // kept so Back to identify shows the same matches again
    }
  | {
      step: "sending";
      session: SessionOption;
      member: RosterMember;
      command: CheckInCommand; // built once; a retry resends this exact command
    }
  | {
      step: "result";
      session: SessionOption; // the receipt has to name the selected session
      member: RosterMember;
      command: CheckInCommand | null; // null only if the command couldn't be built
      outcome: CheckInOutcome;
    };

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
  | { type: "submitCheckIn"; command: CheckInCommand } // Confirm check-in tapped
  | { type: "commandRejected" } // buildCheckIn refused the inputs, nothing was sent
  | {
      type: "checkInAnswered";
      correlationId: string; // which request this answer belongs to
      outcome: CheckInOutcome;
    }
  | { type: "retryCheckIn" } // Try again after "not confirmed": resends the same command
  | { type: "reset" } // Done, idle timeout or auto-return: back to a clean Welcome
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
      return {
        step: "confirm",
        session: state.session,
        member: action.member,
        query: state.query,
      };
    }

    case "changeSession":
      // Changing the class drops the student and anything decided about them.
      // Not while sending: the request is in flight and the screen locks.
      // From the result screen this is "Choose a class".
      if (
        state.step !== "identify" &&
        state.step !== "confirm" &&
        state.step !== "result"
      ) {
        return state;
      }
      return backToSessionList();

    case "retryCheckIn":
      // Same command, same idempotency key: if the first attempt was saved after
      // all, the server hands back that receipt instead of recording it twice
      if (state.step !== "result" || state.outcome.kind !== "notConfirmed") {
        return state;
      }
      if (!state.command) return state;
      return {
        step: "sending",
        session: state.session,
        member: state.member,
        command: state.command,
      };

    case "reset":
      // Privacy reset (K07), from any step: session, student, search text, roster,
      // command and result all go. In-flight requests are aborted by the page
      // when their step ends, and their late answers no longer match anything.
      return initialCheckInFlow;

    case "submitCheckIn":
      // Only from Confirm, so a second tap while sending does nothing
      if (state.step !== "confirm") return state;
      return {
        step: "sending",
        session: state.session,
        member: state.member,
        command: action.command,
      };

    case "commandRejected":
      if (state.step !== "confirm") return state;
      return {
        step: "result",
        session: state.session,
        member: state.member,
        command: null,
        outcome: { kind: "seeFrontDesk" },
      };

    case "checkInAnswered":
      // Ignore an answer meant for a different request (an earlier attempt,
      // or one from before a reset)
      if (state.step !== "sending") return state;
      if (state.command.correlationId !== action.correlationId) return state;
      return {
        step: "result",
        session: state.session,
        member: state.member,
        command: state.command,
        outcome: action.outcome,
      };

    case "back":
      if (state.step === "session") return { step: "welcome" };
      if (state.step === "identify") return backToSessionList();
      if (state.step === "confirm") {
        // Back to pick someone else: the chosen student is dropped (and with
        // them anything decided about them), but the search text stays so
        // "picked the wrong Ava" is one tap to fix. Roster is fetched fresh.
        return {
          step: "identify",
          session: state.session,
          roster: { status: "loading" },
          query: state.query,
        };
      }
      return state;

    default:
      return state;
  }
}
