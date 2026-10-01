"use client";

import React from "react";
import useCompanion from "./useCompanion";
import TaskItem from "./TaskItem";
import ReceiptHistory from "./ReceiptHistory";
import AgentComposer from "./AgentComposer";
import styles from "./CompanionRail.module.scss";

type Props = {
  children: React.ReactNode;
};

const CompanionRail = ({ children }: Props) => {
  const companion = useCompanion();

  return (
    <div className={styles.companionRail}>
      <div className={styles.companionRail__header}>
        <h2>
          <span className={styles.companionRail__header__icon}>✦</span>Do For Me
        </h2>
      </div>

      <div className={styles.companionRail__state}>
        <div className={styles.statusLine}>
          <div className={styles.statusIcon}></div>
          {companion.label}
        </div>

        <h3>{companion.heading}</h3>
        <div className={styles.tasks}>
          {companion.suggestions.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              open={companion.openId === task.id}
              status={companion.status[task.id]}
              onToggle={() => companion.toggle(task.id)}
              onApprove={() => companion.approve(task)}
            />
          ))}
        </div>

        <ReceiptHistory receipts={companion.receipts} />
      </div>

      <AgentComposer onRequest={companion.request} />
    </div>
  );
};

export default CompanionRail;
