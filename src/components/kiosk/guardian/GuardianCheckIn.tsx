"use client";

import { useEffect, useState } from "react";
import type { SessionOption } from "@/contracts/kiosk-attendance";
import { guardianCheckIn, newGuardianCommand, verifyGuardian, type GuardianCommand, type GuardianVerified } from "@/integrations/guardian";
import styles from "./GuardianCheckIn.module.scss";
import Avatar from "@/components/primitives/avatar/Avatar";

type Outcome = { text: string; retry?: GuardianCommand };

// onFinished: the kiosk's privacy reset (clear everything, back to Welcome), same as Done after a normal check-in
export default function GuardianCheckIn({ session, onFinished }: { session: SessionOption; onFinished?: () => void }) {
  const [open, setOpen] = useState(false), [phone, setPhone] = useState(""), [pin, setPin] = useState("");
  const [verified, setVerified] = useState<GuardianVerified | null>(null), [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({});
  useEffect(() => {
    if (!verified) return;
    const timer = window.setTimeout(() => { setVerified(null); setOutcomes({}); setMessage("For privacy the family list was closed. Verify again to continue."); },
      verified.expiresInSeconds * 1000);
    return () => window.clearTimeout(timer);
  }, [verified]);
  const close = () => {
    const finished = verified !== null; // the parent got past the PIN step
    setOpen(false); setVerified(null); setPin(""); setPhone(""); setOutcomes({}); setMessage("");
    // After a verified visit, Done ends it like a normal check-in: privacy reset, back to Welcome.
    // Before that, it's just Cancel and the visitor stays on Find your name.
    if (finished) onFinished?.();
  };
  async function verify() {
    setBusy(true); setMessage("");
    const answer = await verifyGuardian(phone, pin, session.sessionId);
    setPin(""); setBusy(false);
    if (answer.kind === "ok") { setVerified(answer.value); setPhone(""); return; }
    setMessage(answer.kind === "problem" ? answer.title : "The connection is unavailable. Please try again or see the front desk.");
  }
  async function checkIn(memberId: string, existing?: GuardianCommand) {
    if (!verified) return;
    const command = existing || newGuardianCommand(memberId, session.sessionId);
    setBusy(true);
    const answer = await guardianCheckIn(verified.guardianToken, command);
    setBusy(false);
    const student = verified.students.find(s => s.memberId === memberId)?.displayName || "Student";
    setOutcomes(o => ({ ...o, [memberId]: answer.kind === "ok"
      ? { text: answer.value.receipt.alreadyRecorded ? `${student} was already checked in.` : `${student} is checked in${answer.value.receipt.status === "late" ? " (late)" : ""}.` }
      : answer.kind === "problem" ? { text: answer.title }
      : { text: `We could not confirm ${student}'s check-in.`, retry: command } }));
  }
  if (!open) return <div className={styles.start}><button onClick={() => setOpen(true)}>Parent check-in with phone and PIN</button></div>;
  return <section className={styles.panel} aria-label="Parent check-in">
    {!verified ? <>
      <p>Enter the phone number the school has for you and your 6-digit kiosk PIN. Only your own children are shown.</p>
      <div className={styles.fields}>
        <label>Phone number<input aria-label="Parent phone number" inputMode="tel" autoComplete="off" value={phone} maxLength={32} disabled={busy} onChange={e => setPhone(e.target.value)} /></label>
        <label>Kiosk PIN<input aria-label="Parent kiosk PIN" type="password" inputMode="numeric" autoComplete="off" value={pin} maxLength={6} disabled={busy} onChange={e => setPin(e.target.value.replace(/[^0-9]/g, ""))} /></label>
        <button disabled={busy || phone.replace(/[^0-9]/g, "").length < 7 || pin.length !== 6} onClick={() => void verify()}>Verify parent</button>
      </div>
    </> : <>
      <p>Hello {verified.guardian}. Choose who is here for {session.title}.</p>
      {verified.students.map(s => <div key={s.memberId} className={styles.student} role="group" aria-label={`Student ${s.displayName}`}>
        <span className={styles.who}><Avatar name={s.displayName} /><strong>{s.displayName}</strong></span>
        {outcomes[s.memberId] ? <span role="status">{outcomes[s.memberId].text}</span> : null}
        {!s.onRoster ? <span>Not booked in this class. Please see the front desk.</span>
          : s.attendanceState !== "pending" ? <span>Already recorded.</span>
          : !outcomes[s.memberId] || outcomes[s.memberId].retry ? <button disabled={busy} onClick={() => void checkIn(s.memberId, outcomes[s.memberId]?.retry)}>{outcomes[s.memberId]?.retry ? `Try ${s.displayName} again` : `Check in ${s.displayName}`}</button> : null}
      </div>)}
      {!verified.students.length && <p>No children are linked to this parent. Please see the front desk.</p>}
    </>}
    {message && <p role="alert">{message}</p>}
    <button disabled={busy} onClick={close}>{verified ? "Done" : "Cancel"}</button>
  </section>;
}
