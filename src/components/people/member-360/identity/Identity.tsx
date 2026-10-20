"use client";

import { useState } from "react";
import { Member } from "@/domain/member";
import Modal from "@/components/primitives/modal/Modal";
import {
  getMemberModal,
  ModalType,
} from "@/components/people/member-card/memberModals";
import styles from "./Identity.module.scss";
import Link from "@/components/primitives/AppLink";
import { memberInitials } from "@/domain/member-presentation";

type Props = {
  member: Member;
  liveTest?: boolean;
};

// Each button says which modal it opens
const btns: { label: string; modal?: ModalType }[] = [
  { label: "Check in" },
  { label: "Message", modal: "message" },
  { label: "Book", modal: "book" },
  { label: "Payment", modal: "payment" },
  { label: "Profile details", modal: "edit" },
  { label: "...", modal: "quickActions" }, // the hold-menu from the member card
  { label: "Companion context", modal: "ask" },
  { label: "Do For Me" }, // opens the Companion's Do For Me panel, not a modal
];

const Identity = ({ member, liveTest = false }: Props) => {
  const [open, setOpen] = useState<ModalType | null>(null);
  const current = open ? getMemberModal(open, member) : null;

  const handleClick = (btn: (typeof btns)[number]) => {
    // The shell opens the Companion and the rail shows this member's suggestion in Do For Me
    if (btn.label === "Do For Me") {
      window.dispatchEvent(new CustomEvent("dojang:do-for-me", { detail: { memberId: member.id } }));
    }
    if (btn.modal) setOpen(btn.modal);
  };

  return (
    <>
      <div className={styles.identity}>
        <div className={styles.member}>
          <div className={styles.member__avatar}>{memberInitials(member)}</div>

          <div className={styles.memberName}>
            <div className={styles.text}>
              <h2>{member.name}</h2>
              <p>
                {[member.memberNumber, member.householdName]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <div className={styles.status}>
              {member.membershipState} · {member.rank.name}
            </div>
          </div>
        </div>
      </div>
      <div className={styles.memberActions}>
        <ul>
          {btns.map((btn) => (
            <li key={btn.label}>
              {btn.label === "Check in" ? (
                <Link href="/kiosk" className={styles.checkInBtn}>
                  Open check-in
                </Link>
              ) : (
                <button onClick={() => handleClick(btn)}>{btn.label}</button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* one modal, content depends on which button was clicked */}
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
            liveTest={liveTest}
            onDone={() => setOpen(null)}
            onCancel={() => setOpen(null)}
            onAskAI={() => setOpen("ask")}
            onOpen={setOpen}
          />
        )}
      </Modal>
    </>
  );
};

export default Identity;
