import styles from "./ActionCard.module.scss";

type Props = {
  label: string;
  description: string;
  size?: "large" | "normal";
  disabled?: boolean;
  onClick?: () => void;
  className?: string; // for layout from the parent (margins, flex)
};

// Big tappable card with a label, a short description and an arrow
const ActionCard = ({ label, description, size = "normal", disabled = false, onClick, className }: Props) => {
  const classNames = [styles.card, styles[size], className].filter(Boolean).join(" ");

  return (
    <button type="button" className={classNames} disabled={disabled} onClick={onClick}>
      <span className={styles.label}>{label}</span>
      <span className={styles.description}>{description}</span>
      {/* no arrow when disabled so it doesn't look tappable */}
      {!disabled && <span className={styles.arrow} aria-hidden="true">→</span>}
    </button>
  );
};

export default ActionCard;
