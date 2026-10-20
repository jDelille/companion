"use client";
import { useState } from "react";
import type { Suggestion } from "@/domain/companion";
import type { TaskStatus } from "./useCompanion";
import styles from "./CompanionRail.module.scss";

type Props = {
  suggestion: Suggestion;
  summary: string;
  open: boolean;
  status?: TaskStatus;
  onDoForMe: () => void; // opens the Do For Me panel, where staff review and apply it
};
export default function SuggestedCard({
  suggestion,
  summary,
  status,
  onDoForMe,
}: Props) {
  const [explainOpen, setExplainOpen] = useState(false);
  return (
    <div className={styles.suggested}>
      <p className={styles.suggestedLabel}>Suggested</p>
      <h4>{suggestion.title}</h4>
      <p>{summary}</p>
      <div className={styles.suggestedActions}>
        <button onClick={() => setExplainOpen((value) => !value)}>
          Explain
        </button>
        <button onClick={onDoForMe}>Do For Me</button>
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
    </div>
  );
}
