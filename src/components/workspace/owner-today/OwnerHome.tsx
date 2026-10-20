"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "@/components/primitives/AppLink";
import { callHub } from "@/components/people/member-360/edit-leaf/memberEdits";
import ExecutiveToday from "./ExecutiveToday";
import styles from "./OwnerHome.module.scss";

// /owner, laid out like owner-screen.png: its own top bar (Dojang · location · you), then the
// Owner / executive Today. Only owners and managers stay here; anyone else goes to the
// staff Today (/). The role comes from the Hub, with the person's own Odoo sign-in.

type Viewer =
  | { kind: "checking" }
  | { kind: "signedOut" }
  | { kind: "owner"; name: string; role: string };

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

export default function OwnerHome({ connected, demoMode }: { connected: boolean; demoMode: boolean }) {
  const router = useRouter();
  const [viewer, setViewer] = useState<Viewer>({ kind: "checking" });

  useEffect(() => {
    if (!connected) return;
    let current = true;
    callHub("context", {}, null)
      .then((value: { principal?: { name?: string; role?: string } }) => {
        if (!current) return;
        const role = value.principal?.role ?? "";
        if (role === "owner" || role === "manager") {
          setViewer({ kind: "owner", name: value.principal?.name ?? "", role });
        } else {
          router.replace("/"); // not an owner or manager: the staff Today
        }
      })
      .catch(() => {
        if (current) setViewer({ kind: "signedOut" });
      });
    return () => {
      current = false;
    };
  }, [connected, router]);

  return (
    <div className={styles.shell}>
      <header className={styles.bar}>
        <Link href="/owner" className={styles.brand}>
          <span className={styles.mark} aria-hidden="true">
            D
          </span>
          <span>
            <strong>Dojang</strong>
            <small>Business Companion</small>
          </span>
        </Link>
        <span className={styles.location}>{demoMode ? "Downtown" : "Dojang"}</span>
        <div className={styles.you}>
          {/* The staff workspace (members, classes, Do For Me) */}
          <Link href="/people" className={styles.workspaceLink}>
            Workspace
          </Link>
          {viewer.kind === "owner" && (
            <span className={styles.avatar} title={viewer.name}>
              {initials(viewer.name)}
              <i aria-hidden="true" />
            </span>
          )}
        </div>
      </header>

      <main className={styles.main}>
        {!connected && <p className={styles.note}>The owner view needs Odoo. It isn’t available with sample data.</p>}
        {connected && viewer.kind === "checking" && <p className={styles.note} role="status">Loading your day…</p>}
        {connected && viewer.kind === "signedOut" && (
          <p className={styles.note}>
            Sign in with your owner or manager account to see this. <Link href="/hub">Sign in →</Link>
          </p>
        )}
        {viewer.kind === "owner" && <ExecutiveToday name={viewer.name} role={viewer.role} />}
      </main>
    </div>
  );
}
