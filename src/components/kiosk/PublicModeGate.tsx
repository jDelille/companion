"use client";
import { useEffect, useState, type ReactNode } from 'react';

// Do not mount the public journey until staff authority is removed. A failed
// request is not a successful privacy reset, including when the device is offline.
export default function PublicModeGate({children}:{children:ReactNode}) {
  const [state,setState]=useState<'clearing'|'ready'|'failed'>(process.env.NEXT_PUBLIC_DEMO_MODE==='true'?'ready':'clearing');
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    if(process.env.NEXT_PUBLIC_DEMO_MODE==='true')return;
    let active=true;
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),10000);
    fetch('/api/integration/public-mode',{method:'POST',cache:'no-store',signal:controller.signal})
      .then(async response=>{
        const value=await response.json();
        if(!response.ok||value.staffContextCleared!==true)throw Error();
        if(active){
          // Other staff tabs must not retain private rendered data either.
          if(typeof BroadcastChannel!=='undefined'){
            const channel=new BroadcastChannel('dojang-privacy');channel.postMessage('public-mode');channel.close();
          }
          setState('ready');
        }
      }).catch(()=>{if(active)setState('failed');});
    return()=>{active=false;clearTimeout(timer);controller.abort();};
  },[attempt]);
  if(state==='ready')return children;
  return <section aria-label="Kiosk privacy reset" style={{padding:'2rem'}}>
    <h1>{state==='failed'?'Kiosk privacy reset not confirmed':'Preparing the public kiosk'}</h1>
    <p role="status">{state==='failed'?'Reconnect and retry before handing this device to a visitor.':'Signing out staff and clearing private context…'}</p>
    {state==='failed'&&<button onClick={()=>{setState('clearing');setAttempt(n=>n+1);}}>Retry privacy reset</button>}
  </section>;
}
