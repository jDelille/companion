"use client";

import { useState, type ReactNode } from "react";
import styles from "./Tabs.module.scss";

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
  const panel = panels[activeTab];

  return (
    <>
      <div className={styles.objectTabs} role="tablist">
        {TAB_NAMES.map((tab) => (
          <button
            key={tab}
            id={tabId(tab)}
            role="tab"
            aria-selected={activeTab === tab}
            aria-controls="member-tab-panel"
            disabled={!panels[tab]}
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
