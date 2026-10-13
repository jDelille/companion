"use client";

import {useEffect, useRef, useState, type FormEvent} from "react";
import {explainHubError, type ActionFeedback} from "@/domain/hub-actions";
import styles from "./page.module.css";

type Shift = {id:string; instructor:string; checkIn:string; checkOut:string|null; hours:number; version:number; state:string; needsReview:boolean; correctable:boolean};
type Data = {instructor:{id:string;name:string}|null; current:Shift|null; canCorrect:boolean; shifts:Shift[]; windowDays:number; truncated:boolean};
type Review = {operation:string; payload:Record<string,unknown>; description:string};
type Props = {busy:boolean; locked:boolean; feedback?:ActionFeedback; clearFeedback:()=>void;
  act:(operation:string,payload:Record<string,unknown>)=>Promise<ActionFeedback|undefined>;
  retry?:()=>Promise<ActionFeedback|undefined>};
const when = (value:string)=>new Date(value).toLocaleString();
const localInput = (value:string)=>{const date=new Date(value);return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);};

function Correction({shift,disabled,prepare}:{shift:Shift;disabled:boolean;prepare:(r:Review)=>void}) {
  function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values=new FormData(event.currentTarget);
    const checkIn=new Date(String(values.get('checkIn'))),checkOut=new Date(String(values.get('checkOut')));
    if(!Number.isFinite(checkIn.getTime())||!Number.isFinite(checkOut.getTime()))return;
    const reason=String(values.get('reason')||'').trim();
    prepare({operation:'correct_timesheet',payload:{shiftId:shift.id,expectedVersion:shift.version,checkIn:checkIn.toISOString(),checkOut:checkOut.toISOString(),reason},
      description:`Correct ${shift.instructor}’s shift from ${when(shift.checkIn)} – ${when(shift.checkOut!)} to ${checkIn.toLocaleString()} – ${checkOut.toLocaleString()}. Reason: ${reason}.`});
  }
  return <details className={styles.booking}><summary>Correct this timesheet</summary><form className={styles.fields} onSubmit={submit}>
    <p>Times are in this device’s timezone. Odoo rejects overlapping shifts. This does not approve payroll.</p>
    <label>Corrected clock-in<input name="checkIn" type="datetime-local" defaultValue={localInput(shift.checkIn)} required disabled={disabled}/></label>
    <label>Corrected clock-out<input name="checkOut" type="datetime-local" defaultValue={localInput(shift.checkOut!)} required disabled={disabled}/></label>
    <label>Correction reason<textarea name="reason" maxLength={500} required disabled={disabled}/></label>
    <button disabled={disabled}>Review timesheet correction</button>
  </form></details>;
}

export default function InstructorWorkspace({busy,locked,feedback,clearFeedback,act,retry}:Props) {
  const [data,setData]=useState<Data|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[reload,setReload]=useState(0);
  const [review,setReview]=useState<Review|null>(null);
  const reviewRef=useRef<HTMLDivElement>(null),inFlight=useRef(false);
  useEffect(()=>{
    const abort=new AbortController();
    void (async()=>{
      try {
        const response=await fetch('/api/hub',{method:'POST',headers:{'content-type':'application/json'},cache:'no-store',signal:abort.signal,
          body:JSON.stringify({operation:'instructor_context',payload:{},requestKey:null})});
        const value=await response.json();
        if(!response.ok)throw Error(value.error?.code||'CONNECTION_UNAVAILABLE');
        if(!Array.isArray(value.shifts)||typeof value.canCorrect!=='boolean')throw Error('INSTRUCTOR_DETAILS_UNAVAILABLE');
        if(!abort.signal.aborted){setData(value);setError('');}
      }catch(e){if(!abort.signal.aborted){setData(null);setError(explainHubError(e instanceof Error?e.message:'CONNECTION_UNAVAILABLE'));}}
      finally{if(!abort.signal.aborted)setLoading(false);}
    })();
    return ()=>abort.abort();
  },[reload]);
  useEffect(()=>{if(review)reviewRef.current?.focus();},[review]);
  const disabled=busy||locked||loading;
  const refresh=()=>{setReview(null);setLoading(true);setReload(n=>n+1);};
  const prepare=(value:Review)=>{if(!disabled){clearFeedback();setReview(value);}};
  async function confirm() {
    if(!review||disabled||inFlight.current)return;
    inFlight.current=true;
    try{const result=await act(review.operation,review.payload);if(result?.kind==='success')refresh();else if(result?.kind==='error')setReview(null);}
    finally{inFlight.current=false;}
  }
  function clock(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();if(!data?.instructor)return;
    const pin=String(new FormData(event.currentTarget).get('pin')||'');
    event.currentTarget.reset();
    prepare({operation:'instructor_clock',payload:{direction:data.current?'out':'in',currentShiftId:data.current?.id||null,pin},
      description:`Clock ${data.current?'out':'in'} as ${data.instructor.name}${data.current?`, ending the shift started ${when(data.current.checkIn)}`:''}. Odoo records the server time when confirmed.`});
  }
  return <section className={styles.card} aria-label="Instructor workspace">
    <div className={styles.row}><h2>Instructor workspace</h2><button disabled={disabled} onClick={refresh}>Refresh shifts</button></div>
    <ul className={styles.chips} aria-label="How this works"><li>Individual staff identity</li><li>Native Odoo timesheets</li><li>Review before saving</li></ul>
    {loading&&<p role="status">Loading authorized shifts…</p>}
    {error&&<p role="alert">{error} No cached employee records are substituted.</p>}
    {feedback&&<div role={feedback.kind==='error'?'alert':'status'} aria-label="Instructor action result" className={styles.bookingResult}>
      <p>{feedback.text}</p>{feedback.refreshWarning&&<p>{feedback.refreshWarning}</p>}
      {feedback.kind==='uncertain'&&retry&&<button disabled={busy} onClick={()=>void retry().then(result=>{if(result?.kind==='success')refresh();})}>Check original shift action</button>}
    </div>}
    {data&&!loading&&<>
      {review&&<div ref={reviewRef} tabIndex={-1} role="group" aria-label="Review instructor action" className={styles.savedReceipt}>
        <h3>Review before saving</h3><p>{review.description}</p><p>No student attendance, messages, or payments will change.</p>
        <div className={styles.row}><button disabled={disabled} onClick={()=>void confirm()}>Confirm instructor action in Odoo</button><button disabled={disabled} onClick={()=>setReview(null)}>Cancel review</button></div>
      </div>}
      {data.instructor?<div className={styles.fields}><h3>{data.instructor.name}</h3>
        <p>{data.current?`Clocked in since ${when(data.current.checkIn)}`:'Not currently clocked in'}</p>
        <form className={styles.fields} onSubmit={clock}><label>Instructor PIN<input name="pin" aria-label="Instructor PIN" type="password" inputMode="numeric" autoComplete="off" pattern="[0-9]{6}" minLength={6} maxLength={6} required disabled={disabled||!!review}/></label>
          <button disabled={disabled||!!review}>Review clock {data.current?'out':'in'}</button></form>
        <p className={styles.muted}>The PIN does not let you choose another instructor. Sign out before handing this device to another person.</p>
      </div>:<div className={styles.warningBox} role="status"><i aria-hidden="true">!</i><div><strong>No active instructor profile linked</strong><p>No active instructor profile is linked to your account at this school. An administrator must link the existing profile before clocking in.</p></div></div>}
      <h3>{data.canCorrect?'Team timesheets':'Your timesheets'}</h3>
      <p className={styles.muted}>Last {data.windowDays} days{data.truncated?' · showing the latest 100 shifts; review older records in Odoo':''}. Open shifts have no final worked-hours total.</p>
      {!data.shifts.length&&<div className={styles.emptyBox}><i aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></i><strong>No shifts in this period.</strong><p>Shifts will appear here once an instructor clocks in.</p></div>}
      {data.shifts.map(shift=><article className={styles.booking} key={`${shift.id}:${shift.version}`} aria-label={`Shift ${shift.id}`}>
        <div className={styles.row}><strong>{shift.instructor}</strong><span>{shift.checkOut?`${shift.hours.toFixed(2)} hours`:'In progress'}</span></div>
        <p>{when(shift.checkIn)} → {shift.checkOut?when(shift.checkOut):'Not clocked out'}</p>
        <small>Odoo shift {shift.id} · {shift.state}{shift.needsReview?' · Automatic close needs review':''}</small>
        {data.canCorrect&&shift.correctable&&<Correction shift={shift} disabled={disabled||!!review} prepare={prepare}/>}
        {data.canCorrect&&!shift.correctable&&<p className={styles.muted}>Only closed draft shifts can be corrected here. Validated or open shifts require the native HR workflow.</p>}
      </article>)}
    </>}
  </section>;
}
