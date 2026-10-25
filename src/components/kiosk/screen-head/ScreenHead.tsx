import styles from "./ScreenHead.module.scss";

type Props = {
  eyebrow: string; // small mono label: Check in, Identify, Review...
  title: string;
  titleId?: string; // lets an input point at the title (aria-labelledby)
  lead?: string; // grey line under the title
  onBack?: () => void; // leave out and there is no Back button
  backDisabled?: boolean; // locked while a check-in is sending
};

// Jodi's screen top: ← Back, eyebrow, title, lead. Shared by every kiosk screen.
const ScreenHead = ({
  eyebrow,
  title,
  titleId,
  lead,
  onBack,
  backDisabled = false,
}: Props) => {
  return (
    <header className={styles.head}>
      {onBack && (
        <button
          type="button"
          className={styles.back}
          onClick={onBack}
          disabled={backDisabled}
        >
          ← Back
        </button>
      )}
      <div className={styles.eyebrow}>{eyebrow}</div>
      <h1 id={titleId} className={styles.title}>
        {title}
      </h1>
      {lead && <p className={styles.lead}>{lead}</p>}
    </header>
  );
};

export default ScreenHead;
