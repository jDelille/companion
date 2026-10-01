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

      <div className={styles.companionRail__state}>
        <div className={styles.statusLine}>
          <div className={styles.statusIcon}></div>
          Front desk context
        </div>

        <h3>Three tasks due</h3>
        <div className={styles.tasks}>
          <div className={styles.task}>
            <span>Call Parker trial</span>
            <button>Open</button>
          </div>
          <div className={styles.task}>
            <span>Review Lee waiver</span>
            <button>Open</button>
          </div>
          <div className={styles.task}>
            <span>Prepare testing form</span>
            <button>Open</button>
          </div>
        </div>
      </div>

      <div className={styles.companionRail__agentComposer}>
        <input type="text" placeholder="Ask the agent..." />
        <button className={styles.agentBtn}>↑</button>
      </div>
    </div>
  );
};

export default CompanionRail;
