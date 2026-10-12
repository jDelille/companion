"use client";

import { useState } from "react";
import type { Member } from "@/domain/member";
import {
  memberActionCopy,
  membershipLabel,
  type MemberAction,
} from "@/domain/member-presentation";
import LocalTime from "@/components/primitives/local-time/LocalTime";
import Link from "@/components/primitives/AppLink";
import styles from "./memberModals.module.scss";

export type ModalType = MemberAction;
type BodyProps = {
  member: Member;
  onDone: () => void;
  onCancel: () => void;
  onAskAI?: () => void;
  onOpen?: (type: ModalType) => void;
};

const MessageBody = ({ member, onCancel }: BodyProps) => {
  const [draft, setDraft] = useState(
    `Hello, this is Dojang following up with ${member.name}.`,
  );
  const [review, setReview] = useState(false);
  return (
    <>
      <p className={styles.note}>
        For {member.name}
        {member.householdName ? ` · ${member.householdName}` : ""}
      </p>
      <label>
        Message
        <textarea
          rows={4}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setReview(false);
          }}
        />
      </label>
      {review && (
        <div className={styles.note} role="status">
          <strong>Draft preview</strong>
          <p>{draft}</p>
          <p>Not sent. No verified recipient is connected for this member.</p>
        </div>
      )}
      <div className={styles.detailActions}>
        <button
          type="button"
          onClick={() => setReview(true)}
          disabled={!draft.trim()}
        >
          Preview draft
        </button>
        <button type="button" onClick={onCancel}>
          Close
        </button>
      </div>
    </>
  );
};

const BookBody = ({ member }: BodyProps) => (
  <>
    <p className={styles.note}>Today&apos;s registered classes</p>
    {member.bookings === undefined ? (
      <p>Bookings are not connected for {member.name}.</p>
    ) : member.bookings.length ? (
      <ul className={styles.list}>
        {member.bookings.map((booking) => (
          <li key={booking.sessionId} className={styles.option}>
            <div className={styles.optionText}>
              <p>{booking.title}</p>
              <span>
                <LocalTime iso={booking.startsAt} />
              </span>
            </div>
            <span className={styles.optionValue}>Registered</span>
          </li>
        ))}
      </ul>
    ) : (
      <p>No classes booked for {member.name} today.</p>
    )}
    <p className={styles.note}>
      Booking changes and eligibility checks aren&apos;t connected in this
      preview.
    </p>
    <div className={styles.detailActions}>
      <Link href="/ops">View class schedule →</Link>
    </div>
  </>
);

const PaymentBody = ({ member }: BodyProps) => (
  <>
    <dl className={styles.details}>
      <div>
        <dt>Member</dt>
        <dd>{member.name}</dd>
      </div>
      <div>
        <dt>Membership</dt>
        <dd>{membershipLabel(member)}</dd>
      </div>
      <div>
        <dt>Household</dt>
        <dd>{member.householdName || "Not provided"}</dd>
      </div>
    </dl>
    <p className={styles.note}>
      Billing details aren&apos;t connected for this member. No verified plan,
      balance, payment method, or next charge is available.
    </p>
  </>
);

const EditBody = ({ member }: BodyProps) => (
  <>
    <dl className={styles.details}>
      <div>
        <dt>Name</dt>
        <dd>{member.name}</dd>
      </div>
      <div>
        <dt>Member number</dt>
        <dd>{member.memberNumber}</dd>
      </div>
      <div>
        <dt>Membership</dt>
        <dd>{membershipLabel(member)}</dd>
      </div>
      <div>
        <dt>Rank</dt>
        <dd>
          {member.rank.name} · {member.rank.stripes} stripes
        </dd>
      </div>
      <div>
        <dt>Household</dt>
        <dd>{member.householdName || "Not provided"}</dd>
      </div>
    </dl>
    <p className={styles.note}>
      Program, instructor, and profile changes need a connected
      member-management service.
    </p>
  </>
);

const AskAIBody = ({ member }: BodyProps) => (
  <>
    <dl className={styles.details}>
      <div>
        <dt>Member</dt>
        <dd>{member.name}</dd>
      </div>
      <div>
        <dt>Membership</dt>
        <dd>{membershipLabel(member)}</dd>
      </div>
      <div>
        <dt>Rank</dt>
        <dd>{member.rank.name}</dd>
      </div>
    </dl>
    <p className={styles.note}>
      Open Companion from the navigation to ask about this member. Available
      actions depend on connected services.
    </p>
  </>
);

const DetailsBody = ({ member, onOpen }: BodyProps) => (
  <>
    <dl className={styles.details}>
      <div>
        <dt>Membership</dt>
        <dd>{membershipLabel(member)}</dd>
      </div>
      <div>
        <dt>Rank</dt>
        <dd>{member.rank.name}</dd>
      </div>
      <div>
        <dt>Readiness</dt>
        <dd>
          {member.testReadiness === undefined
            ? "Not available"
            : `${member.testReadiness}%`}
        </dd>
      </div>
      <div>
        <dt>Today&apos;s bookings</dt>
        <dd>
          {member.bookings === undefined
            ? "Not connected"
            : member.bookings.length}
        </dd>
      </div>
    </dl>
    <div className={styles.detailActions}>
      <Link href="/kiosk">Open check-in →</Link>
      <button type="button" onClick={() => onOpen?.("book")}>
        Bookings
      </button>
      <button type="button" onClick={() => onOpen?.("payment")}>
        Payments
      </button>
      <button type="button" onClick={() => onOpen?.("message")}>
        Message draft
      </button>
      <button type="button" onClick={() => onOpen?.("edit")}>
        Profile details
      </button>
    </div>
  </>
);

const contextMenu: { label: string; hint: string; modal: ModalType }[] = [
  {
    label: "Overview",
    hint: "Identity, rank and membership",
    modal: "details",
  },
  {
    label: "Bookings",
    hint: "This member's registered classes",
    modal: "book",
  },
  {
    label: "Payments",
    hint: "Membership and billing availability",
    modal: "payment",
  },
  {
    label: "Profile details",
    hint: "Review the current member record",
    modal: "edit",
  },
  {
    label: "Message draft",
    hint: "Preview a message for this member",
    modal: "message",
  },
];
const QuickActionsBody = ({ onOpen }: BodyProps) => (
  <section className={styles.menuSection}>
    <ul>
      {contextMenu.map((item) => (
        <li key={item.modal}>
          <button type="button" onClick={() => onOpen?.(item.modal)}>
            <span className={styles.menuLabel}>{item.label}</span>
            <span className={styles.menuHint}>{item.hint}</span>
          </button>
        </li>
      ))}
    </ul>
  </section>
);

const bodies = {
  message: MessageBody,
  book: BookBody,
  payment: PaymentBody,
  edit: EditBody,
  ask: AskAIBody,
  details: DetailsBody,
  quickActions: QuickActionsBody,
};
export function getMemberModal(action: ModalType, member: Member) {
  return { ...memberActionCopy(action, member), Body: bodies[action] };
}
