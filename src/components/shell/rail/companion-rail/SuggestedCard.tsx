"use client";
import { useState } from "react";
import type { Suggestion } from "@/domain/companion";
import type { TaskStatus } from "./useCompanion";
import Modal from "@/components/primitives/modal/Modal";
import styles from "./CompanionRail.module.scss";
import modalStyles from "@/components/people/member-card/memberModals.module.scss";

type Props = {
  suggestion: Suggestion;
  summary: string;
  open: boolean;
  status?: TaskStatus;
  onApprove: () => void;
};
export default function SuggestedCard({
  suggestion,
  summary,
  status,
  onApprove,
}: Props) {
  const [explainOpen, setExplainOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  return (
    <div className={styles.suggested}>
      <p className={styles.suggestedLabel}>Suggested</p>
      <h4>{suggestion.title}</h4>
      <p>{summary}</p>
      <div className={styles.suggestedActions}>
        <button onClick={() => setExplainOpen((value) => !value)}>
          Explain
        </button>
        <button onClick={() => setReviewOpen(true)}>Review action</button>
      </div>
      {explainOpen && <p>{suggestion.explanation}</p>}
      {status === "working" && <p role="status">Working…</p>}
      {status === "done" && <p role="status">✓ Done</p>}
      {status === "failed" && (
        <p role="status">Couldn&apos;t complete this. Nothing was changed.</p>
      )}
      {status === "notConfirmed" && (
        <p role="status">Not confirmed. It may not have run.</p>
      )}
      <Modal
        open={reviewOpen}
        label="Review action"
        title={suggestion.title}
        description={suggestion.explanation}
        onClose={() => setReviewOpen(false)}
      >
        <dl className={modalStyles.details}>
          {suggestion.preview.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
        <div className={modalStyles.detailActions}>
          <button
            type="button"
            disabled={status === "working" || status === "done"}
            onClick={() => {
              setReviewOpen(false);
              onApprove();
            }}
          >
            {suggestion.actionLabel}
          </button>
        </div>
      </Modal>
    </div>
  );
}
