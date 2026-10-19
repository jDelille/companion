"use client";

import { useEffect, useSyncExternalStore } from "react";

// Which member page is open, so the shell's side pane can show "Selected: …"
// for the member actually on screen. The page announces it (SelectMember);
// the pane reads it (useSelectedMember). Works the same with mock or Odoo
// data, because the page already has the member.

export type SelectedMember = {
  id: string;
  name: string;
  detail: string; // "Blue Belt · 92% ready"
};

let selected: SelectedMember | null = null;
const listeners = new Set<() => void>();

function setSelected(member: SelectedMember | null) {
  selected = member;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSelectedMember(): SelectedMember | null {
  return useSyncExternalStore(
    subscribe,
    () => selected,
    () => null, // nothing selected while the server renders
  );
}

// Rendered by a member page. Clears itself when the page goes away, so the
// pane never keeps showing someone you've navigated away from.
export function SelectMember({ id, name, detail }: SelectedMember) {
  useEffect(() => {
    setSelected({ id, name, detail });
    return () => setSelected(null);
  }, [id, name, detail]);

  return null;
}
