"use client";

import React, { useState } from "react";
import styles from "./CompanionRail.module.scss";

type Props = {
  children: React.ReactNode;
};

const CompanionRail = ({ children }: Props) => {
  const [openId, setOpenId] = useState<string | null>(null);
  const [status, setStatus] = useState<Record<string, "working" | "done">>({});
  const [history, setHistory] = useState<
    { id: string; text: string; at: string }[]
  >([]);
  const tasks = [
    {
      id: "parker",
      title: "Call Parker trial",
      actionLabel: "Prepare call",
      explanation:
        "Jordan's first class is at 4:15. Guardian hasn't confirmed.",
      details: [
        { label: "Call", value: "Parker Family (guardian)" },
        { label: "Purpose", value: "Confirm 4:15 Pee Wee trial" },
      ],
    },
    {
      id: "lee",
      title: "Review Lee waiver",
      actionLabel: "Send waiver reminder",
      explanation: "Riley's trial is at 5:00. Waiver is unsigned.",
      details: [
        { label: "To", value: "Lee Family (guardian)" },
        {
          label: "Message",
          value: "Please sign Riley's waiver before today's class.",
        },
      ],
    },
    {
      id: "testing",
      title: "Prepare testing form",
      actionLabel: "Prepare testing roster",
      explanation: "September test: 3 students at 85%+ readiness.",
      details: [
        { label: "Students", value: "Noah Patel · Maya Chen · Priya Shah" },
        { label: "Approval", value: "Instructor sign-off required" },
      ],
    },
  ];

  const approve = async (task: (typeof tasks)[number]) => {
    setStatus((s) => ({ ...s, [task.id]: "working" }));
    await new Promise((r) => setTimeout(r, 900)); // simulate backend running
    setStatus((s) => ({ ...s, [task.id]: "done" }));
    setHistory((h) => [
      {
        id: `${task.id}-${Date.now()}`,
        text: `${task.actionLabel} · via Companion`,
        at: new Date().toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        }),
      },
      ...h,
    ]);
  };

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
          Front desk context
        </div>

        <h3>Three tasks due</h3>
        <div className={styles.tasks}>
          {tasks.map((task) => (
            <div key={task.id} className={styles.task}>
              <span>{task.title}</span>
              <button
                onClick={() => setOpenId(openId === task.id ? null : task.id)}
              >
                {openId === task.id ? "Close" : "Open"}
              </button>

              {openId === task.id && (
                <div className={styles.details}>
                  <p>{task.explanation}</p>
                  <dl>
                    {task.details.map((d) => (
                      <div key={d.label}>
                        <dt>{d.label}</dt>
                        <dd>{d.value}</dd>
                      </div>
                    ))}
                  </dl>

                  {status[task.id] === "working" && (
                    <p className={styles.working}>Working…</p>
                  )}
                  {status[task.id] === "done" && (
                    <p className={styles.done}>✓ Done</p>
                  )}
                  {!status[task.id] && (
                    <button
                      className={styles.approve}
                      onClick={() => approve(task)}
                    >
                      {task.actionLabel}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {history.length > 0 && (
          <div className={styles.history}>
            <h3>History</h3>
            {history.map((h) => (
              <p key={h.id} className={styles.historyItem}>
                <span className={styles.historyTime}>{h.at}</span> {h.text}
              </p>
            ))}
          </div>
        )}
      </div>

      <div className={styles.companionRail__agentComposer}>
        <input type="text" placeholder="Ask the agent..." />
        <button className={styles.agentBtn}>↑</button>
      </div>
    </div>
  );
};

export default CompanionRail;
