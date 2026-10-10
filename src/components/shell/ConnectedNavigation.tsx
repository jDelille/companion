"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Shell.module.scss";

const items = [
  {href: "/ops", label: "Classes", matches: (path: string) => path.startsWith("/ops")},
  {href: "/integration/members", label: "Members", matches: (path: string) => path.startsWith("/people/") || path === "/integration/members"},
  {href: "/hub", label: "Follow-ups", matches: (path: string) => path === "/hub"},
];

export default function ConnectedNavigation({mobile = false}: {mobile?: boolean}) {
  const pathname = usePathname();
  return <nav className={mobile ? styles.connectedBottomNav : styles.connectedNav} aria-label={mobile ? "Mobile staff navigation" : "Staff navigation"}>
    {items.map(item => <Link key={item.href} href={item.href} aria-current={item.matches(pathname) ? "page" : undefined}>{item.label}</Link>)}
  </nav>;
}
