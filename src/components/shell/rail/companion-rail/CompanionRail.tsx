"use client";

import React from "react";
import FollowUpComposer from "@/components/ai/follow-up/FollowUpComposer";
import followupStyles from "@/components/ai/follow-up/FollowUp.module.scss";
import useCompanion from "./useCompanion";
import TaskItem from "./TaskItem";
import ReceiptHistory from "./ReceiptHistory";
import AgentComposer from "./AgentComposer";
import MemberIntel from "./MemberIntel";
import SuggestedCard from "./SuggestedCard";
import styles from "./CompanionRail.module.scss";

type Props = {
  children?: React.ReactNode;
};

const CompanionRail = ({ children }: Props) => {
  const companion = useCompanion();
  const featured = companion.featured;

  return (
    <div className={styles.companionRail}>
      <div className={styles.companionRail__header}>
        <h2>
          <span className={styles.companionRail__header__icon}>✦</span>Do For Me
        </h2>
      </div>

      <div className={styles.companionRail__state}>
        {companion.contextStatus === "loading" && (
          <p className={styles.contextNote}>Loading…</p>
        )}
        {companion.contextStatus === "unavailable" && (
          <p className={styles.contextNote}>
            Suggestions aren&apos;t available right now.
          </p>
        )}

        {companion.label && (
          <div className={styles.statusLine}>
            <div className={styles.statusIcon}></div>
            {companion.label}
          </div>
        )}
        {companion.heading && <h3>{companion.heading}</h3>}

        {companion.intel && <MemberIntel items={companion.intel} />}
        {featured && (
          <SuggestedCard
            suggestion={featured.suggestion}
            summary={featured.summary}
            open={companion.openId === featured.suggestion.id}
            status={companion.status[featured.suggestion.id]}
            onApprove={() => companion.approve(featured.suggestion)}
          />
        )}

        {companion.suggestions.length > 0 && (
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
        )}

        {companion.view.memberId && companion.followUpEnabled && <FollowUpComposer key={companion.view.key} sessions={companion.sessions || []} busy={companion.requestStatus === "thinking"} onPrepare={companion.request} />}
        {companion.answer && <div className={followupStyles.answer} role="status"><small>{companion.answer.mode}</small><p>{companion.answer.text}</p></div>}
        <ReceiptHistory receipts={companion.receipts} />
      </div>

      <AgentComposer
        status={companion.requestStatus}
        onRequest={companion.request}
        onTyping={companion.clearRequestStatus}
      />
    </div>
  );
};

export default CompanionRail;