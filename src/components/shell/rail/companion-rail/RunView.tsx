"use client";

import Link from "@/components/primitives/AppLink";
import type { PageRun, RunStepStatus } from "./pageRun";
import styles from "./DoForMe.module.scss";

// The rail's view of a running plan (doc 45 "Agent execution state") and its receipt
// (doc 46 "AI completion receipt"). There's no Undo: what Odoo saved is reversed
// through Odoo's own reviewed action (e.g. cancelling the broadcast).

const marks: Record<RunStepStatus, string> = {
  done: "✓",
  running: "●",
  waiting: "◐",
  pending: "○",
  skipped: "–",
  failed: "✕",
};

const stateLabels: Record<PageRun["state"], string> = {
  running: "Running",
  paused: "Paused",
  waiting: "Waiting for you",
  stopped: "Stopped · nothing was saved after the last ✓",
  done: "Completed",
  failed: "Stopped by a problem",
};

export default function RunView({ run, receiptOnly = false }: { run: PageRun; receiptOnly?: boolean }) {
  const active = run.state === "running" || run.state === "paused" || run.state === "waiting";
  return (
    <>
      {!receiptOnly && (
        <>
          <p className={styles.pageStatus} data-state={run.state}>
            <i aria-hidden="true" />
            {stateLabels[run.state]}
          </p>
          <h3 className={styles.pageHeading}>{run.title}</h3>
          <ol className={styles.runSteps} aria-label="Plan steps">
            {run.steps.map((step, index) => (
              <li key={index} data-status={step.status}>
                <span aria-hidden="true">{marks[step.status]}</span>
                <span>
                  {step.label}
                  {step.detail && <small>{step.detail}</small>}
                </span>
              </li>
            ))}
          </ol>
          {active && (
            <div className={styles.runControls}>
              {run.state === "paused" ? (
                <button type="button" onClick={run.resume}>
                  Resume
                </button>
              ) : (
                <button type="button" onClick={run.pause}>
                  Pause
                </button>
              )}
              <button type="button" onClick={run.stop}>
                Stop
              </button>
              <button type="button" onClick={run.changePlan}>
                Change plan
              </button>
            </div>
          )}
        </>
      )}

      {run.receipt && (
        <section className={styles.runReceipt} aria-label="Completion receipt">
          <small>✓ Completed</small>
          <strong>{run.receipt.title}</strong>
          <ul>
            {run.receipt.lines.map((line) => (
              <li key={line.text} data-ok={line.ok}>
                {line.ok ? "✓" : "–"} {line.text}
              </li>
            ))}
          </ul>
          <small className={styles.runAuditLabel}>Audit ID</small>
          <code>{run.receipt.auditId}</code>
          <Link href={run.receipt.detailsHref}>View details →</Link>
        </section>
      )}
    </>
  );
}
