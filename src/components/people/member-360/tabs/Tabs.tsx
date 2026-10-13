"use client";

import { useState, type ReactNode } from "react";
import styles from "./Tabs.module.scss";
import { useOptionalWorkspaceActions } from "@/components/workspace/WorkspaceActions";

export const TAB_NAMES = [
  "Overview",
  "Timeline",
  "Attendance",
  "Progress",
  "Membership",
  "Billing",
  "Messages",
  "Documents",
  "Family",
  "Safety",
] as const;

export type TabName = (typeof TAB_NAMES)[number];

type Props = {
  panels: Partial<Record<TabName, ReactNode>>; // tabs without a panel aren't built yet
};

const tabId = (tab: TabName) => `member-tab-${tab.toLowerCase()}`;

const Tabs = ({ panels }: Props) => {
  const [activeTab, setActiveTab] = useState<TabName>("Overview");
  const locked = useOptionalWorkspaceActions()?.hasPending;
  const panel = panels[activeTab];

  return (
    <>
      <div className={styles.objectTabs} role="tablist" aria-label="Member sections" onKeyDown={event=>{
        if(locked||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
        const enabled=TAB_NAMES.filter(name=>panels[name]);
        const current=enabled.indexOf(activeTab);
        const next=event.key==='Home'?enabled[0]:event.key==='End'?enabled.at(-1):enabled[(current+(event.key==='ArrowRight'?1:-1)+enabled.length)%enabled.length];
        if(next){event.preventDefault();setActiveTab(next);document.getElementById(tabId(next))?.focus();}
      }}>
        {TAB_NAMES.map((tab) => (
          <button
            key={tab}
            id={tabId(tab)}
            role="tab"
            aria-selected={activeTab === tab}
            aria-controls="member-tab-panel"
            disabled={!panels[tab] || (locked && activeTab !== tab)}
            tabIndex={activeTab === tab ? 0 : -1}
            title={!panels[tab] ? "Not connected in this workspace" : undefined}
            className={activeTab === tab ? styles.isActive : ""}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div id="member-tab-panel" role="tabpanel" aria-labelledby={tabId(activeTab)}>
        {panel ?? <p className={styles.notBuilt}>{activeTab} isn&apos;t built yet.</p>}
      </div>
    </>
  );
};

export default Tabs;
