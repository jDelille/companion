import type { Member, MemberAttendance, CheckIn } from "@/domain/member";
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

// One plain sentence from real records only, e.g. "Active member · 4 check-ins this week."
function storyHeadline(member: Member, attendance: MemberAttendance) {
  const state = `${membershipLabel(member)} member`;
  const count = attendance.lastSevenDays;
  if (count === 0) return `${state} · no check-ins this week.`;
  return `${state} · ${count} ${count === 1 ? "check-in" : "check-ins"} this week.`;
}

// Newest first, at most three. Falls back to the latest check-in when there's no history.
function recentCheckIns(attendance: MemberAttendance): CheckIn[] {
  if (attendance.history?.length) return attendance.history.slice(0, 3);
  return attendance.latest ? [attendance.latest] : [];
}

export default function MemberGrid({
  member,
  attendance,
  liveTest = false,
}: {
  member: Member;
  attendance: MemberAttendance;
  liveTest?: boolean;
}) {
  const recent = recentCheckIns(attendance);
  return (
    <div className={styles.memberGrid}>
      <article>
        <span className={styles.label}>Member story</span>
        <h2 className={styles.headline}>{storyHeadline(member, attendance)}</h2>
        <StatList
          stats={[
            { label: "Check-ins (7 days)", value: attendance.lastSevenDays },
            { label: "Current rank", value: member.rank.name },
            { label: "Stripes", value: member.rank.stripes },
            { label: "Member number", value: member.memberNumber },
          ]}
        />
        <span className={styles.label}>
          {liveTest ? "Recent verified check-ins" : "Recent check-ins"}
        </span>
        {recent.length ? (
          <ul className={styles.recent}>
            {recent.map((checkIn) => (
              <li key={checkIn.checkedInAt}>
                <strong>
                  <LocalTime iso={checkIn.checkedInAt} />
                </strong>
                <span>
                  {checkIn.sessionTitle}
                  {checkIn.late && " · Late"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>No check-ins yet.</p>
        )}
      </article>

      <article>
        <span className={styles.label}>Membership</span>
        <StatList
          stats={[
            { label: "Status", value: `${membershipLabel(member)} membership` },
            { label: "Household", value: member.householdName || "Not provided" },
            ...(member.nextClass
              ? [{ label: "Next class", value: member.nextClass }]
              : []),
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
        <span className={styles.label}>Progression</span>
        <StatList
          stats={[
            {
              label: "Current rank",
              value: member.rank.stripes
                ? `${member.rank.name} · ${member.rank.stripes} ${member.rank.stripes === 1 ? "stripe" : "stripes"}`
                : member.rank.name,
            },
            ...(member.testReadiness !== undefined
              ? [{ label: "Test readiness", value: `${member.testReadiness}%` }]
              : []),
          ]}
        />
      </article>
    </div>
  );
}
