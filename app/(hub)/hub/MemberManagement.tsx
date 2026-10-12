"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Select from "@/components/primitives/select/Select";
import { explainHubError, type ActionFeedback } from "@/domain/hub-actions";
import styles from "./page.module.css";

type Session = { id: string; title: string; startsAt: string; future: boolean; version: number };
type Details = {
  member: { id: string; name: string; version: number; partnerVersion: number; phone: string | null; email: string | null; state: string; rank: string; stripes: number };
  canEdit: boolean;
  canEditContact: boolean;
  ranks: { id: string; name: string; maxStripes: number }[];
  rankHistory: { id: string; rank: string; stripes: number; date: string }[];
  bookings: { id: string; sessionId: string; title: string; startsAt: string; attendanceState: string; replaceable: boolean }[];
  attendance: { id: string; sessionId: string; title: string; checkedInAt: string; checkedOutAt: string | null }[];
  billing: null | {
    subscriptions: { id: string; plan: string; state: string; nextInvoiceDate: string | null }[];
    invoices: { id: string; number: string; kind: string; date: string | null; paymentState: string; total: number; remaining: number; currency: string; scope: string }[];
  };
};
type Review = { operation: string; payload: Record<string, unknown>; description: string };
type Props = {
  memberId: string; sessions: Session[]; now: number; busy: boolean; locked: boolean;
  feedback?: ActionFeedback; clearFeedback: () => void; retry?: () => Promise<ActionFeedback | undefined>;
  act: (operation: string, payload: Record<string, unknown>) => Promise<ActionFeedback | undefined>;
};
const when = (value: string) => new Date(value).toLocaleString();
const money = (value: number, currency: string) => new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value);

function ContactForm({ data, disabled, review }: { data: Details; disabled: boolean; review: (v: Review) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const changes: Record<string, string> = {};
    for (const field of ["name", "phone", "email"] as const) {
      const value = String(form.get(field) || "").trim();
      if (value !== (data.member[field] || "")) changes[field] = value;
    }
    if (!Object.keys(changes).length) return;
    review({ operation: "update_member", payload: { memberId: data.member.id, expectedVersion: data.member.version,
      expectedPartnerVersion: data.member.partnerVersion, changes },
      description: `Update ${data.member.name}: ${Object.entries(changes).map(([key, value]) => `${key} → ${value || "clear this field"}`).join("; ")}.` });
  }
  return <form className={styles.fields} onSubmit={submit}>
    <label>Name<input name="name" aria-label="Member name" defaultValue={data.member.name} maxLength={200} required disabled={disabled} /></label>
    <label>Email<input name="email" aria-label="Member email" type="email" defaultValue={data.member.email || ""} maxLength={200} disabled={disabled} /></label>
    <label>Phone<input name="phone" aria-label="Member phone" type="tel" defaultValue={data.member.phone || ""} maxLength={200} disabled={disabled} /></label>
    <button disabled={disabled}>Review profile changes</button>
  </form>;
}

function RankForm({ data, disabled, review }: { data: Details; disabled: boolean; review: (v: Review) => void }) {
  const [rankId, setRank] = useState("");
  const rank = data.ranks.find(item => item.id === rankId);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rank) return;
    const form = new FormData(event.currentTarget);
    const stripes = Number(form.get("stripes"));
    const reason = String(form.get("reason") || "").trim();
    if (!Number.isInteger(stripes) || stripes < 0 || stripes > rank.maxStripes || !reason) return;
    review({ operation: "rank", payload: { memberId: data.member.id, expectedVersion: data.member.version, rankId: rank.id, stripes, reason },
      description: `Award ${rank.name}, ${stripes} stripes, to ${data.member.name}. Reason: ${reason}. This adds an Odoo rank-history record.` });
  }
  return <form className={styles.fields} onSubmit={submit}>
    <label>Rank<Select ariaLabel="Award rank" value={rankId} disabled={disabled} onChange={setRank} placeholder="Choose rank" options={data.ranks.map(r => ({ value: r.id, label: r.name }))} /></label>
    <label>Stripes<input name="stripes" type="number" min={0} max={rank?.maxStripes || 0} defaultValue={0} required disabled={disabled} /></label>
    <label>Assessment reason<textarea name="reason" required maxLength={500} disabled={disabled} /></label>
    <button disabled={disabled || !rank}>Review rank award</button>
  </form>;
}

export default function MemberManagement({ memberId, sessions, now, busy, locked, feedback, clearFeedback, retry, act }: Props) {
  const [data, setData] = useState<Details | null>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState<Review | null>(null);
  const [replacement, setReplacement] = useState("");
  const reviewRef = useRef<HTMLDivElement>(null);
  const submitRef = useRef(false);
  const disabled = busy || locked || loading;
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/hub", { method: "POST", cache: "no-store", headers: { "content-type": "application/json" },
          body: JSON.stringify({ operation: "member_details", payload: { memberId }, requestKey: null }) });
        const value = await response.json();
        if (!response.ok) throw Error(value.error?.code || "CONNECTION_UNAVAILABLE");
        if (value.member?.id !== memberId || !Array.isArray(value.bookings) || !Array.isArray(value.attendance) || !Array.isArray(value.rankHistory)) throw Error("MEMBER_DETAILS_UNAVAILABLE");
        if (!cancelled) { setData(value); setError(""); }
      } catch (problem) {
        if (!cancelled) { setData(null); setError(explainHubError(problem instanceof Error ? problem.message : "CONNECTION_UNAVAILABLE")); }
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [memberId, reload]);
  useEffect(() => { if (review) reviewRef.current?.focus({ preventScroll: false }); }, [review]);
  const refresh = () => { setLoading(true); setReview(null); setReload(value => value + 1); };
  const prepare = (value: Review) => { if (!disabled) { clearFeedback(); setReview(value); } };
  async function confirm() {
    if (!review || disabled || submitRef.current) return;
    submitRef.current = true;
    try {
      const result = await act(review.operation, review.payload);
      if (result?.kind === "success") refresh();
      else if (result?.kind === "error") setReview(null);
    } finally { submitRef.current = false; }
  }
  const target = sessions.find(s => s.id === replacement && s.future && Date.parse(s.startsAt) > now);
  return <section className={styles.card} aria-label="Member management">
    <div className={styles.row}><h2>{data ? `Manage ${data.member.name}` : "Member management"}</h2>
      <button disabled={disabled} onClick={refresh}>Refresh member details</button></div>
    {loading && <p role="status">Loading this member’s Odoo records…</p>}
    {error && <p role="alert">{error} No other member’s details have been substituted.</p>}
    {feedback && <div className={styles.bookingResult} role={feedback.kind === "error" ? "alert" : "status"} aria-label="Member action result">
      <p>{feedback.text}</p>{feedback.refreshWarning && <p>{feedback.refreshWarning}</p>}
      {feedback.kind === "uncertain" && retry && <button disabled={busy} onClick={() => void retry().then(result => { if (result?.kind === "success") refresh(); })}>Check original member action</button>}
    </div>}
    {data && !loading && <>
      <p>{data.member.state} · {data.member.rank} · {data.member.stripes} stripes</p>
      {review && <div ref={reviewRef} tabIndex={-1} className={styles.savedReceipt} role="group" aria-label="Review member action">
        <h3>Review before saving</h3><p>{review.description}</p><p>No message will be sent and no payment will be collected.</p>
        <div className={styles.row}><button disabled={disabled} onClick={() => void confirm()}>Confirm member action in Odoo</button>
          <button disabled={disabled} onClick={() => setReview(null)}>Cancel review</button></div>
      </div>}
      <details className={styles.booking} open><summary>Contact details</summary>
        {data.canEditContact ? <ContactForm key={`${data.member.version}:${data.member.partnerVersion}`} data={data} disabled={disabled || !!review} review={prepare} />
          : <p>{data.canEdit ? "This contact is shared or outside the site's company. An administrator must review it in Odoo before editing." : "Only a manager or owner can edit contact details."}</p>}
      </details>
      <details className={styles.booking}><summary>Membership and billing</summary>
        {data.billing ? <>
          <p>Read-only records linked to this member’s subscriptions. Payments and refunds are not processed here.</p>
          {data.billing.subscriptions.length ? data.billing.subscriptions.map(s => <div className={styles.auditEntry} key={s.id}>
            <strong>{s.plan}</strong><p>{s.state}{s.nextInvoiceDate ? ` · Next invoice date: ${s.nextInvoiceDate}` : " · Next invoice date unavailable"}</p></div>) : <p>No linked subscriptions found.</p>}
          <h3>Posted invoices and credit notes</h3>
          {data.billing.invoices.length ? data.billing.invoices.map(i => <div className={styles.auditEntry} key={i.id}>
            <strong>{i.number}{i.kind === "out_refund" ? " · Credit note" : ""}</strong>
            <p>{i.date || "Date unavailable"} · {i.paymentState.replaceAll("_", " ")}</p>
            <p>Total {money(i.total, i.currency)} · Remaining {money(i.remaining, i.currency)}</p>
            {i.scope === "household" && <p>Shared household invoice. These are whole-invoice amounts, not this member’s individual balance.</p>}
          </div>) : <p>No posted invoices linked to these subscriptions. This does not establish a zero balance.</p>}
          <small>Up to 50 subscriptions and 50 linked posted invoices. Next invoice date is not a confirmed payment date.</small>
        </> : <p>Billing is visible only to managers and owners.</p>}
      </details>
      <details className={styles.booking}><summary>Registrations and class changes</summary>
        <p>Active registrations for upcoming or ongoing classes (up to 100).</p>
        <label className={styles.fields}>Replacement class<Select ariaLabel="Replacement class for member" value={replacement} disabled={disabled || !!review} onChange={setReplacement}
          placeholder="Choose future replacement" options={sessions.filter(s => s.future && Date.parse(s.startsAt) > now).map(s => ({ value: s.id, label: `${s.title} · ${when(s.startsAt)}` }))} /></label>
        {data.bookings.length ? data.bookings.map(b => <div className={styles.auditEntry} key={b.id}>
          <strong>{b.title}</strong><p>{when(b.startsAt)} · {b.attendanceState}</p>
          {b.replaceable && Date.parse(b.startsAt) > now ? <button disabled={disabled || !!review || !target || target.id === b.sessionId} onClick={() => {
            if (target) prepare({ operation: "change_class", payload: { memberId, fromSessionId: b.sessionId, sessionId: target.id, expectedVersion: target.version },
              description: `Replace ${data.member.name}’s ${b.title} (${when(b.startsAt)}) with ${target.title} (${when(target.startsAt)}). Existing cancellation and eligibility rules apply.` });
          }}>Review replacement of {b.title}</button> : <small>This registration cannot be replaced here after the class starts or attendance is recorded.</small>}
        </div>) : <p>No active registrations found.</p>}
      </details>
      <details className={styles.booking}><summary>Attendance and checkout</summary>
        {data.attendance.length ? data.attendance.map(a => <div key={a.id} className={styles.auditEntry}>
          <strong>{a.title}</strong><p>Checked in: {when(a.checkedInAt)}</p>
          {a.checkedOutAt ? <p>Checked out: {when(a.checkedOutAt)}</p> : <button disabled={disabled || !!review} onClick={() => prepare({ operation: "checkout", payload: { memberId, sessionId: a.sessionId },
            description: `Record checkout now for ${data.member.name} from ${a.title}, checked in ${when(a.checkedInAt)}.` })}>Review checkout from {a.title}</button>}
        </div>) : <p>No present or late attendance records found.</p>}
        <small>Most recent 30 attendance records within your access.</small>
      </details>
      <details className={styles.booking}><summary>Rank and progress</summary>
        {data.rankHistory.map(r => <p key={r.id}>{r.date} · {r.rank} · {r.stripes} stripes</p>)}
        {!data.rankHistory.length && <p>No rank history recorded.</p>}
        <small>Most recent 20 awards.</small>
        {data.canEdit && <RankForm key={data.member.version} data={data} disabled={disabled || !!review} review={prepare} />}
      </details>
    </>}
  </section>;
}
