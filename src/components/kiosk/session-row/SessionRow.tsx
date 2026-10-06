import { ViewTransition } from "react";
import type { SessionOption } from "@/contracts/kiosk-attendance";
import { formatDuration, formatStartTime } from "@/domain/kiosk/sessionFormat";
import styles from "./SessionRow.module.scss";

type Props = {
  session: SessionOption;
  onSelect: (session: SessionOption) => void;
};

// One class in today's list: time on the left, name and duration, capacity on the right.
// Full classes look and work the same as the rest. Capacity is info, not a gate.
const SessionRow = ({ session, onSelect }: Props) => {
  const { time, period } = formatStartTime(session.startsAt);
  const duration = formatDuration(session.startsAt, session.endsAt);
  const spokenLabel = `${session.title}, ${time} ${period}, ${duration}, ${session.seatsTaken} of ${session.capacity} spots taken`;

  return (
    // Same name as SessionHeader on K03: tapping this row morphs it into the header
    <ViewTransition name={`session-${session.sessionId}`} share="morph" default="none">
      <button
        type="button"
        className={styles.row}
        onClick={() => onSelect(session)}
        aria-label={spokenLabel}
      >
        <span className={styles.time}>
          {time}
          {period && <span className={styles.period}>{period}</span>}
        </span>

        <span className={styles.details}>
          <span className={styles.title}>{session.title}</span>
          <span className={styles.duration}>{duration}</span>
        </span>

        <span className={styles.capacity}>
          {session.seatsTaken}/{session.capacity}
        </span>
      </button>
    </ViewTransition>
  );
};

export default SessionRow;
