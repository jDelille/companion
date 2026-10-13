"use client";

import { useEffect, useState } from "react";
import Link from "@/components/primitives/AppLink";
import { explainHubError } from "@/domain/hub-actions";
import type { MemberDetails } from "@/../app/(companion)/hub/MemberManagement";
import styles from "./ConnectedMemberDetails.module.scss";
import { PersonName } from "@/components/primitives/avatar/Avatar";

export type MemberSection = "timeline" | "attendance" | "progress" | "membership" | "billing" | "messages" | "documents" | "family" | "safety";
type Data = MemberDetails & {
  family: null | { household: string | null; members: {id:string;name:string}[]; householdGuardians?:{id:string;name:string;primary:boolean}[]; guardians:{id:string;name:string;channel:string;allowReply:boolean}[] };
  safety: null | {allergies:string|null;medicalNotes:string|null;emergencyNote:string|null;contacts:{id:string;name:string;phone:string;relationship:string;primary:boolean}[]};
  documents: null | {waiver:null|{state:string;signedBy:string|null;signedAt:string|null};files:{id:string;name:string;mimeType:string;bytes:number}[]};
  messages:{id:string;text:string;state:string;channel:string;summary:string}[];
  timeline:{id:string;action:string;actor:string;at:string}[];
};
const when = (s:string) => new Date(s).toLocaleString();
const money = (n:number,c:string) => new Intl.NumberFormat(undefined,{style:'currency',currency:c}).format(n);

export default function ConnectedMemberDetails({ memberId, section }: {memberId:string;section:MemberSection}) {
  const [data,setData] = useState<Data|null>(null);
  const [error,setError] = useState('');
  const [revision,setRevision] = useState(0);
  const href = `/hub?memberId=${encodeURIComponent(memberId)}&view=${section==='messages'?'messages':'manage'}&section=${section}`;
  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/hub',{method:'POST',cache:'no-store',signal:controller.signal,headers:{'content-type':'application/json'},
      body:JSON.stringify({operation:'member_workspace',payload:{memberId},requestKey:null})})
      .then(async response => { const value=await response.json();if(!response.ok)throw Error(value.error?.code||'CONNECTION_UNAVAILABLE');
        if(value.member?.id!==memberId||!Array.isArray(value.attendance)||!Array.isArray(value.timeline)||!Array.isArray(value.messages))throw Error('MEMBER_DETAILS_UNAVAILABLE');
        if(!controller.signal.aborted){setData(value);setError('');}})
      .catch(problem=>{if(!controller.signal.aborted){setData(null);setError(problem.message);}});
    return ()=>controller.abort();
  },[memberId,revision]);
  if(error)return <section className={styles.panel} aria-label={`${section} records`}><h2>{error==='SIGN_IN_REQUIRED'?'Sign in to view these records':'These records could not be loaded'}</h2>
    <p>{error==='SIGN_IN_REQUIRED'?'Use your individual staff account. Your selected member and section will be retained.':explainHubError(error)}</p>
    <Link href={href}>Continue with staff sign-in →</Link><button onClick={()=>{setError('');setData(null);setRevision(n=>n+1);}}>Try again</button></section>;
  if(!data)return <p className={styles.panel} role="status">Loading this member’s authorized records…</p>;
  return <section className={styles.panel} aria-label={`${section} records`}>
    <div className={styles.heading}><h2>{section==='timeline'?'Activity timeline':section==='attendance'?'Attendance history':section.charAt(0).toUpperCase()+section.slice(1)}</h2>
      <button onClick={()=>{setData(null);setRevision(n=>n+1);}}>Refresh records</button></div>
    {section==='timeline'&&<>{data.timeline.length?data.timeline.map(t=><article key={t.id}><strong>{t.action.replaceAll('_',' ')}</strong><p>{t.actor} · {when(t.at)}</p></article>):<p>No recorded Companion actions for this member.</p>}<small>Member entries from the latest 50 authorized workspace actions.</small></>}
    {section==='attendance'&&<>{data.attendance.length?data.attendance.map(a=><article key={a.id}><strong>{a.title}</strong><p>In: {when(a.checkedInAt)}</p><p>{a.checkedOutAt?`Out: ${when(a.checkedOutAt)}`:'No checkout recorded'}</p></article>):<p>No present or late attendance records.</p>}<small>Most recent 30 records within your class access.</small><Link href={href}>Review checkout →</Link></>}
    {section==='progress'&&<><p><strong>{data.member.rank}</strong> · {data.member.stripes} stripes</p>{data.rankHistory.length?data.rankHistory.map(r=><article key={r.id}>{r.date} · {r.rank} · {r.stripes} stripes</article>):<p>No rank awards recorded.</p>}<small>Most recent 20 awards. Rank is not a testing-readiness assessment.</small>{data.canEdit&&<Link href={href}>Review a rank award →</Link>}</>}
    {section==='membership'&&<><p>Current state: <strong>{data.member.state}</strong></p>{data.billing?data.billing.subscriptions.length?data.billing.subscriptions.map(s=><article key={s.id}><strong>{s.plan}</strong><p>{s.state} · {s.nextInvoiceDate?`Next invoice ${s.nextInvoiceDate}`:'Next invoice date unavailable'}</p></article>):<p>No linked subscriptions recorded.</p>:<p>Subscription billing details require manager access.</p>}
      <h3>Current class registrations</h3>{data.bookings.length?data.bookings.map(b=><article key={b.id}><strong>{b.title}</strong><p>{when(b.startsAt)} · {b.attendanceState}</p></article>):<p>No active upcoming or ongoing registrations.</p>}<Link href={`/hub?memberId=${encodeURIComponent(memberId)}&view=manage&section=bookings`}>Review registrations and class changes →</Link></>}
    {section==='billing'&&<>{data.billing?<>{data.billing.invoices.length?data.billing.invoices.map(i=><article key={i.id}><strong>{i.number}</strong><p>{i.paymentState.replaceAll('_',' ')} · {i.date||'Date unavailable'}</p><p>Total {money(i.total,i.currency)} · Remaining {money(i.remaining,i.currency)}</p>{i.scope==='household'&&<p>Whole-household invoice; this is not the child’s individual balance.</p>}</article>):<p>No linked posted invoices. This does not establish a zero balance.</p>}<Link href={href}>Review an invoice and secure checkout →</Link></>:<p>Billing requires manager or owner access.</p>}</>}
    {section==='messages'&&<>{data.messages.length?data.messages.map(m=><article key={m.id}><strong>{m.channel} · {m.state}</strong><p>{m.text}</p>{m.summary&&<p>{m.summary}</p>}</article>):<p>No messages for this member in the latest 50 authorized messages.</p>}<Link href={href}>Open this member’s inbox →</Link></>}
    {section==='family'&&<>{data.family?<><p>Household: <strong>{data.family.household||'Not linked'}</strong></p>{data.family.members.map(m=><article key={m.id}><Link href={`/people/${m.id}`} className={styles.personLink}><PersonName name={m.name}/><span aria-hidden="true">→</span></Link></article>)}<h3>Household guardians</h3>{data.family.householdGuardians?.length?data.family.householdGuardians.map(g=><article key={g.id}><PersonName name={g.name}/><p>{g.primary?'Primary guardian':'Guardian'} · Native household relationship</p></article>):<p>No guardian is recorded on this household.</p>}<small>A household guardian is not a verified messaging channel and does not grant signing, payment or portal access.</small><h3>Verified guardian channels</h3>{data.family.guardians.length?data.family.guardians.map(g=><article key={g.id}><PersonName name={g.name}/><p>{g.channel} · {g.allowReply?'Replies permitted':'Replies not permitted'}</p></article>):<p>No verified guardian channel is linked. A matching name or household does not establish consent.</p>}</>:<p>Family and guardian details require manager or owner access.</p>}</>}
    {section==='safety'&&<>{data.safety?<><h3>Emergency contacts</h3>{data.safety.contacts.length?data.safety.contacts.map(c=><article key={c.id}><PersonName name={c.name} label={`${c.name}${c.primary?' · Primary':''}`}/><p>{c.relationship} · <a href={`tel:${c.phone}`}>{c.phone}</a></p></article>):<p>No emergency contact recorded.</p>}<h3>Allergies</h3><p>{data.safety.allergies||'Not recorded'}</p><h3>Medical notes</h3><p>{data.safety.medicalNotes||'Not recorded'}</p><h3>Emergency note</h3><p>{data.safety.emergencyNote||'Not recorded'}</p><small>Missing information is not confirmation that no health needs exist. Record updates through the school’s authorized process.</small></>:<p>Private safety information requires manager or owner access.</p>}</>}
    {section==='documents'&&<>{data.documents?<><h3>Waiver</h3>{data.documents.waiver?<p>{data.documents.waiver.state}{data.documents.waiver.signedBy?` · ${data.documents.waiver.signedBy}`:''}{data.documents.waiver.signedAt?` · ${when(data.documents.waiver.signedAt)}`:''}</p>:<p>The waiver module is not connected in this school.</p>}<h3>Document register</h3>{data.documents.files.length?data.documents.files.map(f=><article key={f.id}><strong>{f.name}</strong><p>{f.mimeType} · {Math.ceil(f.bytes/1024)} KB</p></article>):<p>No files attached directly to this member record.</p>}<small>Most recent 30 attachment records. File downloads and signing remain in the authorized document workflow.</small></>:<p>Private documents require manager or owner access.</p>}</>}
  </section>;
}
