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

        
    </div>
  )
}

export default ContextPane