"use client";

import { useEffect, useReducer, useState } from "react";
import type { SessionsLoad } from "@/domain/kiosk/checkInFlow";
import { createActionCommand, createQuestion } from "@/domain/kiosk/concierge";
import {
  canSubmit,
  conciergeReducer,
  initialConciergeFor,
} from "@/domain/kiosk/conciergeFlow";
import { askConcierge, runConciergeAction } from "@/integrations/concierge";
import { getSessions } from "@/integrations/kiosk";
import ConciergeScreen from "./ConciergeScreen";

type Props = {
  startWith: "questions" | "staffHelp";
  onExit: () => void; // back to Welcome
  onGoToCheckIn: () => void; // the "Check In" suggestion
  onDone: () => void; // privacy reset
};

// Runs the Concierge: holds its flow state and sends its requests. Only mounted
// during the kiosk's "concierge" step, so leaving the step (Back, Done, idle
// reset) unmounts it and everything it held is gone.
const Concierge = ({ startWith, onExit, onGoToCheckIn, onDone }: Props) => {
  const [state, dispatch] = useReducer(conciergeReducer, startWith, initialConciergeFor);

  // Ask while thinking. A late reply to an earlier question is dropped.
  const pendingQuestion = state.view === "thinking" ? state.question : null;

  useEffect(() => {
    if (!pendingQuestion) return;

    let cancelled = false;
    const controller = new AbortController();
    askConcierge(pendingQuestion, controller.signal).then((answer) => {
      if (cancelled) return;
      dispatch({ type: "answered", correlationId: pendingQuestion.correlationId, answer });
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [pendingQuestion]);

  // Send the confirmed action while sending. The command object stays the same
  // for the whole attempt, so this runs once per attempt.
  const pendingCommand = state.view === "sending" ? state.command : null;

  useEffect(() => {
    if (!pendingCommand) return;

    let cancelled = false;
    const controller = new AbortController();
    runConciergeAction(pendingCommand, controller.signal).then((answer) => {
      if (cancelled) return;
      dispatch({ type: "actionAnswered", correlationId: pendingCommand.correlationId, answer });
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [pendingCommand]);

  // Today's classes, for "What classes are on today?" and for picking a trial class.
  // Same source as Check In, so both always show the same classes.
  const needsSessions =
    (state.view === "reply" && state.answer.kind === "schedule") ||
    (state.view === "preview" && state.action.needsTrialDetails);
  // Each fetch is tagged with its attempt, so Try again shows "loading" straight
  // away and an older answer can't stand in for the newer one
  const [sessionsAttempt, setSessionsAttempt] = useState(0);
  const [loadedSessions, setLoadedSessions] = useState<{
    attempt: number;
    sessions: SessionsLoad;
  } | null>(null);

  useEffect(() => {
    if (!needsSessions) return;

    let cancelled = false;
    const controller = new AbortController();
    getSessions(controller.signal)
      .then((list) => {
        if (cancelled) return;
        setLoadedSessions({ attempt: sessionsAttempt, sessions: { status: "ready", list } });
      })
      .catch(() => {
        if (cancelled) return;
        setLoadedSessions({ attempt: sessionsAttempt, sessions: { status: "unavailable" } });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [needsSessions, sessionsAttempt]);

  let sessions: SessionsLoad | null = null;
  if (needsSessions) {
    const isCurrent = loadedSessions?.attempt === sessionsAttempt;
    sessions = isCurrent && loadedSessions ? loadedSessions.sessions : { status: "loading" };
  }

  // Confirm tapped: build the command once, here, with fresh ids
  const handleConfirm = () => {
    if (state.view !== "preview" || !canSubmit(state)) return;

    let trial = null;
    if (state.action.needsTrialDetails && state.session) {
      trial = {
        firstName: state.firstName.trim(),
        sessionId: state.session.sessionId,
        sessionTitle: state.session.title,
        startsAt: state.session.startsAt,
      };
    }
    dispatch({ type: "submit", command: createActionCommand(state.action.id, trial) });
  };

  return (
    <ConciergeScreen
      state={state}
      sessions={sessions}
      canSubmit={canSubmit(state)}
      onTextChange={(text) => dispatch({ type: "textChanged", text })}
      onAsk={(question) => dispatch({ type: "ask", question: createQuestion(question) })}
      onStartAction={(action) => dispatch({ type: "startAction", action })}
      onFirstNameChange={(firstName) => dispatch({ type: "firstNameChanged", firstName })}
      onPickSession={(session) => dispatch({ type: "pickSession", session })}
      onConfirm={handleConfirm}
      onRetry={() => dispatch({ type: "retry" })}
      onRetrySessions={() => setSessionsAttempt((attempt) => attempt + 1)}
      onAskAgain={() => dispatch({ type: "askAgain" })}
      onExit={onExit}
      onGoToCheckIn={onGoToCheckIn}
      onDone={onDone}
    />
  );
};

export default Concierge;
