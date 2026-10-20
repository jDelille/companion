"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "@/components/primitives/AppLink";
import { explainHubError, runHubAction } from "@/domain/hub-actions";
import { ShowEvidence } from "@/components/shell/rail/companion-rail/pageEvidence";
import { callHub } from "@/components/people/member-360/edit-leaf/memberEdits";
import {
  eligibleCandidates,
  matchTest,
  matchTestingAudience,
  recognizeGoal,
  type BroadcastContext,
  type TestingEligibility,
} from "./contractRules";
import styles from "./ActionContract.module.scss";

// The Action contract page (doc "✦ ACTION CONTRACT", laid out like do-for-me-5):
// Goal, Scope, Will Do, Will Not, Approval, then Inspect / Edit / Approve.
// Everything shown comes from Odoo. The only step Odoo can do is "Prepare invitations":
// Approve saves them as an Odoo broadcast awaiting approval. Nothing is sent from here.

type Props = { goal: string; liveTest: boolean };

type Loaded = { eligibility: TestingEligibility; broadcasts: BroadcastContext };

type BroadcastPreview = { audience: string; recipientCount: number; reviewToken: string };

export default function ActionContract({ goal, liveTest }: Props) {
  const router = useRouter();
  const kind = goal ? recognizeGoal(goal) : null;

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState("");

  // The contract's settings; Edit changes them. The message is always written by staff.
  const [testId, setTestId] = useState<string | null>(null); // null = the matched test
  const [audienceId, setAudienceId] = useState<string | null>(null); // null = the matched audience
  const [channel, setChannel] = useState("sms");
  const [purpose, setPurpose] = useState("service");
  const [message, setMessage] = useState("");

  const [inspecting, setInspecting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [preview, setPreview] = useState<BroadcastPreview | null>(null); // the approval review
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [requestKey] = useState(() => crypto.randomUUID()); // one Approve = one broadcast, even if retried

  const [newGoal, setNewGoal] = useState("");

  useEffect(() => {
    if (!liveTest || !kind) return;
    let current = true;
    Promise.all([callHub("testing_eligibility", { query: "" }, null), callHub("broadcast_context", {}, null)])
      .then(([eligibility, broadcasts]) => {
        if (current) setLoaded({ eligibility, broadcasts });
      })
      .catch((error: Error) => {
        if (current) setLoadError(explainHubError(error.message));
      });
    return () => {
      current = false;
    };
  }, [liveTest, kind]);

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

  const eligibility = loaded?.eligibility ?? null;
  const broadcastContext = loaded?.broadcasts ?? null;
  const candidates = eligibility ? eligibleCandidates(eligibility) : [];
  const matchedTest = eligibility ? matchTest(goal, eligibility.tests) : null;
  const test = eligibility?.tests.find((item) => item.id === (testId ?? matchedTest?.id)) ?? null;
  const matchedAudience = broadcastContext ? matchTestingAudience(broadcastContext.audiences) : null;
  const audience = broadcastContext?.audiences.find((item) => item.id === (audienceId ?? matchedAudience?.id)) ?? null;
  const saved = result?.ok === true;
  const canApprove = liveTest && audience !== null && message.trim() !== "" && !busy && !saved;

  // Why "Prepare invitations" can't run yet, or what it will do
  const invitationDetail = !audience
    ? "Choose an Odoo audience in Edit (none is set up for testing candidates)."
    : !message.trim()
      ? `To ${audience.label} by ${channel.toUpperCase()}. Write the message in Edit.`
      : `To ${audience.label} by ${channel.toUpperCase()}, saved for approval.`;

  // Approve: Odoo previews the frozen recipient list first
  async function reviewApproval() {
    if (!canApprove || !audience) return;
    setBusy(true);
    setResult(null);
    try {
      setPreview(await callHub("broadcast_preview", { channel, purpose, audience: audience.id, body: message.trim() }, null));
    } catch (error) {
      setResult({ ok: false, text: explainHubError((error as Error).message) });
    } finally {
      setBusy(false);
    }
  }

  async function confirmApproval() {
    if (!preview || !audience || busy) return;
    setBusy(true);
    const feedback = await runHubAction(
      () =>
        callHub(
          "create_broadcast",
          {
            channel,
            purpose,
            audience: audience.id,
            body: message.trim(),
            name: goal.slice(0, 120),
            reason: `Action contract: “${goal}”`,
            reviewToken: preview.reviewToken,
          },
          requestKey,
        ),
      async () => {},
      () => {},
    );
    setBusy(false);
    setResult({ ok: feedback.kind === "success", text: feedback.text });
    if (feedback.kind === "success") setPreview(null);
  }

  const awaitingApproval = broadcastContext?.broadcasts.filter((item) => item.state === "awaiting_approval").length ?? 0;

  return (
    <section className={styles.page}>
      {/* The rail: the contract's state and its steps, from the same records */}
      <ShowEvidence
        evidence={{
          status: saved ? "Saved for approval" : "Waiting for approval",
          heading: goal,
          numbered: true,
          items: [
            {
              title: "Eligibility",
              detail: eligibility ? `${candidates.length} ${candidates.length === 1 ? "candidate" : "candidates"} identified` : "Checking…",
            },
            { title: "Evaluations", detail: "No evaluation records in Odoo yet" },
            {
              title: "Communication",
              detail: saved ? "Saved in Messaging & consent; nothing sent" : "Blocked until approval",
            },
          ],
          footnote: saved ? "Invitation saved for approval. Nothing was sent." : "No changes have executed.",
          sourcesHref: "/hub?view=testing",
        }}
      />

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
        <span className={styles.pill}>Approval required</span>
      </header>

      {!liveTest && <p className={styles.note}>Action contracts need Odoo. They aren’t available with sample data.</p>}
      {loadError && <p className={styles.error} role="alert">{loadError}</p>}
      {liveTest && !loaded && !loadError && <p className={styles.note} role="status">Reading testing and messaging records…</p>}

      {loaded && (
        <>
          <div className={styles.scope}>
            <div>
              <small className={styles.label}>Scope</small>
              <p>{test ? `${test.name} · ${test.date}` : "No test chosen. Pick one in Edit."}</p>
            </div>
            <strong>
              {candidates.length} {candidates.length === 1 ? "student" : "students"}
            </strong>
          </div>

          {inspecting && (
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
              <label>
                Test
                <select value={test?.id ?? ""} onChange={(event) => setTestId(event.target.value)} disabled={busy || saved}>
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
                <select
                  value={audience?.id ?? ""}
                  onChange={(event) => {
                    setAudienceId(event.target.value);
                    setPreview(null);
                  }}
                  disabled={busy || saved}
                >
                  <option value="">Choose</option>
                  {broadcastContext?.audiences.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Channel
                <select
                  value={channel}
                  onChange={(event) => {
                    setChannel(event.target.value);
                    setPreview(null);
                  }}
                  disabled={busy || saved}
                >
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                </select>
              </label>
              <label>
                Purpose
                <select
                  value={purpose}
                  onChange={(event) => {
                    setPurpose(event.target.value);
                    setPreview(null);
                  }}
                  disabled={busy || saved}
                >
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
                  onChange={(event) => {
                    setMessage(event.target.value);
                    setPreview(null);
                  }}
                  disabled={busy || saved}
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

          {preview && (
            <div className={styles.review} role="status">
              <strong>
                Save the invitation for approval: {preview.recipientCount}{" "}
                {preview.recipientCount === 1 ? "recipient" : "recipients"} in {preview.audience}.
              </strong>
              <p>Odoo freezes this recipient list. Nothing is queued or sent.</p>
            </div>
          )}
          {result && (
            <p className={result.ok ? styles.note : styles.error} role={result.ok ? "status" : "alert"}>
              {result.text} {result.ok && <Link href="/hub?view=communications">Open Messaging &amp; consent →</Link>}
            </p>
          )}

          <footer className={styles.footer}>
            <button type="button" className={styles.secondary} onClick={() => setInspecting((open) => !open)} aria-expanded={inspecting}>
              Inspect
            </button>
            <button type="button" className={styles.secondary} onClick={() => setEditing((open) => !open)} aria-expanded={editing}>
              Edit
            </button>
            {preview ? (
              <button type="button" className={styles.primary} onClick={confirmApproval} disabled={busy}>
                {busy ? "Saving…" : "Confirm approval"}
              </button>
            ) : (
              <button type="button" className={styles.primary} onClick={reviewApproval} disabled={!canApprove}>
                {busy ? "Checking…" : saved ? "Approved" : "Approve"}
              </button>
            )}
          </footer>
        </>
      )}
    </section>
  );
}
