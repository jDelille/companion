import PlainButton from "@/components/primitives/plain-button/PlainButton";
import styles from "./StatusMessage.module.scss";

export type StatusAction = {
  label: string;
  onClick: () => void;
};

type Props = {
  message: string; // what happened: "No classes today."
  detail?: string; // where to go: "Please see the front desk."
  actions?: StatusAction[]; // e.g. Try again, Back, Change class
};

// Neutral message for empty, no-match and unavailable states, shared by every
// kiosk screen so they all say things the same way. Never shows a reason.
const StatusMessage = ({ message, detail, actions = [] }: Props) => {
  return (
    // role="status" so screen readers announce it when it appears
    <div className={styles.status} role="status">
      <p>{message}</p>
      {detail && <p>{detail}</p>}

      {actions.length > 0 && (
        <div className={styles.actions}>
          {actions.map((action) => (
            <PlainButton key={action.label} onClick={action.onClick}>
              {action.label}
            </PlainButton>
          ))}
        </div>
      )}
    </div>
  );
};

export default StatusMessage;
