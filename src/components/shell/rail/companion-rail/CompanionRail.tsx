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
import TodayBrief from "./TodayBrief";
import { usePathname } from "next/navigation";
import styles from "./CompanionRail.module.scss";

type Props = {
  children?: React.ReactNode;
};

const CompanionRail = ({ children }: Props) => {
  const companion = useCompanion();
  const featured = companion.featured;
  const onToday = usePathname() === "/";

  return (
    <div className={styles.companionRail}>
      <div className={styles.companionRail__header}>
        <h2>
          <span className={styles.companionRail__header__icon}>✦</span>Companion
        </h2>
      </div>

      <div className={styles.companionRail__state}>
        <p className={styles.contextNote}>
          Ask a question or prepare an action for review.
        </p>
        {/* Placeholders the size of the status pill and task rows (Today has its own in TodayBrief) */}
        {companion.contextStatus === "loading" && !onToday && (
          <div className={styles.skeletonGroup} role="status" aria-label="Loading suggestions">
            <i className={`${styles.skeleton} ${styles.skeletonPill}`} aria-hidden="true" />
            <i className={`${styles.skeleton} ${styles.skeletonHeading}`} aria-hidden="true" />
            {[1, 2, 3].map((placeholder) => (
              <i key={placeholder} className={`${styles.skeleton} ${styles.skeletonRow}`} aria-hidden="true" />
            ))}
          </div>
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
        {/* On Today the Companion greets and lists what needs attention, instead of a generic heading */}
        {onToday ? <TodayBrief /> : companion.heading && <h3>{companion.heading}</h3>}

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

        {companion.view.memberId && companion.followUpEnabled && (
          <FollowUpComposer
            key={companion.view.key}
            sessions={companion.sessions || []}
            busy={companion.requestStatus === "thinking"}
            onPrepare={companion.request}
          />
        )}
        {companion.answer && (
          <div className={followupStyles.answer} role="status">
            <small>{companion.answer.mode}</small>
            <p>{companion.answer.text}</p>
          </div>
        )}
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
