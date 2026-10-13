'use client';

import {useEffect,useRef,useState} from 'react';
import {explainHubError,type ActionFeedback} from '@/domain/hub-actions';
import {PersonName} from '@/components/primitives/avatar/Avatar';
import styles from './page.module.css';
import intakeStyles from './intake.module.css';

type Archived = {id:string;name:string;memberNumber:string;version:number;archivedAt:string;archivedBy:string|null;reason:string|null};
type Props = {busy:boolean;locked:boolean;feedback?:ActionFeedback;clearFeedback:()=>void;
  retry?:()=>Promise<ActionFeedback|undefined>;act:(operation:string,payload:Record<string,unknown>)=>Promise<ActionFeedback|undefined>};
async function read(operation:string,payload:Record<string,unknown>){
  const response=await fetch('/api/hub',{method:'POST',cache:'no-store',headers:{'content-type':'application/json'},body:JSON.stringify({operation,payload,requestKey:null})});
  const value=await response.json();
  if(!response.ok)throw Error(value.error?.code||'CONNECTION_UNAVAILABLE');
  return value;
}

export default function ArchivedMembers({busy,locked,feedback,clearFeedback,retry,act}:Props){
  const [rows,setRows]=useState<Archived[]|null>(null),[more,setMore]=useState(false),[error,setError]=useState('');
  const [query,setQuery]=useState(''),[search,setSearch]=useState(''),[reload,setReload]=useState(0);
  const [selected,setSelected]=useState<Archived|null>(null),[reason,setReason]=useState(''),[confirmed,setConfirmed]=useState(false);
  const inFlight=useRef(false),reviewRef=useRef<HTMLDivElement>(null);
  const blocked=busy||locked;
  useEffect(()=>{
    let cancelled=false;
    void read('archived_members',{query:search}).then(value=>{if(!cancelled){setRows(value.members);setMore(!!value.more);setError('');}})
      .catch(e=>{if(!cancelled){setRows(null);setError(explainHubError(e.message));}});
    return()=>{cancelled=true;};
  },[search,reload]);
  useEffect(()=>{if(selected||feedback)reviewRef.current?.focus();},[selected,feedback]);
  async function restore(){
    if(!selected||!confirmed||!reason.trim()||blocked||inFlight.current)return;
    inFlight.current=true;
    try{
      const result=await act('restore_member',{memberId:selected.id,expectedVersion:selected.version,reason:reason.trim()});
      if(result?.kind==='success'){setSelected(null);setReason('');setConfirmed(false);setReload(n=>n+1);}
      else if(result?.kind==='error'){setSelected(null);setConfirmed(false);setReload(n=>n+1);}
    }finally{inFlight.current=false;}
  }
  const checkResult=async()=>{const result=await retry?.();if(result?.kind==='success'){setSelected(null);setReload(n=>n+1);}};
  return <section aria-label="Archived students">
    <div className={styles.card}><h2>Archived students</h2><p>Archived students keep their attendance, rank and billing history in Odoo. They are hidden from rosters, the kiosk and new bookings.</p>
      <div className={intakeStyles.search}><label>Find an archived student<input aria-label="Find an archived student" value={query} maxLength={100} onChange={e=>setQuery(e.target.value)}/></label><button disabled={blocked} onClick={()=>setSearch(query.trim())}>Search archive</button></div></div>
    {error&&<p role="alert" className={styles.card}>{error}</p>}
    {!rows?<p role="status">Loading archived students…</p>:<div className={styles.card}>
      {rows.length?rows.map(r=><div key={r.id} className={styles.auditEntry}><PersonName name={r.name} label={`${r.name} · ${r.memberNumber}`}/>
        <p>Archived {new Date(r.archivedAt).toLocaleString()}{r.archivedBy?` by ${r.archivedBy}`:''}{r.reason?` · ${r.reason}`:''}</p>
        <button disabled={blocked} onClick={()=>{clearFeedback();setSelected(r);setReason('');setConfirmed(false);}}>Review restoring {r.name}</button></div>):<p>No archived students match.</p>}
      {more&&<p>Showing the 50 most recently changed. Narrow your search.</p>}
    </div>}
    <div ref={reviewRef} tabIndex={-1} className={intakeStyles.result}>
      {selected&&<div className={styles.card} aria-label="Review restoring student"><h2>Restore {selected.name}?</h2>
        <p>The student returns to the active directory, rosters and the kiosk. Bookings cancelled at archive are not re-created, and no membership is restarted.</p>
        <label className={styles.fields}>Reason for restoring<input aria-label="Reason for restoring" value={reason} maxLength={500} disabled={blocked} onChange={e=>setReason(e.target.value)}/></label>
        <label className={intakeStyles.confirm}><input type="checkbox" checked={confirmed} disabled={blocked} onChange={e=>setConfirmed(e.target.checked)}/>I confirmed this student should be active again.</label>
        <div className={styles.row}><button disabled={blocked||!confirmed||!reason.trim()} onClick={()=>void restore()}>{busy?'Restoring…':'Confirm restore in Odoo'}</button><button disabled={blocked} onClick={()=>setSelected(null)}>Cancel</button></div>
      </div>}
      {feedback&&<div className={styles.card} role={feedback.kind==='error'?'alert':'status'} aria-label="Archive action result"><p>{feedback.text}</p>{feedback.refreshWarning&&<p>{feedback.refreshWarning}</p>}{feedback.kind==='uncertain'&&retry&&<button disabled={busy} onClick={()=>void checkResult()}>Check restore result</button>}</div>}
    </div>
  </section>;
}
