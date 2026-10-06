"use client";

import { useEffect, useReducer } from "react";
import SessionSelectScreen from "@/components/kiosk/screens/SessionSelectScreen";
import WelcomeScreen from "@/components/kiosk/screens/WelcomeScreen";
import {
  checkInFlowReducer,
  initialCheckInFlow,
} from "@/domain/kiosk/checkInFlow";
import { SCHOOL_NAME, SECONDARY_ACTIONS } from "@/domain/kiosk/kioskConfig";
import { getSessions } from "@/integrations/kiosk";

export default function KioskPage() {
  const [flow, dispatch] = useReducer(checkInFlowReducer, initialCheckInFlow);

  // Fetch today's sessions whenever the session step is loading (first visit or Try again)
  const isLoadingSessions = flow.step === "session" && flow.sessions.status === "loading";

  useEffect(() => {
    if (!isLoadingSessions) return;

    // If they leave before it answers, ignore the late response
    let cancelled = false;
    getSessions()
      .then((sessions) => {
        if (!cancelled) dispatch({ type: "sessionsLoaded", sessions });
      })
      .catch(() => {
        if (!cancelled) dispatch({ type: "sessionsFailed" });
      });

    return () => {
      cancelled = true;
    };
  }, [isLoadingSessions]);

  if (flow.step === "welcome") {
    return (
      <WelcomeScreen
        schoolName={SCHOOL_NAME}
        actions={SECONDARY_ACTIONS}
        onCheckIn={() => dispatch({ type: "start" })}
      />
    );
  }

  if (flow.step === "session") {
    return (
      <SessionSelectScreen
        sessions={flow.sessions}
        onSelect={(session) => dispatch({ type: "selectSession", session })}
        onRetry={() => dispatch({ type: "retrySessions" })}
        onBack={() => dispatch({ type: "back" })}
      />
    );
  }

  // TODO: IdentifyScreen (K03). Placeholder so you can see the picked session arrive.
  if (flow.step === "identify") {
    return <p>Identify: {flow.session.title}</p>;
  }

  return <p>Step: {flow.step}</p>;
}
