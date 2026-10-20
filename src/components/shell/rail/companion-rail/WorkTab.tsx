import type { Suggestion } from "@/domain/companion";
import type { TaskStatus } from "./useCompanion";
import styles from "./DoForMe.module.scss";

type Props = {
  suggestion: Suggestion | null;
  status?: TaskStatus;
  context?: string; // "Connected Odoo records", from the Companion context
  onApply: () => void;
  onNotNow: () => void;
  onEvidence: () => void;
  onHistory: () => void;
};

const riskLabels = {
  low: "Low risk",
  medium: "Medium risk",
  high: "High risk",
};

// The line at the top of Work, like the mockup's "WAITING FOR APPROVAL"
const stateLabels = {
  waiting: "Waiting for approval",
  working: "Working",
  done: "Done",
  failed: "Couldn't complete",
  notConfirmed: "Not confirmed",
};

// Do For Me's Work tab: the picked task's review. Everything here comes from the
// suggestion the Odoo backend sent. Apply goes through the Companion approval
// route: nothing saves until staff press it, and Odoo saves a receipt.
const WorkTab = ({ suggestion, status, context, onApply, onNotNow, onEvidence, onHistory }: Props) => {
  if (!suggestion) {
    return (
      <p className={styles.why}>
        Nothing picked yet. Press Do For Me on a suggestion in Plan, or ask the agent below.
      </p>
    );
  }

  const state = status ?? "waiting";
  const canApply = !status || status === "failed";

  return (
    <>
      <p className={styles.state} data-status={state}>
        <span aria-hidden="true" className={styles.stateDot} />
        {stateLabels[state]}
        {context ? ` · ${context}` : ""}
      </p>

      <h3 className={styles.workTitle}>{suggestion.title}</h3>
      <p className={styles.why}>{suggestion.explanation}</p>
      <p className={styles.risk} data-risk={suggestion.risk}>
        {riskLabels[suggestion.risk]}
      </p>

      {suggestion.preview.length > 0 && (
        <>
          <p className={styles.label}>What will change</p>
          <dl className={styles.preview}>
            {suggestion.preview.map((row) => (
              <div key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        </>
      )}

      <p className={styles.executed} data-status={state} role="status">
        {state === "waiting" && "No changes have executed."}
        {state === "working" && "Working…"}
        {state === "done" && "✓ Saved in Odoo with a receipt."}
        {state === "failed" && "Nothing was changed."}
        {state === "notConfirmed" && "It may not have run. Check History before trying again."}
      </p>

      <div className={styles.actions}>
        {status === "done" ? (
          <button type="button" className={styles.next} onClick={onHistory}>
            See the receipt →
          </button>
        ) : (
          <>
            <button type="button" className={styles.next} onClick={onNotNow}>
              Not now
            </button>
            <button type="button" className={styles.next} onClick={onEvidence}>
              Why? →
            </button>
          </>
        )}
        {canApply && (
          <button type="button" className={styles.apply} onClick={onApply}>
            {suggestion.actionLabel}
          </button>
        )}
        {status === "notConfirmed" && (
          <button type="button" className={styles.apply} onClick={onApply}>
            Try again
          </button>
        )}
      </div>
    </>
  );
};

export default WorkTab;
