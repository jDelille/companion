import type { Receipt } from "@/domain/companion";
import styles from "./ReceiptHistory.module.scss";

type Props = {
  receipts: Receipt[];
};

const ReceiptHistory = ({ receipts }: Props) => {
  if (receipts.length === 0) return null;

  return (
    <div className={styles.history}>
      <h3>History</h3>
      {receipts.map((r) => (
        <p key={r.id} className={styles.historyItem}>
          <span className={styles.historyTime}>{r.at}</span> {r.summary} ·{" "}
          {r.actor}
        </p>
      ))}
    </div>
  );
};

export default ReceiptHistory;
