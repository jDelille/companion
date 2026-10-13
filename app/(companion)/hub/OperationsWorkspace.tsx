"use client";
import {useEffect, useState, type FormEvent} from 'react';
import Select from '@/components/primitives/select/Select';
import styles from './page.module.css';
import print from './operations.module.css';

type Class = {id:string;name:string;startsAt:string};
type Report = {fromDate:string;toDate:string;timeZone:string;generatedAt:string;sessions:number;classes:Class[];
  attendance:{recorded:number;attended:number;daily:{date:string;counts:Record<string,number>}[]};
  workload:{id:string;name:string;sessions:number;scheduledHours:number;closedShiftHours:number;openShifts:number}[];
  unassignedSessions:number;beltDistribution:{name:string;members:number}[];
  family:{households:number;membersInHouseholds:number;membersWithoutHousehold:number};scope:string};
type Roster = {session:{id:string;name:string;startsAt:string;endsAt:string;instructor:string|null;state:string};timeZone:string;generatedAt:string;
  members:{id:string;name:string;rank:string;attendance:string}[]};
const labels:Record<string,string>={present:'Present',late:'Late',absent:'Absent',excused:'Excused',sick:'Sick',injury:'Injury',vacation:'Vacation',other:'Other',pending:'Not yet recorded'};
const errorText=(code:string)=>code==='REPORT_TOO_LARGE'?'This report exceeds the safe display limit. Use a smaller date range or the native Odoo report.':code==='INVALID_REPORT_RANGE'?'Choose a valid date range of at most 31 days.':'Authorized records could not be loaded. Retry or sign in again; no sample records are substituted.';
async function read<T>(operation:string,payload:Record<string,unknown>,signal:AbortSignal):Promise<T>{
  const r=await fetch('/api/hub',{method:'POST',headers:{'content-type':'application/json'},cache:'no-store',signal,body:JSON.stringify({operation,payload,requestKey:null})});
  const value=await r.json();if(!r.ok)throw Error(value.error?.code||'UNAVAILABLE');return value as T;
}
export default function OperationsWorkspace({manager,sessions}:{manager:boolean;sessions:{id:string;title:string;startsAt:string}[]}){
  const [range,setRange]=useState<{fromDate:string;toDate:string;attempt:number}|null>(null);
  const [report,setReport]=useState<Report|null>(null),[reportError,setReportError]=useState(''),[loading,setLoading]=useState(false);
  const [selection,setSelection]=useState({id:'',attempt:0}),[roster,setRoster]=useState<Roster|null>(null),[rosterError,setRosterError]=useState(''),[rosterLoading,setRosterLoading]=useState(false);
  useEffect(()=>{
    if(!range||!manager)return;
    const abort=new AbortController();
    read<Report>('operations_report',{fromDate:range.fromDate,toDate:range.toDate},abort.signal)
      .then(value=>{if(!abort.signal.aborted)setReport(value);})
      .catch(e=>{if(!abort.signal.aborted)setReportError(errorText(e.message));})
      .finally(()=>{if(!abort.signal.aborted)setLoading(false);});
    return()=>abort.abort();
  },[range,manager]);
  useEffect(()=>{
    if(!selection.id)return;
    const abort=new AbortController();
    read<Roster>('session_roster',{sessionId:selection.id},abort.signal)
      .then(value=>{if(!abort.signal.aborted)setRoster(value);})
      .catch(e=>{if(!abort.signal.aborted)setRosterError(errorText(e.message));})
      .finally(()=>{if(!abort.signal.aborted)setRosterLoading(false);});
    return()=>abort.abort();
  },[selection]);
  function run(event:FormEvent<HTMLFormElement>){
    event.preventDefault();const form=new FormData(event.currentTarget);
    setReport(null);setReportError('');setLoading(true);
    setRange(previous=>({fromDate:String(form.get('fromDate')),toDate:String(form.get('toDate')),attempt:(previous?.attempt||0)+1}));
  }
  function choose(id:string){setRoster(null);setRosterError('');setRosterLoading(!!id);setSelection(previous=>({id,attempt:previous.attempt+1}));}
  const classes=new Map(sessions.map(s=>[s.id,{id:s.id,name:s.title,startsAt:s.startsAt}]));
  report?.classes.forEach(s=>classes.set(s.id,s));
  return <section aria-label="Operations reports and rosters" className={styles.card}>
    <h2>Operations reports & rosters</h2><p>Read-only Odoo records. No attendance, memberships or payroll are changed here.</p>
    {manager?<>
      <form className={styles.fields} onSubmit={run}><div className={styles.row}>
        <label>From date<input name="fromDate" type="date" required/></label><label>Through date<input name="toDate" type="date" required/></label>
        <button disabled={loading}>Load operations report</button></div><small>Up to 31 days, using your school’s timezone. No missing attendance is inferred as an absence.</small></form>
      {loading&&<p role="status">Loading native operations records…</p>}{reportError&&<p role="alert">{reportError}</p>}
      {report&&<div aria-label="Verified operations report">
        <h3>{report.fromDate} — {report.toDate}</h3><p className={styles.muted}>{report.scope} Timezone: {report.timeZone}.</p>
        <div className={styles.row}><strong>{report.sessions} scheduled classes</strong><strong>{report.attendance.attended} attended records</strong><span>{report.attendance.recorded} total recorded attendance outcomes</span></div>
        <h3>Daily attendance</h3>{report.attendance.daily.length?report.attendance.daily.map(day=><article className={styles.booking} key={day.date}><strong>{day.date}</strong><p>{Object.entries(day.counts).map(([state,count])=>`${labels[state]||state}: ${count}`).join(' · ')}</p></article>):<p>No recorded attendance in this class-date range.</p>}
        <h3>Instructor workload</h3>{report.workload.length?report.workload.map(row=><article className={styles.booking} key={row.id}><strong>{row.name}</strong><p>{row.sessions} classes · {row.scheduledHours.toFixed(2)} scheduled hours · {row.closedShiftHours.toFixed(2)} closed-shift hours · {row.openShifts} open shifts</p></article>):<p>No linked instructor activity in this range.</p>}
        <p>{report.unassignedSessions} classes have no instructor assigned. Scheduled hours and worked shift hours measure different records; neither is a payroll approval.</p>
        <h3>Current belt distribution</h3><div className={styles.row}>{report.beltDistribution.map(rank=><p key={rank.name}><strong>{rank.name}</strong> · {rank.members}</p>)}</div>
        <h3>Current family summary</h3><p>{report.family.households} households · {report.family.membersInHouseholds} active member records in households · {report.family.membersWithoutHousehold} without a linked household</p>
      </div>}
    </>:<p>School-wide reports require manager or owner access. Your authorized class rosters remain available below.</p>}
    <h3>Class roster</h3><Select ariaLabel="Roster class" value={selection.id} onChange={choose} placeholder="Choose an authorized class" options={[...classes.values()].map(s=>({value:s.id,label:`${s.name} · ${new Date(s.startsAt).toLocaleString(undefined,{timeZone:report?.timeZone||'UTC'})} ${report?.timeZone||'UTC'}`}))}/>
    <p className={styles.muted}>Managers can load a report date range to select past classes. This is the current registered roster, not a saved testing roster.</p>
    {rosterLoading&&<p role="status">Loading the actual class roster…</p>}{rosterError&&<p role="alert">{rosterError} <button onClick={()=>choose(selection.id)}>Retry roster</button></p>}
    {roster&&<>
      <button className={print.noPrint} onClick={()=>window.print()}>Print class roster</button>
      <article className={print.printable} aria-label="Printable class roster"><h2>{roster.session.name}</h2>
        <p>{new Date(roster.session.startsAt).toLocaleString(undefined,{timeZone:roster.timeZone})} · {roster.timeZone} · {roster.session.instructor||'Instructor not assigned'} · {roster.session.state}</p>
        <p>{roster.members.length} registered members · Generated {new Date(roster.generatedAt).toLocaleString()} · Staff-only copy</p>
        <div className={print.tableWrap}><table><thead><tr><th>Student</th><th>Current belt</th><th>Recorded attendance</th></tr></thead><tbody>{roster.members.map(member=><tr key={member.id}><td>{member.name}</td><td>{member.rank}</td><td>{labels[member.attendance]||member.attendance}</td></tr>)}</tbody></table></div>
        {!roster.members.length&&<p>No registered members on this class roster.</p>}
      </article>
    </>}
  </section>;
}
