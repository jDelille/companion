"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { getCompanionContext } from "@/integrations/companion";
import type { CompanionContext } from "@/domain/companion";
import styles from "./FollowUp.module.scss";
import RefreshIcon from "@/icons/RefreshIcon";
import { ChevronRightIcon } from "@/icons";

// Odoo sends either an ISO date or ready-made text
const formatDetail = (detail: string) =>
  /^\d{4}-/.test(detail) ? new Date(detail).toLocaleString() : detail;

export default function ConnectedWorkflowView({
  historyOnly = false,
}: {
  historyOnly?: boolean;
}) {
  const path = usePathname();
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{
    path: string;
    data: CompanionContext | null;
  } | null>(null);
  useEffect(() => {
    const reload = () => setRevision((n) => n + 1);
    window.addEventListener("dojang:companion-updated", reload);
    const timer = setInterval(reload, 15000);
    return () => {
      clearInterval(timer);
      window.removeEventListener("dojang:companion-updated", reload);
    };
  }, []);
  useEffect(() => {
    const c = new AbortController();
    getCompanionContext(path, c.signal).then((r) => {
      if (!c.signal.aborted)
        setResult({ path, data: r.outcome === "loaded" ? r.context : null });
    });
    return () => c.abort();
  }, [path, revision]);

  const data = result?.path === path ? result.data : undefined;

  return (
    <section className={styles.workspace}>
      <header className={styles.pageHeader}>
        <div className={styles.pageTitles}>
          <h2 className={styles.pageTitle}>
            {historyOnly
              ? "Companion follow-up history"
              : data?.heading || "Staff workspace"}
          </h2>
          {!historyOnly && data && (
            <p className={styles.intro}>
              Class attendance comes from the same Odoo records as kiosk
              check-in.
              {/* Its own line: a key for the statuses below */}
              <br />
              <strong>Pending</strong> means not yet checked in.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setRevision((n) => n + 1)}
          className={styles.refreshButton}
        >
          <RefreshIcon color="currentColor" size={16} />
          Refresh
        </button>
      </header>

      {data === undefined ? (
        <p className={styles.notice} role="status">
          Loading Odoo records…
        </p>
      ) : data === null ? (
        <p className={styles.notice} role="alert">
          Unable to load authorized records. Connect a staff test device and
          retry.
        </p>
      ) : (
        <div className={styles.sections}>
          {!historyOnly && (
            <section className={styles.section}>
              <h3 className={styles.sectionLabel}>Today&apos;s classes</h3>
              {!data.records?.length ? (
                <p className={styles.empty}>
                  No records in this authorized scope.
                </p>
              ) : (
                <ul className={styles.itemList}>
                  {data.records.map((r) => (
                    <li key={r.id}>
                      {/* The whole card opens the class roster */}
                      <Link href={r.href} className={styles.classItem}>
                        <span className={styles.itemTitle}>{r.label}</span>
                        <span className={styles.meta}>
                          {formatDetail(r.detail)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <section className={styles.section}>
            <h3 className={styles.sectionLabel}>Reviewed follow-ups</h3>
            {!data.followUps?.length ? (
              <p className={styles.empty}>
                No approved follow-ups yet. Open a member and use “Prepare
                parent follow-up” in the Companion.
              </p>
            ) : (
              <ul className={styles.itemList}>
                {data.followUps.map((f) => (
                  <li key={f.id} className={styles.followUpItem}>
                    {/* Name and its date/status read as one header */}
                    <div className={styles.followUpHeader}>
                      <Link
                        href={`/people/${f.memberId}`}
                        className={styles.itemTitle}
                      >
                        {f.memberName}
                      </Link>
                      <div className={styles.metaRow}>
                        <span className={styles.meta}>
                          {new Date(f.at).toLocaleString()}
                        </span>
                        <span className={styles.statusBadge}>{f.status}</span>
                      </div>
                    </div>
                    <p className={styles.summary}>{f.summary}</p>
                    <details className={styles.draft}>
                      <summary>
                        <span className={styles.chevron} aria-hidden="true">
                          <ChevronRightIcon color="currentColor" size={16} />
                        </span>
                        <p className={styles.draftTitle}>
                          Reviewed reply draft
                        </p>
                      </summary>
                      <blockquote className={styles.draftText}>
                        {f.replyDraft}
                      </blockquote>
                      <small className={styles.draftMode}>{f.mode}</small>
                    </details>
                    <Link
                      href={`/ops/sessions/${f.sessionId}`}
                      className={styles.rosterLink}
                    >
                      Open class roster →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
