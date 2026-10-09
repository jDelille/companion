// left nav column

"use client";

import { usePathname } from "next/navigation";
import { isNavItemActive, navItems } from "../navItems";
import RailItem from "./RailItem";
import styles from "./Rail.module.scss";

export default function Rail() {
  const pathname = usePathname();

  return (
    <nav className={styles.rail} aria-label="Main">
      <div className={styles.rail__logo}>D</div>
      <ul className={styles.rail__links}>
        {navItems.map((item) => (
          <RailItem key={item.id} item={item} isActive={isNavItemActive(item, pathname)} />
        ))}
      </ul>
      <div className={styles.rail__user}>MK</div>
    </nav>
  );
}