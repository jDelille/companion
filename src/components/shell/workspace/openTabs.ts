"use client";

import { useSyncExternalStore } from "react";

// The records open as tabs above the workspace ([Today] [Maya Chen ×] ...).
// Today is always there and isn't stored. Opening a member or a class adds a tab;
// the tabs last for this browser tab's session.

export type WorkspaceTab = { href: string; label: string };

const STORAGE_KEY = "dojang:workspace-tabs";
const MAX_TABS = 8;

let tabs: WorkspaceTab[] = [];
let loaded = false;
const listeners = new Set<() => void>();
const noTabs: WorkspaceTab[] = [];

function load() {
  if (loaded) return;
  loaded = true;
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? "[]");
    if (Array.isArray(saved)) {
      // One tab per address: drops copies saved by an older version of the tab bar
      const seen = new Set<string>();
      tabs = saved.filter((tab: WorkspaceTab) => {
        if (typeof tab?.href !== "string" || seen.has(tab.href)) return false;
        seen.add(tab.href);
        return true;
      });
    }
  } catch {
    // no storage (private window, blocked): start with Today only
  }
}

function save(next: WorkspaceTab[]) {
  tabs = next;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
  } catch {
    // tabs still work for this page, they just aren't remembered
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  load();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useWorkspaceTabs(): WorkspaceTab[] {
  return useSyncExternalStore(
    subscribe,
    () => {
      load();
      return tabs;
    },
    () => noTabs, // nothing open while the server renders
  );
}

// Adds the tab, or renames it if it's already open (e.g. "Class" → the class's name).
// The oldest tab goes when there are too many.
export function openWorkspaceTab(tab: WorkspaceTab) {
  load();
  const existing = tabs.find((open) => open.href === tab.href);
  if (existing) {
    if (existing.label === tab.label) return;
    save(tabs.map((open) => (open.href === tab.href ? tab : open)));
    return;
  }
  const next = [...tabs, tab];
  save(next.slice(Math.max(0, next.length - MAX_TABS)));
}

// Only adds a tab when it isn't open yet, so a real name is never replaced by a fallback
export function openWorkspaceTabIfMissing(tab: WorkspaceTab) {
  load();
  if (tabs.some((open) => open.href === tab.href)) return;
  openWorkspaceTab(tab);
}

export function closeWorkspaceTab(href: string) {
  load();
  save(tabs.filter((open) => open.href !== href));
}
