"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import type { Receipt, Suggestion } from "@/domain/companion";
import {
  getCompanionContext,
  matchExisting,
  matchRequest,
} from "@/integrations/mock/companion";

export type TaskStatus = "working" | "done";

const useCompanion = () => {
  const pathname = usePathname();
  const context = getCompanionContext(pathname);

  const [openId, setOpenId] = useState<string | null>(null);
  const [status, setStatus] = useState<Record<string, TaskStatus>>({});
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [requested, setRequested] = useState<Suggestion[]>([]);

  // Requested tasks show first
  const suggestions = [...requested, ...context.suggestions];

  const toggle = (id: string) => setOpenId((open) => (open === id ? null : id));

  const approve = async (suggestion: Suggestion) => {
    setStatus((s) => ({ ...s, [suggestion.id]: "working" }));
    await new Promise((r) => setTimeout(r, 900)); // simulate backend running
    setStatus((s) => ({ ...s, [suggestion.id]: "done" }));
    setReceipts((r) => [
      {
        id: `${suggestion.id}-${Date.now()}`,
        summary: suggestion.actionLabel,
        actor: "via Companion",
        at: new Date().toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        }),
      },
      ...r,
    ]);
  };

  // Returns whether the agent understood the request
  const request = (text: string) => {
    const suggestion = matchRequest(text);
    if (suggestion) {
      setRequested((r) => [
        suggestion,
        ...r.filter((x) => x.id !== suggestion.id),
      ]);
      setOpenId(suggestion.id); // arrives already open
      return true;
    }

    // Otherwise open the task already listed that it's asking about
    const existing = matchExisting(text, [
      ...suggestions,
      ...(context.featured ? [context.featured.suggestion] : []),
    ]);
    if (!existing) return false;
    setOpenId(existing.id);
    return true;
  };

  return {
    label: context.label,
    heading: context.heading,
    suggestions,
    intel: context.intel,
    featured: context.featured,
    openId,
    toggle,
    status,
    receipts,
    approve,
    request,
  };
};

export default useCompanion;
