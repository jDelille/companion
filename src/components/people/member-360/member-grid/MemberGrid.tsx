"use client";

import React, { useState } from "react";
import Modal from "@/components/primitives/modal/Modal";
import { modals, ModalType } from "@/components/people/member-card/memberModals";
import styles from "./MemberGrid.module.scss";

type Stat = { label: string; value: string };

const story: Stat[] = [
  { label: "Attendance", value: "82%" },
  { label: "Classes", value: "48" },
  { label: "Current rank", value: "Blue" },
  { label: "Join date", value: "Jan 2025" },
];

const recent: Stat[] = [
  { label: "Today", value: "Checked in" },
  { label: "Aug 31", value: "Evaluation completed" },
  { label: "Aug 25", value: "Payment successful" },
];

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

const MemberGrid = () => {
  const [open, setOpen] = useState<ModalType | null>(null);
  const current = open ? modals[open] : null;

  return (
    <div className={styles.memberGrid}>
      <article>
        <span className={styles.label}>Member story</span>
        <h2>Active and progressing normally.</h2>
        <StatList stats={story} variant="plain" />

        <span className={styles.label}>Recent</span>
        <StatList stats={recent} />
      </article>
      <article>
        <span className={styles.label}>Training</span>
        <StatList stats={training} onEdit={() => setOpen("edit")} />

        <span className={styles.label}>Progression</span>
        <StatList stats={progression} />
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
