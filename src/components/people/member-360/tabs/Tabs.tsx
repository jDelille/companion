"use client";

import { useState } from "react";
import styles from "./Tabs.module.scss";

const tabs = [
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
];

const Tabs = () => {
  const [activeTab, setActiveTab] = useState("Overview");

  return (
    <div className={styles.objectTabs} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab}
          role="tab"
          aria-selected={activeTab === tab}
          className={activeTab === tab ? styles.isActive : ""}
          onClick={() => setActiveTab(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
};

export default Tabs;
