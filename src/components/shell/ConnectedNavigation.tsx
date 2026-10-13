"use client";
import Link from "@/components/primitives/AppLink";
import { usePathname, useSearchParams } from "next/navigation";
import type { Ref } from "react";
import NavIcon, { type NavIconName } from "./NavIcon";
import styles from "./Shell.module.scss";
import { useSelectedMember } from "./selected-member/selectedMember";

const items: {
  href: string;
  label: string;
  icon: NavIconName;
  matches: (path: string, view: string) => boolean;
  desktopOnly?: boolean;
}[] = [
  { href: "/", label: "Today", icon: "today", matches: (p) => p === "/" },
  {
    href: "/ops",
    label: "Classes",
    icon: "classes",
    matches: (p) => p.startsWith("/ops"),
  },
  {
    href: "/people",
    label: "Members",
    icon: "members",
    matches: (p, view) => p.startsWith("/people") || p === "/integration/members" || (p === "/hub" && ["manage", "book", "intake", "archived", "courses"].includes(view)),
  },
  { href: "/hub?view=crm", label: "Sales", icon: "sales", matches: (p, view) => p === "/hub" && view === "crm" },
  { href: "/hub", label: "Inbox", icon: "followups", matches: (p, view) => p === "/hub" && ["", "messages"].includes(view) },
  { href: "/hub?view=instructor", label: "Instructor", icon: "classes", matches: (p, view) => p === "/hub" && view === "instructor", desktopOnly: true },
  { href: "/hub?view=attendance", label: "Attendance", icon: "classes", matches: (p, view) => p === "/hub" && view === "attendance", desktopOnly: true },
  { href: "/hub?view=testing", label: "Testing", icon: "classes", matches: (p, view) => p === "/hub" && view === "testing", desktopOnly: true },
  { href: "/hub?view=communications", label: "Messaging", icon: "followups", matches: (p, view) => p === "/hub" && view === "communications", desktopOnly: true },
  { href: "/hub?view=operations", label: "Reports", icon: "classes", matches: (p, view) => p === "/hub" && view === "operations", desktopOnly: true },
  { href: "/hub?view=setup", label: "Setup", icon: "today", matches: (p, view) => p === "/hub" && view === "setup", desktopOnly: true },
  {
    href: "/follow-ups",
    label: "Follow-ups",
    icon: "followups",
    matches: (p) => p === "/follow-ups",
    desktopOnly: true,
  },
];
export default function ConnectedNavigation({
  mobile = false,
  onCompanion,
  companionOpen,
  triggerRef,
}: {
  mobile?: boolean;
  onCompanion?: () => void;
  companionOpen?: boolean;
  triggerRef?: Ref<HTMLButtonElement>;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const selected = useSelectedMember();
  const memberId = selected?.id || params.get("memberId");
  const view = params.get("view") || (params.get("memberId") && pathname === "/hub" ? "book" : "");
  return (
    <nav
      id={mobile ? "mobile-staff-navigation" : undefined}
      className={mobile ? styles.connectedBottomNav : styles.connectedNav}
      aria-label={mobile ? "Mobile staff navigation" : "Staff navigation"}
    >
      {!mobile && (
        <Link href="/" className={styles.wordmark} aria-label="Dojang home">
          <span className={styles.brandMark}>
            D<span>.</span>
          </span>
          <span>
            DOJANG<small>COMPANION</small>
          </span>
        </Link>
      )}
      {items.filter(item => !mobile || !item.desktopOnly).map((item) => (
        <Link
          key={item.href}
          href={memberId && ["Sales", "Inbox"].includes(item.label) ? `/hub?view=${item.label === "Sales" ? "crm" : "messages"}&memberId=${encodeURIComponent(memberId)}` : item.href}
          aria-current={item.matches(pathname, view) ? "page" : undefined}
        >
          <span className={styles.navSymbol}>
            <NavIcon name={item.icon} />
          </span>
          <span>{item.label}</span>
        </Link>
      ))}
      {onCompanion && (
        <button
          ref={triggerRef}
          onClick={onCompanion}
          aria-label="Open companion"
          aria-controls="roster-companion"
          aria-expanded={companionOpen}
        >
          <span className={styles.navSymbol}>
            <NavIcon name="companion" />
          </span>
          <span>Companion</span>
        </button>
      )}
      {!mobile && (
        <Link href="/hub?view=ai" aria-current={pathname === "/hub" && view === "ai" ? "page" : undefined}>AI settings</Link>
      )}
      {!mobile && (
        <Link href="/kiosk" className={styles.kioskLink}>
          Open check-in kiosk <span aria-hidden="true">↗</span>
        </Link>
      )}
    </nav>
  );
}
