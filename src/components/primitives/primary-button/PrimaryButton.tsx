import type { ReactNode } from "react";
import styles from "./PrimaryButton.module.scss";

type Props = {
  children: ReactNode;
  onClick: () => void;
  // brand: the one committing action on a screen (Confirm check-in).
  // glass: the main next step that doesn't commit anything (Done).
  tone?: "brand" | "glass";
  disabled?: boolean; // e.g. while a check-in is sending
  className?: string; // for layout from the parent (margins)
};

// Big full-width oval for a screen's main action
const PrimaryButton = ({
  children,
  onClick,
  tone = "glass",
  disabled = false,
  className,
}: Props) => {
  const classNames = [styles.button, styles[tone], className].filter(Boolean).join(" ");

  return (
    <button type="button" className={classNames} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
};

export default PrimaryButton;
