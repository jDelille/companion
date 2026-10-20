"use client";

import type { Member, MemberAttendance } from "@/domain/member";
import { membershipLabel } from "@/domain/member-presentation";
import { useSyncExternalStore, type ReactNode } from "react";
import { useMemberWorkspace } from "../memberWorkspace";
import {
  MEMBER_ACTION_EVENT,
  MEMBER_TAB_EVENT,
  sendShellEvent,
} from "@/components/shell/workspace/shellEvents";
import styles from "./MemberGrid.module.scss";

// Member 360's Overview, laid out like the mockup: Member story on the left,
// Training and Progression on the right. Member intelligence is in the Do For Me rail.

const NOT_RECORDED = "Not recorded";

type Stat = { label: string; value: ReactNode; action?: ReactNode };
const StatList = ({ stats }: { stats: Stat[] }) => (
  <ul className={`${styles.statList} ${styles.rows}`}>
    {stats.map((stat) => (
      <li key={stat.label}>
        {stat.label}
        <div className={styles.value}>
          <span className={stat.value === NOT_RECORDED ? styles.missing : ""}>{stat.value}</span>
          {stat.action}
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

// "Jan 2025"
function joinDate(iso?: string) {
  if (!iso) return NOT_RECORDED;
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// "Today" or "Aug 31", in the viewer's time zone (worked out in the browser only)
const noSubscription = () => () => {};
function DayLabel({ iso }: { iso: string }) {
  const text = useSyncExternalStore(
    noSubscription,
    () => {
      const day = new Date(iso);
      if (day.toDateString() === new Date().toDateString()) return "Today";
      return day.toLocaleDateString([], { month: "short", day: "numeric" });
    },
    () => "",
  );
  return <time dateTime={iso}>{text}</time>;
}

type RecentItem = { key: string; at: string; text: string; late?: boolean };

// Check-ins, plus the Hub's recorded actions when connected. Newest first, at most three.
function recentItems(attendance: MemberAttendance, timeline: { id: string; action: string; at: string }[]): RecentItem[] {
  const checkIns = attendance.history?.length
    ? attendance.history
    : attendance.latest
      ? [attendance.latest]
      : [];
  const items: RecentItem[] = checkIns.map((checkIn) => ({
    key: `checkin-${checkIn.checkedInAt}`,
    at: checkIn.checkedInAt,
    text: `Checked in · ${checkIn.sessionTitle}`,
    late: checkIn.late,
  }));
  for (const entry of timeline) {
    const action = entry.action.replaceAll("_", " ");
    items.push({ key: `action-${entry.id}`, at: entry.at, text: action.charAt(0).toUpperCase() + action.slice(1) });
  }
  return items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 3);
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
  const workspace = useMemberWorkspace(member.id, liveTest);
  const recent = recentItems(attendance, workspace?.timeline ?? []);

  // Odoo: the program is the member's course in the Hub. Sample data has its own.
  const program = liveTest
    ? workspace?.courses.length
      ? workspace.courses.map((course) => course.name).join(", ")
      : NOT_RECORDED
    : member.training?.program ?? NOT_RECORDED;

  // ✎ opens the member's Edit window, where each change is reviewed before it's saved
  const editButton = (field: string) => (
    <button
      type="button"
      className={styles.editBtn}
      aria-label={`Edit ${field}`}
      onClick={() => sendShellEvent(MEMBER_ACTION_EVENT, { memberId: member.id, action: "edit" })}
    >
      ✎
    </button>
  );

  return (
    <div className={styles.memberGrid}>
      <article>
        {/* Card header: label + the one-sentence story, with a line under it */}
        <header className={styles.cardHeader}>
          <span className={styles.label}>Member story</span>
          <h2 className={styles.headline}>{storyHeadline(member, attendance)}</h2>
        </header>
        <StatList
          stats={[
            { label: "Attendance", value: `${Math.round(member.attendanceRate * 100)}%` },
            { label: "Classes", value: member.classesAttended ?? NOT_RECORDED },
            { label: "Current rank", value: member.rank.name },
            { label: "Join date", value: joinDate(member.joinedOn) },
          ]}
        />
        <span className={styles.label}>Recent</span>
        {recent.length ? (
          <ul className={styles.recent}>
            {recent.map((item) => (
              <li key={item.key}>
                <strong>
                  <DayLabel iso={item.at} />
                </strong>
                <span>{item.text}</span>
                {item.late && <em className={styles.latePill}>Late</em>}
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>Nothing recorded yet.</p>
        )}
      </article>

      <article>
        <header className={styles.cardHeader}>
          <span className={styles.label}>Training</span>
        </header>
        <StatList
          stats={[
            { label: "Program", value: program, action: editButton("program") },
            { label: "Primary instructor", value: member.training?.primaryInstructor ?? NOT_RECORDED, action: editButton("primary instructor") },
            { label: "Team", value: member.training?.team ?? NOT_RECORDED, action: editButton("team") },
            { label: "Home location", value: member.training?.homeLocation ?? NOT_RECORDED, action: editButton("home location") },
          ]}
        />
        <span className={styles.label}>Progression</span>
        {/* Rank has no edit pencil: it changes through a reviewed rank award */}
        <StatList
          stats={[
            {
              label: "Current rank",
              value: member.rank.name,
              action: liveTest ? (
                <button
                  type="button"
                  className={styles.openBtn}
                  onClick={() => sendShellEvent(MEMBER_TAB_EVENT, { memberId: member.id, tab: "Progress" })}
                >
                  Open Progression
                </button>
              ) : undefined,
            },
          ]}
        />
      </article>
    </div>
  );
}
