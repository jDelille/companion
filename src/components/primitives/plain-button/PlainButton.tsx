import type { ReactNode } from "react";
import styles from "./PlainButton.module.scss";

type Props = {
  children: ReactNode;
  onClick: () => void;
  className?: string; // for layout from the parent (margins, alignment)
};

// Quiet text button for secondary actions: Back, Try again, Change class.
// Still at least --touch-height tall so it's easy to hit.
const PlainButton = ({ children, onClick, className }: Props) => {
  const classNames = [styles.button, className].filter(Boolean).join(" ");

  return (
    <button type="button" className={classNames} onClick={onClick}>
      {children}
    </button>
  );
};

export default PlainButton;
