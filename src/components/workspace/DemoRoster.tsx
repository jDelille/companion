"use client";
import { useEffect, useState } from "react";
import Link from "@/components/primitives/AppLink";
import { getRoster, getSessions } from "@/integrations/kiosk";
import type { RosterMember, SessionOption } from "@/contracts/kiosk-attendance";
import styles from "./Workspace.module.scss";
import { PersonName } from "@/components/primitives/avatar/Avatar";
export default function DemoRoster({ id }: { id: string }) {
  const [data, setData] = useState<{
    session: SessionOption;
    roster: RosterMember[];
  } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const c = new AbortController();
    Promise.all([getSessions(c.signal), getRoster(id, c.signal)])
      .then(([sessions, roster]) => {
        if (c.signal.aborted) return;
        const session = sessions.find((s) => s.sessionId === id);
        if (!session) setFailed(true);
        else setData({ session, roster });
      })
      .catch(() => {
        if (!c.signal.aborted) setFailed(true);
      });
    return () => c.abort();
  }, [id]);
  return (
    <section className={styles.page}>
      <Link className={styles.quietButton} href="/ops">
        ← All classes
      </Link>
      <header className={styles.heading} style={{ marginTop: 28 }}>
        <div>
          <div className={styles.eyebrow}>Class roster · Sample data</div>
          <h1>{data?.session.title ?? "Class roster"}</h1>
          <p>
            Review attendance. Use the check-in kiosk to try checking in a
            sample student.
          </p>
        </div>
        <Link className={styles.button} href="/kiosk">
          Open check-in →
        </Link>
      </header>
      {failed ? (
        <div className={styles.empty} role="alert">
          This class roster is unavailable.
        </div>
      ) : !data ? (
        <p role="status">Loading roster…</p>
      ) : (
        <ul className={styles.roster}>
          {data.roster.map((m) => (
            <li key={m.memberId}>
              <PersonName name={m.displayName} />
              <span>
                {m.attendanceState === "pending"
                  ? "Not yet checked in"
                  : m.attendanceState}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
