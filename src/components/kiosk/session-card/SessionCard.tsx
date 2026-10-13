import { ViewTransition } from "react";
import type { SessionOption } from "@/contracts/kiosk-attendance";
import { formatDuration, formatStartTime } from "@/domain/kiosk/sessionFormat";
import styles from "./SessionCard.module.scss";

type Props = {
  session: SessionOption;
  onSelect: (session: SessionOption) => void;
};

const SessionCard = ({ session, onSelect }: Props) => {
  const { time, period } = formatStartTime(session.startsAt, session.timeZone);
  const duration = formatDuration(session.startsAt, session.endsAt);
  const spokenLabel = `${session.title}, ${time} ${period}, ${duration}, ${session.instructor || 'Instructor to be confirmed'}, ${session.seatsTaken} of ${session.capacity} spots taken`;

  return (
    // Same as SessionHeader on K03: tapping this card morphs it into the header
    <ViewTransition
      name={`session-${session.sessionId}`}
      share="morph"
      default="none"
    >
      <button
        type="button"
        className={styles.card}
        onClick={() => onSelect(session)}
        aria-label={spokenLabel}
      >
        <span className={styles.time}>
          {time}
          {period && <span className={styles.period}>{period}</span>}
        </span>

        <span className={styles.details}>
          <span className={styles.title}>{session.title}</span>
          <span className={styles.duration}>{session.instructor || 'Instructor to be confirmed'}{session.location ? ` · ${session.location}` : ''}</span>
          <span className={styles.duration}>
            {duration}
            <span aria-hidden="true"> · </span>
            <span>
              {session.seatsTaken}/{session.capacity} booked
            </span>
          </span>
        </span>

        <span className={styles.arrow} aria-hidden="true">
          ↗
        </span>
      </button>
    </ViewTransition>
  );
};

export default SessionCard;
