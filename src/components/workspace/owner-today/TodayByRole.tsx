"use client";

import { useEffect, useState } from "react";
import FrontDeskToday from "./FrontDeskToday";
import { callHub } from "@/components/people/member-360/edit-leaf/memberEdits";

// Today is the Current work view in the shell (do-for-me-1.png) for everyone for now.
// The role, from the Hub's context read with the person's own Odoo sign-in, only picks the
// label ("Instructor" or "Front desk"). The Owner / executive Today (/owner) is parked:
// it isn't linked or routed to until it's turned back on.

type Viewer = { kind: "checking" } | { kind: "staff"; role: string };

export default function TodayByRole({ connected }: { connected: boolean }) {
  const [viewer, setViewer] = useState<Viewer>(connected ? { kind: "checking" } : { kind: "staff", role: "staff" });

  useEffect(() => {
    if (!connected) return;
    let current = true;
    callHub("context", {}, null)
      .then((value: { principal?: { role?: string } }) => {
        if (!current) return;
        setViewer({ kind: "staff", role: value.principal?.role ?? "staff" });
      })
      .catch(() => {
        if (current) setViewer({ kind: "staff", role: "staff" });
      });
    return () => {
      current = false;
    };
  }, [connected]);

  if (viewer.kind === "checking") return <p role="status" style={{ padding: "32px 24px", color: "var(--muted)" }}>Loading your day…</p>;
  return <FrontDeskToday role={viewer.role} connected={connected} />;
}
