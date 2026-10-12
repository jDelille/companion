import type { Member, MemberAttendance } from "@/domain/member";
import { membershipLabel } from "@/domain/member-presentation";
import LocalTime from "@/components/primitives/local-time/LocalTime";
import type { ReactNode } from "react";
import styles from "./MemberGrid.module.scss";

type Stat = { label: string; value: ReactNode };
const StatList = ({ stats }: { stats: Stat[] }) => (
  <ul className={`${styles.statList} ${styles.rows}`}>
    {stats.map((stat) => (
      <li key={stat.label}>
        {stat.label}
        <div className={styles.value}>
          <span>{stat.value}</span>
        </div>
      </li>
    ))}
  </ul>
);

export default function MemberGrid({
  member,
  attendance,
  liveTest = false,
}: {
  member: Member;
  attendance: MemberAttendance;
  liveTest?: boolean;
}) {
  const latest = attendance.latest;
  return (
    <div className={styles.memberGrid}>
      <article>
        <span className={styles.label}>Membership</span>
        <h2>{membershipLabel(member)} membership</h2>
        <StatList
          stats={[
            { label: "Member number", value: member.memberNumber },
            {
              label: "Household",
              value: member.householdName || "Not provided",
            },
            { label: "Current rank", value: member.rank.name },
            { label: "Stripes", value: member.rank.stripes },
            ...(member.testReadiness !== undefined
              ? [{ label: "Test readiness", value: `${member.testReadiness}%` }]
              : []),
          ]}
        />
      </article>
      <article>
        <span className={styles.label}>Attendance</span>
        <h2>{liveTest ? "Verified attendance" : "Recorded check-ins"}</h2>
        <StatList
          stats={[
            { label: "Check-ins (7 days)", value: attendance.lastSevenDays },
            {
              label: "Last check-in",
              value: latest ? (
                <>
                  {latest.sessionTitle} · <LocalTime iso={latest.checkedInAt} />
                  {latest.late && " · Late"}
                </>
              ) : (
                "No check-ins yet"
              ),
            },
          ]}
        />
        <span className={styles.label}>Today&apos;s bookings</span>
        <StatList
          stats={
            member.bookings === undefined
              ? [{ label: "Bookings", value: "Not connected" }]
              : member.bookings.length
                ? member.bookings.map((booking) => ({
                    label: booking.title,
                    value: <LocalTime iso={booking.startsAt} />,
                  }))
                : [{ label: "Bookings", value: "No classes booked today" }]
          }
        />
      </article>
    </div>
  );
}
