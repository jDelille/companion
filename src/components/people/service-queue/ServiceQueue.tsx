import React from "react";
import styles from "./ServiceQueue.module.scss";

const ServiceQueue = () => {
  return (
    <div className={styles.serviceQueue}>
      <p className={styles.label}>service queue</p>

      <ul className={styles.queueList}>
        <li className={styles.queueCard}>
            <p>Payment update</p>
            <span>Chen</span>
        </li>
        <li className={styles.queueCard}>
            <p>Guardian request</p>
            <span>Rivera</span>
        </li>
        <li className={styles.queueCard}>
            <p>Trial arrival</p>
            <span>Parker</span>
        </li>
      </ul>

      <button className={styles.openQueueBtn}>Open queue</button>
    </div>
  );
};

export default ServiceQueue;
