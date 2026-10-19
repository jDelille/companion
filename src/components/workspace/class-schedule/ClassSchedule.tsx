"use client";
import Link from "@/components/primitives/AppLink";
import { useEffect, useState } from "react";
import { getStaffSessions } from "@/integrations/staff-sessions";
import { getSessions } from "@/integrations/kiosk";
import type { SessionOption } from "@/contracts/kiosk-attendance";
// Same page, panel and row styles as Today, so the two pages read as one design
import styles from "../owner-today/OwnerToday.module.scss";

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

// Classes: today's schedule with live / finished / upcoming and how full each class is
export default function ClassSchedule({ connected = false }: { connected?: boolean }) {
  const [sessions, setSessions] = useState<SessionOption[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const loadSessions = connected ? getStaffSessions : getSessions;
    loadSessions(controller.signal)
      .then((list) => {
        if (controller.signal.aborted) return;
        setSessions([...list].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt)));
        setFailed(false);
        setNow(new Date());
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [connected, revision]);

  useEffect(() => {
    const refresh = () => setRevision((n) => n + 1);
    window.addEventListener("focus", refresh);
    const timer = setInterval(refresh, 60000);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const nowTime = now?.getTime() ?? 0;

  return (
    <section className={styles.page}>
      <header className={styles.intro}>
        <div>
          <span className={styles.kicker}>Operations · Schedule</span>
          <h1>Classes</h1>
          <p>{now?.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}</p>
        </div>
        <div className={styles.actions}>
          <Link className={styles.primary} href="/kiosk">
            Check in ↗
          </Link>
        </div>
      </header>

      <article className={styles.panel}>
        <header>
          <span>
            <small>Today</small>
            <h2>Schedule</h2>
          </span>
          {sessions && sessions.length > 0 && (
            <span className={styles.headerNote}>
              {sessions.length} {sessions.length === 1 ? "class" : "classes"}
            </span>
          )}
        </header>
        {failed ? (
          <p className={styles.panelNote} role="alert">
            Classes aren’t available yet. <Link href="/integration/pair">Connect device</Link>{" "}
            <button className={styles.textButton} onClick={() => setRevision((n) => n + 1)}>
              Try again
            </button>
          </p>
        ) : sessions === null ? (
          <p className={styles.panelNote} role="status">
            Loading classes…
          </p>
        ) : sessions.length === 0 ? (
          <p className={styles.panelNote}>No classes are scheduled today.</p>
        ) : (
          sessions.map((s) => {
            const running = Date.parse(s.startsAt) <= nowTime && Date.parse(s.endsAt) > nowTime;
            const finished = Date.parse(s.endsAt) <= nowTime;
            const full = s.capacity > 0 && s.seatsTaken >= s.capacity;
            const fill = s.capacity > 0 ? Math.min(100, Math.round((s.seatsTaken / s.capacity) * 100)) : 0;
            return (
              <Link
                key={s.sessionId}
                className={`${styles.row} ${styles.scheduleRow} ${finished ? styles.finished : ""}`}
                href={`/ops/sessions/${s.sessionId}`}
                aria-label={`Open ${s.title} roster`}
              >
                <b>{time(s.startsAt)}</b>
                <span>
                  <strong>{s.title}</strong>
                  <small>
                    {running ? "On the mat now" : finished ? "Finished" : "Upcoming"} · {time(s.startsAt)} – {time(s.endsAt)}
                    {s.instructor ? ` · ${s.instructor}` : ""}
                  </small>
                  <i className={styles.capacity} aria-hidden="true">
                    <i style={{ width: `${fill}%` }} className={full ? styles.capacityFull : ""} />
                  </i>
                </span>
                <em className={running ? styles.live : ""}>
                  {s.seatsTaken} / {s.capacity}
                  {full ? " · Full" : ""}
                </em>
              </Link>
            );
          })
        )}
      </article>
    </section>
  );
}
