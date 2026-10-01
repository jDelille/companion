// Today, Maya Chen, September test
"use client";

import React, { useState } from "react";
import styles from "./Workspace.module.scss";

const WorkspaceTabs = () => {
  const [activeTab, setActiveTab] = useState("Today");

  // "Maya Chen" and "September Test" hidden for now; add them back here when they have views
  const [tabs, setTabs] = useState(["Today"]);

  const closeTab = (tab: string) => setTabs((t) => t.filter((x) => x !== tab));

  // Only Today has a view to switch to for now
  const clickable = (tab: string) => tab === "Today";

  return (
    <div className={styles.workspace__tabs}>
      <ul>
        {tabs.map((tab) => (
          <li
            key={tab}
            className={`${styles.tab} ${activeTab === tab ? styles.active : ""}`}
          >
            <button
              onClick={() => setActiveTab(tab)}
              disabled={!clickable(tab)}
            >
              {tab}
            </button>
            {activeTab !== tab && (
              <button
                className={styles.tabClose}
                onClick={() => closeTab(tab)}
                aria-label={`Close ${tab}`}
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default WorkspaceTabs;
