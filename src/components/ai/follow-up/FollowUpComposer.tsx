"use client";
import {useState} from 'react';
import type {CompanionContext, CompanionRequestBody} from '@/domain/companion';
import styles from './FollowUp.module.scss';
type Props = {sessions: NonNullable<CompanionContext['sessions']>; busy: boolean; onPrepare: (text: string, input: NonNullable<CompanionRequestBody['followUp']>)=>Promise<void>};
export default function FollowUpComposer({sessions,busy,onPrepare}: Props) {
  const [sessionId,setSessionId] = useState('');
  const [message,setMessage] = useState('');
  const [confirmed,setConfirmed] = useState(false);
  const [attempt,setAttempt] = useState<{idempotencyKey:string;correlationId:string}|null>(null);
  const changed=()=>{setAttempt(null);setConfirmed(false)};
  return <details className={styles.card}>
    <summary>Prepare parent follow-up</summary>
    <p>Paste a staff-entered attendance report for this student. This is not a connected parent inbox.</p>
    <form onSubmit={async e=>{e.preventDefault();if(busy || !confirmed || !sessionId || !message.trim())return;const keys=attempt || {idempotencyKey:`followup-${crypto.randomUUID()}`,correlationId:`followup-${crypto.randomUUID()}`};setAttempt(keys);await onPrepare('Prepare parent follow-up',{sessionId,message:message.trim(),...keys})}}>
      <label>Reported class<select required value={sessionId} onChange={e=>{setSessionId(e.target.value);changed()}}><option value="">Choose enrolled session</option>{sessions.map(s=><option key={s.sessionId} value={s.sessionId}>{s.title} · {new Date(s.startsAt).toLocaleString()}</option>)}</select></label>
      <label>Parent report<textarea required maxLength={1500} rows={4} value={message} placeholder="My child cannot attend this class. Could we arrange a makeup?" onChange={e=>{setMessage(e.target.value);changed()}} /></label>
      <label className={styles.confirm}><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I checked that this report concerns the selected student and class.</label>
      <button disabled={busy || !confirmed || !sessionId || !message.trim()}>{busy?'Preparing…':'Prepare for review'}</button>
      {!sessions.length && <p>No enrolled sessions are available in this authorized scope.</p>}
    </form>
  </details>;
}
