"use client";

import { startTransition, useEffect, useReducer } from "react";
import RecoveryStatus from "@/components/kiosk/recovery/RecoveryStatus";
import IdleWarning from "@/components/kiosk/idle-warning/IdleWarning";
import Concierge from "@/components/kiosk/screens/concierge-screen/Concierge";
import { useIdleTimer } from "@/components/kiosk/idle-warning/useIdleTimer";
import ConfirmScreen from "@/components/kiosk/screens/confirm-screen/ConfirmScreen";
import ResultScreen from "@/components/kiosk/screens/result-screen/ResultScreen";
import IdentifyScreen from "@/components/kiosk/screens/identify-screen/IdentifyScreen";
import SessionSelectScreen from "@/components/kiosk/screens/session-select-screen/SessionSelectScreen";
import WelcomeScreen from "@/components/kiosk/screens/welcome-screen/WelcomeScreen";
import {
  checkInFlowReducer,
  initialCheckInFlow,
} from "@/domain/kiosk/checkInFlow";
import { createCheckInCommand } from "@/domain/kiosk/checkInCommand";
import { outcomeFor } from "@/domain/kiosk/checkInOutcome";
import {
  CONCIERGE_ENABLED,
  IDLE_TIMEOUT_SECONDS,
  IDLE_WARNING_SECONDS,
  RESULT_AUTO_RETURN_SECONDS,
  SCHOOL_NAME,
  SECONDARY_ACTIONS,
} from "@/domain/kiosk/kioskConfig";
import { searchRoster } from "@/domain/kiosk/rosterSearch";
import { checkIn, getRoster, getSessions } from "@/integrations/kiosk";

export default function KioskPage() {
  const [flow, dispatch] = useReducer(checkInFlowReducer, initialCheckInFlow);

  // Fetch today's sessions whenever the session step is loading (first visit or Try again)
  const isLoadingSessions = flow.step === "session" && flow.sessions.status === "loading";

  useEffect(() => {
    if (!isLoadingSessions) return;

    // If they leave before it answers (Back, idle reset), cancel it and ignore any late answer
    let cancelled = false;
    const controller = new AbortController();
    getSessions(controller.signal)
      .then((sessions) => {
        if (!cancelled) dispatch({ type: "sessionsLoaded", sessions });
      })
      .catch(() => {
        if (!cancelled) dispatch({ type: "sessionsFailed" });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [isLoadingSessions]);

  // Fetch the selected session's roster whenever the identify step is loading
  const rosterSessionId =
    flow.step === "identify" && flow.roster.status === "loading"
      ? flow.session.sessionId
      : null;

  useEffect(() => {
    if (!rosterSessionId) return;

    // Same late-response guard as sessions. The reducer also checks the sessionId.
    let cancelled = false;
    const controller = new AbortController();
    getRoster(rosterSessionId, controller.signal)
      .then((roster) => {
        if (!cancelled) {
          dispatch({ type: "rosterLoaded", sessionId: rosterSessionId, roster });
        }
      })
      .catch(() => {
        if (!cancelled) dispatch({ type: "rosterFailed", sessionId: rosterSessionId });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [rosterSessionId]);

  // Send the check-in while on the sending step. The command object stays the
  // same for the whole step, so this runs once per attempt.
  const pendingCommand = flow.step === "sending" ? flow.command : null;

  useEffect(() => {
    if (!pendingCommand) return;

    // Leaving the step cancels the request for real, and its answer is dropped.
    // (A timeout inside checkIn() is different: that answer still arrives, as "not confirmed".)
    let cancelled = false;
    const controller = new AbortController();

    checkIn(pendingCommand, controller.signal).then((answer) => {
      if (cancelled) return;
      dispatch({
        type: "checkInAnswered",
        correlationId: pendingCommand.correlationId,
        outcome: outcomeFor(answer, pendingCommand),
      });
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [pendingCommand]);

  // Confirm tapped: build the command once, here, with fresh ids
  const handleConfirm = () => {
    if (flow.step !== "confirm") return;
    const command = createCheckInCommand(flow.session, flow.member);
    if (command) {
      dispatch({ type: "submitCheckIn", command });
    } else {
      dispatch({ type: "commandRejected" });
    }
  };

  // K07: success and already-checked-in go back to Welcome on their own
  const autoReturnDue =
    flow.step === "result" &&
    (flow.outcome.kind === "success" || flow.outcome.kind === "alreadyCheckedIn");

  useEffect(() => {
    if (!autoReturnDue) return;

    // Taps don't extend it: the receipt has been seen, the screen is for the next person
    const timer = setTimeout(
      () => dispatch({ type: "reset" }),
      RESULT_AUTO_RETURN_SECONDS * 1000,
    );
    return () => clearTimeout(timer);
  }, [autoReturnDue]);

  // K07: idle reset. Off on Welcome (nothing to clear), while sending (the
  // check-in timeout already bounds it), and when the result returns on its own anyway
  const idle = useIdleTimer({
    active: flow.step !== "welcome" && flow.step !== "sending" && !autoReturnDue,
    restartKey: flow.step,
    timeoutSeconds: IDLE_TIMEOUT_SECONDS,
    warningSeconds: IDLE_WARNING_SECONDS,
    onTimeout: () => dispatch({ type: "reset" }),
  });

  // Coming back through the browser's back/forward cache would restore the
  // last visitor's screen, so start clean instead
  useEffect(() => {
    const resetIfRestored = (event: PageTransitionEvent) => {
      if (event.persisted) dispatch({ type: "reset" });
    };
    window.addEventListener("pageshow", resetIfRestored);
    return () => window.removeEventListener("pageshow", resetIfRestored);
  }, []);

  // One screen per step. Every reset is a plain dispatch, never startTransition,
  // so it switches instantly and no snapshot of the previous person lingers.
  const renderScreen = () => {
    if (flow.step === "welcome") {
      return (
        <WelcomeScreen
          schoolName={SCHOOL_NAME}
          actions={SECONDARY_ACTIONS}
          onCheckIn={() => dispatch({ type: "start" })}
          // AI is optional: with the Concierge off there's no card, and check-in is unchanged
          onAsk={CONCIERGE_ENABLED ? () => dispatch({ type: "openConcierge" }) : undefined}
          onStaffHelp={() => dispatch({ type: "getStaffHelp" })}
        />
      );
    }

    if (flow.step === "session") {
      return (
        <SessionSelectScreen
          sessions={flow.sessions}
          // startTransition lets the picked row morph into the K03 header
          onSelect={(session) =>
            startTransition(() => dispatch({ type: "selectSession", session }))
          }
          onRetry={() => dispatch({ type: "retrySessions" })}
          onBack={() => dispatch({ type: "back" })}
        />
      );
    }

    if (flow.step === "identify") {
      const search =
        flow.roster.status === "ready"
          ? searchRoster(flow.roster.list, flow.query)
          : ({ status: "tooShort" } as const);

      return (
        <IdentifyScreen
          session={flow.session}
          rosterStatus={flow.roster.status}
          query={flow.query}
          search={search}
          onQueryChange={(query) => dispatch({ type: "searchChanged", query })}
          onSelectMember={(member) => dispatch({ type: "selectMember", member })}
          onRetry={() => dispatch({ type: "retryRoster" })}
          onChangeSession={() => dispatch({ type: "changeSession" })}
          onStaffHelp={() => dispatch({ type: "getStaffHelp" })}
          onBack={() => dispatch({ type: "back" })}
        />
      );
    }

    if (flow.step === "confirm" || flow.step === "sending") {
      return (
        <ConfirmScreen
          session={flow.session}
          member={flow.member}
          isSending={flow.step === "sending"}
          onConfirm={handleConfirm}
          onBack={() => dispatch({ type: "back" })}
          onChangeSession={() => dispatch({ type: "changeSession" })}
        />
      );
    }

    if (flow.step === "result") {
      return (
        <ResultScreen
          session={flow.session}
          member={flow.member}
          outcome={flow.outcome}
          onDone={() => dispatch({ type: "reset" })}
          onRetry={() => dispatch({ type: "retryCheckIn" })}
          onChooseClass={() => dispatch({ type: "changeSession" })}
          onStaffHelp={() => dispatch({ type: "getStaffHelp" })}
        />
      );
    }

    if (flow.step === "concierge") {
      return (
        <Concierge
          // keyed so "Get help" while already in the Concierge starts it fresh
          key={flow.startWith}
          startWith={flow.startWith}
          onExit={() => dispatch({ type: "back" })}
          onGoToCheckIn={() => dispatch({ type: "goToCheckIn" })}
          onDone={() => dispatch({ type: "reset" })}
        />
      );
    }

    // Every step is handled above; TypeScript errors here if a new one isn't
    const unhandled: never = flow;
    return unhandled;
  };

  return (
    <>
      {renderScreen()}
      <IdleWarning secondsLeft={idle.secondsLeft} onStillHere={idle.stillHere} />
      <RecoveryStatus />
    </>
  );
}
