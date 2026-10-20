"use client";

import { useEffect, useSyncExternalStore } from "react";

// A plan Do For Me is running for the page on screen (doc 45 "Agent execution state") and,
// once it finishes, its receipt (doc 46 "AI completion receipt"). The page owns the run and
// announces it (ShowRun); the rail's Work tab shows the steps and the Pause / Stop /
// Change plan buttons, and History shows the receipt. Cleared when the page goes away.

export type RunStepStatus = "pending" | "running" | "done" | "skipped" | "waiting" | "failed";

export type RunStep = {
  label: string; // "Identified 32 candidates" once done; "Identifying candidates" before
  status: RunStepStatus;
  detail?: string; // why it's skipped or waiting, or what it found
};

export type RunState = "running" | "paused" | "waiting" | "stopped" | "done" | "failed";

export type RunReceipt = {
  title: string; // "Testing invitations"
  lines: { ok: boolean; text: string }[];
  auditId: string;
  detailsHref: string;
};

export type PageRun = {
  title: string;
  state: RunState;
  steps: RunStep[];
  receipt: RunReceipt | null;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  changePlan: () => void;
};

let current: PageRun | null = null;
const listeners = new Set<() => void>();

function setRun(run: PageRun | null) {
  current = run;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function usePageRun(): PageRun | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
}

// Rendered by the page; announces the run every time it changes
export function ShowRun({ run }: { run: PageRun }) {
  useEffect(() => {
    setRun(run);
  }, [run]);
  useEffect(() => () => setRun(null), []);
  return null;
}
