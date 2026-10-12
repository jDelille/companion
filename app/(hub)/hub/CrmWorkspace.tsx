'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import Link from '@/components/primitives/AppLink';
import Select from '@/components/primitives/select/Select';
import {explainHubError,type ActionFeedback} from '@/domain/hub-actions';
import styles from './page.module.css';

type Lead={id:string;name:string;contact:string;email:string;phone:string;version:number;stageId:string|null;stage:string;ownerId:string|null;owner:string;source:string;tags:{id:string;name:string}[];canEditContact:boolean};
type Task={id:string;relatedType:'lead'|'member';relatedId:string;relatedName:string;summary:string;due:string;owner:string;state:string;version:number;canComplete:boolean;feedback:string};
type Context={leads:Lead[];tasks:Task[];stages:{id:string;name:string}[];members:{id:string;name:string}[];moreLeads:boolean;moreTasks:boolean};
type Detail={lead:Lead;tasks:Task[];stages:{id:string;name:string}[];memberId:string|null;trial:{title:string;startsAt:string}|null;timeline:{id:string;action:string;actor:string;at:string}[]};
type Review={operation:string;payload:Record<string,unknown>;description:string};
type Props={busy:boolean;locked:boolean;feedback?:ActionFeedback;clearFeedback:()=>void;retry?:()=>Promise<ActionFeedback|undefined>;act:(operation:string,payload:Record<string,unknown>)=>Promise<ActionFeedback|undefined>};
async function read(operation:string,payload:Record<string,unknown>){
  const response=await fetch('/api/hub',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({operation,payload,requestKey:null}),cache:'no-store'});
  const result=await response.json();if(!response.ok)throw Error(result.error?.code||'CONNECTION_UNAVAILABLE');return result;
}
function formFields(event:FormEvent<HTMLFormElement>){event.preventDefault();return new FormData(event.currentTarget);}
function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function LeadForm({lead,disabled,review}:{lead?:Lead;disabled:boolean;review:(r:Review)=>void}){
  return <form className={styles.fields} onSubmit={e=>{
    const f=formFields(e);const values={name:String(f.get('name')||''),contact:String(f.get('contact')||''),email:String(f.get('email')||''),phone:String(f.get('phone')||'')};
    const changes=lead?Object.fromEntries(Object.entries(values).filter(([k,v])=>v!==lead[k as keyof Lead]&&(lead.canEditContact||k==='name'))):values;
    if(!Object.keys(changes).length)return;
    review({operation:lead?'update_lead':'create_lead',payload:lead?{leadId:lead.id,expectedVersion:lead.version,changes}:values,description:`${lead?'Update '+lead.name:'Create lead'}: ${Object.entries(changes).map(([k,v])=>`${k} → ${v||'(empty)'}`).join('; ')}. No stage change or customer message.`});
  }}><label>Lead title<input name="name" aria-label="Lead title" defaultValue={lead?.name||''} required maxLength={200} disabled={disabled}/></label>
    <label>Contact name<input name="contact" aria-label="Lead contact" defaultValue={lead?.contact||''} maxLength={200} disabled={disabled||!!lead&&!lead.canEditContact}/></label>
    <label>Email<input name="email" type="email" aria-label="Lead email" defaultValue={lead?.email||''} maxLength={200} disabled={disabled||!!lead&&!lead.canEditContact}/></label>
    <label>Phone<input name="phone" type="tel" aria-label="Lead phone" defaultValue={lead?.phone||''} maxLength={200} disabled={disabled||!!lead&&!lead.canEditContact}/></label>
    {lead&&!lead.canEditContact&&<p>Linked contact: edit contact details in Odoo to protect shared member/family records.</p>}
    <button disabled={disabled}>{lead?'Review lead changes':'Review new lead'}</button>
  </form>;
}
function TaskRows({tasks,disabled,review,openLead}:{tasks:Task[];disabled:boolean;review:(r:Review)=>void;openLead:(id:string)=>void}){
  return <>{tasks.length?tasks.map(t=><article key={t.id} className={styles.auditEntry} aria-label={`Task ${t.id}`}><strong>{t.summary}</strong>
    <p>{t.relatedName} · {t.owner} · Due {t.due} · {t.state}</p>
    {t.relatedType==='lead'?<button disabled={disabled} onClick={()=>openLead(t.relatedId)}>Open related lead</button>:<Link href={`/hub?memberId=${encodeURIComponent(t.relatedId)}&view=manage`}>Open related member →</Link>}
    {t.canComplete?<form className={styles.fields} onSubmit={e=>{const f=formFields(e);const feedback=String(f.get('feedback')||'');review({operation:'complete_task',payload:{taskId:t.id,expectedVersion:t.version,feedback},description:`Complete “${t.summary}” for ${t.relatedName}. Outcome: ${feedback}. Records completion only; it does not perform a stage change, send a message or charge a payment.`});}}>
      <label>Outcome<input name="feedback" aria-label={`Outcome for task ${t.id}`} required maxLength={1000} disabled={disabled}/></label><button disabled={disabled}>Review task completion</button>
    </form>:t.state==='done'?<p>Outcome: {t.feedback||'Recorded in Odoo'}</p>:<small>Managed by an Odoo workflow; review there before completing.</small>}
  </article>):<p>No tasks in this view.</p>}</>;
}

export default function CrmWorkspace({busy,locked,feedback,clearFeedback,retry,act}:Props){
  const [data,setData]=useState<Context|null>(null),[detail,setDetail]=useState<Detail|null>(null);
  const [query,setQuery]=useState(''),[search,setSearch]=useState(''),[stage,setStage]=useState(''),[owner,setOwner]=useState(''),[tag,setTag]=useState('');
  const [selected,setSelected]=useState(''),[error,setError]=useState(''),[leadError,setLeadError]=useState(''),[revision,setRevision]=useState(0);
  const [review,setReview]=useState<Review|null>(null),[taskTarget,setTaskTarget]=useState(''),[proposedStage,setProposedStage]=useState('');
  const disabled=busy||locked||!!review;
  const reviewRef=useRef<HTMLElement>(null);
  useEffect(()=>{if(review){reviewRef.current?.focus({preventScroll:true});reviewRef.current?.scrollIntoView({block:'center'});}},[review]);
  useEffect(()=>{let cancelled=false;void read('crm_context',{query:search}).then((v:Context)=>{if(!Array.isArray(v.leads)||!Array.isArray(v.tasks)||!Array.isArray(v.stages)||!Array.isArray(v.members))throw Error('CRM_DETAILS_UNAVAILABLE');if(!cancelled){setData(v);setError('');}}).catch(e=>{if(!cancelled){setData(null);setError(explainHubError(e.message));}});return()=>{cancelled=true;};},[search,revision]);
  useEffect(()=>{if(!selected)return;let cancelled=false;void read('lead_details',{leadId:selected}).then((v:Detail)=>{if(v.lead?.id!==selected||!Array.isArray(v.tasks)||!Array.isArray(v.stages)||!Array.isArray(v.timeline))throw Error('CRM_DETAILS_UNAVAILABLE');if(!cancelled){setDetail(v);setLeadError('');}}).catch(e=>{if(!cancelled){setDetail(null);setLeadError(explainHubError(e.message));}});return()=>{cancelled=true;};},[selected,revision]);
  function openLead(id:string){if(disabled)return;setDetail(null);setLeadError('');setSelected(id);setTaskTarget(`lead:${id}`);setProposedStage('');clearFeedback();}
  function prepare(r:Review){clearFeedback();setReview(r);}
  async function submit(rechecking=false){
    const outcome=await (rechecking?retry?.():review?act(review.operation,review.payload):undefined);
    if(outcome&&outcome.kind!=='uncertain'){setReview(null);if(outcome.kind==='success'){setDetail(null);setData(null);setRevision(v=>v+1);}}
  }
  const selectedDetail=detail?.lead.id===selected?detail:null;
  const visible=data?.leads.filter(l=>(!stage||l.stageId===stage)&&(!owner||l.owner===owner)&&(!tag||l.tags.some(t=>t.id===tag)))||[];
  const owners=Array.from(new Set(data?.leads.map(l=>l.owner)||[]));
  const tags=Array.from(new Map(data?.leads.flatMap(l=>l.tags.map(t=>[t.id,t] as const))||[]).values());
  return <section aria-label="CRM workspace">
    <header className={styles.row}><h2>Sales & tasks</h2><button disabled={disabled} onClick={()=>{setData(null);setDetail(null);setRevision(v=>v+1);}}>Refresh CRM</button></header>
    <p className={styles.muted}>Live Odoo records. Changes are reviewed before saving. Stage proposals create internal review tasks, not automatic customer messages.</p>
    {feedback&&<div role={feedback.kind==='error'?'alert':'status'} aria-label="CRM action result" className={styles.notice}><p>{feedback.text}</p>{feedback.refreshWarning&&<p>{feedback.refreshWarning}</p>}{feedback.kind==='uncertain'&&retry&&<button disabled={busy} onClick={()=>void submit(true)}>Check CRM action result</button>}</div>}
    {review&&<section ref={reviewRef} tabIndex={-1} role="group" aria-label="Review CRM action" className={styles.card}><h3>Review before saving</h3><p>{review.description}</p><button disabled={busy||locked} onClick={()=>void submit()}>Confirm CRM action in Odoo</button><button disabled={busy||locked} onClick={()=>setReview(null)}>Cancel review</button></section>}
    {error?<p role="alert">{error}</p>:!data?<p role="status">Loading CRM records…</p>:<>
      <details className={styles.booking}><summary>New lead</summary><LeadForm key={`new-${revision}`} disabled={disabled} review={prepare}/></details>
      <form className={styles.fields} onSubmit={e=>{e.preventDefault();setData(null);setSearch(query);setRevision(v=>v+1);}}><label>Search leads<input aria-label="Search leads" value={query} onChange={e=>setQuery(e.target.value)} maxLength={100} disabled={disabled}/></label><button disabled={disabled}>Search CRM</button></form>
      <div className={styles.crmFilters}>
        <Select ariaLabel="Filter stage" value={stage} onChange={setStage} disabled={disabled} options={[{value:'',label:'All stages'},...data.stages.map(s=>({value:s.id,label:s.name}))]}/>
        <Select ariaLabel="Filter owner" value={owner} onChange={setOwner} disabled={disabled} options={[{value:'',label:'All owners'},...owners.map(s=>({value:s,label:s}))]}/>
        <Select ariaLabel="Filter lead tag" value={tag} onChange={setTag} disabled={disabled} options={[{value:'',label:'All tags / interests'},...tags.map(s=>({value:s.id,label:s.name}))]}/>
      </div>
      <p>{visible.length} leads shown{data.moreLeads?' · Showing the latest 100 matches; narrow your search.':''}</p>
      <section aria-label="Lead pipeline">{visible.length?visible.map(l=><article key={l.id} className={styles.auditEntry}><div className={styles.row}><strong>{l.name}</strong><button disabled={disabled} onClick={()=>openLead(l.id)}>Open lead {l.name}</button></div><p>{l.stage} · {l.owner} · {l.contact||'Contact not recorded'}</p></article>):<p>No matching leads.</p>}</section>
      {selected&&<section className={styles.card} aria-label="Lead detail">{leadError?<p role="alert">{leadError}</p>:!selectedDetail?<p role="status">Loading selected lead…</p>:<>
        <h2>{selectedDetail.lead.name}</h2><p>{selectedDetail.lead.stage} · {selectedDetail.lead.owner} · Source: {selectedDetail.lead.source}</p>
        <LeadForm key={`${selectedDetail.lead.id}:${selectedDetail.lead.version}:${revision}`} lead={selectedDetail.lead} disabled={disabled} review={prepare}/>
        {selectedDetail.memberId&&<Link href={`/hub?memberId=${encodeURIComponent(selectedDetail.memberId)}&view=manage`}>Open linked member →</Link>}
        {selectedDetail.trial?<p>Linked trial: {selectedDetail.trial.title} · {new Date(selectedDetail.trial.startsAt).toLocaleString()}. Attendance must be checked on the class roster.</p>:<p>No trial session linked in Odoo. A task is not a booking.</p>}
        <details className={styles.booking}><summary>Propose a stage change</summary><form className={styles.fields} onSubmit={e=>{const f=formFields(e);const next=selectedDetail.stages.find(s=>s.id===proposedStage);if(!next)return;const reason=String(f.get('reason')||'');prepare({operation:'propose_stage',payload:{leadId:selected,expectedVersion:selectedDetail.lead.version,stageId:next.id,reason,due:String(f.get('due')||'')},description:`Create a review task for ${selectedDetail.lead.name}: ${selectedDetail.lead.stage} → ${next.name}. ${reason}. The lead stays in its current stage until reviewed in Odoo.`});}}>
          <Select ariaLabel="Proposed stage" value={proposedStage} onChange={setProposedStage} disabled={disabled} placeholder="Choose configured stage" options={selectedDetail.stages.filter(s=>s.id!==selectedDetail.lead.stageId).map(s=>({value:s.id,label:s.name}))}/>
          <label>Reason<input name="reason" required maxLength={120} disabled={disabled}/></label><label>Review due<input name="due" type="date" required defaultValue={today()} disabled={disabled}/></label><button disabled={disabled||!proposedStage}>Review stage proposal</button>
        </form></details>
        <h3>Lead tasks and outcomes</h3><TaskRows tasks={selectedDetail.tasks} disabled={disabled} review={prepare} openLead={openLead}/>
        <h3>Companion action history</h3>{selectedDetail.timeline.length?selectedDetail.timeline.map(t=><p key={t.id}>{t.action.replaceAll('_',' ')} · {t.actor} · {new Date(t.at).toLocaleString()}</p>):<p>No Companion actions yet. Earlier Odoo history remains in Odoo.</p>}
      </>}</section>}
      <section className={styles.card} aria-label="Create linked task"><h2>Next action</h2><form className={styles.fields} onSubmit={e=>{const f=formFields(e);const [relatedType,relatedId]=taskTarget.split(':');const summary=String(f.get('summary')||'');const due=String(f.get('due')||'');const target=relatedType==='lead'?(data.leads.find(l=>l.id===relatedId)||selectedDetail?.lead):data.members.find(m=>m.id===relatedId);if(!target||target.id!==relatedId)return;prepare({operation:'create_task',payload:{relatedType,relatedId,summary,due},description:`Create “${summary}” for ${target.name}, due ${due}, assigned to your account. This is an internal task only.`});}}>
        <Select ariaLabel="Task linked record" value={taskTarget} onChange={setTaskTarget} disabled={disabled} placeholder="Choose a lead or member" options={[...data.leads.map(l=>({value:`lead:${l.id}`,label:`Lead · ${l.name}`})),...(selectedDetail&&!data.leads.some(l=>l.id===selected)?[{value:`lead:${selected}`,label:`Lead · ${selectedDetail.lead.name}`}]:[]),...data.members.map(m=>({value:`member:${m.id}`,label:`Member · ${m.name}`}))]}/>
        <label>Task summary<input name="summary" aria-label="Task summary" required maxLength={200} disabled={disabled}/></label><label>Due date<input name="due" aria-label="Task due date" type="date" required defaultValue={today()} disabled={disabled}/></label><button disabled={disabled||!taskTarget}>Review new task</button>
      </form></section>
      <section className={styles.card} aria-label="Open CRM tasks"><h2>Open tasks</h2>{data.moreTasks&&<p>First 100 due tasks shown. Open the linked lead for its task history.</p>}<TaskRows tasks={data.tasks} disabled={disabled} review={prepare} openLead={openLead}/></section>
    </>}
  </section>;
}
