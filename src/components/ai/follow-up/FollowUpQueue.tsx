"use client";

import { useState } from "react";
import Modal from "@/components/primitives/modal/Modal";
import NavIcon from "@/components/shell/NavIcon";
import useCompanion from "@/components/shell/rail/companion-rail/useCompanion";
import workspace from "@/components/workspace/Workspace.module.scss";
import styles from "./FollowUpQueue.module.scss";

const followUpCapabilities = new Set([
  "crm.lead.prepare_follow_up",
  "crm.trial.prepare",
  "communication.prepare_email",
]);

// Preview review queue. Connected mode uses its authorized Odoo follow-up list.
export default function FollowUpQueue() {
  const companion = useCompanion();
  const [filter, setFilter] = useState<"pending" | "reviewed">("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const tasks = companion.suggestions.filter((task) =>
    followUpCapabilities.has(task.capability),
  );
  const reviewed = tasks.filter((task) => companion.status[task.id] === "done");
  const pending = tasks.filter((task) => companion.status[task.id] !== "done");
  const visible = filter === "pending" ? pending : reviewed;
  const selected = tasks.find((task) => task.id === selectedId);
  const status = selected ? companion.status[selected.id] : undefined;

  return (
    <section className={workspace.page}>
      <header className={workspace.heading}>
        <div>
          <div className={workspace.eyebrow}>
            A little attention goes a long way
          </div>
          <h1>Follow-ups</h1>
          <p>See who needs a check-in. Review the details before approving.</p>
        </div>
        <button className={workspace.quietButton} onClick={companion.refresh}>
          Refresh
        </button>
      </header>
      <div
        className={styles.filters}
        role="group"
        aria-label="Filter follow-ups"
      >
        <button
          aria-pressed={filter === "pending"}
          onClick={() => setFilter("pending")}
        >
          Needs review <span>{pending.length}</span>
        </button>
        <button
          aria-pressed={filter === "reviewed"}
          onClick={() => setFilter("reviewed")}
        >
          Reviewed <span>{reviewed.length}</span>
        </button>
      </div>
      <p className={styles.note}>
        Sample follow-ups. Approvals stay in this preview; no calls or messages
        are sent.
      </p>
      {companion.contextStatus === "loading" ? (
        <p className={workspace.empty} role="status">
          Loading follow-ups…
        </p>
      ) : companion.contextStatus === "unavailable" ? (
        <p className={workspace.empty} role="alert">
          Follow-ups couldn’t be loaded. Try Refresh.
        </p>
      ) : visible.length ? (
        <ul
          className={styles.queue}
          aria-label={
            filter === "pending"
              ? "Follow-ups needing review"
              : "Reviewed follow-ups"
          }
        >
          {visible.map((task) => (
            <li key={task.id}>
              <span className={styles.symbol} aria-hidden="true">
                <NavIcon name="followups" />
              </span>
              <div className={styles.taskText}>
                <h2>{task.title}</h2>
                <p>{task.explanation}</p>
                <small>
                  {companion.status[task.id] === "done"
                    ? "Reviewed · sample only"
                    : "Needs your review"}
                </small>
              </div>
              <button
                className={workspace.quietButton}
                onClick={() => setSelectedId(task.id)}
                aria-label={`${filter === "pending" ? "Review" : "View"} ${task.title}`}
              >
                {filter === "pending" ? "Review" : "View"}{" "}
                <span aria-hidden="true">→</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className={workspace.empty} role="status">
          <h2>
            {filter === "pending"
              ? "You’re all caught up."
              : "No reviewed follow-ups yet."}
          </h2>
          <p>
            {filter === "pending"
              ? "Your approved samples are in Reviewed."
              : "Approve a sample from Needs review to see it here."}
          </p>
        </div>
      )}
      <Modal
        open={!!selected}
        label="Review sample follow-up"
        title={selected?.title ?? "Follow-up"}
        description={selected?.explanation ?? ""}
        onClose={() => setSelectedId(null)}
      >
        {selected && (
          <>
            <dl className={styles.preview}>
              {selected.preview.map((item) => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
            <p className={styles.note}>
              This approval records a sample receipt. It does not contact
              anyone.
            </p>
            {status === "failed" && (
              <p role="alert">
                The approval failed. Nothing was changed; you can try again.
              </p>
            )}
            {status === "notConfirmed" && (
              <p role="alert">
                The result wasn’t confirmed. Retry checks the same approval
                safely.
              </p>
            )}
            {status === "done" ? (
              <>
                <p role="status">Reviewed · sample only</p>
                <button
                  className={workspace.button}
                  onClick={() => setSelectedId(null)}
                >
                  Done
                </button>
              </>
            ) : (
              <button
                className={workspace.button}
                disabled={status === "working"}
                onClick={() => void companion.approve(selected)}
              >
                {status === "working"
                  ? "Recording approval…"
                  : status === "notConfirmed"
                    ? "Retry approval"
                    : "Approve sample follow-up"}
              </button>
            )}
          </>
        )}
      </Modal>
    </section>
  );
}
