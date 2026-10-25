import type { ReactNode } from "react";
import styles from "./KioskButton.module.scss";

type Props = {
  children: ReactNode;
  onClick: () => void;
  variant?: "primary" | "secondary" | "text";
  disabled?: boolean; // e.g. while a check-in is sending
  className?: string; // for layout from the parent
};

// Jodi's buttons: primary (red), secondary (outlined card), text (quiet)
const KioskButton = ({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  className,
}: Props) => {
  const classNames = [styles.button, styles[variant], className]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={classNames}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default KioskButton;
