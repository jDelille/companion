import Link from "@/components/primitives/AppLink";
import styles from "./ServiceQueue.module.scss";

export default function ServiceQueue() {
  return (
    <div className={styles.serviceQueue}>
      <p className={styles.label}>Follow-ups</p>
      <Link href="/follow-ups" className={styles.openQueueBtn}>
        Open review queue →
      </Link>
    </div>
  );
}
