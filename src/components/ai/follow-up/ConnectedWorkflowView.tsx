"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "@/components/primitives/AppLink";
import { getCompanionContext } from "@/integrations/companion";
import type { CompanionContext } from "@/domain/companion";
import styles from "./FollowUp.module.scss";
import Avatar, { PersonName } from "@/components/primitives/avatar/Avatar";
import RefreshIcon from "@/icons/RefreshIcon";
import { ChevronRightIcon } from "@/icons";

// Odoo sends either an ISO date or ready-made text
const formatDetail = (detail: string) =>
  /^\d{4}-/.test(detail) ? new Date(detail).toLocaleString() : detail;

// Roster status text from Odoo ("present", "late", "Not yet checked in"…) → pill colour
const isCheckedIn = (detail: string) => /^(present|late)/i.test(detail);
const pillTone = (detail: string) =>
  isCheckedIn(detail) ? "checkedIn" : /absent|excused/i.test(detail) ? "away" : "pending";

export default function ConnectedWorkflowView({
  historyOnly = false,
  embedded = false,
}: {
  historyOnly?: boolean;
  embedded?: boolean; // inside a member tab: just the follow-ups card, no page header
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
  const Heading = historyOnly ? "h1" : "h2";

  return (
    <section className={`${styles.workspace} ${embedded ? styles.embedded : ""}`}>
      {!embedded && <header className={styles.pageHeader}>
        <div className={styles.pageTitles}>
          <span className={styles.kicker}>
            {historyOnly ? "Engagement · Follow-ups" : "Operations · Class roster"}
          </span>
          <Heading className={styles.pageTitle}>
            {historyOnly ? "Follow-ups" : data?.heading || "Staff workspace"}
          </Heading>
          {historyOnly && (
            <p className={styles.intro}>
              Reviewed drafts and saved follow-ups. Prepare a new one from a
              member’s Companion.
            </p>
          )}
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
      </header>}

      {data === undefined ? (
        <p className={styles.notice} role="status">
          Loading Odoo records…
        </p>
      ) : data === null ? (
        // Usually this device isn't paired yet; the button goes straight to pairing
        <div className={styles.empty} role="alert">
          <strong>Couldn&apos;t load staff records</strong>
          Unable to load authorized records. Connect a staff test device and
          retry.
          <Link href="/integration/pair" className={styles.connectButton}>
            Connect staff device
          </Link>
        </div>
      ) : (
        <div className={styles.sections}>
          {!historyOnly && (
            <section className={styles.section}>
              <header className={styles.sectionHeader}>
                <h3 className={styles.sectionLabel}>Roster</h3>
                {!!data.records?.length && (
                  <span className={styles.sectionCount}>
                    {data.records.filter((r) => isCheckedIn(r.detail)).length} of{" "}
                    {data.records.length} checked in
                  </span>
                )}
              </header>
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
                        <PersonName name={r.label} />
                        <span className={`${styles.pill} ${styles[pillTone(r.detail)]}`}>
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
            <header className={styles.sectionHeader}>
              <h3 className={styles.sectionLabel}>Reviewed follow-ups</h3>
              {!!data.followUps?.length && (
                <span className={styles.sectionCount}>
                  {data.followUps.length} saved
                </span>
              )}
            </header>
            {!data.followUps?.length ? (
              <p className={styles.empty}>
                <strong>No approved follow-ups yet.</strong>
                Open a member and use “Prepare parent follow-up” in the
                Companion.
              </p>
            ) : (
              <ul className={styles.itemList}>
                {data.followUps.map((f) => (
                  <li key={f.id} className={styles.followUpItem}>
                    {/* Avatar + name on the left, date and status on the right */}
                    <div className={styles.followUpHeader}>
                      <span className={styles.followUpWho}>
                        <Avatar name={f.memberName} />
                        <Link
                          href={`/people/${f.memberId}`}
                          className={styles.itemTitle}
                        >
                          {f.memberName}
                        </Link>
                      </span>
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
                      Open class roster <span aria-hidden="true">→</span>
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
