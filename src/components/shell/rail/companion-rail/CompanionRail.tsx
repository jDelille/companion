import React from "react";
import styles from "./CompanionRail.module.scss";

type Props = {
  children: React.ReactNode;
};

const CompanionRail = ({ children }: Props) => {
  return (
    <div className={styles.companionRail}>
      <div className={styles.companionRail__header}>
        <h2>
          <span className={styles.companionRail__header__icon}>✦</span>Do For Me
        </h2>
      </div>
    </div>
  );
};

export default CompanionRail;
