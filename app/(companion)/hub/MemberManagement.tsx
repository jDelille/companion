"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type PointerEvent as ReactPointerEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Select from "@/components/primitives/select/Select";
import { explainHubError, type ActionFeedback } from "@/domain/hub-actions";
import ConnectedMemberDetails from "@/components/people/member-360/ConnectedMemberDetails";
import { ChecklistItems } from "./SetupChecklist";
import styles from "./page.module.css";

type Session = { id: string; title: string; startsAt: string; future: boolean; version: number };
export type MemberDetails = {
  member: { id: string; name: string; version: number; partnerVersion: number; phone: string | null; email: string | null; dateOfBirth?: string | null; photo?: string | null; state: string; rank: string; stripes: number };
  canEdit: boolean;
  canEditContact: boolean;
  courses?: { id: string; name: string }[];
  ranks: { id: string; name: string; maxStripes: number }[];
  rankHistory: { id: string; rank: string; stripes: number; date: string }[];
  bookings: { id: string; sessionId: string; title: string; startsAt: string; attendanceState: string; replaceable: boolean }[];
  attendance: { id: string; sessionId: string; title: string; checkedInAt: string; checkedOutAt: string | null }[];
  billing: null | {
    subscriptions: { id: string; plan: string; state: string; nextInvoiceDate: string | null }[];
    invoices: { id: string; number: string; kind: string; date: string | null; paymentState: string; total: number; remaining: number; currency: string; scope: string; version: number; paymentUnavailable: string | null }[];
  };
};
type Details = MemberDetails;
type Review = { operation: string; payload: Record<string, unknown>; description: string; archive?: boolean };
type ArchiveImpacts = { version: number; futureBookingCount: number; futureBookings: { enrollmentId: string; title: string; startsAt: string }[];
  openMemberships: number; portalAccounts: number; household: string | null; courses: { id: string; name: string }[]; blockers: string[] };
type Bound = { act: (operation: string, payload: Record<string, unknown>) => Promise<ActionFeedback | undefined>; feedback?: ActionFeedback; retry?: () => Promise<ActionFeedback | undefined> };
type Props = {
  memberId: string; section?: string; sessions: Session[]; now: number; busy: boolean; locked: boolean;
  feedback?: ActionFeedback; clearFeedback: () => void; retry?: () => Promise<ActionFeedback | undefined>;
  act: (operation: string, payload: Record<string, unknown>) => Promise<ActionFeedback | undefined>;
  archive?: Bound;
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

async function resizedPhoto(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw Error("PHOTO_TYPE_UNSUPPORTED");
  if (file.size > 15 * 1024 * 1024) throw Error("PHOTO_TOO_LARGE");
  const bitmap = await createImageBitmap(file).catch(() => { throw Error("PHOTO_INVALID"); });
  if (Math.min(bitmap.width, bitmap.height) < 64) throw Error("PHOTO_DIMENSIONS");
  const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const encoded = canvas.toDataURL("image/jpeg", 0.85).split(",")[1] || "";
  if (!encoded || encoded.length > 400000) throw Error("PHOTO_TOO_LARGE");
  return { encoded, width: canvas.width, height: canvas.height };
}

function PhotoForm({ data, disabled, review }: { data: Details; disabled: boolean; review: (v: Review) => void }) {
  const [error, setError] = useState("");
  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    try {
      const photo = await resizedPhoto(file);
      review({ operation: "update_member_photo", payload: { memberId: data.member.id, expectedVersion: data.member.version, image: photo.encoded },
        description: `Save a new photo for ${data.member.name} (${photo.width}×${photo.height} JPEG). It replaces the current Odoo contact photo.` });
    } catch (problem) { setError(explainHubError(problem instanceof Error ? problem.message : "PHOTO_INVALID")); }
  }
  return <div className={styles.fields}>
    {data.member.photo ? <Image src={data.member.photo} alt={`Current photo of ${data.member.name}`} width={96} height={96} unoptimized style={{ objectFit: "cover", borderRadius: 12 }} /> : <p>No photo on file.</p>}
    <label>Choose a new photo<input type="file" aria-label="Choose a new photo" accept="image/jpeg,image/png,image/webp" disabled={disabled} onChange={event => void choose(event)} /></label>
    {data.member.photo && <button disabled={disabled} onClick={() => review({ operation: "update_member_photo", payload: { memberId: data.member.id, expectedVersion: data.member.version, image: null },
      description: `Remove ${data.member.name}’s photo from the Odoo contact.` })}>Review photo removal</button>}
    {error && <p role="alert">{error}</p>}
  </div>;
}

function ArchiveForm({ data, disabled, review }: { data: Details; disabled: boolean; review: (v: Review) => void }) {
  const [impacts, setImpacts] = useState<ArchiveImpacts | null>(null);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/hub", { method: "POST", cache: "no-store", headers: { "content-type": "application/json" },
      body: JSON.stringify({ operation: "archive_review", payload: { memberId: data.member.id }, requestKey: null }) })
      .then(async response => { const value = await response.json(); if (!response.ok) throw Error(value.error?.code || "CONNECTION_UNAVAILABLE");
        if (!cancelled) { setImpacts(value); setError(""); } })
      .catch(problem => { if (!cancelled) setError(explainHubError(problem.message)); });
    return () => { cancelled = true; };
  }, [data.member.id, data.member.version]);
  if (error) return <p role="alert">{error}</p>;
  if (!impacts) return <p role="status">Checking what archiving would change…</p>;
  return <div className={styles.fields}>
    <p>{impacts.futureBookingCount} upcoming bookings would be cancelled. Attendance, rank and billing history stay in Odoo.</p>
    {impacts.courses.length > 0 && <p>Course rosters kept for restore: {impacts.courses.map(c => c.name).join(", ")}</p>}
    {impacts.household && <p>Household: {impacts.household}</p>}
    {impacts.blockers.length ? <div role="alert">{impacts.blockers.map(code => <p key={code}>{explainHubError(code)}</p>)}</div> : <>
      <label>Reason for archiving<input aria-label="Reason for archiving" value={reason} maxLength={500} disabled={disabled} onChange={event => setReason(event.target.value)} /></label>
      <button disabled={disabled || !reason.trim()} onClick={() => review({ operation: "archive_member", archive: true,
        payload: { memberId: data.member.id, expectedVersion: impacts.version, reason: reason.trim() },
        description: `Archive ${data.member.name}. ${impacts.futureBookingCount} upcoming bookings will be cancelled and the student is hidden from rosters and the kiosk. Reason: ${reason.trim()}. You can restore the student later.` })}>Review archiving</button>
    </>}
  </div>;
}

type KioskAccess = { version: number; students: string[]; guardians: { id: string; name: string; hasPhone: boolean; hasPin: boolean; setAt: string | null; setBy: string | null; locked: boolean }[] };

function GuardianKioskForm({ data, disabled, review }: { data: Details; disabled: boolean; review: (v: Review) => void }) {
  const [access, setAccess] = useState<KioskAccess | null>(null);
  const [error, setError] = useState("");
  const [pins, setPins] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/hub", { method: "POST", cache: "no-store", headers: { "content-type": "application/json" },
      body: JSON.stringify({ operation: "guardian_kiosk_access", payload: { memberId: data.member.id }, requestKey: null }) })
      .then(async response => { const value = await response.json(); if (!response.ok) throw Error(value.error?.code || "CONNECTION_UNAVAILABLE");
        if (!cancelled) { setAccess(value); setError(""); } })
      .catch(problem => { if (!cancelled) setError(explainHubError(problem.message)); });
    return () => { cancelled = true; };
  }, [data.member.id, data.member.version]);
  if (error) return <p role="alert">{error}</p>;
  if (!access) return <p role="status">Loading kiosk access…</p>;
  if (!access.guardians.length) return <p>No household guardian is linked to this student in Odoo.</p>;
  return <div className={styles.fields}>
    <p>A parent can check in their own children at the kiosk with their phone number and a 6-digit PIN. Set the PIN with the parent at the desk; it is stored only as a secure hash and never sent.</p>
    {access.students.length > 0 && <p>Children in this household: {access.students.join(", ")}</p>}
    {access.guardians.map(g => <div key={g.id} className={styles.auditEntry} role="group" aria-label={`Kiosk access for ${g.name}`}>
      <strong>{g.name}</strong>
      <p>{g.hasPin ? `PIN set${g.setAt ? ` ${when(g.setAt)}` : ""}${g.setBy ? ` by ${g.setBy}` : ""}` : "No kiosk PIN"}{g.locked ? " · locked after failed attempts" : ""}{!g.hasPhone ? " · no phone number in Odoo" : ""}</p>
      {g.hasPhone && <>
        <label>New 6-digit PIN<input aria-label={`New kiosk PIN for ${g.name}`} type="password" inputMode="numeric" autoComplete="new-password" maxLength={6}
          value={pins[g.id] || ""} disabled={disabled} onChange={event => setPins(p => ({ ...p, [g.id]: event.target.value.replace(/[^0-9]/g, "") }))} /></label>
        <label>Reason<input aria-label={`Reason for kiosk PIN for ${g.name}`} value={reasons[g.id] || ""} maxLength={500} disabled={disabled}
          onChange={event => setReasons(r => ({ ...r, [g.id]: event.target.value }))} /></label>
        <div className={styles.row}>
          <button disabled={disabled || (pins[g.id] || "").length !== 6 || !(reasons[g.id] || "").trim()} onClick={() => review({ operation: "set_guardian_kiosk_pin",
            payload: { memberId: data.member.id, guardianId: g.id, pin: pins[g.id], reason: (reasons[g.id] || "").trim() },
            description: `${g.hasPin ? "Replace" : "Set"} the kiosk check-in PIN for ${g.name}. Failed-attempt locks are cleared. The PIN is stored as a secure hash and is not shown again. Reason: ${(reasons[g.id] || "").trim()}.` })}>Review kiosk PIN</button>
          {g.hasPin && <button disabled={disabled || !(reasons[g.id] || "").trim()} onClick={() => review({ operation: "revoke_guardian_kiosk_pin",
            payload: { memberId: data.member.id, guardianId: g.id, reason: (reasons[g.id] || "").trim() },
            description: `Turn off kiosk check-in for ${g.name}. Any open kiosk family list is closed. Reason: ${(reasons[g.id] || "").trim()}.` })}>Review turning off kiosk PIN</button>}
        </div>
      </>}
    </div>)}
  </div>;
}

type LedgerPayment = { id: string; amount: number; date: string; journal: string; evidence: string; provider: string | null; providerReference: string | null; transactionState: string | null };
type LedgerRefund = { id: string; amount: number; currency: string; method: string; state: string; creditNote: string | null; requestedBy: string; approvedBy: string | null; refundPayment: string | null; version: number };
type LedgerInvoice = { id: string; number: string; date: string | null; total: number; remaining: number; currency: string; paymentState: string; settled: boolean; settlementEvidence: string[]; payments: LedgerPayment[]; refunds: LedgerRefund[]; refundable: boolean };
const REFUND_STATES: Record<string, string> = { awaiting_approval: "Awaiting owner approval", awaiting_refund_payment: "Credit note posted · return the money at the desk, then record it",
  awaiting_provider_refund: "Credit note posted · waiting for the payment provider to confirm the refund", refunded_by_provider: "Refunded · confirmed by the payment provider",
  refunded: "Refunded · refund payment recorded by staff", cancelled: "Cancelled" };

function RefundsForm({ data, disabled, review }: { data: Details; disabled: boolean; review: (v: Review) => void }) {
  const [ledger, setLedger] = useState<{ invoices: LedgerInvoice[]; canApprove: boolean } | null>(null);
  const [error, setError] = useState("");
  const [reasons, setReasons] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/hub", { method: "POST", cache: "no-store", headers: { "content-type": "application/json" },
      body: JSON.stringify({ operation: "billing_ledger", payload: { memberId: data.member.id }, requestKey: null }) })
      .then(async response => { const value = await response.json(); if (!response.ok) throw Error(value.error?.code || "CONNECTION_UNAVAILABLE");
        if (!cancelled) { setLedger(value); setError(""); } })
      .catch(problem => { if (!cancelled) setError(explainHubError(problem.message)); });
    return () => { cancelled = true; };
  }, [data.member.id]);
  async function prepareRefund(invoice: LedgerInvoice) {
    const reason = (reasons[invoice.id] || "").trim();
    try {
      const response = await fetch("/api/hub", { method: "POST", cache: "no-store", headers: { "content-type": "application/json" },
        body: JSON.stringify({ operation: "refund_preview", payload: { memberId: data.member.id, invoiceId: invoice.id }, requestKey: null }) });
      const value = await response.json();
      if (!response.ok) throw Error(value.error?.code || "CONNECTION_UNAVAILABLE");
      review({ operation: "request_refund", payload: { memberId: data.member.id, invoiceId: invoice.id, reason, reviewToken: value.reviewToken },
        description: `Request a full refund of ${money(value.amount, value.currency)} for ${value.number}. ${value.effects.join(" ")} Reason: ${reason}.` });
    } catch (problem) { setError(explainHubError((problem as Error).message)); }
  }
  if (error) return <p role="alert">{error}</p>;
  if (!ledger) return <p role="status">Loading settlement records…</p>;
  if (!ledger.invoices.length) return <p>No posted invoices linked to this member.</p>;
  return <div className={styles.fields}>
    <p>Paid means Odoo has reconciled a payment. Online payments show the provider’s reference; desk payments show who recorded them. Refunds need an owner’s approval.</p>
    {ledger.invoices.map(invoice => <div key={invoice.id} className={styles.auditEntry} role="group" aria-label={`Settlement for ${invoice.number}`}>
      <strong>{invoice.number} · {money(invoice.total, invoice.currency)} · {invoice.paymentState.replaceAll("_", " ")}</strong>
      {invoice.payments.map(payment => <p key={payment.id}>{payment.date} · {money(payment.amount, invoice.currency)} · {payment.journal} · {payment.evidence === "provider_receipt" ? `provider ${payment.provider} ref ${payment.providerReference}` : "recorded by staff"}</p>)}
      {!invoice.settled && <p>Not settled. Nothing here marks an invoice paid; payment must come from the provider or a recorded payment in Odoo.</p>}
      {invoice.refunds.map(refund => <div key={refund.id} className={styles.row} role="group" aria-label={`Refund ${refund.id} for ${invoice.number}`}>
        <p>Refund {money(refund.amount, refund.currency)} · {REFUND_STATES[refund.state] || refund.state}{refund.creditNote ? ` · credit note ${refund.creditNote}` : ""} · requested by {refund.requestedBy}{refund.approvedBy ? ` · approved by ${refund.approvedBy}` : ""}</p>
        {["awaiting_approval", "awaiting_refund_payment"].includes(refund.state) && <>
          <label>Reason<input aria-label={`Reason for refund ${refund.id}`} value={reasons[`r${refund.id}`] || ""} maxLength={500} disabled={disabled} onChange={event => setReasons(r => ({ ...r, [`r${refund.id}`]: event.target.value }))} /></label>
          {refund.state === "awaiting_approval" && ledger.canApprove && <button disabled={disabled || !(reasons[`r${refund.id}`] || "").trim()} onClick={() => review({ operation: "approve_refund",
            payload: { refundId: refund.id, expectedVersion: refund.version, reason: (reasons[`r${refund.id}`] || "").trim() },
            description: `Approve the refund of ${money(refund.amount, refund.currency)} for ${invoice.number}. A full credit note is posted in Odoo now. Money is returned only when ${refund.method === "provider" ? "the payment provider confirms the refund" : "staff record the refund payment"}.` })}>Review refund approval</button>}
          {refund.state === "awaiting_approval" && <button disabled={disabled || !(reasons[`r${refund.id}`] || "").trim()} onClick={() => review({ operation: "cancel_refund",
            payload: { refundId: refund.id, expectedVersion: refund.version, reason: (reasons[`r${refund.id}`] || "").trim() },
            description: `Cancel the refund request for ${invoice.number}. No accounting entry is created.` })}>Review refund cancellation</button>}
          {refund.state === "awaiting_refund_payment" && <button disabled={disabled || !(reasons[`r${refund.id}`] || "").trim()} onClick={() => review({ operation: "record_refund_payment",
            payload: { refundId: refund.id, expectedVersion: refund.version, reason: (reasons[`r${refund.id}`] || "").trim() },
            description: `Record that ${money(refund.amount, refund.currency)} was returned to the customer for ${invoice.number}, in the same journal as the original desk payment.` })}>Review refund payment</button>}
        </>}
      </div>)}
      {invoice.refundable && <div className={styles.row}>
        <label>Reason<input aria-label={`Reason for refunding ${invoice.number}`} value={reasons[invoice.id] || ""} maxLength={500} disabled={disabled} onChange={event => setReasons(r => ({ ...r, [invoice.id]: event.target.value }))} /></label>
        <button disabled={disabled || !(reasons[invoice.id] || "").trim()} onClick={() => void prepareRefund(invoice)}>Review refund request</button>
      </div>}
    </div>)}
  </div>;
}

type WaiverContext = { title: string; text: string; contentVersion: string; minor: boolean; state: string; signedBy: string | null; signedAt: string | null;
  pdfStored: boolean; signers: { partnerId: string; name: string; relationship: string }[]; witnessedBy: string | null; version: number };

function WaiverForm({ data, disabled, review }: { data: Details; disabled: boolean; review: (v: Review) => void }) {
  const [waiver, setWaiver] = useState<WaiverContext | null>(null);
  const [error, setError] = useState("");
  const [signer, setSigner] = useState(""), [name, setName] = useState(""), [agreed, setAgreed] = useState(false), [inked, setInked] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null), drawing = useRef(false);
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/hub", { method: "POST", cache: "no-store", headers: { "content-type": "application/json" },
      body: JSON.stringify({ operation: "waiver_context", payload: { memberId: data.member.id }, requestKey: null }) })
      .then(async response => { const value = await response.json(); if (!response.ok) throw Error(value.error?.code || "CONNECTION_UNAVAILABLE");
        if (!cancelled) { setWaiver(value); setError(""); } })
      .catch(problem => { if (!cancelled) setError(explainHubError(problem.message)); });
    return () => { cancelled = true; };
  }, [data.member.id, data.member.version]);
  const point = (event: ReactPointerEvent<HTMLCanvasElement>) => { const box = event.currentTarget.getBoundingClientRect();
    return [(event.clientX - box.left) * event.currentTarget.width / box.width, (event.clientY - box.top) * event.currentTarget.height / box.height]; };
  const start = (event: ReactPointerEvent<HTMLCanvasElement>) => { const ctx = event.currentTarget.getContext("2d"); if (!ctx || disabled) return;
    drawing.current = true; const [x, y] = point(event); ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.strokeStyle = "#111"; ctx.beginPath(); ctx.moveTo(x, y); };
  const move = (event: ReactPointerEvent<HTMLCanvasElement>) => { if (!drawing.current) return; const ctx = event.currentTarget.getContext("2d"); if (!ctx) return;
    const [x, y] = point(event); ctx.lineTo(x, y); ctx.stroke(); setInked(true); };
  const clear = () => { const c = canvas.current; c?.getContext("2d")?.clearRect(0, 0, c.width, c.height); setInked(false); };
  if (error) return <p role="alert">{error}</p>;
  if (!waiver) return <p role="status">Loading waiver…</p>;
  if (waiver.state === "signed") return <p>Signed by {waiver.signedBy}{waiver.signedAt ? ` · ${when(waiver.signedAt)}` : ""}{waiver.witnessedBy ? ` · witnessed by ${waiver.witnessedBy}` : ""}{waiver.pdfStored ? " · signed PDF stored in Odoo" : ""}.</p>;
  const chosen = waiver.signers.find(s => s.partnerId === signer);
  return <div className={styles.fields}>
    <h4>{waiver.title}</h4>
    <div style={{ whiteSpace: "pre-wrap", maxHeight: "16rem", overflowY: "auto" }}>{waiver.text}</div>
    {!waiver.signers.length ? <p role="alert">{waiver.minor ? "A household guardian must be linked in Odoo before a minor’s waiver can be signed." : "No eligible signer."}</p> : <>
      <label>Signer<select aria-label="Waiver signer" value={signer} disabled={disabled} onChange={event => { setSigner(event.target.value); setName(waiver.signers.find(s => s.partnerId === event.target.value)?.name || ""); }}>
        <option value="">Choose who is signing</option>{waiver.signers.map(s => <option key={s.partnerId} value={s.partnerId}>{s.name} ({s.relationship === "self" ? "student" : "guardian"})</option>)}</select></label>
      <label>Full name as signed<input aria-label="Name as signed" value={name} maxLength={120} disabled={disabled} onChange={event => setName(event.target.value)} /></label>
      <canvas ref={canvas} aria-label="Signature pad" width={600} height={180} style={{ width: "100%", maxWidth: 600, height: "auto", aspectRatio: "600 / 180", border: "1px solid currentColor", touchAction: "none", background: "#fff" }}
        onPointerDown={start} onPointerMove={move} onPointerUp={() => { drawing.current = false; }} onPointerLeave={() => { drawing.current = false; }} />
      <div className={styles.row}><button type="button" disabled={disabled} onClick={clear}>Clear signature</button></div>
      <label><input type="checkbox" aria-label="Signer read and agrees" checked={agreed} disabled={disabled} onChange={event => setAgreed(event.target.checked)} />The signer read this waiver on this screen and agrees to it. I am witnessing the signature in person.</label>
      <button disabled={disabled || !chosen || !name.trim() || !agreed || !inked} onClick={() => chosen && canvas.current && review({ operation: "sign_waiver",
        payload: { memberId: data.member.id, expectedVersion: waiver.version, signerPartnerId: chosen.partnerId, signedByName: name.trim(), contentVersion: waiver.contentVersion,
          agreed: true, signature: canvas.current.toDataURL("image/png") },
        description: `Save the waiver for ${data.member.name}, signed by ${name.trim()} (${chosen.relationship === "self" ? "student" : "household guardian"}) and witnessed by you. Odoo stores the signature and a signed PDF on the student record.` })}>Review signature</button>
    </>}
  </div>;
}

function OnboardingStatus({ memberId }: { memberId: string }) {
  const [data, setData] = useState<{ items: { key: string; label: string; done: boolean; detail: string; where: string }[]; done: number; total: number } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/hub", { method: "POST", cache: "no-store", headers: { "content-type": "application/json" },
      body: JSON.stringify({ operation: "member_onboarding", payload: { memberId }, requestKey: null }) })
      .then(async response => { const value = await response.json(); if (!response.ok) throw Error(value.error?.code || "CONNECTION_UNAVAILABLE"); if (!cancelled) setData(value); })
      .catch(problem => { if (!cancelled) setError(explainHubError(problem.message)); });
    return () => { cancelled = true; };
  }, [memberId]);
  if (error) return <p role="alert">{error}</p>;
  if (!data) return <p role="status">Checking onboarding…</p>;
  return <><p>{data.done} of {data.total} steps complete</p><ChecklistItems items={data.items} /></>;
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

export default function MemberManagement({ memberId, section, sessions, now, busy, locked, feedback, clearFeedback, retry, act, archive }: Props) {
  const router = useRouter();
  const [data, setData] = useState<Details | null>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState<Review | null>(null);
  const [replacement, setReplacement] = useState("");
  const [familyOpen, setFamilyOpen] = useState(section === "family");
  const [archiveOpen, setArchiveOpen] = useState(section === "archive");
  const [kioskOpen, setKioskOpen] = useState(section === "kiosk");
  const [refundsOpen, setRefundsOpen] = useState(section === "refunds");
  const [waiverOpen, setWaiverOpen] = useState(section === "waiver");
  const [onboardingOpen, setOnboardingOpen] = useState(section === "onboarding");
  const [kioskKey, setKioskKey] = useState(0);
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
      if (review.archive && archive) {
        const result = await archive.act(review.operation, review.payload);
        if (result?.kind === "success") router.push("/hub?view=archived");
        else if (result?.kind === "error") setReview(null);
        return;
      }
      const result = await act(review.operation, review.payload);
      if (result?.kind === "success") { refresh(); setKioskKey(k => k + 1); }
      else if (result?.kind === "error") setReview(null);
    } finally { submitRef.current = false; }
  }
  const target = sessions.find(s => s.id === replacement && s.future && Date.parse(s.startsAt) > now);
  const currentCheckout = feedback?.checkout && !loading && data?.billing?.invoices.some(invoice =>
    invoice.id === feedback.checkout?.invoiceId && invoice.remaining === feedback.checkout.amount && invoice.paymentUnavailable === null);
  return <section className={styles.card} aria-label="Member management">
    <div className={styles.row}><h2>{data ? `Manage ${data.member.name}` : "Member management"}</h2>
      <button disabled={disabled} onClick={refresh}>Refresh member details</button></div>
    {loading && <p role="status">Loading this member’s Odoo records…</p>}
    {error && <p role="alert">{error} No other member’s details have been substituted.</p>}
    {feedback && <div className={styles.bookingResult} role={feedback.kind === "error" ? "alert" : "status"} aria-label="Member action result">
      <p>{feedback.text}</p>{feedback.refreshWarning && <p>{feedback.refreshWarning}</p>}
      {feedback.checkout && currentCheckout && <><p>{feedback.checkout.invoiceNumber} · {money(feedback.checkout.amount, feedback.checkout.currency)}</p>
        <a href={feedback.checkout.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Continue to secure invoice checkout →</a>
        <p>Complete payment on the secure checkout page, then refresh member details to see the confirmed Odoo balance.</p></>}
      {feedback.checkout && !loading && !currentCheckout && <p>Refresh and review the current invoice before continuing to checkout.</p>}
      {feedback.kind === "uncertain" && retry && <button disabled={busy} onClick={() => void retry().then(result => { if (result?.kind === "success") refresh(); })}>Check original member action</button>}
    </div>}
    {archive?.feedback && <div className={styles.bookingResult} role={archive.feedback.kind === "error" ? "alert" : "status"} aria-label="Archive action result">
      <p>{archive.feedback.text}</p>
      {archive.feedback.kind === "uncertain" && archive.retry && <button disabled={busy} onClick={() => void archive.retry?.().then(result => { if (result?.kind === "success") router.push("/hub?view=archived"); })}>Check archive result</button>}
    </div>}
    {data && !loading && <>
      <p>{data.member.state} · {data.member.rank} · {data.member.stripes} stripes{data.member.dateOfBirth && <> · Born {data.member.dateOfBirth}</>}</p>
      {review && <div ref={reviewRef} tabIndex={-1} className={styles.savedReceipt} role="group" aria-label="Review member action">
        <h3>Review before saving</h3><p>{review.description}</p><p>No message will be sent and no payment will be collected.</p>
        <div className={styles.row}><button disabled={disabled} onClick={() => void confirm()}>{review.operation === "payment_link" ? "Prepare secure checkout" : review.archive ? "Confirm archive in Odoo" : "Confirm member action in Odoo"}</button>
          <button disabled={disabled} onClick={() => setReview(null)}>Cancel review</button></div>
      </div>}
      {data.canEdit && <details className={styles.booking} open={onboardingOpen} onToggle={event => setOnboardingOpen(event.currentTarget.open)}><summary>Onboarding checklist</summary>
        {onboardingOpen && <OnboardingStatus key={kioskKey} memberId={data.member.id} />}
      </details>}
      <details className={styles.booking} open={!section || section === 'profile'}><summary>Contact details</summary>
        {data.canEditContact ? <ContactForm key={`${data.member.version}:${data.member.partnerVersion}`} data={data} disabled={disabled || !!review} review={prepare} />
          : <p>{data.canEdit ? "This contact is shared or outside the site's company. An administrator must review it in Odoo before editing." : "Only a manager or owner can edit contact details."}</p>}
      </details>
      <details className={styles.booking} open={section === "photo"}><summary>Photo</summary>
        <PhotoForm data={data} disabled={disabled || !!review} review={prepare} />
      </details>
      {data.canEdit && data.courses && <details className={styles.booking} open={section === "courses"}><summary>Courses</summary>
        {data.courses.length ? data.courses.map(c => <p key={c.id}>{c.name}</p>) : <p>Not on any course roster.</p>}
        <a href="/hub?view=courses">Manage course rosters →</a>
      </details>}
      <details className={styles.booking} open={familyOpen} onToggle={event => setFamilyOpen(event.currentTarget.open)}><summary>Household and guardians</summary>
        {!data.canEdit ? <p>Family and guardian details require manager or owner access.</p> : familyOpen && <ConnectedMemberDetails memberId={memberId} section="family" />}
      </details>
      <details className={styles.booking} open={section === 'billing' || section === 'membership'}><summary>Membership and billing</summary>
        {data.billing ? <>
          <p>Invoices linked to this member’s subscriptions. Review an unpaid invoice to continue to secure checkout. Refresh after payment for the current balance.</p>
          {data.billing.subscriptions.length ? data.billing.subscriptions.map(s => <div className={styles.auditEntry} key={s.id}>
            <strong>{s.plan}</strong><p>{s.state}{s.nextInvoiceDate ? ` · Next invoice date: ${s.nextInvoiceDate}` : " · Next invoice date unavailable"}</p></div>) : <p>No linked subscriptions found.</p>}
          <h3>Posted invoices and credit notes</h3>
          {data.billing.invoices.length ? data.billing.invoices.map(i => <div className={styles.auditEntry} key={i.id}>
            <strong>{i.number}{i.kind === "out_refund" ? " · Credit note" : ""}</strong>
            <p>{i.date || "Date unavailable"} · {i.paymentState.replaceAll("_", " ")}</p>
            <p>Total {money(i.total, i.currency)} · Remaining {money(i.remaining, i.currency)}</p>
            {i.scope === "household" && <p>Shared household invoice. These are whole-invoice amounts, not this member’s individual balance.</p>}
            {i.paymentUnavailable === null ? <button disabled={disabled || !!review} onClick={() => prepare({operation: "payment_link",
              payload: {memberId, invoiceId: i.id, expectedVersion: i.version, expectedAmount: i.remaining},
              description: `Prepare secure checkout for invoice ${i.number}: ${money(i.remaining, i.currency)}${i.scope === "household" ? " for the whole household invoice" : ""}. The payer reviews and submits payment on Odoo’s checkout page.`})}>Review payment for {i.number}</button>
              : i.remaining > 0 && i.kind === "out_invoice" && <p>{explainHubError(i.paymentUnavailable || "PAYMENT_SETUP_REQUIRED")}</p>}
          </div>) : <p>No posted invoices linked to these subscriptions. This does not establish a zero balance.</p>}
          <small>Up to 50 subscriptions and 50 linked posted invoices. Next invoice date is not a confirmed payment date.</small>
        </> : <p>Billing is visible only to managers and owners.</p>}
      </details>
      <details className={styles.booking} open={section === 'bookings'}><summary>Registrations and class changes</summary>
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
      <details className={styles.booking} open={section === 'attendance'}><summary>Attendance and checkout</summary>
        {data.attendance.length ? data.attendance.map(a => <div key={a.id} className={styles.auditEntry}>
          <strong>{a.title}</strong><p>Checked in: {when(a.checkedInAt)}</p>
          {a.checkedOutAt ? <p>Checked out: {when(a.checkedOutAt)}</p> : <button disabled={disabled || !!review} onClick={() => prepare({ operation: "checkout", payload: { memberId, sessionId: a.sessionId },
            description: `Record checkout now for ${data.member.name} from ${a.title}, checked in ${when(a.checkedInAt)}.` })}>Review checkout from {a.title}</button>}
        </div>) : <p>No present or late attendance records found.</p>}
        <small>Most recent 30 attendance records within your access.</small>
      </details>
      {data.canEdit && <details className={styles.booking} open={waiverOpen} onToggle={event => setWaiverOpen(event.currentTarget.open)}><summary>Waiver signing</summary>
        {waiverOpen && <WaiverForm key={kioskKey} data={data} disabled={disabled || !!review} review={prepare} />}
      </details>}
      {data.canEdit && <details className={styles.booking} open={refundsOpen} onToggle={event => setRefundsOpen(event.currentTarget.open)}><summary>Settlement and refunds</summary>
        {refundsOpen && <RefundsForm key={kioskKey} data={data} disabled={disabled || !!review} review={prepare} />}
      </details>}
      {data.canEdit && <details className={styles.booking} open={kioskOpen} onToggle={event => setKioskOpen(event.currentTarget.open)}><summary>Guardian kiosk access</summary>
        {kioskOpen && <GuardianKioskForm key={kioskKey} data={data} disabled={disabled || !!review} review={prepare} />}
      </details>}
      {data.canEdit && archive && <details className={styles.booking} open={archiveOpen} onToggle={event => setArchiveOpen(event.currentTarget.open)}><summary>Archive student</summary>
        {archiveOpen && <ArchiveForm data={data} disabled={disabled || !!review} review={prepare} />}
      </details>}
      <details className={styles.booking} open={section === 'progress'}><summary>Rank and progress</summary>
        {data.rankHistory.map(r => <p key={r.id}>{r.date} · {r.rank} · {r.stripes} stripes</p>)}
        {!data.rankHistory.length && <p>No rank history recorded.</p>}
        <small>Most recent 20 awards.</small>
        {data.canEdit && <RankForm key={data.member.version} data={data} disabled={disabled || !!review} review={prepare} />}
      </details>
    </>}
  </section>;
}
