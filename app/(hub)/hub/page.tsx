'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import Link from 'next/link';
import styles from './page.module.css';

type Message={id:string;text:string;state:string;summary:string;reply:string;mode:string;revision:number;channel:string;guardianName:string;contactRef:string;memberId:string|null;sessionId:string|null};
type Context={principal:{name:string;role:string};members:{id:string;name:string}[];sessions:{id:string;title:string;startsAt:string;future:boolean;version:number}[];messages:Message[];
  deliveries:{id:string;messageId:string;state:string;providerRef:string|null;approvedBy:string}[];
  capabilities:{outbound:string;inbound:string;ai:string};timeline:{id:string;memberId:string;action:string;actor:string;at:string}[]};
type Action=(operation:string,payload:Record<string,unknown>)=>Promise<void>;

async function call(body:Record<string,unknown>){
  const response=await fetch('/api/hub',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),cache:'no-store'});
  const value=await response.json();
  if(!response.ok)throw Error(value.error?.code || 'CONNECTION_UNAVAILABLE');
  return value;
}
const explain=(code:string)=>({HUB_NOT_CONFIGURED:'The hub connection has not been configured on this deployment.',SIGN_IN_REQUIRED:'Sign in with your Odoo account.',SIGN_IN_FAILED_OR_MFA_REQUIRED:'Sign-in failed. Check your credentials. This hub login does not yet support accounts requiring MFA.',NO_SITE_ACCESS:'This account has not been granted access to this site.',PROVIDER_NOT_CONFIGURED:'Messaging is not configured. Your draft remains saved.',GUARDIAN_REVIEW_REQUIRED:'A manager must verify this sender’s guardian authority before continuing.',VERSION_CONFLICT:'This record changed. Refresh and review it again.',BUSINESS_RULE_REVIEW_REQUIRED:'Odoo could not approve this change. Review the subscription, credits, class roster and available places.',BACKEND_UNAVAILABLE_RETRY_SAME_ACTION:'The result could not be confirmed. Retry the same action before starting another.'}[code] || code.replaceAll('_',' ').toLowerCase());

function MessageCard({message,data,act,busy}:{message:Message;data:Context;act:Action;busy:boolean}){
  const [memberId,setMember]=useState(message.memberId || '');
  const [sessionId,setSession]=useState(message.sessionId || '');
  const [reply,setReply]=useState(message.reply);
  const [targetId,setTarget]=useState('');
  const [bookingType,setBookingType]=useState('book');
  const [reviewBooking,setReviewBooking]=useState(false);
  const target=data.sessions.find(s=>s.id===targetId);
  const delivery=data.deliveries.find(d=>d.messageId===message.id);
  const canAct=['owner','manager','instructor'].includes(data.principal.role);
  return <article className={styles.card}>
    <div className={styles.row}><strong>{data.members.find(m=>m.id===message.memberId)?.name || 'Needs student and class review'}</strong><span>{message.channel}</span></div>
    <p className={styles.quote}>{message.text}</p>
    {message.state!=='resolved' && canAct && <div className={styles.fields}>
      <label>Student<select aria-label={`Student for message ${message.id}`} value={memberId} onChange={e=>setMember(e.target.value)}><option value="">Select student</option>{data.members.map(m=><option value={m.id} key={m.id}>{m.name}</option>)}</select></label>
      <label>Class<select aria-label={`Class for message ${message.id}`} value={sessionId} onChange={e=>setSession(e.target.value)}><option value="">Select class</option>{data.sessions.map(s=><option value={s.id} key={s.id}>{s.title} · {new Date(s.startsAt).toLocaleString()}</option>)}</select></label>
      <button disabled={busy||!memberId||!sessionId} onClick={()=>void act('resolve',{messageId:message.id,memberId,sessionId,expectedRevision:message.revision})}>Confirm student and class</button>
      {message.state==='unmatched'&&<p>This sender needs a verified guardian binding before this can be confirmed.</p>}
    </div>}
    {message.state==='resolved' && <>
      {message.summary && <><h3>Instructor summary</h3><p>{message.summary}</p><small>{message.mode}</small></>}
      {!delivery && canAct && <>
        <button disabled={busy} onClick={()=>void act('draft',{messageId:message.id,expectedRevision:message.revision})}>{message.reply?'Regenerate draft':'Prepare follow-up'}</button>
        {message.reply && <div className={styles.fields}><label>Review reply<textarea aria-label="Review reply" maxLength={1500} value={reply} onChange={e=>setReply(e.target.value)}/></label>
          <p>Recipient: {message.guardianName || 'Verified guardian'} · {message.channel} contact {message.contactRef}. This sends a reply on the verified channel. No booking or attendance change is included.</p>
          <button disabled={busy||!reply.trim()||data.capabilities.outbound==='not_configured'} onClick={()=>void act('approve_reply',{messageId:message.id,expectedRevision:message.revision,reply})}>Approve and queue reply</button>
          {data.capabilities.outbound==='not_configured'&&<small>Messaging must be configured before a reply can be queued.</small>}
        </div>}
      </>}
      {canAct&&<details className={styles.booking}><summary>Book or change a class</summary><div className={styles.fields}>
        <p>Review a future class for this student. Odoo checks the subscription, credits, roster and capacity when you confirm. Existing charges and cancellation rules apply.</p>
        <label>Booking action<select value={bookingType} disabled={busy} onChange={e=>{setBookingType(e.target.value);setReviewBooking(false);}}><option value="book">Add a class registration</option><option value="change_class">Replace the original registration</option></select></label>
        <label>Target class<select aria-label="Target class" value={targetId} disabled={busy} onChange={e=>{setTarget(e.target.value);setReviewBooking(false);}}><option value="">Select future class</option>{data.sessions.filter(s=>s.future&&s.id!==message.sessionId).map(s=><option key={s.id} value={s.id}>{s.title} · {new Date(s.startsAt).toLocaleString()}</option>)}</select></label>
        {!reviewBooking?<button disabled={busy||!target} onClick={()=>setReviewBooking(true)}>Review class change</button>:<>
          <p><strong>{data.members.find(m=>m.id===message.memberId)?.name}</strong>: {bookingType==='book'?'add a registration for':'replace the original class with'} <strong>{target?.title}</strong> on {target&&new Date(target.startsAt).toLocaleString()}. This records the booking in Odoo; it does not send a message.</p>
          <button disabled={busy||!target} onClick={()=>{if(target)void act(bookingType,{memberId:message.memberId,sessionId:target.id,expectedVersion:target.version,...(bookingType==='change_class'?{fromSessionId:message.sessionId}:{})});}}>Confirm booking in Odoo</button>
        </>}
      </div></details>}
    </>}
    {delivery&&<p role="status"><strong>Reply {delivery.state}.</strong> Approved by {delivery.approvedBy}.{delivery.state==='accepted'?' Provider accepted it; delivery is not yet confirmed.':''}{delivery.providerRef?` Receipt: ${delivery.providerRef}`:''}</p>}
  </article>;
}

export default function Hub(){
  const [data,setData]=useState<Context|null>(null),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[hasPending,setHasPending]=useState(false);
  const pending=useRef<{operation:string;payload:Record<string,unknown>;requestKey:string}|null>(null);
  const refresh=async()=>{const value=await call({operation:'context',payload:{},requestKey:null});setData(value);};
  useEffect(()=>{let cancelled=false;void call({operation:'context',payload:{},requestKey:null}).then(v=>{if(!cancelled)setData(v);}).catch(()=>{});return()=>{cancelled=true;};},[]);
  async function login(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget);setBusy(true);setNotice('');
    try{setData(await call({operation:'login',login:form.get('login'),password:form.get('password')}));}catch(e){setNotice(explain((e as Error).message));}finally{setBusy(false);}}
  const act:Action=async(operation,payload)=>{
    if(pending.current && JSON.stringify([operation,payload])!==JSON.stringify([pending.current.operation,pending.current.payload])){setNotice('Retry the unconfirmed action before starting another.');return;}
    pending.current ||= {operation,payload,requestKey:crypto.randomUUID()};setHasPending(true);setBusy(true);setNotice('');
    try{const result=await call(pending.current);pending.current=null;setHasPending(false);await refresh();setNotice(result.enrollmentId?`Registration saved in Odoo. Receipt: ${result.enrollmentId}.`:'Saved in Odoo.');}
    catch(e){const code=(e as Error).message;if(code!=='BACKEND_UNAVAILABLE_RETRY_SAME_ACTION'){pending.current=null;setHasPending(false);}setNotice(explain(code));}
    finally{setBusy(false);}
  };
  return <main className={styles.root}><header className={styles.header}><div><small>ROSTER</small><h1>Follow-up hub</h1></div><Link href="/ops">Class workspace</Link></header>
    {notice&&<p className={styles.notice} role="status">{notice}</p>}
    {!data?<section className={styles.card}><h2>Sign in to your school</h2><p>Use your individual Odoo account with Companion site access.</p><form onSubmit={login} className={styles.fields}><label>Login<input name="login" autoComplete="username" required/></label><label>Password<input name="password" type="password" autoComplete="current-password" required/></label><button disabled={busy}>{busy?'Signing in…':'Sign in'}</button></form></section>:<>
      <div className={styles.row}><p>{data.principal.name} · {data.principal.role}</p><div className={styles.row}><button disabled={busy} onClick={()=>void refresh().catch(e=>setNotice(explain(e.message)))}>Refresh</button><button disabled={busy} onClick={()=>void call({operation:'logout'}).then(()=>{setData(null);pending.current=null;setHasPending(false);}).catch(e=>setNotice(explain(e.message)))}>Sign out</button></div></div>
      <p className={styles.muted}>{data.capabilities.outbound==='not_configured'?'Outbound messaging is not configured. Drafts can still be reviewed.':'Replies require your review and approval before entering the delivery queue.'}</p>
      {hasPending&&<button disabled={busy} onClick={()=>{const p=pending.current;if(p)void act(p.operation,p.payload);}}>Retry unconfirmed action</button>}
      <section aria-label="Parent messages">{data.messages.length?data.messages.map(m=><MessageCard key={`${m.id}:${m.revision}`} message={m} data={data} act={act} busy={busy}/>):<article className={styles.card}><h2>No messages to review</h2><p>Messages appear here when received through your configured channel and within your assigned scope.</p></article>}</section>
      <section className={styles.card}><h2>Recent actions</h2>{data.timeline.length?data.timeline.map(t=><p key={t.id}>{data.members.find(m=>m.id===t.memberId)?.name} · {t.action.replaceAll('_',' ')} · {t.actor} · {new Date(t.at).toLocaleString()}</p>):<p>No recorded actions yet.</p>}</section>
    </>}
  </main>;
}
