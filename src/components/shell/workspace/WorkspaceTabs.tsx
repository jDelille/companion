// [Today] [Maya Chen ×] [Sales ×] [Children Beginner ×]: the pages open in the workspace.
// Today is always first. Opening any other page adds its tab (see pageTabs.ts).
"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "@/components/primitives/AppLink";
import { useSelectedMember } from "../selected-member/selectedMember";
import { useOptionalWorkspaceActions } from "@/components/workspace/WorkspaceActions";
import {
  closeWorkspaceTab,
  openWorkspaceTab,
  openWorkspaceTabIfMissing,
  useWorkspaceTabs,
} from "./openTabs";
import { tabForPage } from "./pageTabs";
import styles from "./Workspace.module.scss";

const WorkspaceTabs = () => {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const tabs = useWorkspaceTabs();
  const selectedMember = useSelectedMember();
  const actions = useOptionalWorkspaceActions();

  // The page on screen, as a tab
  const current = tabForPage(pathname, params);
  const currentHref = current?.href ?? null;
  const currentLabel = current?.label ?? "";
  const currentFinal = current?.final ?? false;

  // Opening a page adds its tab. A placeholder name ("Member", "Class") never replaces
  // a real one the tab already has.
  useEffect(() => {
    if (!currentHref) return;
    const tab = { href: currentHref, label: currentLabel };
    if (currentFinal) openWorkspaceTab(tab);
    else openWorkspaceTabIfMissing(tab);
  }, [currentHref, currentLabel, currentFinal]);

  // The member page says who's on screen: name the tab after them
  useEffect(() => {
    if (!selectedMember) return;
    const href = `/people/${selectedMember.id}`;
    if (href === pathname) openWorkspaceTab({ href, label: selectedMember.name });
  }, [selectedMember, pathname]);

  const closeTab = (href: string) => {
    closeWorkspaceTab(href);
    // Closing the tab you're on goes back to Today (not while an action awaits confirmation)
    if (href === currentHref && !actions?.hasPending) router.push("/");
  };

  return (
    <nav className={styles.workspace__tabs} aria-label="Open pages">
      <ul>
        <li className={`${styles.tab} ${pathname === "/" ? styles.active : ""}`}>
          <Link href="/" aria-current={pathname === "/" ? "page" : undefined}>
            Today
          </Link>
        </li>
        {tabs.map((tab) => (
          <li key={tab.href} className={`${styles.tab} ${tab.href === currentHref ? styles.active : ""}`}>
            <Link href={tab.href} aria-current={tab.href === currentHref ? "page" : undefined}>
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
