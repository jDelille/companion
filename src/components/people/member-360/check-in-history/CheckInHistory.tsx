import type { CheckIn, MemberAttendance } from "@/domain/member";
import LocalTime from "@/components/primitives/local-time/LocalTime";
import styles from "./CheckInHistory.module.scss";

type Props = {
  attendance: MemberAttendance;
};

const dateFormat: Intl.DateTimeFormatOptions = {
  weekday: "short",
  month: "short",
  day: "numeric",
};

const timeFormat: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
};

// Member360's Attendance tab (Miro 09.03 "Check-ins"): every class this member
// checked in to, newest first. Read only: check-ins are made at the kiosk or
// the front desk, never edited here.
const CheckInHistory = ({ attendance }: Props) => {
  // Odoo only sends the latest check-in so far, so show that much and say so
  const rows: CheckIn[] = attendance.history ?? (attendance.latest ? [attendance.latest] : []);
  const isPartial = attendance.history === undefined;

  return (
    <section className={styles.history} aria-labelledby="check-in-history">
      <div className={styles.header}>
        <h2 id="check-in-history">Check-ins</h2>
        <p className={styles.summary}>
          {attendance.lastSevenDays} in the last 7 days
        </p>
      </div>

      {rows.length === 0 ? (
        <p className={styles.empty}>No check-ins yet.</p>
      ) : (
        <ol className={styles.list}>
          {rows.map((checkIn) => (
            <li key={checkIn.checkedInAt} className={styles.row}>
              <span className={styles.date}>
                <LocalTime iso={checkIn.checkedInAt} format={dateFormat} />
              </span>
              <span className={styles.session}>{checkIn.sessionTitle}</span>
              <span className={styles.time}>
                <LocalTime iso={checkIn.checkedInAt} format={timeFormat} />
                {/* Neutral, just information: same as the kiosk receipt */}
                {checkIn.late && <span className={styles.tag}>Late</span>}
              </span>
            </li>
          ))}
        </ol>
      )}

      {isPartial && rows.length > 0 && (
        <p className={styles.note}>
          Showing the latest check-in only. Full history isn&apos;t available from Odoo yet.
        </p>
      )}
    </section>
  );
};

export default CheckInHistory;
