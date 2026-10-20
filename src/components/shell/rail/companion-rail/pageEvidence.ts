"use client";

import { useEffect, useSyncExternalStore } from "react";

// Evidence a page wants the Do For Me rail to show (e.g. the Proposed edit page:
// Membership, Rank, Schedule). The page announces it (ShowEvidence); the rail reads it
// (usePageEvidence) and opens its Evidence tab. Cleared when the page goes away.

export type EvidenceItem = { title: string; detail: string };
export type PageEvidence = {
  items: EvidenceItem[];
  sourcesHref?: string; // "Inspect sources →"
};

let current: PageEvidence | null = null;
const listeners = new Set<() => void>();

function setEvidence(evidence: PageEvidence | null) {
  current = evidence;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function usePageEvidence(): PageEvidence | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
}

// Rendered by a page. The JSON key keeps it from re-announcing the same evidence every render.
export function ShowEvidence({ evidence }: { evidence: PageEvidence }) {
  const key = JSON.stringify(evidence);
  useEffect(() => {
    setEvidence(JSON.parse(key));
    return () => setEvidence(null);
  }, [key]);
  return null;
}
