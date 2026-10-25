import styles from "./KioskHeader.module.scss";

type Props = {
  label: string; // small word next to the logo: Arrival, Identify, Complete...
  onReset: () => void; // logo and the circle-arrows button go back to Welcome
  showDemoPill?: boolean; // "Premium design pass" tag, demo mode only
};

// Jodi's top bar: DOJANG + current screen name on the left, reset on the right.
// Each page renders it itself so it can show the right label.
const KioskHeader = ({ label, onReset, showDemoPill = false }: Props) => {
  return (
    <header className={styles.header}>
      <button type="button" className={styles.brand} onClick={onReset}>
        <span className={styles.brandWord}>DOJANG</span>
        <span className={styles.brandContext}>{label}</span>
      </button>

      <span className={styles.spacer} />

      {showDemoPill && (
        <span className={styles.pill}>
          <i /> Premium design pass
        </span>
      )}

      <button
        type="button"
        className={styles.iconButton}
        aria-label="Reset preview"
        onClick={onReset}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 7h-9a5 5 0 0 0-5 5" />
          <path d="m16 3 4 4-4 4" />
          <path d="M4 17h9a5 5 0 0 0 5-5" />
          <path d="m8 21-4-4 4-4" />
        </svg>
      </button>
    </header>
  );
};

export default KioskHeader;
