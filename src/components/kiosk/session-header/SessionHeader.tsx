import { ViewTransition } from "react";
import type { SessionOption } from "@/contracts/kiosk-attendance";
import PlainButton from "@/components/primitives/plain-button/PlainButton";
import { formatDuration, formatStartTime } from "@/domain/kiosk/sessionFormat";
import styles from "./SessionHeader.module.scss";

type Props = {
  session: SessionOption;
  onChangeSession?: () => void; // leave out to hide Change class (Result screen)
  changeDisabled?: boolean; // locked while a check-in is sending
};

// The selected class, kept on screen from Identify (K03) through Result (K06).
// Laid out like SessionRow so the row on K02 can morph into it.
const SessionHeader = ({
  session,
  onChangeSession,
  changeDisabled = false,
}: Props) => {
  const { time, period } = formatStartTime(session.startsAt);
  const duration = formatDuration(session.startsAt, session.endsAt);

  return (
    // Same name as the row on K02, so the browser treats them as one object.
    // default="none" stops it animating on unrelated changes.
    <ViewTransition name={`session-${session.sessionId}`} share="morph" default="none">
      <header className={styles.header}>
        <span className={styles.time}>
          {time}
          {period && <span className={styles.period}>{period}</span>}
        </span>

        <span className={styles.details}>
          <span className={styles.title}>{session.title}</span>
          <span className={styles.duration}>{duration}</span>
        </span>

        {onChangeSession && (
          <PlainButton onClick={onChangeSession} disabled={changeDisabled}>
            Change class
          </PlainButton>
        )}
      </header>
    </ViewTransition>
  );
};

export default SessionHeader;
