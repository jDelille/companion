// [Today] [Maya Chen ×] [Children Beginner ×]: the records open in the workspace
"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "@/components/primitives/AppLink";
import { useSelectedMember } from "../selected-member/selectedMember";
import { useOptionalWorkspaceActions } from "@/components/workspace/WorkspaceActions";
import {
  closeWorkspaceTab,
  openWorkspaceTab,
  openWorkspaceTabIfMissing,
  useWorkspaceTabs,
} from "./openTabs";
import styles from "./Workspace.module.scss";

const memberPage = /^\/people\/[^/]+$/;
const classPage = /^\/ops\/sessions\/[^/]+$/;

const WorkspaceTabs = () => {
  const pathname = usePathname();
  const router = useRouter();
  const tabs = useWorkspaceTabs();
  const selectedMember = useSelectedMember();
  const actions = useOptionalWorkspaceActions();

  // Opening a member or a class adds its tab, with a plain label until the name is known
  useEffect(() => {
    if (memberPage.test(pathname)) openWorkspaceTabIfMissing({ href: pathname, label: "Member" });
    if (classPage.test(pathname)) openWorkspaceTabIfMissing({ href: pathname, label: "Class" });
  }, [pathname]);

  // The member page says who's on screen: name the tab after them
  useEffect(() => {
    if (!selectedMember) return;
    const href = `/people/${selectedMember.id}`;
    if (href === pathname) openWorkspaceTab({ href, label: selectedMember.name });
  }, [selectedMember, pathname]);

  const closeTab = (href: string) => {
    closeWorkspaceTab(href);
    // Closing the tab you're on goes back to Today (not while an action awaits confirmation)
    if (href === pathname && !actions?.hasPending) router.push("/");
  };

  return (
    <nav className={styles.workspace__tabs} aria-label="Open records">
      <ul>
        <li className={`${styles.tab} ${pathname === "/" ? styles.active : ""}`}>
          <Link href="/" aria-current={pathname === "/" ? "page" : undefined}>
            Today
          </Link>
        </li>
        {tabs.map((tab) => (
          <li
            key={tab.href}
            className={`${styles.tab} ${pathname === tab.href ? styles.active : ""}`}
          >
            <Link href={tab.href} aria-current={pathname === tab.href ? "page" : undefined}>
              {tab.label}
            </Link>
            <button
              type="button"
              className={styles.tabClose}
              onClick={() => closeTab(tab.href)}
              aria-label={`Close ${tab.label}`}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default WorkspaceTabs;
