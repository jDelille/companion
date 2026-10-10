"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import Rail from "./rail/Rail";
import ContextPane from "./ContextPane";
import styles from "./Shell.module.scss";
import WorkspaceHeader from "./workspace/WorkspaceHeader";
import WorkspaceTabs from "./workspace/WorkspaceTabs";
import CompanionRail from "./rail/companion-rail/CompanionRail";
import AdaptiveBottomNav from "./bottom-nav/AdaptiveBottomNav";
import ConnectedNavigation from "./ConnectedNavigation";

type Props = {children: ReactNode; context?: ReactNode; companion?: ReactNode; connectedTest?: boolean};

export default function AdaptiveShell({children, context, companion, connectedTest = false}: Props) {
  const [contextOpen, setContextOpen] = useState(false);
  const [companionOpen, setCompanionOpen] = useState(false);
  const companionTrigger = useRef<HTMLButtonElement>(null);
  const contextTrigger = useRef<HTMLButtonElement>(null);
  const companionClose = useRef<HTMLButtonElement>(null);
  const contextClose = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (companionOpen) companionClose.current?.focus();
    else if (contextOpen) contextClose.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (companionOpen) {
        setCompanionOpen(false);
        companionTrigger.current?.focus();
      } else if (contextOpen) {
        setContextOpen(false);
        contextTrigger.current?.focus();
      }
    };
    if (companionOpen || contextOpen) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [companionOpen, contextOpen]);
  return (
    <div className={styles.adaptiveShell} data-context-open={contextOpen} data-companion-open={companionOpen}>
      <div className={styles.railSlot}>
        {connectedTest ? <ConnectedNavigation /> : <Rail />}
      </div>
      <div id="workspace-context" className={`${styles.contextSlot} ${connectedTest ? styles.connectedContext : ""}`}>
        <button ref={contextClose} className={styles.contextClose} onClick={() => {setContextOpen(false); contextTrigger.current?.focus();}} aria-label="Close context panel">✕</button>
        {context !== undefined ? context : <ContextPane>{undefined}</ContextPane>}
      </div>
      <div className={styles.workspaceSlot}>
        {connectedTest ? <header className={styles.connectedHeader}><div><strong>Roster Companion</strong><span>Test workspace</span></div><button ref={contextTrigger} className={styles.contextTrigger} aria-controls="workspace-context" aria-expanded={contextOpen} onClick={() => {setCompanionOpen(false); setContextOpen(open => !open);}}>Workspace guide</button></header> : <>
          <WorkspaceHeader onToggleContext={() => setContextOpen(open => !open)} contextOpen={contextOpen} />
          <WorkspaceTabs />
        </>}
        <div className={styles.workspaceBody}>{children}</div>
      </div>
      <div id="roster-companion" className={styles.companionSlot}>
        <button ref={companionClose} className={styles.companionClose} onClick={() => {setCompanionOpen(false); companionTrigger.current?.focus();}} aria-label="Close companion">✕</button>
        {companion !== undefined ? companion : <CompanionRail />}
      </div>
      <button ref={companionTrigger} className={styles.companionTrigger} aria-controls="roster-companion" aria-expanded={companionOpen} onClick={() => {setContextOpen(false); setCompanionOpen(true);}} aria-label="Open companion">✦</button>
      <div className={styles.bottomNavSlot}>{connectedTest ? <ConnectedNavigation mobile /> : <AdaptiveBottomNav />}</div>
    </div>
  );
}
