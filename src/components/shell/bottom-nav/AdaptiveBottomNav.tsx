"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavItemActive, navItems, bottomNavIds } from "../navItems";
import styles from "./AdaptiveBottomNav.module.scss";

export default function AdaptiveBottomNav() {
  const pathname = usePathname();
  const items = navItems.filter((item) => bottomNavIds.includes(item.id));

  return (
    <nav className={styles.bottomNav} aria-label="Primary">
      {items.map((item) => {
        const active = isNavItemActive(item, pathname);
        return (
          <Link
            key={item.id}
            href={item.href}
            className={`${styles.item} ${active ? styles.active : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <span className={styles.abbrv}>{item.abbrv}</span>
            <span className={styles.label}>{item.label}</span>
          </Link>
        );
      })}
      <button className={styles.item}>
        <span className={styles.abbrv}>•••</span>
        <span className={styles.label}>More</span>
      </button>
    </nav>
  );
}
