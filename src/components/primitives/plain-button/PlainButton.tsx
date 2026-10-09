import type { ReactNode } from "react";
import styles from "./PlainButton.module.scss";

type Props = {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean; // e.g. while a check-in is sending
  className?: string;
};

// Quiet text button for secondary actions: Back, Try again, Change class.
const PlainButton = ({
  children,
  onClick,
  disabled = false,
  className,
}: Props) => {
  const classNames = [styles.button, className].filter(Boolean).join(" ");

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

export default PlainButton;
