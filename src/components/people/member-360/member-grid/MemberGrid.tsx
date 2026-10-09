"use client";

import React, { useState } from "react";
import type { Member, MemberAttendance } from "@/domain/member";
import LocalTime from "@/components/primitives/local-time/LocalTime";
import Modal from "@/components/primitives/modal/Modal";
import { modals, ModalType } from "@/components/people/member-card/memberModals";
import styles from "./MemberGrid.module.scss";

type Stat = { label: string; value: React.ReactNode };

// Placeholder rows (still Maya's demo data for everyone) until those have a source
const storyPlaceholders: Stat[] = [
  { label: "Classes", value: "48" },
  { label: "Current rank", value: "Blue" },
  { label: "Join date", value: "Jan 2025" },
];

const recentPlaceholders: Stat[] = [
  { label: "Aug 31", value: "Evaluation completed" },
  { label: "Aug 25", value: "Payment successful" },
];

// The real attendance rows, from the same store the kiosk writes to
const attendanceStory = (attendance: MemberAttendance): Stat => {
  return { label: "Check-ins (7 days)", value: String(attendance.lastSevenDays) };
};

const lastCheckIn = (attendance: MemberAttendance): Stat => {
  const latest = attendance.latest;
  if (!latest) {
    return { label: "Last check-in", value: "No check-ins yet" };
  }
  return {
    label: "Last check-in",
    value: (
      <>
        {latest.sessionTitle} · <LocalTime iso={latest.checkedInAt} />
        {latest.late && " · Late"}
      </>
    ),
  };
};

const training: Stat[] = [
  { label: "Program", value: "Children Advanced" },
  { label: "Primary Instructor", value: "Master Kim" },
  { label: "Team", value: "Tournament Candidate" },
  { label: "Home location", value: "Downtown" },
];

const progression: Stat[] = [{ label: "Current rank", value: "Blue Belt" }];

// "rows" = divider under each stat, "plain" = no dividers
type Variant = "rows" | "plain";

type StatListProps = {
  stats: Stat[];
  variant?: Variant;
  onEdit?: () => void; // shows a ✎ next to each value
};

const StatList = ({ stats, variant = "rows", onEdit }: StatListProps) => (
  <ul className={`${styles.statList} ${styles[variant]}`}>
    {stats.map((s) => (
      <li key={s.label}>
        {s.label}
        <div className={styles.value}>
          <span>{s.value}</span>
          {onEdit && (
            <button
              className={styles.editBtn}
              onClick={onEdit}
              aria-label={`Edit ${s.label}`}
            >
              ✎
            </button>
          )}
        </div>
      </li>
    ))}
  </ul>
);

type Props = {
  attendance: MemberAttendance;
  liveMember?: Member;
};

const MemberGrid = ({ attendance, liveMember }: Props) => {
  const [open, setOpen] = useState<ModalType | null>(null);
  const current = open ? modals[open] : null;

  const story = [attendanceStory(attendance), ...(liveMember ? [{ label: "Current rank", value: liveMember.rank.name }] : storyPlaceholders)];
  const recent = [lastCheckIn(attendance), ...(liveMember ? [] : recentPlaceholders)];

  return (
    <div className={styles.memberGrid}>
      <article>
        <span className={styles.label}>Member story</span>
        <h2>{liveMember ? "Verified attendance" : "Active and progressing normally."}</h2>
        <StatList stats={story} variant="plain" />

        <span className={styles.label}>Recent</span>
        <StatList stats={recent} />
      </article>
      <article>
        <span className={styles.label}>Training</span>
        <StatList stats={liveMember ? [{ label: "Training details", value: "Not connected in this test" }] : training} onEdit={liveMember ? undefined : () => setOpen("edit")} />

        <span className={styles.label}>Progression</span>
        <StatList stats={liveMember ? [{ label: "Current rank", value: liveMember.rank.name }] : progression} />
      </article>

      <Modal
        open={!!current}
        label={current?.label ?? ""}
        title={current?.title ?? ""}
        description={current?.description ?? ""}
        onClose={() => setOpen(null)}
      >
        {current && (
          <current.Body
            onDone={() => setOpen(null)}
            onCancel={() => setOpen(null)}
            onAskAI={() => setOpen("ask")}
          />
        )}
      </Modal>
    </div>
  );
};

export default MemberGrid;
