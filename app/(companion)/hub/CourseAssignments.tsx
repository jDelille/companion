'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {explainHubError,type ActionFeedback} from '@/domain/hub-actions';
import Avatar from '@/components/primitives/avatar/Avatar';
import styles from './page.module.css';
import intakeStyles from './intake.module.css';

type Person = {id:string;name:string};
type Template = {id:string;name:string;version:number;memberCount:number;autoEnroll:boolean};
type Course = {id:string;name:string;version:number;autoEnroll:boolean;upcomingSessions:number;members:Person[];candidates:Person[]};
type Roster = {templates:Template[];course:Course|null};
type Preview = {course:string;autoEnroll:boolean;valid:boolean;reviewToken:string|null;version:number;
  add:{memberId:string;name:string;futureBookings:number}[];remove:{memberId:string;name:string;cancelledBookings:number}[];
  capacityConflicts:{sessionId:string;title:string;startsAt:string;capacity:number;registered:number;adding:number}[]};
type Props = {busy:boolean;locked:boolean;feedback?:ActionFeedback;clearFeedback:()=>void;
  retry?:()=>Promise<ActionFeedback|undefined>;act:(operation:string,payload:Record<string,unknown>)=>Promise<ActionFeedback|undefined>};
const LIMIT=50;
async function read(operation:string,payload:Record<string,unknown>){
  const response=await fetch('/api/hub',{method:'POST',cache:'no-store',headers:{'content-type':'application/json'},body:JSON.stringify({operation,payload,requestKey:null})});
  const value=await response.json();
  if(!response.ok)throw Error(value.error?.code||'CONNECTION_UNAVAILABLE');
  return value;
}

export default function CourseAssignments({busy,locked,feedback,clearFeedback,retry,act}:Props){
  const [roster,setRoster]=useState<Roster|null>(null),[templateId,setTemplateId]=useState(''),[reload,setReload]=useState(0);
  const [error,setError]=useState(''),[query,setQuery]=useState('');
  const [adding,setAdding]=useState<string[]>([]),[removing,setRemoving]=useState<string[]>([]);
  const [preview,setPreview]=useState<Preview|null>(null),[reason,setReason]=useState(''),[confirmed,setConfirmed]=useState(false),[reviewing,setReviewing]=useState(false);
  const inFlight=useRef(false),resultRef=useRef<HTMLDivElement>(null);
  const blocked=busy||locked||reviewing;
  useEffect(()=>{
    let cancelled=false;
    void read('course_roster',{templateId}).then((value:Roster)=>{if(!cancelled){setRoster(value);setError('');}})
      .catch(e=>{if(!cancelled){setRoster(null);setError(explainHubError(e.message));}});
    return()=>{cancelled=true;};
  },[templateId,reload]);
  useEffect(()=>{if(preview||feedback)resultRef.current?.focus();},[preview,feedback]);
  const course=roster?.course&&roster.course.id===templateId?roster.course:null;
  const candidates=useMemo(()=>(course?.candidates||[]).filter(p=>p.name.toLowerCase().includes(query.trim().toLowerCase())),[course,query]);
  const resetReview=()=>{setPreview(null);setConfirmed(false);clearFeedback();};
  const toggle=(list:string[],set:(v:string[])=>void,id:string)=>{resetReview();set(list.includes(id)?list.filter(v=>v!==id):list.length>=LIMIT?list:[...list,id]);};
  const choose=(id:string)=>{setTemplateId(id);setAdding([]);setRemoving([]);setQuery('');setReason('');resetReview();setError('');};
  async function review(){
    if(!course||blocked||inFlight.current||(!adding.length&&!removing.length))return;
    inFlight.current=true;setReviewing(true);resetReview();
    try{
      const value:Preview=await read('course_assignment_preview',{templateId:course.id,addMemberIds:adding,removeMemberIds:removing});
      if(!Array.isArray(value.add)||!Array.isArray(value.remove))throw Error('BACKEND_UNAVAILABLE');
      setPreview(value);setError('');
    }catch(e){setError(explainHubError((e as Error).message));}finally{setReviewing(false);inFlight.current=false;}
  }
  async function confirm(){
    if(!course||!preview?.reviewToken||!confirmed||!reason.trim()||blocked||inFlight.current)return;
    inFlight.current=true;
    try{
      const result=await act('assign_course_members',{templateId:course.id,expectedVersion:preview.version,addMemberIds:adding,
        removeMemberIds:removing,reason:reason.trim(),reviewToken:preview.reviewToken});
      if(result?.kind==='success'){setAdding([]);setRemoving([]);setReason('');setPreview(null);setConfirmed(false);setReload(n=>n+1);}
      else if(result?.kind==='error'){setPreview(null);setConfirmed(false);}
    }finally{inFlight.current=false;}
  }
  const checkResult=async()=>{const result=await retry?.();if(result?.kind==='success'){setAdding([]);setRemoving([]);setReason('');setPreview(null);setReload(n=>n+1);}};
  return <section aria-label="Course rosters">
    <div className={styles.card}><h2>Assign students to a course.</h2><p>Course members are enrolled in upcoming generated classes by the school’s native course rules. Removing a student cancels their upcoming registered classes for this course.</p><p className={styles.muted}>Up to {LIMIT} students per change. Nothing changes until you review and confirm.</p></div>
    {error&&<p role="alert" className={styles.card}>{error}</p>}
    {!roster?<p role="status">Loading course rosters…</p>:<div className={styles.card}>
      <label className={styles.fields}>Course<select aria-label="Course" value={templateId} disabled={blocked} onChange={e=>choose(e.target.value)}>
        <option value="">Choose a course</option>{roster.templates.map(t=><option key={t.id} value={t.id}>{t.name} · {t.memberCount} on roster</option>)}</select></label>
      {!roster.templates.length&&<p>No active course templates exist in this school.</p>}
      {course&&<>
        <p>{course.upcomingSessions} upcoming classes · {course.autoEnroll?'Course members are enrolled automatically':'Automatic enrollment is off; roster changes do not create bookings'}</p>
        <fieldset disabled={blocked} className={intakeStyles.fieldset}><legend>Current roster ({course.members.length})</legend>
          {course.members.length?course.members.map(m=><label key={m.id} className={intakeStyles.confirm}><input type="checkbox" aria-label={`Remove ${m.name}`} checked={removing.includes(m.id)} onChange={()=>toggle(removing,setRemoving,m.id)}/><Avatar name={m.name} size="small"/>{m.name}</label>):<p>No students are on this course roster.</p>}
        </fieldset>
        <fieldset disabled={blocked} className={intakeStyles.fieldset}><legend>Add students</legend>
          <label>Find students to add<input aria-label="Find students to add" value={query} onChange={e=>setQuery(e.target.value)} maxLength={100}/></label>
          {candidates.slice(0,100).map(m=><label key={m.id} className={intakeStyles.confirm}><input type="checkbox" aria-label={`Add ${m.name}`} checked={adding.includes(m.id)} onChange={()=>toggle(adding,setAdding,m.id)}/><Avatar name={m.name} size="small"/>{m.name}</label>)}
          {!candidates.length&&<p>No matching active students outside this roster.</p>}
          {candidates.length>100&&<p>Showing the first 100 matches. Narrow your search.</p>}
        </fieldset>
        <p>{adding.length} to add · {removing.length} to remove</p>
        <button disabled={blocked||(!adding.length&&!removing.length)} onClick={()=>void review()}>{reviewing?'Checking upcoming classes…':'Review course assignment'}</button>
      </>}
    </div>}
    <div ref={resultRef} tabIndex={-1} className={intakeStyles.result}>
      {preview&&<div className={styles.card} aria-label="Review course assignment"><h2>Review before changing {preview.course}</h2>
        {preview.add.map(a=><p key={a.memberId}>Add {a.name}: {preview.autoEnroll?`${a.futureBookings} upcoming class bookings will be created`:'no bookings will be created'}</p>)}
        {preview.remove.map(r=><p key={r.memberId}>Remove {r.name}: {r.cancelledBookings} upcoming registered bookings will be cancelled</p>)}
        {preview.capacityConflicts.length>0&&<div role="alert"><p>These classes would exceed capacity. Nothing can be confirmed until this is resolved:</p>{preview.capacityConflicts.map(c=><p key={c.sessionId}>{c.title} · {new Date(c.startsAt).toLocaleString()} · {c.registered}/{c.capacity} booked, adding {c.adding}</p>)}</div>}
        {preview.valid&&<>
          <label className={styles.fields}>Reason for this roster change<input aria-label="Reason for this roster change" value={reason} maxLength={500} disabled={blocked} onChange={e=>setReason(e.target.value)}/></label>
          <label className={intakeStyles.confirm}><input type="checkbox" checked={confirmed} disabled={blocked} onChange={e=>setConfirmed(e.target.checked)}/>I reviewed the students and the bookings Odoo will create or cancel.</label>
          <button disabled={blocked||!confirmed||!reason.trim()} onClick={()=>void confirm()}>{busy?'Updating roster…':'Confirm roster change in Odoo'}</button>
        </>}
        <p className={styles.muted}>Membership eligibility is still checked at check-in. No message is sent.</p>
      </div>}
      {feedback&&<div className={styles.card} role={feedback.kind==='error'?'alert':'status'} aria-label="Course assignment result"><p>{feedback.text}</p>{feedback.refreshWarning&&<p>{feedback.refreshWarning}</p>}{feedback.kind==='uncertain'&&retry&&<button disabled={busy} onClick={()=>void checkResult()}>Check roster change result</button>}</div>}
    </div>
  </section>;
}
