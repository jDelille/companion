// Kiosk Concierge flow: which view we're on and how we move between them.
// Screens only report what happened (an action). This decides the next view.
//
// ask -> thinking -> reply -> (preview -> sending -> done / notConfirmed / failed)
//
// All of this lives inside the kiosk's "concierge" step, so the privacy reset
// (Done, idle timeout) throws the whole thing away with the step.

import type { SessionOption } from "@/contracts/kiosk-attendance";
import {
  createQuestion,
  STAFF_HELP_QUESTION,
  type ConciergeAction,
  type ConciergeActionAnswer,
  type ConciergeActionCommand,
  type ConciergeAnswer,
  type ConciergeQuestion,
  type ConciergeReceipt,
} from "./concierge";

export type ConciergeState =
  | { view: "ask"; text: string } // text box contents live here so the reset clears them
  | {
      view: "thinking";
      question: ConciergeQuestion;
      goStraightToAction: boolean; // "Get help from staff": skip the reply, open the preview
    }
  | { view: "reply"; question: string; answer: ConciergeAnswer }
  | {
      view: "preview";
      action: ConciergeAction;
      firstName: string;
      session: SessionOption | null; // the class picked for a trial
    }
  | { view: "sending"; action: ConciergeAction; command: ConciergeActionCommand }
  | { view: "done"; action: ConciergeAction; receipt: ConciergeReceipt }
  | { view: "notConfirmed"; action: ConciergeAction; command: ConciergeActionCommand }
  | { view: "failed"; action: ConciergeAction };

export type ConciergeFlowAction =
  | { type: "textChanged"; text: string }
  | { type: "ask"; question: ConciergeQuestion } // a chip, or the typed question
  | { type: "answered"; correlationId: string; answer: ConciergeAnswer }
  | { type: "startAction"; action: ConciergeAction } // e.g. "Request a free trial class"
  | { type: "firstNameChanged"; firstName: string }
  | { type: "pickSession"; session: SessionOption }
  | { type: "submit"; command: ConciergeActionCommand } // confirm tapped
  | { type: "actionAnswered"; correlationId: string; answer: ConciergeActionAnswer }
  | { type: "retry" } // Try again after "not confirmed": resends the same command
  | { type: "askAgain" }; // back to the questions, dropping the reply

export const initialConcierge: ConciergeState = { view: "ask", text: "" };

// Where the Concierge opens: the questions, or already asking for staff help
export function initialConciergeFor(startWith: "questions" | "staffHelp"): ConciergeState {
  if (startWith === "staffHelp") {
    return {
      view: "thinking",
      question: createQuestion(STAFF_HELP_QUESTION),
      goStraightToAction: true,
    };
  }
  return initialConcierge;
}

// Trial requests need a first name and a class before they can be sent
export function canSubmit(state: ConciergeState): boolean {
  if (state.view !== "preview") return false;
  if (!state.action.needsTrialDetails) return true;
  return state.firstName.trim().length > 0 && state.session !== null;
}

export function conciergeReducer(
  state: ConciergeState,
  action: ConciergeFlowAction,
): ConciergeState {
  switch (action.type) {
    case "textChanged":
      if (state.view !== "ask") return state;
      return { view: "ask", text: action.text };

    case "ask":
      if (state.view !== "ask" && state.view !== "reply") return state;
      if (action.question.question.trim() === "") return state;
      return { view: "thinking", question: action.question, goStraightToAction: false };

    case "answered":
      // Ignore a reply to a question we've already moved on from
      if (state.view !== "thinking") return state;
      if (state.question.correlationId !== action.correlationId) return state;
      if (state.goStraightToAction && action.answer.kind === "action") {
        return { view: "preview", action: action.answer.action, firstName: "", session: null };
      }
      return {
        view: "reply",
        question: state.question.question,
        answer: action.answer,
      };

    case "startAction":
      if (state.view !== "reply") return state;
      return { view: "preview", action: action.action, firstName: "", session: null };

    case "firstNameChanged":
      if (state.view !== "preview") return state;
      return { ...state, firstName: action.firstName };

    case "pickSession":
      if (state.view !== "preview") return state;
      return { ...state, session: action.session };

    case "submit":
      // Only from a complete preview, so a second tap while sending does nothing
      if (!canSubmit(state) || state.view !== "preview") return state;
      return { view: "sending", action: state.action, command: action.command };

    case "actionAnswered":
      // Ignore an answer meant for a different attempt
      if (state.view !== "sending") return state;
      if (state.command.correlationId !== action.correlationId) return state;
      if (action.answer.outcome === "done") {
        return { view: "done", action: state.action, receipt: action.answer.receipt };
      }
      if (action.answer.outcome === "failed") {
        return { view: "failed", action: state.action };
      }
      return { view: "notConfirmed", action: state.action, command: state.command };

    case "retry":
      // Same command, same key: if the first attempt ran after all, the server
      // hands back that receipt instead of doing it twice
      if (state.view !== "notConfirmed") return state;
      return { view: "sending", action: state.action, command: state.command };

    case "askAgain":
      // Not while sending: the request is in flight and the screen locks
      if (state.view === "sending") return state;
      return initialConcierge;

    default:
      return state;
  }
}
