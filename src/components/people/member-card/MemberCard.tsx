"use client"; // ← new: the card now has state

import { useState } from "react";
import type { Member } from "@/domain/member";
import Modal from "@/components/primitives/modal/Modal";
import styles from "./MemberCard.module.scss";
import { modals, ModalType } from "./memberModals";
import useLongPress from "./useLongPress";

type Props = {
  member: Member;
};

// ← new: each action says what it opens
const actions: { id: number; label: string; modal?: ModalType }[] = [
  { id: 1, label: "Check in" },
  { id: 2, label: "Book", modal: "book" },
  { id: 3, label: "Payment", modal: "payment" },
  { id: 4, label: "Message", modal: "message" },
  { id: 5, label: "✎ Edit", modal: "edit" },
  { id: 6, label: "+", modal: "ask" },
];

const MemberCard = ({ member }: Props) => {
  const [open, setOpen] = useState<ModalType | null>(null); // ← new
  const [checkedIn, setCheckedIn] = useState(false); // ← new
  const current = open ? modals[open] : null;

  // tap = details, hold = quick actions
  const memberPress = useLongPress(
    () => setOpen("quickActions"),
    () => setOpen("details"),
  );

  const initials = member.name
    .split(" ")
    .map((n) => n[0])
    .join(""); // ← "MC" from the name

  const handleAction = (a: (typeof actions)[number]) => {
    if (a.label === "Check in") setCheckedIn(true);
    else if (a.modal) setOpen(a.modal);
  };

  return (
    <div className={styles.memberCard}>
      <div className={styles.cardHeader}>
        <p className={styles.label}>active context</p>
        <span className={styles.hint}>Tap for details · hold for actions</span>
      </div>
      <div
        className={styles.member}
        role="button"
        tabIndex={0}
        {...memberPress}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen("details");
          }
        }}
      >
        <div className={styles.member__avatar}>{initials}</div>

        <div className={styles.memberName}>
          <div className={styles.text}>
            <h2>{member.name}</h2>
            <p>
              {member.rank.name} · {member.householdName}
            </p>
          </div>
          <div className={styles.status}>
            {checkedIn ? "checked in" : member.membershipState}
          </div>
        </div>
      </div>

      <div className={styles.memberInfo}>
        <div className={styles.infoBox}>
          <span>Membership</span>
          <p>Current</p>
        </div>
        <div className={styles.infoBox}>
          <span>Next class</span>
          <p>{member.nextClass}</p>
        </div>
        <div className={styles.infoBox}>
          <span>Test readiness</span>
          <p>{member.testReadiness}%</p>
        </div>
      </div>

      <div className={styles.memberActions}>
        <ul>
          {actions.map((a) => (
            <li key={a.id}>
              <button
                className={a.label === "Check in" ? styles.checkInBtn : ""}
                onClick={() => handleAction(a)}
                disabled={a.label === "Check in" && checkedIn}
              >
                {a.label === "Check in" && checkedIn ? "✓ Checked in" : a.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* ← new: one modal, content depends on which button was clicked */}
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
            onOpen={setOpen}
            onCheckIn={() => {
              setCheckedIn(true);
              setOpen(null); // close so the card shows "checked in"
            }}
          />
        )}
      </Modal>
    </div>
  );
};

export default MemberCard;
