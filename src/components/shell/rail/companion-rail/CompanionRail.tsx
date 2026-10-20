"use client";

import React, { useEffect, useState } from "react";
import FollowUpComposer from "@/components/ai/follow-up/FollowUpComposer";
import followupStyles from "@/components/ai/follow-up/FollowUp.module.scss";
import useCompanion from "./useCompanion";
import TaskItem from "./TaskItem";
import AgentComposer from "./AgentComposer";
import MemberIntel from "./MemberIntel";
import SuggestedCard from "./SuggestedCard";
import TodayBrief from "./TodayBrief";
import WorkTab from "./WorkTab";
import EvidenceTab from "./EvidenceTab";
import { usePathname } from "next/navigation";
import { viewFromPath } from "@/integrations/companion";
import styles from "./CompanionRail.module.scss";
import doForMeStyles from "./DoForMe.module.scss";
import type { Suggestion } from "@/domain/companion";
import { ASK_AGENT_EVENT, type AskAgentDetail } from "@/components/shell/workspace/shellEvents";
import { usePageEvidence } from "./pageEvidence";
import { usePageRun } from "./pageRun";
import RunView from "./RunView";
import Link from "@/components/primitives/AppLink";

type Props = {
  children?: React.ReactNode;
};

type Tab = "plan" | "work" | "evidence" | "history";

const tabs: { id: Tab; label: string }[] = [
  { id: "plan", label: "Plan" },
  { id: "work", label: "Work" },
  { id: "evidence", label: "Evidence" },
  { id: "history", label: "History" },
];

// "2026-10-07T14:14:00Z" -> "2:14 PM", in the viewer's own time zone
const formatTime = (iso: string) => {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
};

// The right rail is Do For Me (Jodi's mockup): Plan shows what the Companion
// suggests for this page, Work shows the picked task, Evidence shows why and the
// Odoo records read, History lists the receipts Odoo saved. The picked task's
// review, with Apply, is in Work (nothing runs until staff press it).
const CompanionRail = ({ children }: Props) => {
  const companion = useCompanion();
  const featured = companion.featured;
  const pathname = usePathname();
  const onToday = pathname === "/";

  // The open tab and the picked task, and on which page.
  // pageTop: a page's "Do For Me" button (e.g. on a member) asked for that page's
  // top suggestion, which may still be loading. Moving to another page starts on Plan again.
  const [doForMe, setDoForMe] = useState<{
    page: string;
    tab: Tab;
    suggestion: Suggestion | null;
    pageTop: boolean;
  } | null>(null);
  useEffect(() => {
    const onDoForMe = (event: Event) => {
      const page = window.location.pathname;
      // The button says which member it's for. Only aim at that member's task when
      // this page's Companion context is that member's.
      const detail = (event as CustomEvent<{ memberId?: string } | null>).detail;
      const memberId = detail?.memberId;
      if (memberId && viewFromPath(page).memberId !== memberId) {
        setDoForMe({ page, tab: "plan", suggestion: null, pageTop: false });
        return;
      }
      setDoForMe({ page, tab: "work", suggestion: null, pageTop: true });
    };
    window.addEventListener("dojang:do-for-me", onDoForMe);
    return () => window.removeEventListener("dojang:do-for-me", onDoForMe);
  }, []);

  // A question from the top bar's search box: ask it here, answer shows in Plan
  const request = companion.request;
  useEffect(() => {
    const onAsk = (event: Event) => {
      const text = (event as CustomEvent<AskAgentDetail>).detail?.text;
      if (!text) return;
      setDoForMe({ page: window.location.pathname, tab: "plan", suggestion: null, pageTop: false });
      request(text);
    };
    window.addEventListener(ASK_AGENT_EVENT, onAsk);
    return () => window.removeEventListener(ASK_AGENT_EVENT, onAsk);
  }, [request]);

  // A page with its own evidence (the Proposed edit page) opens on Evidence
  const pageEvidence = usePageEvidence();
  // A page running a plan (Action contract) opens on Work, where the run is
  const pageRun = usePageRun();

  const onThisPage = doForMe !== null && doForMe.page === pathname;
  const tab: Tab = onThisPage ? doForMe.tab : pageRun ? "work" : pageEvidence ? "evidence" : "plan";
  const pickedOnThisPage = onThisPage ? doForMe.suggestion : null;

  const pageSuggestions = featured
    ? [featured.suggestion, ...companion.suggestions]
    : companion.suggestions;

  // The task Work and Evidence are about: the one picked with Do For Me
  // (or the page's top suggestion when a page button asked), otherwise the task open
  // in Plan (a typed request's task arrives open)
  let picked: Suggestion | null = null;
  if (pickedOnThisPage) {
    // The live copy when it's still listed, otherwise the one that was opened
    picked = pageSuggestions.find((task) => task.id === pickedOnThisPage.id) ?? pickedOnThisPage;
  } else if (onThisPage && doForMe.pageTop) {
    picked = pageSuggestions[0] ?? null;
  }
  if (!picked && companion.openId) {
    picked = pageSuggestions.find((task) => task.id === companion.openId) ?? null;
  }

  const showTab = (next: Tab) => {
    setDoForMe({ page: pathname, tab: next, suggestion: picked, pageTop: false });
  };
  const goal = picked ?? pageSuggestions[0] ?? null;
  // Inspect (Evidence) or Review Plan (Work) for the goal's task
  const aimAt = (suggestion: Suggestion, next: Tab) => {
    setDoForMe({ page: pathname, tab: next, suggestion, pageTop: false });
  };
  // Do For Me on a task: Work shows its review, with Apply
  const doTask = (suggestion: Suggestion) => {
    setDoForMe({ page: pathname, tab: "work", suggestion, pageTop: false });
  };

  // The picked task's own receipt shows first
  const receipts = picked
    ? [
        ...companion.receipts.filter((receipt) => receipt.suggestionId === picked.id),
        ...companion.receipts.filter((receipt) => receipt.suggestionId !== picked.id),
      ]
    : companion.receipts;

  return (
    <div className={styles.companionRail}>
      <div className={styles.companionRail__header}>
        <h2>
          <span className={styles.companionRail__header__icon}>✦</span>Do For Me
        </h2>
      </div>

      <div className={doForMeStyles.tabs} role="tablist" aria-label="Do For Me">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`do-for-me-tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls="do-for-me-tabpanel"
            onClick={() => showTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div
        className={styles.companionRail__state}
        role="tabpanel"
        id="do-for-me-tabpanel"
        aria-labelledby={`do-for-me-tab-${tab}`}
      >
        {tab === "plan" && (
          <>
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

            {/* The goal Do For Me is aimed at: the picked task, or this page's top suggestion */}
            {goal && (
              <div className={doForMeStyles.goal}>
                <small>Goal</small>
                <p>{goal.title}</p>
                <div className={doForMeStyles.goalActions}>
                  <button type="button" onClick={() => aimAt(goal, "evidence")}>
                    Inspect
                  </button>
                  <button type="button" onClick={() => aimAt(goal, "work")}>
                    Review Plan
                  </button>
                </div>
              </div>
            )}

            {companion.intel && <MemberIntel items={companion.intel} />}
            {featured && (
              <SuggestedCard
                suggestion={featured.suggestion}
                summary={featured.summary}
                open={companion.openId === featured.suggestion.id}
                status={companion.status[featured.suggestion.id]}
                onDoForMe={() => doTask(featured.suggestion)}
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
          </>
        )}

        {tab === "work" && pageRun && (
          <div className={doForMeStyles.body}>
            <RunView run={pageRun} />
          </div>
        )}

        {tab === "work" && !pageRun && (
          <div className={doForMeStyles.body}>
            <WorkTab
              suggestion={picked}
              status={picked ? companion.status[picked.id] : undefined}
              context={companion.label}
              onApply={() => {
                if (!picked) return;
                // Keep this task picked even if the page's top suggestion changes afterwards
                doTask(picked);
                companion.approve(picked);
              }}
              onNotNow={() => showTab("plan")}
              onEvidence={() => showTab("evidence")}
              onHistory={() => showTab("history")}
            />
          </div>
        )}

        {tab === "evidence" && (
          <div className={doForMeStyles.body}>
            {pageEvidence ? (
              <>
                {pageEvidence.status ? (
                  <p className={doForMeStyles.pageStatus}>
                    <i aria-hidden="true" />
                    {pageEvidence.status}
                  </p>
                ) : (
                  <p className={doForMeStyles.label}>Evidence</p>
                )}
                {pageEvidence.heading && <h3 className={doForMeStyles.pageHeading}>{pageEvidence.heading}</h3>}
                {pageEvidence.numbered ? (
                  <ol className={doForMeStyles.steps}>
                    {pageEvidence.items.map((item, index) => (
                      <li key={item.title}>
                        <span className={doForMeStyles.stepNumber}>{index + 1}</span>
                        <span>
                          <strong>{item.title}</strong>
                          <small>{item.detail}</small>
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <dl className={doForMeStyles.pageEvidence}>
                    {pageEvidence.items.map((item) => (
                      <div key={item.title}>
                        <dt>{item.title}</dt>
                        <dd>{item.detail}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {pageEvidence.footnote && <p className={doForMeStyles.pageFootnote}>{pageEvidence.footnote}</p>}
                {pageEvidence.sourcesHref && (
                  <Link href={pageEvidence.sourcesHref} className={doForMeStyles.sources}>
                    Inspect sources <span aria-hidden="true">→</span>
                  </Link>
                )}
              </>
            ) : (
              <EvidenceTab suggestion={picked} records={companion.records} />
            )}
          </div>
        )}

        {tab === "history" && (
          <div className={doForMeStyles.body}>
            {pageRun?.receipt && <RunView run={pageRun} receiptOnly />}
            {receipts.length === 0 && !pageRun?.receipt && (
              <p className={doForMeStyles.why}>Nothing has been done here yet.</p>
            )}
            {receipts.map((receipt) => (
              <p
                key={receipt.id}
                className={doForMeStyles.receipt}
                data-current={picked !== null && receipt.suggestionId === picked.id}
              >
                <span className={doForMeStyles.time}>{formatTime(receipt.at)}</span>{" "}
                {receipt.summary} · {receipt.actor}
              </p>
            ))}
          </div>
        )}
      </div>

      <AgentComposer
        status={companion.requestStatus}
        onRequest={(text) => {
          // The answer, or the task it prepares (which then shows in Work), lands in Plan
          setDoForMe({ page: pathname, tab: "plan", suggestion: null, pageTop: false });
          companion.request(text);
        }}
        onTyping={companion.clearRequestStatus}
      />
    </div>
  );
};

export default CompanionRail;
