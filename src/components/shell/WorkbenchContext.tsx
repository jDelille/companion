"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "@/components/primitives/AppLink";
import styles from "./ContextPane.module.scss";

// Intel's column: "AI Workbench". Active work is the contract on screen; Approvals counts
// the Odoo broadcasts waiting for approval. Nothing here is sample data.

const CONNECTED = process.env.NEXT_PUBLIC_DEMO_MODE !== "true";

export default function WorkbenchContext() {
  const params = useSearchParams();
  const goal = params.get("goal");
  const [awaiting, setAwaiting] = useState<number | null>(null);

  useEffect(() => {
    if (!CONNECTED) return;
    let current = true;
    fetch("/api/hub", {
      method: "POST",
      cache: "no-store",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ operation: "broadcast_context", payload: {}, requestKey: null }),
    })
      .then(async (response) => {
        if (!response.ok) return;
        const value = await response.json();
        const broadcasts: { state: string }[] = Array.isArray(value.broadcasts) ? value.broadcasts : [];
        if (current) setAwaiting(broadcasts.filter((item) => item.state === "awaiting_approval").length);
      })
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [goal]);

  return (
    <div className={styles.contextPane}>
      <div className={styles.contextPane__header}>
        <h2>AI Workbench</h2>
      </div>

      <p className={styles.label}>Active work</p>
      {goal ? (
        <Link href={`/intel?goal=${encodeURIComponent(goal)}`} className={`${styles.item} ${styles.active}`}>
          <div className={styles.info}>
            <p>{goal}</p>
          </div>
        </Link>
      ) : (
        <p className={styles.note}>No contract open</p>
      )}
      <Link href="/intel" className={styles.item}>
        <div className={styles.info}>
          <p>+ New contract</p>
        </div>
      </Link>

      <p className={styles.label}>Approvals</p>
      <Link href="/hub?view=communications" className={styles.item}>
        <div className={styles.info}>
          <p>Needs review</p>
        </div>
        <span>{awaiting ?? ""}</span>
      </Link>
    </div>
  );
}
