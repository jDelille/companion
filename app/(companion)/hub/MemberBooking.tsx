"use client";

import { useEffect, useRef, useState } from "react";
import Link from "@/components/primitives/AppLink";
import Select from "@/components/primitives/select/Select";
import type { ActionFeedback } from "@/domain/hub-actions";
import styles from "./page.module.css";

type Session = { id: string; title: string; startsAt: string; future: boolean; version: number };
type Props = {
  member: { id: string; name: string };
  sessions: Session[];
  now: number;
  busy: boolean;
  locked: boolean;
  feedback?: ActionFeedback;
  clearFeedback: () => void;
  retry?: () => void;
  book: (session: Session) => void;
};

/** The authenticated Hub context supplies identity. A URL ID grants no access. */
export default function MemberBooking({ member, sessions, now, busy, locked, feedback, clearFeedback, retry, book }: Props) {
  const [targetId, setTargetId] = useState("");
  const [review, setReview] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const available = sessions.filter(session => session.future && Date.parse(session.startsAt) > now);
  const target = available.find(session => session.id === targetId);
  const saved = feedback?.kind === "success";
  useEffect(() => {
    if (feedback) resultRef.current?.focus({ preventScroll: true });
  }, [feedback]);

  return <section className={styles.card} aria-label={`Book a class for ${member.name}`}>
    <div className={styles.row}>
      <h2>Book a class for {member.name}</h2>
      <Link href={`/people/${encodeURIComponent(member.id)}`}>Back to member</Link>
    </div>
    <p>Odoo checks membership, credits and class capacity before saving. This does not send a message or process a payment.</p>
    <div className={styles.fields}>
      <label>Future class<Select ariaLabel="Future class for member" value={targetId} disabled={busy || locked || saved}
        placeholder="Choose a class" options={available.map(session => ({ value: session.id, label: `${session.title} · ${new Date(session.startsAt).toLocaleString()}` }))}
        onChange={id => { setTargetId(id); setReview(false); clearFeedback(); }} /></label>
      {!available.length && <p>No future classes are available in your authorized scope.</p>}
      {review && target && <p>Register <strong>{member.name}</strong> for <strong>{target.title}</strong> on {new Date(target.startsAt).toLocaleString()}?</p>}
      <button disabled={busy || locked || !target || saved} onClick={() => {
        if (!review) setReview(true);
        else if (target) book(target);
      }}>{saved ? "Booking saved" : busy && locked ? "Saving booking…" : review ? "Confirm member booking in Odoo" : "Review member booking"}</button>
      {review && !target && <p>This class is no longer available. Refresh and choose another class.</p>}
    </div>
    {feedback && <div ref={resultRef} tabIndex={-1} role={feedback.kind === "error" ? "alert" : "status"}
      aria-label={`Booking result for member ${member.id}`} className={`${styles.bookingResult} ${saved ? styles.bookingSuccess : styles.bookingAttention}`}>
      <p>{feedback.text}</p>{feedback.refreshWarning && <p>{feedback.refreshWarning}</p>}
      {feedback.kind === "uncertain" && retry && <button disabled={busy} onClick={retry}>Check member booking result</button>}
    </div>}
  </section>;
}
