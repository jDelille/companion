import type { SessionOption } from "@/contracts/kiosk-attendance";
import { formatStartTime } from "@/domain/kiosk/sessionFormat";
import styles from "./SessionCard.module.scss";

type Props = {
  session: SessionOption;
  onSelect: (session: SessionOption) => void;
};

// One class as a row, like Jodi's household cards: time · class + details · Select →
const SessionCard = ({ session, onSelect }: Props) => {
  const { time, period } = formatStartTime(session.startsAt, session.timeZone);
  // End time from the same session data and school time zone, for "4:15 PM – 4:55 PM"
  const end = formatStartTime(session.endsAt, session.timeZone);
  const instructor = session.instructor || "Instructor to be confirmed";
  const spokenLabel = `${session.title}, ${time} ${period}, ${instructor}, ${session.seatsTaken} of ${session.capacity} spots taken`;

  return (
    <button
      type="button"
      className={styles.card}
      onClick={() => onSelect(session)}
      aria-label={spokenLabel}
    >
      <span className={styles.time}>
        {time}
        {period && <span className={styles.period}> {period}</span>}
        <span aria-hidden="true"> – </span>
        {end.time}
        {end.period && <span className={styles.period}> {end.period}</span>}
      </span>

      <span className={styles.details}>
        <strong>{session.title}</strong>
        <small>
          {instructor}
          {session.location ? ` · ${session.location}` : ""} ·{" "}
          {session.seatsTaken} / {session.capacity} booked
        </small>
      </span>

      <span className={styles.select} aria-hidden="true">
        Select →
      </span>
    </button>
  );
};

export default SessionCard;
