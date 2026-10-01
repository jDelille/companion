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
      <button onClick={onToggle}>{open ? "Close" : "Open"}</button>

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
          {!status && (
            <button className={styles.approve} onClick={onApprove}>
              {task.actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskItem;
