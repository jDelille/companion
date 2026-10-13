'use client';

import {useEffect,useState} from 'react';
import {explainHubError} from '@/domain/hub-actions';
import styles from './page.module.css';

type Item={key:string;label:string;done:boolean;detail:string;where:string};

export function ChecklistItems({items}:{items:Item[]}){
  return <ul aria-label="Checklist" style={{listStyle:'none',padding:0,margin:0,display:'grid',gap:'0.5rem'}}>
    {items.map(i=><li key={i.key} className={styles.auditEntry} aria-label={`${i.label}: ${i.done?'done':'needs attention'}`}>
      <strong>{i.done?'✓':'○'} {i.label}</strong><p>{i.detail}</p>{!i.done&&<small>Where: {i.where}</small>}
    </li>)}
  </ul>;
}

export default function SetupChecklist(){
  const [data,setData]=useState<{items:Item[];done:number;total:number}|null>(null),[error,setError]=useState('');
  useEffect(()=>{let cancelled=false;
    void fetch('/api/hub',{method:'POST',cache:'no-store',headers:{'content-type':'application/json'},body:JSON.stringify({operation:'setup_checklist',payload:{},requestKey:null})})
      .then(async r=>{const v=await r.json();if(!r.ok)throw Error(v.error?.code||'CONNECTION_UNAVAILABLE');if(!cancelled)setData(v);})
      .catch(e=>{if(!cancelled)setError(explainHubError(e.message));});
    return()=>{cancelled=true;};},[]);
  return <section aria-label="School setup" className={styles.card}>
    <h2>School setup</h2>
    <p>Read from the live Odoo configuration. Nothing here changes settings; each item says where it is configured.</p>
    {error&&<p role="alert">{error}</p>}
    {!data&&!error&&<p role="status">Checking setup…</p>}
    {data&&<><p>{data.done} of {data.total} ready</p><ChecklistItems items={data.items}/></>}
  </section>;
}
