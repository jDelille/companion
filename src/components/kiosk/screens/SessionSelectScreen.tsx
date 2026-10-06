import type { SessionOption } from "@/contracts/kiosk-attendance";
import SessionRow from "@/components/kiosk/SessionRow";
import type { SessionsLoad } from "@/domain/kiosk/checkInFlow";
import styles from "./SessionSelectScreen.module.scss";

type Props = {
  sessions: SessionsLoad;
  onSelect: (session: SessionOption) => void;
  onRetry: () => void;
  onBack: () => void;
};

// K02: pick today's class. Only shows what it's given; the flow does the fetching.
const SessionSelectScreen = ({
  sessions,
  onSelect,
  onRetry,
  onBack,
}: Props) => {
  return (
    <div className={styles.screen}>
      {/* When unavailable, Back sits next to Try again instead, so there's only one */}
      <div className={styles.topBar}>
        {sessions.status !== "unavailable" && (
          <button type="button" className={styles.button} onClick={onBack}>
            ← Back
          </button>
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
          {/* Placeholder rows shaped like SessionRow while the list loads */}
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
        <div className={styles.message} role="status">
          <p>Classes can&apos;t be loaded right now.</p>
          <div className={styles.messageActions}>
            <button type="button" className={styles.button} onClick={onRetry}>
              Try again
            </button>
            <button type="button" className={styles.button} onClick={onBack}>
              Back
            </button>
          </div>
        </div>
      )}

      {sessions.status === "ready" && sessions.list.length === 0 && (
        <p className={styles.message} role="status">
          No classes today.
        </p>
      )}

      {sessions.status === "ready" && sessions.list.length > 0 && (
        <ul className={styles.list}>
          {sessions.list.map((session) => (
            <li key={session.sessionId}>
              <SessionRow session={session} onSelect={onSelect} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SessionSelectScreen;
