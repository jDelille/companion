"use client";

import { startTransition, useEffect, useReducer } from "react";
import IdentifyScreen from "@/components/kiosk/screens/identify-screen/IdentifyScreen";
import SessionSelectScreen from "@/components/kiosk/screens/session-select-screen/SessionSelectScreen";
import WelcomeScreen from "@/components/kiosk/screens/welcome-screen/WelcomeScreen";
import {
  checkInFlowReducer,
  initialCheckInFlow,
} from "@/domain/kiosk/checkInFlow";
import { SCHOOL_NAME, SECONDARY_ACTIONS } from "@/domain/kiosk/kioskConfig";
import { searchRoster } from "@/domain/kiosk/rosterSearch";
import { getRoster, getSessions } from "@/integrations/kiosk";

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

  // Fetch the selected session's roster whenever the identify step is loading
  const rosterSessionId =
    flow.step === "identify" && flow.roster.status === "loading"
      ? flow.session.sessionId
      : null;

  useEffect(() => {
    if (!rosterSessionId) return;

    // Same late-response guard as sessions. The reducer also checks the sessionId.
    let cancelled = false;
    getRoster(rosterSessionId)
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
    };
  }, [rosterSessionId]);

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
        onBack={() => dispatch({ type: "back" })}
      />
    );
  }

  // TODO: ConfirmScreen (K05). Placeholder so you can see the session and student arrive.
  if (flow.step === "confirm") {
    return (
      <p>
        Confirm: {flow.member.displayName} → {flow.session.title}
      </p>
    );
  }

  return <p>Step: {flow.step}</p>;
}
