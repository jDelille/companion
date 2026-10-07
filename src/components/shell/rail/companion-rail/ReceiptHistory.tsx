import type { Receipt } from "@/domain/companion";
import styles from "./ReceiptHistory.module.scss";

type Props = {
  receipts: Receipt[];
};

// "2026-10-07T14:14:00Z" -> "2:14 PM", in the viewer's own time zone
const formatTime = (iso: string) => {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
};

const ReceiptHistory = ({ receipts }: Props) => {
  if (receipts.length === 0) return null;

  return (
    <div className={styles.history}>
      <h3>History</h3>
      {receipts.map((r) => (
        <p key={r.id} className={styles.historyItem}>
          <span className={styles.historyTime}>{formatTime(r.at)}</span> {r.summary} ·{" "}
          {r.actor}
        </p>
      ))}
    </div>
  );
};

export default ReceiptHistory;
