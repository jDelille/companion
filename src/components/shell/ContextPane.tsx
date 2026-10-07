import type { ReactNode } from "react";
import styles from "./ContextPane.module.scss";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  children: ReactNode;
}

const arrivals = [
  { time: "4:15", name: "Pee Wee", detail: "18 booked · 4 in" },
  { time: "5:00", name: "Children Beginner", detail: "21 booked · 2 trials" },
  { time: "5:45", name: "Children Advanced", detail: "17 booked", active: true },
];

const kiosks = [{ name: "Lobby iPad", detail: "Online · Queue 0" }];

const savedViews = [
  { name: "All members", count: 386, active: true },
  { name: "Testing eligible", count: 32 },
  { name: "At risk", count: 11 },
];

const ContextPane = ({ children }: Props) => {
  const pathname = usePathname();
  const onPeople = pathname.startsWith("/people");

  if (onPeople) {
    return (
      <div className={styles.contextPane}>
        <div className={styles.contextPane__header}>
          <h2>Members</h2>
        </div>
        <input type="text" className={styles.searchBar} placeholder="Search members..." />

        <p className={styles.label}>Saved views</p>
        {savedViews.map((v) => (
          <div key={v.name} className={`${styles.item} ${v.active ? styles.active : ""}`}>
            <div className={styles.info}>
              <p>{v.name}</p>
            </div>
            <span>{v.count}</span>
          </div>
        ))}

        <p className={styles.label}>Selected</p>
        <Link href="/people/5001" className={`${styles.item} ${styles.active}`}>
          <div className={styles.avatar}>MC</div>
          <div className={styles.info}>
            <p>Maya Chen</p>
            <span>Blue · 92% ready</span>
          </div>
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.contextPane}>
      <div className={styles.contextPane__header}>
        <h2>Arriving Soon</h2>
      </div>
      <input type="text" className={styles.searchBar} placeholder="Search arrivals..." />

      {arrivals.map((a) => (
        <div key={a.time} className={`${styles.item} ${a.active ? styles.active : ""}`}>
          <div className={styles.time}>{a.time}</div>
          <div className={styles.info}>
            <p>{a.name}</p>
            <span>{a.detail}</span>
          </div>
        </div>
      ))}

      <div className={styles.kioskSection}>
        <p className={styles.label}>Kiosk</p>
        {kiosks.map((k) => (
          <div key={k.name} className={styles.kioskItem}>
            <div className={styles.status}></div>
            <div className={styles.info}>
              <p>{k.name}</p>
              <span>{k.detail}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ContextPane;