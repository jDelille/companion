'use client';

import {useEffect,useRef,useState} from 'react';
import {explainHubError,type ActionFeedback} from '@/domain/hub-actions';
import {PersonName} from '@/components/primitives/avatar/Avatar';
import styles from './page.module.css';
import intakeStyles from './intake.module.css';

type Audience={id:string;label:string};
type Broadcast={id:string;name:string;channel:string;purpose:string;audience:string;state:string;createdBy:string;approvedBy:string|null;approvedAt:string|null;scheduledAt:string|null;counts:Record<string,number>;version:number;body:string};
type Context={audiences:Audience[];provider:string;quietHours:{start:number;end:number;timeZone:string};broadcasts:Broadcast[]};
type Preview={audience:string;recipientCount:number;excludedCounts:Record<string,number>;sample:{name:string;address:string;students:number}[];excludedSample:{name:string;reason:string}[];quietHoursStart:string|null;provider:string;reviewToken:string};
type Channel={channel:string;address:string|null;nativeOptOut:boolean;service:string|null;marketing:string|null};
type Contact={partnerId:string;name:string;student:boolean;channels:Channel[];history:{channel:string;purpose:string;state:string;source:string;evidence:string;by:string;at:string}[]};
type Automation={id:string;kind:string;name:string;module:string;active:boolean;trigger:string;model:string;nextRun?:string|null;sendsMessages:boolean|null;version:number};
type Review={operation:string;payload:Record<string,unknown>;lines:string[]};
type Props={members:{id:string;name:string}[];busy:boolean;locked:boolean;feedback?:ActionFeedback;clearFeedback:()=>void;
  retry?:()=>Promise<ActionFeedback|undefined>;act:(operation:string,payload:Record<string,unknown>)=>Promise<ActionFeedback|undefined>};
const REASONS:Record<string,string>={no_contact:'No address for this channel',opted_out:'Opted out',no_marketing_consent:'No marketing consent',consent_or_contact_changed:'Consent or contact changed before approval',cancelled:'Cancelled'};
const AUTOMATIONS_SHOWN=5; // how many automations show before "Show all"
const PROVIDER:Record<string,string>={not_configured:'No messaging provider is connected. Approved messages stay queued and nothing is sent.',configured_not_exercised:'A provider is configured but not yet proven. Messages count as sent only when the provider confirms.'};
async function read(operation:string,payload:Record<string,unknown>){
  const response=await fetch('/api/hub',{method:'POST',cache:'no-store',headers:{'content-type':'application/json'},body:JSON.stringify({operation,payload,requestKey:null})});
  const value=await response.json();
  if(!response.ok)throw Error(value.error?.code||'CONNECTION_UNAVAILABLE');
  return value;
}

export default function CommunicationsWorkspace({members,busy,locked,feedback,clearFeedback,retry,act}:Props){
  const [context,setContext]=useState<Context|null>(null),[error,setError]=useState(''),[reload,setReload]=useState(0);
  const [draft,setDraft]=useState({name:'',channel:'sms',purpose:'service',audience:'',body:''}),[preview,setPreview]=useState<Preview|null>(null),[reason,setReason]=useState('');
  const [reasons,setReasons]=useState<Record<string,string>>({});
  const [memberId,setMemberId]=useState(''),[contacts,setContacts]=useState<Contact[]|null>(null),[consent,setConsent]=useState<Record<string,{channel:string;purpose:string;state:string;source:string;evidence:string}>>({});
  const [automations,setAutomations]=useState<{automations:Automation[];canManage:boolean}|null>(null);
  // Show the first few automations; the rest open with "Show all"
  const [showAllAutomations,setShowAllAutomations]=useState(false);
  const [review,setReview]=useState<Review|null>(null),[confirmed,setConfirmed]=useState(false);
  const inFlight=useRef(false),reviewRef=useRef<HTMLDivElement>(null);
  const blocked=busy||locked;
  useEffect(()=>{let cancelled=false;
    void read('broadcast_context',{}).then(v=>{if(!cancelled){setContext(v);setError('');}}).catch(e=>{if(!cancelled)setError(explainHubError(e.message));});
    void read('automation_overview',{}).then(v=>{if(!cancelled)setAutomations(v);}).catch(()=>{});
    return()=>{cancelled=true;};},[reload]);
  useEffect(()=>{
    if(!memberId)return;
    let cancelled=false;
    void read('consent_overview',{memberId}).then(v=>{if(!cancelled)setContacts(v.contacts);}).catch(e=>{if(!cancelled)setError(explainHubError(e.message));});
    return()=>{cancelled=true;};
  },[memberId,reload]);
  useEffect(()=>{if(review||feedback)reviewRef.current?.focus();},[review,feedback]);
  const open=(r:Review)=>{clearFeedback();setConfirmed(false);setReview(r);};
  const after=(result?:ActionFeedback)=>{
    if(result?.kind==='success'||result?.kind==='error'){setReview(null);setConfirmed(false);setReload(n=>n+1);}
    if(result?.kind==='success'){setPreview(null);setReason('');setReasons({});}
  };
  async function confirm(){
    if(!review||!confirmed||blocked||inFlight.current)return;
    inFlight.current=true;
    try{after(await act(review.operation,review.payload));}finally{inFlight.current=false;}
  }
  async function loadPreview(){
    try{setPreview(await read('broadcast_preview',{channel:draft.channel,purpose:draft.purpose,audience:draft.audience,body:draft.body}));setError('');}
    catch(e){setPreview(null);setError(explainHubError((e as Error).message));}
  }
  const setDraftField=(field:string,value:string)=>{setDraft(d=>({...d,[field]:value}));setPreview(null);};
  const form=(id:string)=>consent[id]||{channel:'sms',purpose:'marketing',state:'granted',source:'paper_form',evidence:''};
  return <section aria-label="Messaging and consent">
    <div className={styles.card}><h2>Messages, consent and automations.</h2><p>Broadcasts are reviewed, frozen to a consented audience and approved before anything is queued. Consent is recorded with its source and kept as history.</p>
      {context&&<div className={styles.warningBox} role="status"><i aria-hidden="true">!</i><div>
        {/* The provider sentence is the title; the rest and the quiet hours go under it */}
        <strong>{PROVIDER[context.provider].split('. ')[0].replace(/\.$/,'')}</strong>
        <p>{PROVIDER[context.provider].split('. ').slice(1).join('. ')} Quiet hours {context.quietHours.start}:00–{context.quietHours.end}:00 ({context.quietHours.timeZone}): approvals inside them are scheduled for {context.quietHours.end}:00.</p>
      </div></div>}</div>
    {error&&<p role="alert" className={styles.card}>{error}</p>}
    <div className={styles.card} role="region" aria-label="Broadcast">
      <h2>New broadcast</h2>
      {!context?<p role="status">Loading…</p>:<div className={styles.fields}>
        <label>Broadcast name<input aria-label="Broadcast name" value={draft.name} maxLength={120} disabled={blocked} onChange={e=>setDraftField('name',e.target.value)}/></label>
        <label>Channel<select aria-label="Channel" value={draft.channel} disabled={blocked} onChange={e=>setDraftField('channel',e.target.value)}><option value="sms">SMS</option><option value="email">Email</option></select></label>
        <label>Purpose<select aria-label="Purpose" value={draft.purpose} disabled={blocked} onChange={e=>setDraftField('purpose',e.target.value)}><option value="service">Service notice (classes, closures)</option><option value="marketing">Marketing (needs consent)</option></select></label>
        <label>Audience<select aria-label="Audience" value={draft.audience} disabled={blocked} onChange={e=>setDraftField('audience',e.target.value)}><option value="">Choose</option>{context.audiences.map(a=><option key={a.id} value={a.id}>{a.label}</option>)}</select></label>
        <label>Message<textarea aria-label="Message" value={draft.body} maxLength={draft.channel==='email'?5000:1000} disabled={blocked} onChange={e=>setDraftField('body',e.target.value)}/></label>
        <small className={styles.charCount}>{draft.body.length} characters</small>
        <div className={styles.formActions}>
          <button disabled={blocked||!draft.audience||!draft.body.trim()} onClick={()=>void loadPreview()}>Preview audience</button>
          {(!draft.audience||!draft.body.trim())&&<p>Add an audience and message to preview.</p>}
        </div>
      </div>}
      {preview&&<div role="region" aria-label="Broadcast preview">
        <p>{preview.recipientCount} recipients in {preview.audience}.</p>
        {Object.entries(preview.excludedCounts).map(([k,v])=><p key={k}>{v} excluded: {REASONS[k]||k}</p>)}
        {preview.sample.map((s,i)=><p key={i} className={styles.muted}>{s.name} · {s.address}{s.students>1?` · ${s.students} students`:''}</p>)}
        {preview.quietHoursStart&&<p>It is quiet hours now; if approved now it is scheduled for {new Date(preview.quietHoursStart).toLocaleString()}.</p>}
        <label>Reason for this broadcast<input aria-label="Reason for this broadcast" value={reason} maxLength={500} disabled={blocked} onChange={e=>setReason(e.target.value)}/></label>
        <button disabled={blocked||!preview.recipientCount||!reason.trim()||!draft.name.trim()} onClick={()=>open({operation:'create_broadcast',
          payload:{channel:draft.channel,purpose:draft.purpose,audience:draft.audience,body:draft.body,name:draft.name.trim(),reason:reason.trim(),reviewToken:preview.reviewToken},
          lines:[`${draft.name.trim()}: ${draft.channel.toUpperCase()} ${draft.purpose} to ${preview.recipientCount} recipients in ${preview.audience}.`,`“${draft.body.trim()}”`,'Saves the frozen recipient list for approval. Nothing is queued or sent yet.']})}>Review broadcast</button>
      </div>}
      {context?.broadcasts.map(b=><div key={b.id} className={styles.auditEntry} role="group" aria-label={`Broadcast ${b.name}`}>
        <strong>{b.name} · {b.state.replace('_',' ')}</strong>
        <p>{b.channel.toUpperCase()} {b.purpose} · {b.audience} · by {b.createdBy}{b.approvedBy?` · approved by ${b.approvedBy}`:''}{b.scheduledAt?` · scheduled ${new Date(b.scheduledAt).toLocaleString()}`:''}</p>
        <p>{Object.entries(b.counts).map(([k,v])=>`${v} ${k}`).join(' · ')}</p>
        {b.state!=='cancelled'&&<div className={styles.row}>
          <label>Reason<input aria-label={`Reason for ${b.name}`} value={reasons[b.id]||''} maxLength={500} disabled={blocked} onChange={e=>setReasons(r=>({...r,[b.id]:e.target.value}))}/></label>
          {b.state==='awaiting_approval'&&<button disabled={blocked||!(reasons[b.id]||'').trim()} onClick={()=>open({operation:'approve_broadcast',payload:{broadcastId:b.id,expectedVersion:b.version,reason:(reasons[b.id]||'').trim()},
            lines:[`Approve ${b.name} to ${b.counts.queued||0} recipients.`,`“${b.body}”`,'Consent and contacts are checked again now. Messages are queued for the provider; they count as sent only when the provider confirms.']})}>Review approval</button>}
          <button disabled={blocked||!(reasons[b.id]||'').trim()} onClick={()=>open({operation:'cancel_broadcast',payload:{broadcastId:b.id,expectedVersion:b.version,reason:(reasons[b.id]||'').trim()},
            lines:[`Cancel ${b.name}. Queued recipients are removed; nothing is sent.`]})}>Review cancellation</button>
        </div>}
      </div>)}
    </div>
    <div className={styles.card} role="region" aria-label="Consent">
      <h2>Consent</h2>
      <label className={styles.fields}>Student<select aria-label="Student for consent" value={memberId} disabled={blocked} onChange={e=>{setMemberId(e.target.value);setContacts(null);}}>
        <option value="">Choose a student</option>{members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
      {contacts?.map(c=>{const f=form(c.partnerId);const set=(k:string,v:string)=>setConsent(s=>({...s,[c.partnerId]:{...f,[k]:v}}));return <div key={c.partnerId} className={styles.consentContact} role="group" aria-label={`Consent for ${c.name}`}>
        {/* Who: avatar + name (+ Student) */}
        <div className={styles.consentHead}><PersonName name={c.name} size="medium"/>{c.student&&<span className={styles.statusPill}>Student</span>}</div>
        {/* One line per channel: name · address · service and marketing consent */}
        <ul className={styles.consentChannels}>{c.channels.map(ch=><li key={ch.channel}>
          <span className={styles.channelName}>{ch.channel.toUpperCase()}</span>
          <span className={styles.channelAddress}>{ch.address||'No address'}</span>
          <span className={styles.statusPill} data-status={ch.service||'none'}>Service: {ch.service||'not recorded'}</span>
          <span className={styles.statusPill} data-status={ch.marketing||'none'}>Marketing: {ch.marketing||'not recorded'}</span>
          {ch.nativeOptOut&&<span className={styles.statusPill}>Opted out in Odoo</span>}
        </li>)}</ul>
        {c.history.length>0&&<div className={styles.consentHistory}><small className={styles.consentLabel}>History</small>{c.history.map((h,i)=><small key={i}>{h.by} recorded {h.channel} {h.purpose} {h.state} ({h.source}) · {new Date(h.at).toLocaleString()} · {h.evidence}</small>)}</div>}
        <div className={`${styles.row} ${styles.consentForm}`}>
          <label>Channel<select aria-label={`Consent channel for ${c.name}`} value={f.channel} disabled={blocked} onChange={e=>set('channel',e.target.value)}><option value="sms">SMS</option><option value="email">Email</option><option value="whatsapp">WhatsApp</option></select></label>
          <label>Purpose<select aria-label={`Consent purpose for ${c.name}`} value={f.purpose} disabled={blocked} onChange={e=>set('purpose',e.target.value)}><option value="marketing">Marketing</option><option value="service">Service notices</option></select></label>
          <label>Decision<select aria-label={`Consent decision for ${c.name}`} value={f.state} disabled={blocked} onChange={e=>set('state',e.target.value)}><option value="granted">Granted</option><option value="withdrawn">Withdrawn</option></select></label>
          <label>Source<select aria-label={`Consent source for ${c.name}`} value={f.source} disabled={blocked} onChange={e=>set('source',e.target.value)}><option value="paper_form">Paper form</option><option value="in_person">In person</option><option value="web_form">Web form</option><option value="verbal">Verbal</option><option value="reply_stop">Replied STOP</option></select></label>
          <label>Evidence<input aria-label={`Consent evidence for ${c.name}`} value={f.evidence} maxLength={500} disabled={blocked} onChange={e=>set('evidence',e.target.value)}/></label>
          <button disabled={blocked||!f.evidence.trim()} onClick={()=>open({operation:'record_consent',payload:{memberId,partnerId:c.partnerId,channel:f.channel,purpose:f.purpose,state:f.state,source:f.source,evidence:f.evidence.trim()},
            lines:[`${c.name}: ${f.channel.toUpperCase()} ${f.purpose} consent ${f.state} (${f.source.replace('_',' ')}).`,`Evidence: ${f.evidence.trim()}`,f.purpose==='marketing'?'Marketing consent also updates Odoo’s native opt-out list for this address.':'Service consent applies to Companion broadcasts.','No message is sent.']})}>Review consent change</button>
        </div>
      </div>;})}
    </div>
    <div className={styles.card} role="region" aria-label="Automations">
      <h2>Automations</h2>
      <p className={styles.muted}>Native Odoo rules and scheduled jobs from the dojo modules. Pausing stops them from running until resumed. Only an owner can pause or resume.</p>
      {automations?.automations.slice(0,showAllAutomations?undefined:AUTOMATIONS_SHOWN).map(a=><div key={a.id} className={`${styles.auditEntry} ${styles.automationRow}`} role="group" aria-label={`Automation ${a.name}`}>
        {/* Name + Running/Paused, detail chips under it, next run on the right */}
        <div>
          <div className={styles.automationTitle}><strong>{a.name}</strong><span className={styles.statusPill} data-status={a.active?'running':'paused'}>{a.active?'Running':'Paused'}</span></div>
          <ul className={styles.chips} aria-label="Details"><li>{a.kind}</li><li>{a.module}</li><li>{a.model}</li><li>{a.trigger}</li>{a.sendsMessages&&<li>Sends messages</li>}</ul>
        </div>
        {a.nextRun&&<div className={styles.nextRun}><small>Next</small><span>{new Date(a.nextRun).toLocaleString()}</span></div>}
        {automations.canManage&&<div className={styles.row}>
          <label>Reason<input aria-label={`Reason for ${a.name}`} value={reasons[a.id]||''} maxLength={500} disabled={blocked} onChange={e=>setReasons(r=>({...r,[a.id]:e.target.value}))}/></label>
          <button disabled={blocked||!(reasons[a.id]||'').trim()} onClick={()=>open({operation:'set_automation_active',payload:{automationId:a.id,active:!a.active,expectedVersion:a.version,reason:(reasons[a.id]||'').trim()},
            lines:[`${a.active?'Pause':'Resume'} ${a.name}.`,a.active?'It will not run until an owner resumes it.':'It will run again on its native trigger.']})}>{a.active?'Review pause':'Review resume'}</button>
        </div>}
      </div>)}
      {automations&&automations.automations.length>AUTOMATIONS_SHOWN&&<button className={styles.showAll} aria-expanded={showAllAutomations} onClick={()=>setShowAllAutomations(v=>!v)}>{showAllAutomations?'Show fewer':`Show all ${automations.automations.length} automations`}</button>}
    </div>
    <div ref={reviewRef} tabIndex={-1} className={intakeStyles.result}>
      {review&&<div className={styles.card} aria-label="Review communications action"><h2>Review before saving</h2>
        {review.lines.map((l,i)=><p key={i}>{l}</p>)}
        <label className={intakeStyles.confirm}><input type="checkbox" checked={confirmed} disabled={blocked} onChange={e=>setConfirmed(e.target.checked)}/>I reviewed this action.</label>
        <div className={styles.row}><button disabled={blocked||!confirmed} onClick={()=>void confirm()}>{busy?'Saving…':'Confirm communications action in Odoo'}</button><button disabled={blocked} onClick={()=>setReview(null)}>Cancel</button></div>
      </div>}
      {feedback&&<div className={styles.card} role={feedback.kind==='error'?'alert':'status'} aria-label="Communications result"><p>{feedback.text}</p>{feedback.kind==='uncertain'&&retry&&<button disabled={busy} onClick={()=>void retry().then(after)}>Check communications result</button>}</div>}
    </div>
  </section>;
}
