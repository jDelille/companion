import type { ReactNode } from "react";
import styles from "./ContextPane.module.scss";

type Props = {
  children: ReactNode;
}

const ContextPane = ({children}: Props) => {
  return (
    <div className={styles.contextPane}>
      <div className={styles.contextPane__header}>
        <h2>Arriving Soon</h2>
      </div>
      <input type="text" className={styles.searchBar} placeholder="Search arrivals..."/>

      <div className={`${styles.item}`}>
        <div className={styles.time}>4:15</div>
        <div className={styles.info}>
          <p>Pee Wee</p>
          <span>18 booked · 4 in</span>
        </div>
      </div>

      <div className={styles.item}>
        <div className={styles.time}>4:15</div>
        <div className={styles.info}>
          <p>Children Beginner</p>
          <span>21 booked · 2 trials</span>
        </div>
      </div>

      <div className={`${styles.item} ${styles.active}`}>
        <div className={styles.time}>4:15</div>
        <div className={styles.info}>
          <p>Children Advanced</p>
          <span>17 booked</span>
        </div>
      </div>


      <div className={styles.kioskSection}>
        <p className={styles.label}>Kiosk</p>
        <div className={styles.kioskItem}>
          <div className={styles.status}></div>
          <div className={styles.info}>
            <p>Lobby iPad</p>
            <span>Online · Queue 0</span>
          </div>
        </div>
      </div>
        
    </div>
  )
}

export default ContextPane