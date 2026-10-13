'use client';
import {Suspense,useEffect,useRef,useState,type FormEvent} from 'react';
import {useSearchParams} from 'next/navigation';
import Link from '@/components/primitives/AppLink';
import {explainHubError as explain, replacementBlockReason, runHubAction, type ActionFeedback} from '@/domain/hub-actions';
import styles from './page.module.css';
import Select from '@/components/primitives/select/Select';
import MemberBooking from './MemberBooking';
import MemberManagement from './MemberManagement';
import CrmWorkspace from './CrmWorkspace';
import AiSettings from './AiSettings';
import InstructorWorkspace from './InstructorWorkspace';
import OperationsWorkspace from './OperationsWorkspace';
import StudentIntake from './StudentIntake';
import CourseAssignments from './CourseAssignments';
import AttendanceWorkspace from './AttendanceWorkspace';
import ArchivedMembers from './ArchivedMembers';
import {useWorkspaceActions} from '@/components/workspace/WorkspaceActions';
import {SelectMember} from '@/components/shell/selected-member/selectedMember';

type Message={id:string;text:string;state:string;summary:string;reply:string;mode:string;revision:number;channel:string;guardianName:string;contactRef:string;memberId:string|null;sessionId:string|null};
type Context={principal:{name:string;role:string};members:{id:string;name:string}[];sessions:{id:string;title:string;startsAt:string;future:boolean;version:number}[];messages:Message[];
  deliveries:{id:string;messageId:string;state:string;providerRef:string|null;approvedBy:string}[];
  capabilities:{outbound:string;inbound:string;ai:string};timeline:{id:string;memberId:string;action:string;actor:string;at:string;
    booking?:{enrollmentId:string;classTitle:string;startsAt:string;state:string;attendanceState:string}|null}[]};
type Action=(operation:string,payload:Record<string,unknown>,messageId?:string)=>Promise<ActionFeedback|undefined>;

async function call(body:Record<string,unknown>){
  const response=await fetch(body.operation==='update_member_photo'?'/api/hub/photo':'/api/hub',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),cache:'no-store'});
  const value=await response.json();
  if(!response.ok)throw Error(value.error?.code || 'CONNECTION_UNAVAILABLE');
  return value;
}
function MessageCard({message,data,act,busy,locked,now,feedback,clearFeedback,retry}:{message:Message;data:Context;act:Action;busy:boolean;locked:boolean;now:number;feedback?:ActionFeedback;clearFeedback:()=>void;retry?:()=>void}){
  const [memberId,setMember]=useState(message.memberId || '');
  const [sessionId,setSession]=useState(message.sessionId || '');
  const [reply,setReply]=useState(message.reply);
  const [targetId,setTarget]=useState('');
  const [bookingType,setBookingType]=useState('book');
  const [reviewBooking,setReviewBooking]=useState(false);
  const resultRef=useRef<HTMLDivElement>(null);
  const target=data.sessions.find(s=>s.id===targetId&&s.future&&Date.parse(s.startsAt)>now);
  const original=data.sessions.find(s=>s.id===message.sessionId);
  const replacementReason=replacementBlockReason(original,now);
  const bookingBlocked=bookingType==='change_class'&&!!replacementReason;
  const booked=feedback?.kind==='success';
  const delivery=data.deliveries.find(d=>d.messageId===message.id);
  const canAct=['owner','manager','instructor'].includes(data.principal.role);
  useEffect(()=>{if(feedback){resultRef.current?.focus({preventScroll:true});resultRef.current?.scrollIntoView({block:'nearest'});}},[feedback]);
  return <article className={styles.card}>
    <div className={styles.row}><strong>{data.members.find(m=>m.id===message.memberId)?.name || 'Needs student and class review'}</strong><span>{message.channel}</span></div>
    <p className={styles.quote}>{message.text}</p>
    {message.state!=='resolved' && canAct && <div className={styles.fields}>
      <label>Student<Select ariaLabel={`Student for message ${message.id}`} value={memberId} onChange={setMember} placeholder="Select student" options={data.members.map(m=>({value:m.id,label:m.name}))}/></label>
      <label>Class<Select ariaLabel={`Class for message ${message.id}`} value={sessionId} onChange={setSession} placeholder="Select class" options={data.sessions.map(s=>({value:s.id,label:`${s.title} · ${new Date(s.startsAt).toLocaleString()}`}))}/></label>
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
        <label>Booking action<Select ariaLabel="Booking action" ariaDescribedBy={replacementReason?`replacement-reason-${message.id}`:undefined} value={bookingType} disabled={busy||locked} onChange={value=>{setBookingType(value);setReviewBooking(false);clearFeedback();}} options={[{value:'book',label:'Add a class registration'},{value:'change_class',label:'Replace the original registration',disabled:!!replacementReason}]}/></label>
        {replacementReason&&<p id={`replacement-reason-${message.id}`} className={styles.bookingHelp}>{replacementReason}</p>}
        <label>Target class<Select ariaLabel="Target class" value={targetId} disabled={busy||locked} onChange={value=>{setTarget(value);setReviewBooking(false);clearFeedback();}} placeholder="Select future class" options={data.sessions.filter(s=>s.future&&Date.parse(s.startsAt)>now&&s.id!==message.sessionId).map(s=>({value:s.id,label:`${s.title} · ${new Date(s.startsAt).toLocaleString()}`}))}/></label>
        {!reviewBooking?<button disabled={busy||locked||!target||bookingBlocked||booked} onClick={()=>setReviewBooking(true)}>Review class change</button>:<>
          <p><strong>{data.members.find(m=>m.id===message.memberId)?.name}</strong>: {bookingType==='book'?'add a registration for':'replace the original class with'} <strong>{target?.title}</strong> on {target&&new Date(target.startsAt).toLocaleString()}. This records the booking in Odoo; it does not send a message.</p>
          <button disabled={busy||locked||!target||bookingBlocked||booked} onClick={()=>{if(target)void act(bookingType,{memberId:message.memberId,sessionId:target.id,expectedVersion:target.version,...(bookingType==='change_class'?{fromSessionId:message.sessionId}:{})},message.id);}}>{booked?'Booking saved':busy&&locked?'Saving booking…':'Confirm booking in Odoo'}</button>
        </>}
      </div></details>}
      {feedback&&<div ref={resultRef} tabIndex={-1} role={feedback.kind==='error'?'alert':'status'} aria-label={`Booking result for message ${message.id}`} className={`${styles.bookingResult} ${feedback.kind==='success'?styles.bookingSuccess:styles.bookingAttention}`}>
        <p>{feedback.text}</p>{feedback.refreshWarning&&<p>{feedback.refreshWarning}</p>}
        {feedback.kind==='uncertain'&&retry&&<button disabled={busy} onClick={retry}>Check booking result</button>}
      </div>}
    </>}
    {delivery&&<p role="status"><strong>Reply {delivery.state}.</strong> Approved by {delivery.approvedBy}.{delivery.state==='accepted'?' Provider accepted it; delivery is not yet confirmed.':''}{delivery.providerRef?` Receipt: ${delivery.providerRef}`:''}</p>}
  </article>;
}

function HubContent(){
  const searchParams=useSearchParams();
  const selectedMemberId=searchParams.get('memberId');
  const view=searchParams.get('view') || (selectedMemberId?'book':'messages');
  const managing=view==='manage';
  const messages=view==='messages';
  const crm=searchParams.get('view')==='crm';
  const ai=searchParams.get('view')==='ai';
  const instructor=view==='instructor';
  const operations=view==='operations';
  const intake=view==='intake';
  const courses=view==='courses';
  const attendance=view==='attendance';
  const archived=view==='archived';
  const [memberChoice,setMemberChoice]=useState('');
  const [loading,setLoading]=useState(true);
  const [data,setData]=useState<Context|null>(null),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
  const {pending,hasPending,setPending}=useWorkspaceActions();
  const [bookingFeedback,setBookingFeedback]=useState<Record<string,ActionFeedback>>({});
  const pendingMessageId=pending.current?.messageId;
  const [now,setNow]=useState(Date.now);
  const inFlight=useRef(false);
  const refresh=async()=>{const value=await call({operation:'context',payload:{},requestKey:null});setData(value);};
  useEffect(()=>{let cancelled=false;void call({operation:'context',payload:{},requestKey:null}).then(v=>{if(!cancelled)setData(v);}).catch(error=>{if(!cancelled&&error.message!=='SIGN_IN_REQUIRED')setNotice(explain(error.message));}).finally(()=>{if(!cancelled)setLoading(false);});return()=>{cancelled=true;};},[]);
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(timer);},[]);
  async function login(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget);setBusy(true);setNotice('');
    try{setData(await call({operation:'login',login:form.get('login'),password:form.get('password')}));}catch(e){setNotice(explain((e as Error).message));}finally{setBusy(false);}}
  const clearBookingFeedback=(id:string)=>setBookingFeedback(previous=>{const next={...previous};delete next[id];return next;});
  const act:Action=async(operation,payload,messageId)=>{
    if(inFlight.current)return;
    const show=(feedback:ActionFeedback)=>{if(messageId)setBookingFeedback(previous=>({...previous,[messageId]:feedback}));else setNotice([feedback.text,feedback.refreshWarning].filter(Boolean).join(' '));};
    if(pending.current && JSON.stringify([operation,payload])!==JSON.stringify([pending.current.operation,pending.current.payload])){show({kind:'error',text:explain('PENDING_ACTION')});return;}
    // Recheck at submission too: the original class may have started since review.
    if(operation==='change_class'&&!pending.current){const reason=replacementBlockReason(data?.sessions.find(s=>s.id===payload.fromSessionId),Date.now());if(reason){show({kind:'error',text:reason});return;}}
    if(operation==='book'&&!pending.current){const target=data?.sessions.find(s=>s.id===payload.sessionId);if(!target||!target.future||Date.parse(target.startsAt)<=Date.now()){show({kind:'error',text:explain('SESSION_NOT_OPEN')});return;}}
    if(!pending.current)setPending({operation,payload,requestKey:crypto.randomUUID(),messageId,returnHref:'/hub'+(searchParams.size?'?'+searchParams.toString():'')});
    const command=pending.current;
    if(!command)return;
    const {requestKey}=command;
    inFlight.current=true;setBusy(true);setNotice('');if(messageId)clearBookingFeedback(messageId);
    try{
      const feedback=await runHubAction(()=>call({operation,payload,requestKey}),refresh,accepted=>{setPending(null);show(accepted);});
      if(feedback.kind!=='uncertain'){setPending(null);}
      show(feedback);
      return feedback;
    }finally{inFlight.current=false;setBusy(false);}
  };
  const retryPending=async()=>{const p=pending.current;if(p)return act(p.operation,p.payload,p.messageId);};
  const selectedMember=data?.members.find(member=>member.id===selectedMemberId);
  const memberFeedbackKey=selectedMember?`member:${selectedMember.id}`:'';
  const canBook=!!data&&['owner','manager','instructor'].includes(data.principal.role);
  const pageTitle=attendance?'Attendance review':courses?'Course rosters':archived?'Archived students':intake?'New student':crm?'Sales':ai?'AI settings':instructor?'Instructor & timesheets':operations?'Operations':selectedMember&&!messages?selectedMember.name:'Inbox';
  const visibleMessages=selectedMemberId?data?.messages.filter(m=>m.memberId===selectedMemberId):data?.messages;
  const visibleTimeline=selectedMemberId?data?.timeline.filter(t=>t.memberId===selectedMemberId):data?.timeline;
  return <div className={styles.root}><header className={styles.header}><div><small>DOJANG COMPANION</small><h1>{pageTitle}</h1><p className={styles.muted}>{attendance?'Record or correct class attendance with a reviewed, audited change.':courses?'Review bulk course assignments before Odoo creates or cancels bookings.':archived?'Review archived students and restore them with a recorded reason.':intake?'Review a student profile and household before creating native records.':crm?'Prioritize leads, review evidence and complete the next action.':ai?'Review provider readiness and drafting controls.':instructor?'Verify your identity, review shift actions and manage native timesheets.':operations?'Read attendance, instructor workload, member summaries and authorized class rosters.':managing?'Profile, bookings, attendance, progress and billing.':'Review customer messages, prepare replies and arrange classes.'}</p></div><Link href="/ops">Class workspace</Link></header>
    {selectedMember&&<SelectMember id={selectedMember.id} name={selectedMember.name} detail="Authorized member workspace"/>}
    {notice&&<p className={styles.notice} role="status">{notice}</p>}
    {loading?<p role="status">Loading your authorized workspace…</p>:!data?<section className={styles.card}><h2>Sign in to your school</h2><p>Use your individual Odoo account with Companion site access. Device pairing does not grant booking access.</p>{selectedMemberId&&<p>Your member selection will be checked after sign-in.</p>}<form onSubmit={login} className={styles.fields}><label>Login<input name="login" autoComplete="username" required/></label><label>Password<input name="password" type="password" autoComplete="current-password" required/></label><button disabled={busy}>{busy?'Signing in…':'Sign in'}</button></form></section>:<>
      <div className={styles.row}><p>{data.principal.name} · {data.principal.role}</p><div className={styles.row}><button disabled={busy} onClick={()=>void refresh().catch(e=>setNotice(explain(e.message)))}>Refresh</button><button disabled={busy||hasPending} onClick={()=>void call({operation:'logout'}).then(()=>{setData(null);setPending(null);setBookingFeedback({});}).catch(e=>setNotice(explain(e.message)))}>Sign out</button></div></div>
      {!instructor&&!operations&&!intake&&!courses&&!archived&&!attendance&&<p className={styles.muted}>{data.capabilities.outbound==='not_configured'?'Outbound messaging is not configured. Drafts can still be reviewed.':'Replies require your review and approval before entering the delivery queue.'}</p>}
      {!busy&&!hasPending&&<nav className={styles.row} aria-label="Hub sections"><Link href="/hub" aria-current={messages?'page':undefined}>Inbox</Link><Link href="/people">Members</Link><Link href="/follow-ups">Internal follow-ups</Link>{canBook&&<><Link href="/hub?view=instructor" aria-current={instructor?'page':undefined}>Instructor & timesheets</Link><Link href="/hub?view=operations" aria-current={operations?'page':undefined}>Reports & rosters</Link><Link href="/hub?view=attendance" aria-current={attendance?'page':undefined}>Attendance review</Link></>}{['owner','manager'].includes(data.principal.role)&&<><Link href="/hub?view=intake" aria-current={intake?'page':undefined}>New student</Link><Link href="/hub?view=courses" aria-current={courses?'page':undefined}>Course rosters</Link><Link href="/hub?view=archived" aria-current={archived?'page':undefined}>Archived students</Link><Link href="/hub?view=crm">Sales & tasks →</Link><Link href="/hub?view=ai">AI drafting →</Link></>}</nav>}
      {hasPending&&(!pendingMessageId||!bookingFeedback[pendingMessageId])&&<button disabled={busy} onClick={retryPending}>Retry unconfirmed action</button>}
      {crm&&(['owner','manager'].includes(data.principal.role)?<CrmWorkspace busy={busy} locked={hasPending} feedback={bookingFeedback.crm} clearFeedback={()=>clearBookingFeedback('crm')} retry={hasPending&&pendingMessageId==='crm'?retryPending:undefined} act={(operation,payload)=>act(operation,payload,'crm')}/>:<p role="alert">Sales and tasks require manager or owner access.</p>)}
      {ai&&(['owner','manager'].includes(data.principal.role)?<AiSettings busy={busy} locked={hasPending} feedback={bookingFeedback.ai}
        act={(operation,payload)=>act(operation,payload,'ai')} retry={hasPending&&pendingMessageId==='ai'?retryPending:undefined}/>:<p role="alert">AI settings require manager or owner access.</p>)}
      {instructor&&(canBook?<InstructorWorkspace busy={busy} locked={hasPending} feedback={bookingFeedback.instructor} clearFeedback={()=>clearBookingFeedback('instructor')}
        act={(operation,payload)=>act(operation,payload,'instructor')} retry={hasPending&&pendingMessageId==='instructor'?retryPending:undefined}/>:<p role="alert">Instructor workspace requires staff access.</p>)}
      {operations&&(canBook?<OperationsWorkspace manager={['owner','manager'].includes(data.principal.role)} sessions={data.sessions}/>:<p role="alert">Operations requires staff access.</p>)}
      {intake&&(['owner','manager'].includes(data.principal.role)?<StudentIntake busy={busy} locked={hasPending} feedback={bookingFeedback.intake} clearFeedback={()=>clearBookingFeedback('intake')}
        act={(operation,payload)=>act(operation,payload,'intake')} retry={hasPending&&pendingMessageId==='intake'?retryPending:undefined}/>:<p role="alert">Creating students requires manager or owner access.</p>)}
      {attendance&&(canBook?<AttendanceWorkspace busy={busy} locked={hasPending} feedback={bookingFeedback.attendance} clearFeedback={()=>clearBookingFeedback('attendance')}
        act={(operation,payload)=>act(operation,payload,'attendance')} retry={hasPending&&pendingMessageId==='attendance'?retryPending:undefined}/>:<p role="alert">Attendance review requires staff access.</p>)}
      {courses&&(['owner','manager'].includes(data.principal.role)?<CourseAssignments busy={busy} locked={hasPending} feedback={bookingFeedback.courses} clearFeedback={()=>clearBookingFeedback('courses')}
        act={(operation,payload)=>act(operation,payload,'courses')} retry={hasPending&&pendingMessageId==='courses'?retryPending:undefined}/>:<p role="alert">Course rosters require manager or owner access.</p>)}
      {archived&&(['owner','manager'].includes(data.principal.role)?<ArchivedMembers busy={busy} locked={hasPending} feedback={bookingFeedback.archived} clearFeedback={()=>clearBookingFeedback('archived')}
        act={(operation,payload)=>act(operation,payload,'archived')} retry={hasPending&&pendingMessageId==='archived'?retryPending:undefined}/>:<p role="alert">Archived students require manager or owner access.</p>)}
      {!crm&&!ai&&!instructor&&!operations&&!intake&&!courses&&!archived&&!attendance&&<>
      {canBook&&<section className={styles.card} aria-label="Find a member"><label className={styles.fields}>Member<Select ariaLabel="Manage member" value={memberChoice} disabled={busy||hasPending} onChange={setMemberChoice} placeholder="Choose a member" options={data.members.map(m=>({value:m.id,label:m.name}))}/></label>
        {memberChoice&&!busy&&!hasPending&&<Link href={`/hub?memberId=${encodeURIComponent(memberChoice)}&view=manage`}>Open member management →</Link>}</section>}
      {selectedMember&&canBook&&!busy&&!hasPending&&<nav className={styles.row} aria-label="Member workspace"><Link href={`/hub?memberId=${encodeURIComponent(selectedMember.id)}`}>Book a class</Link><Link href={`/hub?memberId=${encodeURIComponent(selectedMember.id)}&view=manage`}>Profile, billing and attendance</Link></nav>}
      {selectedMemberId&&managing&&selectedMember&&canBook&&<MemberManagement key={selectedMember.id} memberId={selectedMember.id} section={searchParams.get('section')||undefined} sessions={data.sessions} now={now} busy={busy} locked={hasPending}
        feedback={bookingFeedback[`manage:${selectedMember.id}`]} clearFeedback={()=>clearBookingFeedback(`manage:${selectedMember.id}`)}
        retry={hasPending&&pendingMessageId===`manage:${selectedMember.id}`?retryPending:undefined}
        act={(operation,payload)=>act(operation,payload,`manage:${selectedMember.id}`)}
        archive={['owner','manager'].includes(data.principal.role)?{act:(operation,payload)=>act(operation,payload,'archived'),feedback:bookingFeedback.archived,retry:hasPending&&pendingMessageId==='archived'?retryPending:undefined}:undefined}/>}
      {selectedMemberId&&!managing&&!messages&&(selectedMember&&canBook?<MemberBooking key={selectedMember.id} member={selectedMember} sessions={data.sessions} now={now} busy={busy} locked={hasPending}
        feedback={bookingFeedback[memberFeedbackKey]} clearFeedback={()=>clearBookingFeedback(memberFeedbackKey)}
        retry={hasPending&&pendingMessageId===memberFeedbackKey?retryPending:undefined}
        book={session=>void act('book',{memberId:selectedMember.id,sessionId:session.id,expectedVersion:session.version},memberFeedbackKey)}/>:<p role="alert">This member is unavailable for booking with your current account. No other member has been selected.</p>)}
      {selectedMemberId&&managing&&(!selectedMember||!canBook)&&<p role="alert">This member is unavailable with your current account. No other member has been selected.</p>}
      {messages&&<section aria-label="Parent messages">{visibleMessages?.length?visibleMessages.map(m=><MessageCard key={`${m.id}:${m.revision}`} message={m} data={data} act={act} busy={busy} locked={hasPending} now={now} feedback={bookingFeedback[m.id]} clearFeedback={()=>clearBookingFeedback(m.id)} retry={hasPending&&pendingMessageId===m.id?retryPending:undefined}/>):<article className={styles.card}><h2>No messages to review</h2><p>Messages appear here when received through your configured channel and within your assigned scope.</p></article>}</section>}
      <section className={styles.card} aria-label="Recent actions"><h2>Recent actions</h2>{visibleTimeline?.length?visibleTimeline.map(t=><div key={t.id} className={styles.auditEntry}>
        <p>{data.members.find(m=>m.id===t.memberId)?.name} · {t.action.replaceAll('_',' ')} · {t.actor} · {new Date(t.at).toLocaleString()}</p>
        {t.booking?<div role="group" aria-label={`Saved booking receipt ${t.booking.enrollmentId}`} className={styles.savedReceipt}>
          <strong>Odoo registration receipt: {t.booking.enrollmentId}</strong>
          <p>{t.booking.classTitle} · {new Date(t.booking.startsAt).toLocaleString()}</p>
          <p>Current registration: {t.booking.state}. Attendance: {t.booking.attendanceState}.</p>
          <small>Loaded from Odoo. This booking record does not confirm that a message was sent.</small>
        </div>:['book','change_class'].includes(t.action)&&<small>Receipt details unavailable. Check the registration in Odoo before booking again.</small>}
      </div>):<p>No recorded actions yet.</p>}</section>
      </>}
    </>}
  </div>;
}

export default function Hub(){
  return <Suspense fallback={<div className={styles.root}><p role="status">Loading workspace…</p></div>}><HubContent/></Suspense>;
}
