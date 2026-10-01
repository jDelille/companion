import styles from "./Modal.module.scss";

type Props = {
  confirmLabel: string; // "Send", "Confirm booking", "Save"…
  askAILabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  askAI?: () => void;
};

// The Cancel + action button row at the bottom of a modal
const ModalActions = ({ confirmLabel, askAILabel, onConfirm, onCancel, askAI }: Props) => (
  <div className={styles.actions}>
    <button type="button" className={styles.cancel} onClick={onCancel}>
      Cancel
    </button>
    <button type="button" className={styles.confirm} onClick={onConfirm}>
      {confirmLabel}
    </button>
    {askAI && (
      // same look as Cancel
      <button type="button" className={styles.cancel} onClick={askAI}>
        {askAILabel}
      </button>
    )}
  </div>
);

export default ModalActions;
