'use client';

import {useEffect,useRef,useState} from 'react';
import {explainHubError,type ActionFeedback} from '@/domain/hub-actions';
import styles from './page.module.css';
import intakeStyles from './intake.module.css';
import {PersonName} from '@/components/primitives/avatar/Avatar';

type SessionRow = {id:string;title:string;startsAt:string;endsAt:string;registered:number;attended:number};
type Correction = {before:string;after:string;reason:string;actor:string;at:string;reversal:boolean};
type Row = {memberId:string;name:string;status:string;logId:string|null;version:number;registered:boolean;checkedInAt:string|null;creditHold:string|null;corrections:Correction[]};
type Sheet = {session:{id:string;title:string;startsAt:string;endsAt:string;open:boolean};canReverse:boolean;marks:string[];rows:Row[]};
type Review = {row:Row;status:string;reason:string;reversal:boolean};
type Props = {busy:boolean;locked:boolean;feedback?:ActionFeedback;clearFeedback:()=>void;
  retry?:()=>Promise<ActionFeedback|undefined>;act:(operation:string,payload:Record<string,unknown>)=>Promise<ActionFeedback|undefined>};
const ATTENDED=['present','late'];
const label=(status:string)=>status==='pending'?'Not recorded':status.charAt(0).toUpperCase()+status.slice(1);
async function read(operation:string,payload:Record<string,unknown>){
  const response=await fetch('/api/hub',{method:'POST',cache:'no-store',headers:{'content-type':'application/json'},body:JSON.stringify({operation,payload,requestKey:null})});
  const value=await response.json();
  if(!response.ok)throw Error(value.error?.code||'CONNECTION_UNAVAILABLE');
  return value;
}

function RowEditor({row,sheet,blocked,onReview}:{row:Row;sheet:Sheet;blocked:boolean;onReview:(review:Review)=>void}){
  const [status,setStatus]=useState(''),[reason,setReason]=useState('');
  const reversal=ATTENDED.includes(row.status)&&!!status&&!ATTENDED.includes(status);
  const locked=!sheet.session.open||(reversal&&!sheet.canReverse)||(!!row.logId&&!sheet.canReverse);
  return <div className={styles.auditEntry} aria-label={`Attendance for ${row.name}`} role="group">
    {/* Student cell: name, status pill, then when it was recorded */}
    <div className={styles.studentCell}>
      <PersonName name={row.name}/>
      <span className={styles.statusPill} data-status={row.status}>{label(row.status)}</span>
      {(row.checkedInAt||row.creditHold||!row.registered)&&<small className={styles.recorded}>{row.checkedInAt?`Recorded ${new Date(row.checkedInAt).toLocaleString()}`:''}{row.creditHold?`${row.checkedInAt?' · ':''}Class credit ${row.creditHold}`:''}{!row.registered?`${row.checkedInAt||row.creditHold?' · ':''}Not on the current roster`:''}</small>}
      {row.corrections.map((c,i)=><small key={i}>{c.actor} changed {label(c.before)} → {label(c.after)} · {new Date(c.at).toLocaleString()} · {c.reason}</small>)}
    </div>
    {sheet.session.open&&(!row.logId||sheet.canReverse)&&<div className={styles.row}>
      <label>New status<select aria-label={`New status for ${row.name}`} value={status} disabled={blocked} onChange={e=>setStatus(e.target.value)}>
        <option value="">Choose</option>{sheet.marks.filter(m=>m!==row.status).map(m=><option key={m} value={m}>{label(m)}</option>)}</select></label>
      <label>Reason<input aria-label={`Reason for ${row.name}`} placeholder="Reason for change" value={reason} maxLength={500} disabled={blocked} onChange={e=>setReason(e.target.value)}/></label>
      <button disabled={blocked||!status||!reason.trim()||locked} onClick={()=>onReview({row,status,reason:reason.trim(),reversal})}>Review {row.name}</button>
    </div>}
    {reversal&&!sheet.canReverse&&<p role="alert">Reversing recorded attendance requires a manager.</p>}
  </div>;
}

export default function AttendanceWorkspace({busy,locked,feedback,clearFeedback,retry,act}:Props){
  const [sessions,setSessions]=useState<SessionRow[]|null>(null),[sessionId,setSessionId]=useState(''),[sheet,setSheet]=useState<Sheet|null>(null);
  const [error,setError]=useState(''),[reload,setReload]=useState(0),[review,setReview]=useState<Review|null>(null),[confirmed,setConfirmed]=useState(false);
  const inFlight=useRef(false),reviewRef=useRef<HTMLDivElement>(null);
  const blocked=busy||locked;
  useEffect(()=>{let cancelled=false;void read('attendance_sessions',{}).then(v=>{if(!cancelled)setSessions(v.sessions);}).catch(e=>{if(!cancelled)setError(explainHubError(e.message));});return()=>{cancelled=true;};},[reload]);
  useEffect(()=>{
    if(!sessionId)return;
    let cancelled=false;
    void read('attendance_sheet',{sessionId}).then((v:Sheet)=>{if(!cancelled){setSheet(v);setError('');}}).catch(e=>{if(!cancelled){setSheet(null);setError(explainHubError(e.message));}});
    return()=>{cancelled=true;};
  },[sessionId,reload]);
  useEffect(()=>{if(review||feedback)reviewRef.current?.focus();},[review,feedback]);
  async function confirm(){
    if(!review||!sheet||!confirmed||blocked||inFlight.current)return;
    inFlight.current=true;
    try{
      const result=await act('mark_attendance',{sessionId:sheet.session.id,memberId:review.row.memberId,status:review.status,expectedVersion:review.row.version,reason:review.reason});
      if(result?.kind==='success'||result?.kind==='error'){setReview(null);setConfirmed(false);setReload(n=>n+1);}
    }finally{inFlight.current=false;}
  }
  const checkResult=async()=>{const result=await retry?.();if(result?.kind==='success'){setReview(null);setReload(n=>n+1);}};
  return <section aria-label="Attendance review">
    <div className={styles.card}><h2>Record or correct attendance.</h2><p>Changes are saved on the native Odoo attendance record with your name, the previous status and your reason. Kiosk check-in receipts are never deleted.</p>
      <p className={styles.muted}>Classes from the last 7 days and today. Reversing a recorded check-in needs a manager and does not refund a class credit automatically.</p></div>
    {error&&<p role="alert" className={styles.card}>{error}</p>}
    {!sessions?<p role="status">Loading recent classes…</p>:<div className={styles.card}>
      <label className={styles.fields}>Class<select aria-label="Class to review" value={sessionId} disabled={blocked} onChange={e=>{setSessionId(e.target.value);setReview(null);clearFeedback();}}>
        <option value="">Choose a class</option>{sessions.map(s=><option key={s.id} value={s.id}>{s.title} · {new Date(s.startsAt).toLocaleString()} · {s.attended}/{s.registered} attended</option>)}</select></label>
      {!sessions.length&&<p>No classes in your attendance window.</p>}
      {sheet&&sheet.session.id===sessionId&&<>
        {!sheet.session.open&&<p>This class is outside the 31-day correction window.</p>}
        {sheet.rows.length>0&&<div className={styles.attendanceHead} aria-hidden="true"><span>Student</span><span>New status</span><span>Reason</span></div>}
        {sheet.rows.length?sheet.rows.map(row=><RowEditor key={`${row.memberId}:${row.version}:${row.status}`} row={row} sheet={sheet} blocked={blocked} onReview={r=>{clearFeedback();setConfirmed(false);setReview(r);}}/>):<p>No registered students.</p>}
        {sheet.rows.length>0&&<p className={styles.attendanceFoot}>Review shows the change before it’s saved. Nothing is written until you confirm.</p>}
      </>}
    </div>}
    <div ref={reviewRef} tabIndex={-1} className={intakeStyles.result}>
      {review&&<div className={styles.card} aria-label="Review attendance change"><h2>Review before saving</h2>
        <p>{review.row.name}: {label(review.row.status)} → {label(review.status)}</p><p>Reason: {review.reason}</p>
        {review.reversal&&<p role="alert">This reverses a recorded check-in. The original record and kiosk receipt are kept with this correction. Any class credit already used is not refunded here.</p>}
        {ATTENDED.includes(review.status)&&!ATTENDED.includes(review.row.status)&&<p>Odoo checks the student’s membership and course eligibility before saving.</p>}
        <label className={intakeStyles.confirm}><input type="checkbox" checked={confirmed} disabled={blocked} onChange={e=>setConfirmed(e.target.checked)}/>I confirmed this attendance change.</label>
        <div className={styles.row}><button className={styles.primaryAction} disabled={blocked||!confirmed} onClick={()=>void confirm()}>{busy?'Saving…':'Confirm attendance in Odoo'}</button><button disabled={blocked} onClick={()=>setReview(null)}>Cancel</button></div>
      </div>}
      {feedback&&<div className={styles.card} role={feedback.kind==='error'?'alert':'status'} aria-label="Attendance result"><p>{feedback.text}</p>{feedback.refreshWarning&&<p>{feedback.refreshWarning}</p>}{feedback.kind==='uncertain'&&retry&&<button disabled={busy} onClick={()=>void checkResult()}>Check attendance result</button>}</div>}
    </div>
  </section>;
}
