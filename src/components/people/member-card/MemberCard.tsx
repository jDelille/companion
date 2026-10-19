"use client"; // ← new: the card now has state

import { useState } from "react";
import type { Member } from "@/domain/member";
import Modal from "@/components/primitives/modal/Modal";
import styles from "./MemberCard.module.scss";
import { getMemberModal, ModalType } from "./memberModals";
import useLongPress from "./useLongPress";
import Link from "@/components/primitives/AppLink";
import { membershipLabel } from "@/domain/member-presentation";

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
  const current = open ? getMemberModal(open, member) : null;

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
    if (a.modal) setOpen(a.modal);
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
          <div className={styles.status}>{member.membershipState}</div>
        </div>
      </div>

      <div className={styles.memberInfo}>
        <div className={styles.infoBox}>
          <span>Membership</span>
          <p>{membershipLabel(member)}</p>
        </div>
        <div className={styles.infoBox}>
          <span>Today’s bookings</span>
          <p>{member.bookings?.length ?? "Not connected"}</p>
        </div>
        <div className={styles.infoBox}>
          <span>Test readiness</span>
          <p>
            {member.testReadiness === undefined
              ? "Not available"
              : `${member.testReadiness}%`}
          </p>
        </div>
      </div>

      <div className={styles.memberActions}>
        <ul>
          {actions.map((a) => (
            <li key={a.id}>
              {a.label === "Check in" ? (
                <Link href="/kiosk" className={styles.checkInBtn}>
                  Open check-in
                </Link>
              ) : (
                <button
                  className={a.label === "Check in" ? styles.checkInBtn : ""}
                  onClick={() => handleAction(a)}
                >
                  {a.label}
                </button>
              )}
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
            key={`${member.id}:${open}`}
            member={member}
            onDone={() => setOpen(null)}
            onCancel={() => setOpen(null)}
            onAskAI={() => setOpen("ask")}
            onOpen={setOpen}
          />
        )}
      </Modal>
    </div>
  );
};

export default MemberCard;
