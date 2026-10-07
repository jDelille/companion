import type { Suggestion } from "@/domain/companion";
import type { TaskStatus } from "./useCompanion";
import styles from "./TaskItem.module.scss";

type Props = {
  task: Suggestion;
  open: boolean;
  status?: TaskStatus;
  onToggle: () => void;
  onApprove: () => void;
};

const TaskItem = ({ task, open, status, onToggle, onApprove }: Props) => {
  return (
    <div className={styles.task}>
      <span>{task.title}</span>
      <button className={styles.toggle} onClick={onToggle}>
        {open ? "Close" : "Open"}
      </button>

      {open && (
        <div className={styles.details}>
          <p>{task.explanation}</p>
          <dl>
            {task.preview.map((d) => (
              <div key={d.label}>
                <dt>{d.label}</dt>
                <dd>{d.value}</dd>
              </div>
            ))}
          </dl>

          {status === "working" && <p className={styles.working}>Working…</p>}
          {status === "done" && <p className={styles.done}>✓ Done</p>}
          {status === "failed" && (
            <p className={styles.failed}>Couldn&apos;t complete this. Nothing was changed.</p>
          )}
          {status === "notConfirmed" && (
            <p className={styles.notConfirmed}>
              Not confirmed. It may not have run.
            </p>
          )}
          {(!status || status === "failed") && (
            <button className={styles.approve} onClick={onApprove}>
              {task.actionLabel}
            </button>
          )}
          {status === "notConfirmed" && (
            <button className={styles.approve} onClick={onApprove}>
              Try again
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskItem;
