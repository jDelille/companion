import styles from "./SuccessMark.module.scss";

// Purely decorative. The receipt headline announces the confirmed result.
export default function SuccessMark({ animate }: { animate: boolean }) {
  return (
    <div
      className={styles.mark}
      data-check-in-mark={animate ? "success" : "already-recorded"}
      aria-hidden="true"
    >
      <span className={styles.halo} />
      <svg viewBox="0 0 120 120" fill="none" focusable="false">
        <circle className={styles.disc} cx="60" cy="60" r="43" />
        <circle className={styles.track} cx="60" cy="60" r="53" />
        <circle
          className={styles.ring}
          cx="60"
          cy="60"
          r="53"
          pathLength="1"
          transform="rotate(-90 60 60)"
        />
        <path className={styles.check} d="m42 60 12 12 25-26" pathLength="1" />
      </svg>
    </div>
  );
}
