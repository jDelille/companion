'use client';

import {useEffect,useState} from 'react';
import {explainHubError} from '@/domain/hub-actions';
import styles from './page.module.css';

type Item={key:string;label:string;done:boolean;detail:string;where:string};

export function ChecklistItems({items}:{items:Item[]}){
  // One row per item: status tile · name + Ready/Needs attention · detail · where to set it
  return <ul aria-label="Checklist" className={styles.checklist}>
    {items.map(i=><li key={i.key} className={styles.checkItem} data-done={i.done?'true':'false'} aria-label={`${i.label}: ${i.done?'done':'needs attention'}`}>
      <i aria-hidden="true">{i.done?'✓':'!'}</i>
      <div><strong className={styles.checkTitle}>{i.label}</strong><p>{i.detail}</p></div>
      {/* Where to set it (empty when ready, so the columns stay lined up) */}
      <small className={styles.checkWhere}>{i.done?'':<><span>Where</span>{i.where}</>}</small>
      <span className={styles.statusPill} data-status={i.done?'granted':'attention'}>{i.done?'Ready':'Needs attention'}</span>
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
    {data&&<>
      {/* "5 of 8 ready" with a thin progress bar */}
      <div className={styles.setupProgress}>
        <p><strong>{data.done} of {data.total}</strong> ready</p>
        <i aria-hidden="true"><i style={{width:`${data.total?Math.round((data.done/data.total)*100):0}%`}}/></i>
      </div>
      <ChecklistItems items={data.items}/>
    </>}
  </section>;
}
