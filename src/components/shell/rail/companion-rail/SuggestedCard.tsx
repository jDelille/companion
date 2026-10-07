"use client";

import { useState } from "react";
import type { Suggestion } from "@/domain/companion";
import type { TaskStatus } from "./useCompanion";
import Modal from "@/components/primitives/modal/Modal";
import { modals } from "@/components/people/member-card/memberModals";
import styles from "./CompanionRail.module.scss";

type Props = {
  suggestion: Suggestion;
  summary: string;
  open: boolean;
  status?: TaskStatus;
  onApprove: () => void;
};

const aiModal = modals.ask;

const SuggestedCard = ({ suggestion, summary, open, status, onApprove }: Props) => {
  const [explainOpen, setExplainOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  return (
    <div className={styles.suggested}>
      <p className={styles.suggestedLabel}>Suggested</p>
      <h4>{suggestion.title}</h4>
      <p>{summary}</p>

      <div className={styles.suggestedActions}>
        <button onClick={() => setExplainOpen((o) => !o)}>Explain</button>
        <button onClick={() => setAiOpen(true)}>Do For Me</button>
      </div>

      {status === "working" && !open && <p className={styles.working}>Working…</p>}
      {status === "done" && !open && <p className={styles.done}>✓ Done</p>}
      {/* Do For Me again: a new attempt after failed, the same command after notConfirmed */}
      {status === "failed" && !open && (
        <p className={styles.failed}>Couldn&apos;t complete this. Nothing was changed.</p>
      )}
      {status === "notConfirmed" && !open && (
        <p className={styles.notConfirmed}>Not confirmed. It may not have run.</p>
      )}

      {/* {explainOpen && <p className={styles.explain}>{suggestion.explanation}</p>} */}

      {/* {open && (
        <div className={styles.details}>
          <dl>
            {suggestion.preview.map((p) => (
              <div key={p.label}>
                <dt>{p.label}</dt>
                <dd>{p.value}</dd>
              </div>
            ))}
          </dl>
          {status === "working" && <p className={styles.working}>Working…</p>}
          {status === "done" && <p className={styles.done}>✓ Done</p>}
          {!status && (
            <button className={styles.approve} onClick={onApprove}>
              {suggestion.actionLabel}
            </button>
          )}
        </div>
      )} */}

      <Modal
        open={aiOpen}
        label={aiModal.label}
        title={aiModal.title}
        description={aiModal.description}
        onClose={() => setAiOpen(false)}
      >
        <aiModal.Body
          onDone={() => {
            setAiOpen(false);
            onApprove(); // confirming the proposal runs the suggestion
          }}
          onCancel={() => setAiOpen(false)}
        />
      </Modal>
    </div>
  );
};

export default SuggestedCard;