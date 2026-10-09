"use client";

import { useState } from "react";
import { Member } from "@/domain/member";
import Modal from "@/components/primitives/modal/Modal";
import { modals, ModalType } from "@/components/people/member-card/memberModals";
import styles from "./Identity.module.scss";

type Props = {
  member: Member;
  readOnly?: boolean;
};

// Each button says which modal it opens
const btns: { label: string; modal?: ModalType }[] = [
  { label: "Check in" },
  { label: "Message", modal: "message" },
  { label: "Book", modal: "book" },
  { label: "Payment", modal: "payment" },
  { label: "✎ Edit", modal: "edit" },
  { label: "...", modal: "quickActions" }, // the hold-menu from the member card
  { label: "✦ Do For Me", modal: "ask" },
];

const Identity = ({ member, readOnly = false }: Props) => {
  const [open, setOpen] = useState<ModalType | null>(null);
  const [checkedIn, setCheckedIn] = useState(false);
  const current = open ? modals[open] : null;

  const handleClick = (btn: (typeof btns)[number]) => {
    if (btn.label === "Check in") setCheckedIn(true);
    else if (btn.modal) setOpen(btn.modal);
  };

  return (
    <>
      <div className={styles.identity}>
        <div className={styles.member}>
          <div className={styles.member__avatar}>{readOnly ? member.name.split(" ").filter(Boolean).map(part => part[0]).slice(0, 2).join("") : "MC"}</div>

          <div className={styles.memberName}>
            <div className={styles.text}>
              <h2>{member.name}</h2>
              <p>{readOnly ? member.memberNumber : <>Children Advanced · {member.householdName}</>}</p>
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
              <button
                className={btn.label === "Check in" ? styles.checkInBtn : ""}
                onClick={() => handleClick(btn)}
                disabled={readOnly || (btn.label === "Check in" && checkedIn)}
                title={readOnly ? "Not connected in this integration test" : undefined}
              >
                {btn.label === "Check in" && checkedIn ? "✓ Checked in" : btn.label}
              </button>
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
            onDone={() => setOpen(null)}
            onCancel={() => setOpen(null)}
            onAskAI={() => setOpen("ask")}
            onOpen={setOpen}
            onCheckIn={() => {
              setCheckedIn(true);
              setOpen(null);
            }}
          />
        )}
      </Modal>
    </>
  );
};

export default Identity;
