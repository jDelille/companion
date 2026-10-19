'use client';

import {useEffect,useRef,useState} from 'react';
import Link from '@/components/primitives/AppLink';
import {explainHubError,type ActionFeedback} from '@/domain/hub-actions';
import styles from './page.module.css';
import intakeStyles from './intake.module.css';

type Trial = {id:string;state:string;version:number;member:{id:string;name:string};session:{id:string;title:string;startsAt:string;canRecordOutcome:boolean;canCancel:boolean};
  reservedBy:string|null;outcomeBy:string|null;subscriptionId:string|null};
type Context = {lead:{id:string;name:string;version:number;stage:string|null;contact:string|null};trials:Trial[];
  students:{id:string;name:string;memberNumber:string;state:string}[];
  sessions:{id:string;title:string;startsAt:string;version:number;registered:number;capacity:number;courseRoster:boolean}[];
  plans:{id:string;name:string;price:number;currency:string;billingPeriod:string;initialFee:number;autoSendInvoice:boolean}[];stageAutomations:string[]};
type Conversion = {member:string;payer:string;startDate:string;coversTrialClass:boolean;creates:string[];doesNot:string[];billing:string;version:number;reviewToken:string;
  plan:{name:string;price:number;currency:string;billingPeriod:string;initialFee:number}};
type Review = {operation:string;payload:Record<string,unknown>;title:string;lines:string[]};
export type TrialBinding = {act:(operation:string,payload:Record<string,unknown>)=>Promise<ActionFeedback|undefined>;feedback?:ActionFeedback;retry?:()=>Promise<ActionFeedback|undefined>;clearFeedback:()=>void};
const when=(value:string)=>new Date(value).toLocaleString();
const money=(value:number,currency:string)=>new Intl.NumberFormat(undefined,{style:'currency',currency}).format(value);
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
async function read(operation:string,payload:Record<string,unknown>){
  const response=await fetch('/api/hub',{method:'POST',cache:'no-store',headers:{'content-type':'application/json'},body:JSON.stringify({operation,payload,requestKey:null})});
  const value=await response.json();
  if(!response.ok)throw Error(value.error?.code||'CONNECTION_UNAVAILABLE');
  return value;
}

export default function TrialPanel({leadId,busy,locked,binding}:{leadId:string;busy:boolean;locked:boolean;binding:TrialBinding}){
  const [context,setContext]=useState<Context|null>(null),[error,setError]=useState(''),[reload,setReload]=useState(0);
  const [query,setQuery]=useState(''),[search,setSearch]=useState(''),[memberId,setMemberId]=useState(''),[sessionId,setSessionId]=useState(''),[reason,setReason]=useState('');
  const [planId,setPlanId]=useState(''),[startDate,setStartDate]=useState(today()),[conversion,setConversion]=useState<Conversion|null>(null);
  const [review,setReview]=useState<Review|null>(null),[confirmed,setConfirmed]=useState(false);
  const inFlight=useRef(false),reviewRef=useRef<HTMLDivElement>(null);
  const blocked=busy||locked;
  useEffect(()=>{
    let cancelled=false;
    void read('trial_context',{leadId,query:search}).then((v:Context)=>{if(!cancelled){setContext(v);setError('');}}).catch(e=>{if(!cancelled){setContext(null);setError(explainHubError(e.message));}});
    return()=>{cancelled=true;};
  },[leadId,search,reload]);
  useEffect(()=>{if(review||binding.feedback)reviewRef.current?.focus();},[review,binding.feedback]);
  const open=context?.trials.find(t=>['reserved','attended'].includes(t.state));
  const prepare=(value:Review)=>{binding.clearFeedback();setConfirmed(false);setReview(value);};
  const reset=()=>{setReview(null);setConfirmed(false);setConversion(null);setReason('');setMemberId('');setSessionId('');setReload(n=>n+1);};
  async function confirm(){
    if(!review||!confirmed||blocked||inFlight.current)return;
    inFlight.current=true;
    try{const result=await binding.act(review.operation,review.payload);if(result?.kind==='success'||result?.kind==='error')reset();}
    finally{inFlight.current=false;}
  }
  async function previewConversion(){
    if(!open||!planId||blocked)return;
    setConversion(null);setError('');
    try{const value:Conversion=await read('conversion_preview',{trialId:open.id,planId,startDate});setConversion(value);}
    catch(e){setError(explainHubError((e as Error).message));}
  }
  const checkResult=async()=>{const result=await binding.retry?.();if(result?.kind==='success')reset();};
  if(error&&!context)return <section className={styles.evidenceDetail} aria-label="Trial"><h3>Trial</h3><p role="alert">{error}</p></section>;
  if(!context)return <p role="status">Loading trial options…</p>;
  const student=context.students.find(s=>s.id===memberId),session=context.sessions.find(s=>s.id===sessionId);
  const automations=context.stageAutomations.length?`Odoo stage automations (${context.stageAutomations.join('; ')}) are not triggered because the stage does not change.`:'No stage automation is triggered because the stage does not change.';
  return <section className={styles.evidenceDetail} aria-label="Trial">
    <h3>Trial</h3>
    {error&&<p role="alert">{error}</p>}
    {context.trials.map(t=><p key={t.id}>{t.member.name} · {t.session.title} · {when(t.session.startsAt)} · <strong>{t.state.replace('_',' ')}</strong>{t.subscriptionId?' · membership created':''}</p>)}
    {!open&&<div className={styles.fields}>
      <p>Reserve a real trial class for an existing student record. Create the student first if needed: <Link href="/hub?view=intake">New student →</Link></p>
      <div className={intakeStyles.search}><label>Find trial student<input aria-label="Find trial student" value={query} maxLength={100} disabled={blocked} onChange={e=>setQuery(e.target.value)}/></label><button disabled={blocked} onClick={()=>setSearch(query.trim())}>Search students</button></div>
      <label>Trial student<select aria-label="Trial student" value={memberId} disabled={blocked} onChange={e=>setMemberId(e.target.value)}><option value="">Choose the exact student</option>
        {context.students.map(s=><option key={s.id} value={s.id} disabled={!['lead','trial'].includes(s.state)}>{s.name} · {s.memberNumber} · {s.state}</option>)}</select></label>
      <label>Trial class<select aria-label="Trial class" value={sessionId} disabled={blocked} onChange={e=>setSessionId(e.target.value)}><option value="">Choose an upcoming class</option>
        {context.sessions.map(s=><option key={s.id} value={s.id}>{s.title} · {when(s.startsAt)} · {s.capacity?`${s.registered}/${s.capacity} booked`:`${s.registered} booked`}{s.courseRoster?' · course roster':''}</option>)}</select></label>
      <label>Reason for this trial<input aria-label="Reason for this trial" value={reason} maxLength={500} disabled={blocked} onChange={e=>setReason(e.target.value)}/></label>
      <button disabled={blocked||!student||!session||!reason.trim()} onClick={()=>student&&session&&prepare({operation:'reserve_trial',
        payload:{leadId,expectedLeadVersion:context.lead.version,memberId:student.id,sessionId:session.id,expectedSessionVersion:session.version,reason:reason.trim()},
        title:`Reserve ${student.name} for ${session.title}`,lines:[`${when(session.startsAt)} · creates a native class registration for this one class; membership checks are not applied to the trial booking.`,
          'Capacity and course roster rules still apply.','Does not change the CRM stage, create a membership or send a message.',automations]})}>Review trial reservation</button>
    </div>}
    {open?.state==='reserved'&&open.session.canCancel&&<div className={styles.fields}>
      <label>Reason for cancelling<input aria-label="Reason for cancelling the trial" value={reason} maxLength={500} disabled={blocked} onChange={e=>setReason(e.target.value)}/></label>
      <button disabled={blocked||!reason.trim()} onClick={()=>prepare({operation:'cancel_trial',payload:{trialId:open.id,expectedVersion:open.version,reason:reason.trim()},
        title:`Cancel ${open.member.name}'s trial`,lines:['Cancels the class registration and returns the student to lead status.','No message is sent.']})}>Review trial cancellation</button>
    </div>}
    {open?.state==='reserved'&&open.session.canRecordOutcome&&<div className={styles.fields}>
      <label>Trial note<input aria-label="Trial outcome note" value={reason} maxLength={500} disabled={blocked} onChange={e=>setReason(e.target.value)}/></label>
      <div className={styles.row}>
        <button disabled={blocked||!reason.trim()} onClick={()=>prepare({operation:'record_trial_outcome',payload:{trialId:open.id,expectedVersion:open.version,outcome:'attended',reason:reason.trim()},
          title:`${open.member.name} attended the trial`,lines:['Saves a present attendance record for this class and marks the lead as trial attended.','Does not change the CRM stage or send an offer.']})}>Review attended</button>
        <button disabled={blocked||!reason.trim()} onClick={()=>prepare({operation:'record_trial_outcome',payload:{trialId:open.id,expectedVersion:open.version,outcome:'no_show',reason:reason.trim()},
          title:`${open.member.name} did not attend`,lines:['Saves an absent attendance record for this class.','Does not set the CRM no-show flag, so no automatic follow-up email is scheduled.']})}>Review no-show</button>
      </div>
    </div>}
    {open?.state==='attended'&&<div className={styles.fields}>
      <label>Membership plan<select aria-label="Membership plan" value={planId} disabled={blocked} onChange={e=>{setPlanId(e.target.value);setConversion(null);}}><option value="">Choose a plan</option>
        {context.plans.map(p=><option key={p.id} value={p.id}>{p.name} · {money(p.price,p.currency)} / {p.billingPeriod}</option>)}</select></label>
      <label>Membership start<input type="date" aria-label="Membership start date" value={startDate} min={today()} disabled={blocked} onChange={e=>{setStartDate(e.target.value);setConversion(null);}}/></label>
      <button disabled={blocked||!planId} onClick={()=>void previewConversion()}>Preview conversion</button>
      {conversion&&<div aria-label="Conversion preview">
        <p>{conversion.member} · {conversion.plan.name} · {money(conversion.plan.price,conversion.plan.currency)} / {conversion.plan.billingPeriod}{conversion.plan.initialFee?` · initial fee ${money(conversion.plan.initialFee,conversion.plan.currency)}`:''} · billed to {conversion.payer}</p>
        {!conversion.coversTrialClass&&<p role="alert">This plan does not cover the trial class’s program or course.</p>}
        <h4>Odoo will</h4>{conversion.creates.map(line=><p key={line}>{line}</p>)}<p>{conversion.billing}</p>
        <h4>Odoo will not</h4>{conversion.doesNot.map(line=><p key={line}>{line}</p>)}
        <label>Reason for converting<input aria-label="Reason for converting" value={reason} maxLength={500} disabled={blocked} onChange={e=>setReason(e.target.value)}/></label>
        <button disabled={blocked||!reason.trim()} onClick={()=>prepare({operation:'convert_trial',payload:{trialId:open.id,expectedVersion:conversion.version,planId,startDate,reason:reason.trim(),reviewToken:conversion.reviewToken},
          title:`Convert ${conversion.member} to ${conversion.plan.name}`,lines:[...conversion.creates,conversion.billing,...conversion.doesNot.map(line=>`Will not: ${line}`)]})}>Review conversion</button>
      </div>}
    </div>}
    <div ref={reviewRef} tabIndex={-1}>
      {review&&<div className={styles.card} aria-label="Review trial action"><h4>{review.title}</h4>{review.lines.map(line=><p key={line}>{line}</p>)}
        <label className={intakeStyles.confirm}><input type="checkbox" checked={confirmed} disabled={blocked} onChange={e=>setConfirmed(e.target.checked)}/>I reviewed what Odoo will and will not do.</label>
        <div className={styles.row}><button disabled={blocked||!confirmed} onClick={()=>void confirm()}>{busy?'Saving…':'Confirm trial action in Odoo'}</button><button disabled={blocked} onClick={()=>setReview(null)}>Cancel</button></div>
      </div>}
      {binding.feedback&&<div className={styles.card} role={binding.feedback.kind==='error'?'alert':'status'} aria-label="Trial result"><p>{binding.feedback.text}</p>{binding.feedback.refreshWarning&&<p>{binding.feedback.refreshWarning}</p>}
        {binding.feedback.kind==='uncertain'&&binding.retry&&<button disabled={busy} onClick={()=>void checkResult()}>Check trial result</button>}</div>}
    </div>
  </section>;
}
