"use client";
import {useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import Link from 'next/link';
import {getCompanionContext} from '@/integrations/companion';
import type {CompanionContext} from '@/domain/companion';
import styles from './FollowUp.module.scss';
export default function ConnectedWorkflowView({historyOnly=false}: {historyOnly?:boolean}) {
  const path=usePathname();
  const [revision,setRevision]=useState(0);
  const [result,setResult]=useState<{path:string;data:CompanionContext|null}|null>(null);
  useEffect(()=>{const reload=()=>setRevision(n=>n+1);window.addEventListener('dojang:companion-updated',reload);const timer=setInterval(reload,15000);return()=>{clearInterval(timer);window.removeEventListener('dojang:companion-updated',reload)}},[]);
  useEffect(()=>{const c=new AbortController();getCompanionContext(path,c.signal).then(r=>{if(!c.signal.aborted)setResult({path,data:r.outcome==='loaded'?r.context:null})});return()=>c.abort()},[path,revision]);
  const data=result?.path===path?result.data:undefined;
  return <section className={styles.workspace}>
    <header><h2>{historyOnly?'Companion follow-up history':data?.heading || 'Staff workspace'}</h2><button onClick={()=>setRevision(n=>n+1)}>Refresh</button></header>
    {data===undefined?<p role="status">Loading Odoo records…</p>:data===null?<p role="alert">Unable to load authorized records. Connect a staff test device and retry.</p>:<>
      {!historyOnly && <><p>Class attendance comes from the same Odoo records as kiosk check-in. Pending means not yet checked in.</p><ul>{data.records?.map(r=><li key={r.id}><Link href={r.href}>{r.label}</Link><small>{/^\d{4}-/.test(r.detail)?new Date(r.detail).toLocaleString():r.detail}</small></li>)}</ul>{!data.records?.length && <p>No records in this authorized scope.</p>}</>}
      <h2>Reviewed follow-ups</h2>
      {!data.followUps?.length?<p>No approved follow-ups yet. Open a member and use “Prepare parent follow-up” in the Companion.</p>:<ul>{data.followUps.map(f=><li key={f.id}><Link href={`/people/${f.memberId}`}>{f.memberName}</Link><small>{new Date(f.at).toLocaleString()} · {f.status}</small><p>{f.summary}</p><details><summary>Reviewed reply draft</summary><blockquote>{f.replyDraft}</blockquote><small>{f.mode}</small></details><Link href={`/ops/sessions/${f.sessionId}`}>Open class roster</Link></li>)}</ul>}
    </>}
  </section>;
}
