"use client";

import styles from './page.module.css';

export type LeadEvidence = {
  score:number; scoreKind:string; method:string; journey:string; priority:'Low'|'Normal'|'High'|'Now';
  priorityReason:string; nextAction:string; risk:string; openTasks:number; overdueTasks:number; dueToday:number;
  trialLinked:boolean; memberLinked:boolean;
  reasons:{label:string;points:number;available:number;recorded:boolean}[];
};
type Summary = {id:string;name:string;stage:string;stageId:string|null;owner:string;contact:string;evidence?:LeadEvidence};

export function CrmPulse({leads,onPriority}:{leads:Summary[];onPriority:()=>void}) {
  if(leads.some(l=>!l.evidence))return <p role="status">Pipeline intelligence is unavailable until the matching CRM update is installed.</p>;
  const open=leads.filter(l=>l.evidence&&!['Won','Lost'].includes(l.evidence.journey));
  const priority=open.filter(l=>['Now','High'].includes(l.evidence!.priority));
  return <section className={styles.crmPulse} aria-label="Loaded pipeline summary">
    <div><strong>{open.length}</strong><span>Open leads</span></div>
    <button onClick={onPriority}><strong>{priority.length}</strong><span>Need attention →</span></button>
    <div><strong>{open.filter(l=>l.evidence?.trialLinked).length}</strong><span>Linked trials</span></div>
    <div><strong>{open.filter(l=>l.evidence?.journey==='Nurture').length}</strong><span>In nurture</span></div>
  </section>;
}

export function LeadPipeline({leads,stages,board,disabled,openLead}:{leads:Summary[];stages:{id:string;name:string}[];board:boolean;disabled:boolean;openLead:(id:string)=>void}) {
  function card(lead:Summary) {
    return <article key={lead.id} className={styles.leadCard}>
      <div className={styles.row}><span className={styles.priority} data-priority={lead.evidence?.priority}>{lead.evidence?.priority||'Priority unavailable'}</span><span>{lead.evidence?`${lead.evidence.score}/100 evidence`:'Evidence unavailable'}</span></div>
      <h3>{lead.name}</h3><p>{lead.contact||'Contact not recorded'}</p><p>{lead.owner} · {lead.stage}</p>
      {lead.evidence&&<p className={styles.muted}>{lead.evidence.priorityReason}</p>}
      <button disabled={disabled} onClick={()=>openLead(lead.id)}>Open lead {lead.name}</button>
    </article>;
  }
  const columns=[...stages,...(leads.some(l=>!l.stageId||!stages.some(s=>s.id===l.stageId))?[{id:'other',name:'Other / unassigned'}]:[])];
  return <section aria-label="Lead pipeline" className={board?styles.pipelineBoard:styles.pipelineList}>
    {board?columns.map(stage=>{const rows=leads.filter(l=>stage.id==='other'?!l.stageId||!stages.some(s=>s.id===l.stageId):l.stageId===stage.id);return <section key={stage.id} className={styles.pipelineLane} aria-label={`Stage ${stage.name}`}><header><h3>{stage.name}</h3><span>{rows.length}</span></header>{rows.length?rows.map(card):<p className={styles.muted}>No matching leads</p>}</section>;}):leads.length?leads.map(card):<p>No matching leads.</p>}
  </section>;
}

export function EvidenceDetail({value}:{value?:LeadEvidence}) {
  if(!value)return <p>Evidence is unavailable. Deploy the matching CRM backend before using the intelligence view.</p>;
  return <section className={styles.evidenceDetail} aria-label="Lead evidence">
    <div className={styles.row}><h3>{value.journey}</h3><span className={styles.priority} data-priority={value.priority}>{value.priority} priority</span></div>
    <p>{value.priorityReason}</p>
    <div className={styles.score}><strong>{value.score}<small>/100</small></strong><p>{value.scoreKind}. The configured stage describes the journey; it does not prove a message, payment or trial attendance.</p></div>
    <details><summary>How this score is calculated</summary><ul>{value.reasons.map(r=><li key={r.label}><span>{r.label}</span><strong>{r.points}/{r.available}</strong></li>)}</ul><small>Fixed evidence weights · {value.method}. No pricing, eligibility or conversion decision is made by this score.</small></details>
  </section>;
}
