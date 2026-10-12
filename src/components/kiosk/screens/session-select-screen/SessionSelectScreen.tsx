import type { RecordId, SessionOption } from "@/contracts/kiosk-attendance";
import SessionCard from "@/components/kiosk/session-card/SessionCard";
import StatusMessage from "@/components/kiosk/status-message/StatusMessage";
import PlainButton from "@/components/primitives/plain-button/PlainButton";
import type { SessionsLoad } from "@/domain/kiosk/checkInFlow";
import { sessionsInTimeOrder } from "@/domain/kiosk/sessionFormat";
import styles from "./SessionSelectScreen.module.scss";

type Props = {
  sessions: SessionsLoad;
  // Set when coming Back from identify: that class's header slides back into its
  // card, and the rest of the screen fades in after it (like the forward pick)
  returningSessionId?: RecordId | null;
  onSelect: (session: SessionOption) => void;
  onRetry: () => void;
  onBack: () => void;
};

// K02: pick today's class. Only shows what it's given; the flow does the fetching.
const SessionSelectScreen = ({
  sessions,
  returningSessionId = null,
  onSelect,
  onRetry,
  onBack,
}: Props) => {
  return (
    <div
      className={[styles.screen, returningSessionId && styles.returning]
        .filter(Boolean)
        .join(" ")}
    >
      {/* When unavailable, Back sits next to Try again instead, so there's only one */}
      <div className={styles.topBar}>
        {sessions.status !== "unavailable" && (
          <PlainButton flush onClick={onBack}>
            ← Back
          </PlainButton>
        )}
      </div>

      <div className={styles.heading}>
        <h1>Choose your class</h1>
      </div>

      <h2 className={styles.today}>Today</h2>

      {/* role="status" so screen readers hear loading / empty / unavailable */}
      {sessions.status === "loading" && (
        <>
          <p className={styles.visuallyHidden} role="status">
            Loading today&apos;s classes…
          </p>
          {/* Placeholder rows shaped like SessionCard while the list loads */}
          <ul className={styles.list} aria-hidden="true">
            {[1, 2, 3].map((placeholder) => (
              <li key={placeholder} className={styles.skeletonRow}>
                <span className={styles.skeletonTime} />
                <span className={styles.skeletonDetails}>
                  <span className={styles.skeletonTitle} />
                  <span className={styles.skeletonDuration} />
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {sessions.status === "unavailable" && (
        <StatusMessage
          message="Classes can't be loaded right now."
          actions={[
            { label: "Try again", onClick: onRetry },
            { label: "Back", onClick: onBack },
          ]}
        />
      )}

      {sessions.status === "ready" && sessions.list.length === 0 && (
        <StatusMessage
          message="No classes today."
          detail="Please see the front desk."
        />
      )}

      {sessions.status === "ready" && sessions.list.length > 0 && (
        <ul className={styles.list}>
          {sessionsInTimeOrder(sessions.list).map((session) => (
            <li
              key={session.sessionId}
              // The card the header lands in shows straight away; the others fade in
              className={
                session.sessionId === returningSessionId
                  ? styles.landing
                  : undefined
              }
            >
              <SessionCard session={session} onSelect={onSelect} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SessionSelectScreen;
