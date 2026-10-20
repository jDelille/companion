"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "@/components/primitives/AppLink";
import { ShowRun } from "@/components/shell/rail/companion-rail/pageRun";
import { eligibleCandidates, matchTest, recognizeGoal } from "./contractRules";
import { useInvitationRun } from "./useInvitationRun";
import styles from "./ActionContract.module.scss";

// The Action contract page (doc "✦ ACTION CONTRACT", laid out like do-for-me-5):
// Goal, Scope, Will Do, Will Not, Approval, then Inspect / Edit / Approve.
// Do For Me runs the plan step by step (doc 45, shown in the rail's Work tab), stops at
// approval, and after Approve shows the receipt (doc 46). Everything comes from Odoo; the
// one write is an Odoo broadcast saved as awaiting approval. Nothing is sent from here.

type Props = { goal: string; liveTest: boolean };

export default function ActionContract({ goal, liveTest }: Props) {
  const router = useRouter();
  const kind = goal ? recognizeGoal(goal) : null;

  // The contract's settings; Edit changes them. The message is always written by staff.
  const [testId, setTestId] = useState<string | null>(null); // null = the matched test
  const [audienceId, setAudienceId] = useState<string | null>(null); // null = the matched audience
  const [channel, setChannel] = useState("sms");
  const [purpose, setPurpose] = useState("service");
  const [message, setMessage] = useState("");
  const [inspecting, setInspecting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [newGoal, setNewGoal] = useState("");

  const run = useInvitationRun(liveTest && kind !== null, goal, { audienceId, channel, purpose, message });
  const audience = run.audience;
  const audiences = run.broadcasts?.audiences ?? [];

  // No goal yet: ask for one
  if (!goal) {
    return (
      <section className={styles.page}>
        <span className={styles.kicker}>✦ Action contract</span>
        <h1>What should Do For Me prepare?</h1>
        <form
          className={styles.goalForm}
          onSubmit={(event) => {
            event.preventDefault();
            if (newGoal.trim()) router.push(`/intel?goal=${encodeURIComponent(newGoal.trim())}`);
          }}
        >
          <input
            value={newGoal}
            maxLength={200}
            onChange={(event) => setNewGoal(event.target.value)}
            placeholder="Describe the goal, e.g. invite testing candidates"
            aria-label="Goal"
          />
          <button type="submit" className={styles.primary} disabled={!newGoal.trim()}>
            Prepare contract
          </button>
        </form>
        <p className={styles.note}>Belt-testing invitations are the only kind of contract so far.</p>
      </section>
    );
  }

  if (!kind) {
    return (
      <section className={styles.page}>
        <span className={styles.kicker}>✦ Action contract</span>
        <h1>{goal}</h1>
        <p className={styles.note}>
          Do For Me can only prepare belt-testing invitations so far. <Link href="/intel">Try another goal</Link>
        </p>
      </section>
    );
  }

  const eligibility = run.eligibility;
  const candidates = eligibility ? eligibleCandidates(eligibility) : [];
  const matchedTest = eligibility ? matchTest(goal, eligibility.tests) : null;
  const test = eligibility?.tests.find((item) => item.id === (testId ?? matchedTest?.id)) ?? null;
  const awaitingApproval = run.broadcasts?.broadcasts.filter((item) => item.state === "awaiting_approval").length ?? 0;

  // Edit is open until the invitation is prepared; after that, Change plan starts over
  const prepared = run.preview !== null;
  const locked = prepared || run.state === "done";
  const waitingForApproval = run.state === "waiting" && prepared && run.receipt === null;

  const invitationDetail = !audience
    ? "Choose an Odoo audience in Edit (none is set up for testing candidates)."
    : !message.trim()
      ? `To ${audience.label} by ${channel.toUpperCase()}. Write the message in Edit.`
      : `To ${audience.label} by ${channel.toUpperCase()}, saved for approval.`;

  const changePlan = () => {
    run.stop();
    setEditing(true);
  };

  return (
    <section className={styles.page}>
      {/* The rail's Work tab shows the run; History shows the receipt */}
      {liveTest && (
        <ShowRun
          run={{
            title: goal,
            state: run.state,
            steps: run.steps,
            receipt: run.receipt,
            pause: run.pause,
            resume: run.resume,
            stop: run.stop,
            changePlan,
          }}
        />
      )}

      <nav className={styles.crumbs}>
        <Link href="/">← Today</Link>
        <span className={styles.kicker}>✦ Action contract</span>
      </nav>

      <header className={styles.header}>
        <div>
          <small className={styles.label}>Goal</small>
          <h1>{goal}</h1>
          <p>A bounded plan from live testing eligibility and messaging records.</p>
        </div>
        <span className={styles.pill}>{run.state === "done" ? "Saved for approval" : "Approval required"}</span>
      </header>

      {!liveTest && <p className={styles.note}>Action contracts need Odoo. They aren’t available with sample data.</p>}
      {run.error && <p className={styles.error} role="alert">{run.error}</p>}

      {liveTest && (
        <>
          <div className={styles.scope}>
            <div>
              <small className={styles.label}>Scope</small>
              <p>{test ? `${test.name} · ${test.date}` : eligibility ? "No test chosen. Pick one in Edit." : "Reading testing records…"}</p>
            </div>
            <strong>{eligibility ? `${candidates.length} ${candidates.length === 1 ? "student" : "students"}` : "—"}</strong>
          </div>

          {inspecting && eligibility && (
            <div className={styles.inspect}>
              <small className={styles.label}>Eligible for their next belt</small>
              {candidates.length ? (
                <ul>
                  {candidates.map((candidate) => (
                    <li key={candidate.memberId}>
                      <Link href={`/people/${candidate.memberId}`}>{candidate.name}</Link>
                      <span>{candidate.nextRank ? `→ ${candidate.nextRank.name}` : ""}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.note}>No students are eligible right now.</p>
              )}
            </div>
          )}

          {editing && (
            <div className={styles.edit}>
              {locked && run.state !== "stopped" && (
                <p className={`${styles.note} ${styles.wide}`}>The invitation is prepared. Use Change plan to edit it.</p>
              )}
              <label>
                Test
                <select value={test?.id ?? ""} onChange={(event) => setTestId(event.target.value)} disabled={locked && run.state !== "stopped"}>
                  <option value="">No test chosen</option>
                  {eligibility?.tests.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} · {item.date}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Audience
                <select value={audience?.id ?? ""} onChange={(event) => setAudienceId(event.target.value)} disabled={locked && run.state !== "stopped"}>
                  <option value="">Choose</option>
                  {audiences.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Channel
                <select value={channel} onChange={(event) => setChannel(event.target.value)} disabled={locked && run.state !== "stopped"}>
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                </select>
              </label>
              <label>
                Purpose
                <select value={purpose} onChange={(event) => setPurpose(event.target.value)} disabled={locked && run.state !== "stopped"}>
                  <option value="service">Service notice</option>
                  <option value="marketing">Marketing (needs consent)</option>
                </select>
              </label>
              <label className={styles.wide}>
                Invitation message
                <textarea
                  value={message}
                  maxLength={channel === "email" ? 5000 : 1000}
                  rows={4}
                  onChange={(event) => setMessage(event.target.value)}
                  disabled={locked && run.state !== "stopped"}
                />
              </label>
            </div>
          )}

          <div className={styles.cards}>
            <article>
              <small className={styles.label}>Will do</small>
              <ul>
                <li>
                  <span className={audience && message.trim() ? styles.yes : styles.pending}>✓</span>
                  <span>
                    Prepare invitations
                    <small>{invitationDetail}</small>
                  </span>
                </li>
                <li>
                  <span className={styles.off}>–</span>
                  <span>
                    Create registration links
                    <small>Not connected to Odoo yet.</small>
                  </span>
                </li>
                <li>
                  <span className={styles.off}>–</span>
                  <span>
                    Create instructor tasks
                    <small>Not connected to Odoo yet.</small>
                  </span>
                </li>
              </ul>
            </article>
            <article>
              <small className={styles.label}>Will not</small>
              <ul>
                <li>
                  <span className={styles.no}>×</span>Promote students
                </li>
                <li>
                  <span className={styles.no}>×</span>Charge testing fees
                </li>
                <li>
                  <span className={styles.no}>×</span>Modify ranks
                </li>
              </ul>
            </article>
          </div>

          <div className={styles.checkpoint}>
            <small className={styles.label}>Approval</small>
            <strong>Required before communication</strong>
            <p>
              Communication can’t be sent until an authorized user approves it. Approving saves the invitation in
              Odoo as awaiting approval; sending is a separate approval in Messaging &amp; consent.
              {awaitingApproval > 0 && ` ${awaitingApproval} ${awaitingApproval === 1 ? "broadcast is" : "broadcasts are"} already waiting there.`}
            </p>
          </div>

          {waitingForApproval && run.preview && (
            <div className={styles.review} role="status">
              <strong>
                Approve to save the invitation: {run.preview.recipientCount}{" "}
                {run.preview.recipientCount === 1 ? "recipient" : "recipients"} in {run.preview.audience}.
              </strong>
              <p>Odoo froze this recipient list. Nothing is queued or sent.</p>
            </div>
          )}

          {/* AI completion receipt (doc 46). No undo: a saved broadcast is cancelled through Odoo. */}
          {run.receipt && (
            <div className={styles.receipt} role="status">
              <small className={styles.label}>✓ Completed</small>
              <strong>{run.receipt.title}</strong>
              <ul>
                {run.receipt.lines.map((line) => (
                  <li key={line.text} className={line.ok ? "" : styles.off}>
                    {line.ok ? "✓" : "–"} {line.text}
                  </li>
                ))}
              </ul>
              <small className={styles.label}>Audit ID</small>
              <code>{run.receipt.auditId}</code>
              <Link href={run.receipt.detailsHref}>View details →</Link>
            </div>
          )}

          <footer className={styles.footer}>
            <button type="button" className={styles.secondary} onClick={() => setInspecting((open) => !open)} aria-expanded={inspecting}>
              Inspect
            </button>
            {run.state === "stopped" || run.state === "failed" ? (
              <button type="button" className={styles.secondary} onClick={run.restart}>
                Start again
              </button>
            ) : (
              <button type="button" className={styles.secondary} onClick={() => setEditing((open) => !open)} aria-expanded={editing}>
                Edit
              </button>
            )}
            <button type="button" className={styles.primary} onClick={run.approve} disabled={!waitingForApproval}>
              {run.state === "done" ? "Approved" : "Approve"}
            </button>
          </footer>
        </>
      )}
    </section>
  );
}
