'use client';

import {useEffect,useRef,useState} from 'react';
import {explainHubError,type ActionFeedback} from '@/domain/hub-actions';
import styles from './page.module.css';
import intakeStyles from './intake.module.css';

type Rank={id:string;name:string;sequence:number};
type Eligible={memberId:string;name:string;currentRank:string|null;nextRank:{id:string;name:string}|null;attended:number;threshold:number|null;status:string;openTest:{testId:string;name:string}|null};
type TestRow={id:string;name:string;date:string;state:string;count:number};
type Eligibility={rows:Eligible[];ranks:Rank[];tests:TestRow[]};
type RosterRow={registrationId:string;memberId:string;name:string;currentRank:string|null;targetRank:string;result:string;promotionId:string|null};
type Roster={test:{id:string;name:string;date:string;state:string;version:number;program:string|null};rows:RosterRow[];school:string};
type Preview={promotions:{registrationId:string;name:string;from:string|null;to:string}[];conflicts:{registrationId:string;name:string;problem:string}[];version:number;valid:boolean;reviewToken:string|null};
type History={id:string;memberId:string;name:string;rank:string;stripes:number;date:string;memberVersion:number;source:string;reversed:boolean;reversedBy:string|null;reversalReason:string|null;latest:boolean};
type Review={operation:string;payload:Record<string,unknown>;lines:string[];effects:string[]};
type Props={busy:boolean;locked:boolean;feedback?:ActionFeedback;clearFeedback:()=>void;
  retry?:()=>Promise<ActionFeedback|undefined>;act:(operation:string,payload:Record<string,unknown>)=>Promise<ActionFeedback|undefined>};
const RESULTS=['pending','pass','fail','withdrew'];
const STATUS:Record<string,string>={eligible:'Eligible',not_yet:'Not yet',no_threshold:'No attendance rule',top_rank:'Highest belt'};
const today=()=>new Date().toISOString().slice(0,10);
async function read(operation:string,payload:Record<string,unknown>){
  const response=await fetch('/api/hub',{method:'POST',cache:'no-store',headers:{'content-type':'application/json'},body:JSON.stringify({operation,payload,requestKey:null})});
  const value=await response.json();
  if(!response.ok)throw Error(value.error?.code||'CONNECTION_UNAVAILABLE');
  return value;
}

export default function TestingWorkspace({busy,locked,feedback,clearFeedback,retry,act}:Props){
  const [query,setQuery]=useState(''),[search,setSearch]=useState(''),[data,setData]=useState<Eligibility|null>(null);
  const [picked,setPicked]=useState<Record<string,string>>({}),[testName,setTestName]=useState(''),[testDate,setTestDate]=useState(today()),[rosterReason,setRosterReason]=useState('');
  const [testId,setTestId]=useState(''),[roster,setRoster]=useState<Roster|null>(null),[results,setResults]=useState<Record<string,string>>({}),[resultReason,setResultReason]=useState('');
  const [promote,setPromote]=useState<string[]>([]),[preview,setPreview]=useState<Preview|null>(null),[promotionReason,setPromotionReason]=useState('');
  const [historyQuery,setHistoryQuery]=useState(''),[history,setHistory]=useState<History[]|null>(null),[reversing,setReversing]=useState<Record<string,string>>({});
  const [error,setError]=useState(''),[reload,setReload]=useState(0),[review,setReview]=useState<Review|null>(null),[confirmed,setConfirmed]=useState(false);
  const inFlight=useRef(false),reviewRef=useRef<HTMLDivElement>(null);
  const blocked=busy||locked;
  useEffect(()=>{let cancelled=false;void read('testing_eligibility',{query:search}).then(v=>{if(!cancelled){setData(v);setError('');}}).catch(e=>{if(!cancelled)setError(explainHubError(e.message));});return()=>{cancelled=true;};},[search,reload]);
  useEffect(()=>{
    if(!testId)return;
    let cancelled=false;
    void read('testing_roster',{testId}).then((v:Roster)=>{if(!cancelled){setRoster(v);setResults(Object.fromEntries(v.rows.map(r=>[r.registrationId,r.result])));setPromote([]);setPreview(null);}}).catch(e=>{if(!cancelled){setRoster(null);setError(explainHubError(e.message));}});
    return()=>{cancelled=true;};
  },[testId,reload]);
  useEffect(()=>{if(review||feedback)reviewRef.current?.focus();},[review,feedback]);
  const open=(r:Review)=>{clearFeedback();setConfirmed(false);setReview(r);};
  const after=(result?:ActionFeedback)=>{
    if(result?.kind==='success'||result?.kind==='error'){setReview(null);setConfirmed(false);setReload(n=>n+1);}
    if(result?.kind==='success'){setPicked({});setRosterReason('');setResultReason('');setPromotionReason('');setPreview(null);setReversing({});if(history)void loadHistory();}
    if(result?.testing)setTestId(result.testing.testId);
  };
  async function confirm(){
    if(!review||!confirmed||blocked||inFlight.current)return;
    inFlight.current=true;
    try{after(await act(review.operation,review.payload));}finally{inFlight.current=false;}
  }
  const checkResult=async()=>{after(await retry?.());};
  async function loadHistory(){try{setHistory((await read('promotion_history',{query:historyQuery})).rows);}catch(e){setError(explainHubError((e as Error).message));}}
  async function loadPreview(){
    if(!roster)return;
    try{setPreview(await read('promotion_preview',{testId:roster.test.id,registrationIds:promote}));}catch(e){setError(explainHubError((e as Error).message));}
  }
  const chosen=Object.entries(picked).filter(([,rank])=>rank);
  const rankName=(id:string)=>data?.ranks.find(r=>r.id===id)?.name||'';
  const changed=roster?roster.rows.filter(r=>results[r.registrationId]!==r.result):[];
  const editable=roster?['scheduled','in_progress'].includes(roster.test.state):false;
  return <section aria-label="Belt testing">
    <div className={styles.card}><h2>Belt testing and promotions.</h2><p>Build a testing roster from attendance progress, record results, then promote passing students after a review. Every step is saved on native Odoo belt tests and belt history.</p>
      <p className={styles.muted}>Nothing here sends a message or creates an invoice. Reversal keeps the original award in history.</p></div>
    {error&&<p role="alert" className={styles.card}>{error}</p>}
    <div className={styles.card} aria-label="Testing eligibility" role="region">
      <h2>Eligibility</h2>
      <div className={styles.row}><label>Find students<input aria-label="Find students" value={query} maxLength={100} disabled={blocked} onChange={e=>setQuery(e.target.value)}/></label><button disabled={blocked} onClick={()=>setSearch(query.trim())}>Search students</button></div>
      {!data?<p role="status">Loading eligibility…</p>:<>
        {data.rows.map(row=><div key={row.memberId} className={styles.auditEntry} role="group" aria-label={`Eligibility for ${row.name}`}>
          <strong>{row.name}</strong>
          <p>{row.currentRank||'No belt'} → {row.nextRank?.name||'—'} · {STATUS[row.status]}{row.threshold?` · ${row.attended}/${row.threshold} classes`:` · ${row.attended} classes`}{row.openTest?` · on ${row.openTest.name}`:''}</p>
          {!row.openTest&&row.nextRank&&<div className={styles.row}>
            <label><input type="checkbox" aria-label={`Add ${row.name}`} checked={!!picked[row.memberId]} disabled={blocked} onChange={e=>setPicked(p=>({...p,[row.memberId]:e.target.checked?row.nextRank!.id:''}))}/>Add to roster</label>
            {picked[row.memberId]&&<label>Testing for<select aria-label={`Testing rank for ${row.name}`} value={picked[row.memberId]} disabled={blocked} onChange={e=>setPicked(p=>({...p,[row.memberId]:e.target.value}))}>{data.ranks.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>}
          </div>}
        </div>)}
        {!data.rows.length&&<p>No active students match.</p>}
        <div className={styles.fields}>
          <label>Test name<input aria-label="Test name" value={testName} maxLength={200} disabled={blocked} onChange={e=>setTestName(e.target.value)}/></label>
          <label>Test date<input aria-label="Test date" type="date" value={testDate} disabled={blocked} onChange={e=>setTestDate(e.target.value)}/></label>
          <label>Reason for this roster<input aria-label="Reason for this roster" value={rosterReason} maxLength={500} disabled={blocked} onChange={e=>setRosterReason(e.target.value)}/></label>
          <button disabled={blocked||!chosen.length||!testName.trim()||!testDate||!rosterReason.trim()} onClick={()=>open({operation:'save_testing_roster',
            payload:{testId:null,expectedVersion:0,name:testName.trim(),testDate,add:chosen.map(([memberId,targetRankId])=>({memberId,targetRankId})),removeRegistrationIds:[],reason:rosterReason.trim()},
            lines:[`New test: ${testName.trim()} on ${testDate}`,...chosen.map(([id,rank])=>`${data.rows.find(r=>r.memberId===id)?.name} → ${rankName(rank)}`),`Reason: ${rosterReason.trim()}`],
            effects:['Creates a native belt test with pending registrations. No belt, invoice or message is created.','Students on the roster are marked as having a pending test, so the daily eligibility job does not create a duplicate test or testing-fee invoice.']})}>Review testing roster</button>
        </div>
        <label className={styles.fields}>Saved tests<select aria-label="Saved tests" value={testId} disabled={blocked} onChange={e=>{setTestId(e.target.value);clearFeedback();}}>
          <option value="">Choose a test</option>{data.tests.map(t=><option key={t.id} value={t.id}>{t.name} · {t.date} · {t.state} · {t.count} students</option>)}</select></label>
      </>}
    </div>
    {roster&&roster.test.id===testId&&<div className={styles.card} aria-label="Testing roster" role="region">
      <h2>{roster.test.name}</h2><p>{roster.school} · {roster.test.date} · {roster.test.state}{roster.test.program?` · ${roster.test.program}`:''}</p>
      {roster.rows.map(row=><div key={row.registrationId} className={styles.auditEntry} role="group" aria-label={`Testing row for ${row.name}`}>
        <strong>{row.name}</strong><p>{row.currentRank||'No belt'} → {row.targetRank}{row.promotionId?' · promoted':''}</p>
        <div className={styles.row}>
          <label>Result<select aria-label={`Result for ${row.name}`} value={results[row.registrationId]||row.result} disabled={blocked||!editable||!!row.promotionId} onChange={e=>setResults(r=>({...r,[row.registrationId]:e.target.value}))}>{RESULTS.map(r=><option key={r} value={r}>{r}</option>)}</select></label>
          {row.result==='pass'&&!row.promotionId&&<label><input type="checkbox" aria-label={`Promote ${row.name}`} checked={promote.includes(row.registrationId)} disabled={blocked} onChange={e=>{setPreview(null);setPromote(p=>e.target.checked?[...p,row.registrationId]:p.filter(id=>id!==row.registrationId));}}/>Promote</label>}
        </div>
      </div>)}
      {!roster.rows.length&&<p>No students on this test.</p>}
      <div className={styles.row}><button onClick={()=>window.print()}>Print testing roster</button></div>
      {editable&&<div className={styles.fields}>
        <label>Reason for results<input aria-label="Reason for results" value={resultReason} maxLength={500} disabled={blocked} onChange={e=>setResultReason(e.target.value)}/></label>
        <button disabled={blocked||!changed.length||!resultReason.trim()} onClick={()=>open({operation:'record_test_results',
          payload:{testId:roster.test.id,expectedVersion:roster.test.version,results:changed.map(r=>({registrationId:r.registrationId,result:results[r.registrationId]})),reason:resultReason.trim()},
          lines:[...changed.map(r=>`${r.name}: ${r.result} → ${results[r.registrationId]}`),`Reason: ${resultReason.trim()}`],
          effects:['Saves results on the native registrations. No belt is awarded until you promote.','A final result clears the pending-test flag. The daily eligibility job can invite the student again later, with a testing-fee invoice if the next belt has one configured.']})}>Review results</button>
      </div>}
      {promote.length>0&&<button disabled={blocked} onClick={()=>void loadPreview()}>Preview promotions</button>}
      {preview&&<div aria-label="Promotion preview" role="region">
        {preview.promotions.map(p=><p key={p.registrationId}>{p.name}: {p.from||'No belt'} → {p.to}</p>)}
        {preview.conflicts.map(c=><p key={c.registrationId} role="alert">{c.name}: {c.problem}</p>)}
        {preview.valid&&preview.reviewToken&&<div className={styles.fields}>
          <label>Reason for promotions<input aria-label="Reason for promotions" value={promotionReason} maxLength={500} disabled={blocked} onChange={e=>setPromotionReason(e.target.value)}/></label>
          <button disabled={blocked||!promotionReason.trim()} onClick={()=>open({operation:'promote_test_results',
            payload:{testId:roster.test.id,expectedVersion:preview.version,registrationIds:promote,reason:promotionReason.trim(),reviewToken:preview.reviewToken},
            lines:[...preview.promotions.map(p=>`${p.name}: ${p.from||'No belt'} → ${p.to}`),`Reason: ${promotionReason.trim()}`],
            effects:[`Adds a belt history entry for each student dated ${roster.test.date}. Attendance progress restarts from that date.`,'No message, certificate or invoice is sent.']})}>Review promotions</button>
        </div>}
      </div>}
    </div>}
    <div className={styles.card} aria-label="Promotion history" role="region">
      <h2>Promotion history</h2>
      <div className={styles.row}><label>Find promotion history<input aria-label="Find promotion history" value={historyQuery} maxLength={100} disabled={blocked} onChange={e=>setHistoryQuery(e.target.value)}/></label><button disabled={blocked} onClick={()=>void loadHistory()}>Search history</button></div>
      {history?.map(h=><div key={h.id} className={styles.auditEntry} role="group" aria-label={`Award ${h.rank} for ${h.name}`}>
        <strong>{h.name} · {h.rank}{h.stripes?` · ${h.stripes} stripes`:''}</strong><p>{h.date} · {h.source}{h.reversed?` · reversed by ${h.reversedBy}: ${h.reversalReason}`:''}</p>
        {h.latest&&!h.reversed&&<div className={styles.row}>
          <label>Reason<input aria-label={`Reason for reversing ${h.name}`} value={reversing[h.id]||''} maxLength={500} disabled={blocked} onChange={e=>setReversing(r=>({...r,[h.id]:e.target.value}))}/></label>
          <button disabled={blocked||!(reversing[h.id]||'').trim()} onClick={()=>open({operation:'reverse_promotion',payload:{rankHistoryId:h.id,expectedVersion:h.memberVersion,reason:(reversing[h.id]||'').trim()},
            lines:[`${h.name}: remove ${h.rank} awarded ${h.date}`,`Reason: ${(reversing[h.id]||'').trim()}`],
            effects:['The award is archived with your name and reason; the student returns to the previous belt.','No message is sent.']})}>Review reversal</button>
        </div>}
      </div>)}
      {history&&!history.length&&<p>No belt history matches.</p>}
    </div>
    <div ref={reviewRef} tabIndex={-1} className={intakeStyles.result}>
      {review&&<div className={styles.card} aria-label="Review testing action"><h2>Review before saving</h2>
        {review.lines.map((l,i)=><p key={i}>{l}</p>)}
        {review.effects.map((l,i)=><p key={i} className={styles.muted}>{l}</p>)}
        <label className={intakeStyles.confirm}><input type="checkbox" checked={confirmed} disabled={blocked} onChange={e=>setConfirmed(e.target.checked)}/>I reviewed this testing action.</label>
        <div className={styles.row}><button disabled={blocked||!confirmed} onClick={()=>void confirm()}>{busy?'Saving…':'Confirm testing action in Odoo'}</button><button disabled={blocked} onClick={()=>setReview(null)}>Cancel</button></div>
      </div>}
      {feedback&&<div className={styles.card} role={feedback.kind==='error'?'alert':'status'} aria-label="Testing result"><p>{feedback.text}</p>{feedback.refreshWarning&&<p>{feedback.refreshWarning}</p>}{feedback.kind==='uncertain'&&retry&&<button disabled={busy} onClick={()=>void checkResult()}>Check testing result</button>}</div>}
    </div>
  </section>;
}
