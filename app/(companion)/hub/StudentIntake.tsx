'use client';

import {useEffect,useRef,useState,type FormEvent} from 'react';
import Link from '@/components/primitives/AppLink';
import {explainHubError,type ActionFeedback} from '@/domain/hub-actions';
import styles from './page.module.css';
import intakeStyles from './intake.module.css';

type Guardian = {id:string;name:string;householdId:string;household:string;version:number;householdVersion:number};
type IntakeContext = {guardians:Guardian[];moreGuardians:boolean;school:string;today:string;recent:{memberId:string;name:string;memberNumber:string}[]};
type ExistingStudent = {memberId:string;name:string;memberNumber:string;active:boolean};
type Preview = {valid:boolean;code?:string;issues:{field:string;message:string}[];intake:Record<string,unknown>;reviewToken:string;guardianName:string|null;householdName:string|null;
  duplicateStudents?:ExistingStudent[];guardianMatches?:Guardian[];unselectableGuardianMatch?:boolean};
type Duplicates = {students:ExistingStudent[];guardians:Guardian[];unselectable:boolean};
type Props = {busy:boolean;locked:boolean;feedback?:ActionFeedback;clearFeedback:()=>void;
  retry?:()=>Promise<ActionFeedback|undefined>;act:(operation:string,payload:Record<string,unknown>)=>Promise<ActionFeedback|undefined>};
async function read(operation:string,payload:Record<string,unknown>){
  const response=await fetch('/api/hub',{method:'POST',cache:'no-store',headers:{'content-type':'application/json'},body:JSON.stringify({operation,payload,requestKey:null})});
  const value=await response.json();
  if(!response.ok)throw Error(value.error?.code||'CONNECTION_UNAVAILABLE');
  return value;
}

export default function StudentIntake({busy,locked,feedback,clearFeedback,retry,act}:Props){
  const [context,setContext]=useState<IntakeContext|null>(null),[loadError,setLoadError]=useState('');
  const [kind,setKind]=useState('adult'),[guardianKind,setGuardianKind]=useState('new'),[guardianId,setGuardianId]=useState('');
  const [query,setQuery]=useState(''),[search,setSearch]=useState(''),[reload,setReload]=useState(0);
  const [preview,setPreview]=useState<Preview|null>(null),[reviewing,setReviewing]=useState(false),[issues,setIssues]=useState<Preview['issues']>([]);
  const [confirmed,setConfirmed]=useState(false),[error,setError]=useState('');
  const [duplicates,setDuplicates]=useState<Duplicates|null>(null),[matched,setMatched]=useState<Guardian[]>([]);
  const resultRef=useRef<HTMLDivElement>(null),formRef=useRef<HTMLFormElement>(null),requestInFlight=useRef(false);
  const blocked=busy||locked||reviewing;
  useEffect(()=>{
    let cancelled=false;
    void read('intake_context',{query:search}).then((value:IntakeContext)=>{if(!cancelled){setContext(value);setLoadError('');}}).catch(e=>{if(!cancelled){setContext(null);setLoadError(explainHubError(e.message));}});
    return()=>{cancelled=true;};
  },[search,reload]);
  useEffect(()=>{if(preview||issues.length||error||feedback)resultRef.current?.focus();},[preview,issues,error,feedback]);
  const resetReview=()=>{setPreview(null);setConfirmed(false);setIssues([]);setDuplicates(null);setError('');clearFeedback();};
  const guardianOptions=context?[...matched.filter(m=>!context.guardians.some(g=>g.id===m.id)),...context.guardians]:[];
  const chooseExisting=(match:Guardian)=>{if(blocked)return;resetReview();setMatched(previous=>[match,...previous.filter(g=>g.id!==match.id)]);setGuardianKind('existing');setGuardianId(match.id);};
  async function review(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(blocked||requestInFlight.current||!context)return;
    const form=new FormData(event.currentTarget);
    const get=(field:string)=>String(form.get(field)||'');
    const selected=guardianOptions.find(g=>g.id===guardianId);
    const guardian=kind==='adult'?null:guardianKind==='new'?{kind:'new',name:get('guardianName'),email:get('guardianEmail'),phone:get('guardianPhone')}:
      selected?{kind:'existing',partnerId:selected.id,householdId:selected.householdId,expectedVersion:selected.version,expectedHouseholdVersion:selected.householdVersion}:null;
    const intake={studentType:kind,student:{name:get('studentName'),email:get('studentEmail'),phone:get('studentPhone'),dateOfBirth:get('birth'),gender:get('gender')},guardian,reviewRef:get('reviewRef')};
    requestInFlight.current=true;setReviewing(true);resetReview();
    try{
      const value:Preview=await read('intake_preview',{intake});
      if(value.valid!==true){
        setIssues(value.issues?.length?value.issues:[{field:'intake',message:'The intake could not be reviewed.'}]);
        if(value.duplicateStudents?.length||value.guardianMatches?.length||value.unselectableGuardianMatch)
          setDuplicates({students:value.duplicateStudents||[],guardians:value.guardianMatches||[],unselectable:!!value.unselectableGuardianMatch});
        return;}
      if(typeof value.reviewToken!=='string'||!value.intake)throw Error('INTAKE_DETAILS_UNAVAILABLE');
      setPreview(value);
    }catch(e){setError(explainHubError((e as Error).message));}finally{setReviewing(false);requestInFlight.current=false;}
  }
  const save=async()=>{
    if(!preview||!confirmed||blocked||requestInFlight.current)return;
    requestInFlight.current=true;
    try{const result=await act('create_student',{intake:preview.intake,reviewToken:preview.reviewToken});
      if(result?.kind==='success'){formRef.current?.reset();setPreview(null);setConfirmed(false);setReload(n=>n+1);}
      else if(result?.kind==='error'){setPreview(null);setConfirmed(false);}
    }finally{requestInFlight.current=false;}
  };
  const checkResult=async()=>{const result=await retry?.();if(result?.kind==='success'){formRef.current?.reset();setPreview(null);setConfirmed(false);setReload(n=>n+1);}};
  const student=preview?.intake.student as {name:string;dateOfBirth:string;email:string;phone:string;gender:string}|undefined;
  return <section aria-label="New student intake">
    <div className={styles.card}><h2>A clear start for a new student.</h2><p>Create their native Odoo profile and, for a child, an explicit household relationship. Identity and guardian authority must be checked by staff.</p><p className={styles.muted}>This step does not book a trial, activate a membership, grant portal access, sign a waiver or send a message.</p></div>
    {loadError?<div role="alert" className={styles.card}><p>{loadError}</p><button disabled={blocked} onClick={()=>setReload(n=>n+1)}>Reload intake options</button></div>:!context?<p role="status">Loading your school’s intake options…</p>:<>
      <form ref={formRef} onSubmit={review} onChange={resetReview} noValidate className={styles.card}>
        <fieldset disabled={blocked} className={intakeStyles.fieldset}><legend>1. Student details</legend><div className={intakeStyles.grid}>
          <label>Student type<select aria-label="Student type" value={kind} onChange={e=>setKind(e.target.value)}><option value="adult">Adult (18 or older)</option><option value="child">Child (under 18)</option></select></label>
          <label>Student full name<input name="studentName" aria-label="Student full name" autoComplete="off" maxLength={200}/></label>
          <label>Date of birth<input type="date" name="birth" aria-label="Student date of birth" max={context.today}/></label>
          <label>Gender (optional)<select name="gender" aria-label="Student gender"><option value="">Not recorded</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option></select></label>
          <label>Student email<input type="email" name="studentEmail" aria-label="Student email" autoComplete="off" maxLength={200}/></label>
          <label>Student phone<input type="tel" name="studentPhone" aria-label="Student phone" autoComplete="off" maxLength={40}/></label>
        </div><p className={styles.muted}>{kind==='adult'?'An adult needs at least one contact method: email or phone.':'Child contact details are optional. Enter the adult’s contact information under Guardian.'}</p></fieldset>
        {kind==='child'&&<fieldset disabled={blocked} className={intakeStyles.fieldset}><legend>2. Guardian and household</legend>
          <label>Guardian selection<select aria-label="Guardian selection" value={guardianKind} onChange={e=>{setGuardianKind(e.target.value);setGuardianId('');}}><option value="new">Create a new guardian and household</option><option value="existing">Use an existing school household</option></select></label>
          {guardianKind==='new'?<div className={intakeStyles.grid}><label>Guardian full name<input name="guardianName" aria-label="Guardian full name" autoComplete="off" maxLength={200}/></label><label>Guardian email<input type="email" name="guardianEmail" aria-label="Guardian email" autoComplete="off" maxLength={200}/></label><label>Guardian phone<input type="tel" name="guardianPhone" aria-label="Guardian phone" autoComplete="off" maxLength={40}/></label></div>:<>
            <div className={intakeStyles.search}><label>Find an existing guardian<input aria-label="Find an existing guardian" value={query} onChange={e=>setQuery(e.target.value)} maxLength={100}/></label><button type="button" onClick={()=>{setGuardianId('');setSearch(query.trim());setReload(n=>n+1);}}>Search households</button></div>
            <label>Existing guardian<select aria-label="Existing guardian" value={guardianId} onChange={e=>setGuardianId(e.target.value)}><option value="">Select the exact guardian and household</option>{guardianOptions.map(g=><option value={g.id} key={g.id}>{g.name} · {g.household} · #{g.id}</option>)}</select></label>
            {context.moreGuardians&&<p>Showing the first 50 matching guardians. Narrow your search to find the exact household.</p>}
            {!guardianOptions.length&&<p>No active guardian households match. Records with missing company or household links need administrator review in Odoo.</p>}
          </>}
          <p className={styles.muted}>A household link does not verify a messaging channel or grant signing, payment or portal permissions.</p>
        </fieldset>}
        <fieldset disabled={blocked} className={intakeStyles.fieldset}><legend>{kind==='child'?'3':'2'}. Staff verification</legend><label>Identity and guardian review reference<input name="reviewRef" aria-label="Identity and guardian review reference" maxLength={300} autoComplete="off"/></label><p className={styles.muted}>Record a reference to the completed identity check and, for a child, guardian-authority check. Do not paste identity documents or passwords.</p></fieldset>
        <button disabled={blocked}>{reviewing?'Checking intake…':'Review new student'}</button>
      </form>
      <div ref={resultRef} tabIndex={-1} className={intakeStyles.result}>
        {issues.length>0&&<div role="alert" className={styles.card} aria-label="Intake review problems"><h2>{duplicates?'Check existing records first':'Complete these fields'}</h2><ul>{issues.map((issue,i)=><li key={`${issue.field}:${i}`}>{issue.field.startsWith('student.')?'Student — ':issue.field.startsWith('guardian.')?'Guardian — ':''}{issue.message}</li>)}</ul><p>Nothing has been created.</p>
          {duplicates?.students.map(s=><p key={s.memberId}>{s.active?<Link href={`/hub?view=manage&memberId=${encodeURIComponent(s.memberId)}&section=family`}>Open existing student {s.name} · {s.memberNumber} →</Link>:<>{s.name} · {s.memberNumber} is archived. An administrator must review the archived profile in Odoo; do not create a replacement.</>}</p>)}
          {duplicates?.guardians.map(g=><p key={g.id}>{g.name} · {g.household} <button type="button" disabled={blocked} onClick={()=>chooseExisting(g)}>Use {g.household}</button></p>)}
          {duplicates?.unselectable&&<p>A matching contact is not a selectable guardian household. Ask an administrator to review it in Odoo before linking a child.</p>}</div>}
        {error&&<p role="alert" className={styles.card}>{error}</p>}
        {preview&&student&&<div className={styles.card} aria-label="Review student intake"><h2>Review before creating</h2><dl className={intakeStyles.summary}><dt>School</dt><dd>{context.school}</dd><dt>Student</dt><dd>{student.name}</dd><dt>Birth date</dt><dd>{student.dateOfBirth}</dd><dt>Contact</dt><dd>{[student.email,student.phone].filter(Boolean).join(' · ')||'No child contact recorded'}</dd><dt>Guardian</dt><dd>{preview.guardianName||'Standalone adult'}</dd><dt>Household</dt><dd>{preview.householdName||(preview.guardianName?'New household':'None')}</dd><dt>Initial status</dt><dd>Lead — no membership or class enrollment</dd><dt>Verification</dt><dd>{String(preview.intake.reviewRef)}</dd></dl>
          <label className={intakeStyles.confirm}><input type="checkbox" checked={confirmed} disabled={blocked} onChange={e=>setConfirmed(e.target.checked)}/>I checked the identity, guardian authority where applicable, and the exact information above.</label>
          <button disabled={blocked||!confirmed} onClick={save}>{busy?'Creating student…':'Confirm student in Odoo'}</button>
        </div>}
        {feedback&&<div className={styles.card} role={feedback.kind==='error'?'alert':'status'} aria-label="Student intake result"><p>{feedback.text}</p>{feedback.refreshWarning&&<p>{feedback.refreshWarning}</p>}{feedback.kind==='uncertain'&&retry&&<button disabled={busy} onClick={checkResult}>Check student creation result</button>}{feedback.intake&&<Link href={`/hub?view=manage&memberId=${encodeURIComponent(feedback.intake.memberId)}&section=family`}>Open created student →</Link>}</div>}
      </div>
      {context.recent.length>0&&<div className={styles.card}><h2>Your recent student intakes</h2><p className={styles.muted}>Loaded from your Odoo creation receipts. Check here after a reload before submitting another intake.</p>{context.recent.map(r=><p key={r.memberId}><Link href={`/hub?view=manage&memberId=${encodeURIComponent(r.memberId)}`}>{r.name} · {r.memberNumber}</Link></p>)}</div>}
    </>}
  </section>;
}
