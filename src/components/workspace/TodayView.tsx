"use client";
import Link from "@/components/primitives/AppLink";
import { useEffect, useState } from "react";
import { getStaffSessions } from "@/integrations/staff-sessions";
import { getSessions } from "@/integrations/kiosk";
import type { SessionOption } from "@/contracts/kiosk-attendance";
import NavIcon from "@/components/shell/NavIcon";
import styles from "./Workspace.module.scss";
const time = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
function Clock({ iso }: { iso: string }) {
  const parts = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).formatToParts(new Date(iso));
  return (
    <time dateTime={iso} aria-label={time(iso)}>
      <span>
        {parts
          .filter((p) => p.type !== "dayPeriod")
          .map((p) => p.value)
          .join("")
          .trim()}
      </span>
      {parts.some((p) => p.type === "dayPeriod") && (
        <small>{parts.find((p) => p.type === "dayPeriod")?.value}</small>
      )}
    </time>
  );
}
export default function TodayView({
  classesOnly = false,
  connected = false,
}: {
  classesOnly?: boolean;
  connected?: boolean;
}) {
  const [sessions, setSessions] = useState<SessionOption[] | null>(null);
  const [error, setError] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const loadSessions = connected ? getStaffSessions : getSessions;
    loadSessions(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setSessions(
            [...data].sort(
              (a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt),
            ),
          );
          setError(false);
          setNow(Date.now());
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [revision, connected]);
  useEffect(() => {
    const refresh = () => setRevision((n) => n + 1);
    window.addEventListener("focus", refresh);
    const timer = setInterval(refresh, 60000);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  const next = sessions?.find((s) => Date.parse(s.endsAt) > (now ?? 0));
  const started = next && Date.parse(next.startsAt) <= (now ?? 0);
  const schedule = (
    <ul className={styles.schedule}>
      {sessions?.map((s) => (
        <li key={s.sessionId}>
          <Link href={`/ops/sessions/${s.sessionId}`}>
            <Clock iso={s.startsAt} />
            <div className={styles.classDetails}>
              <h3>{s.title}</h3>
              <p>Until {time(s.endsAt)}</p>
            </div>
            <span className={styles.bookingCount}>
              {s.seatsTaken} / {s.capacity} booked
            </span>
            <span className={styles.arrow} aria-hidden="true">
              →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
  return (
    <section className={styles.page}>
      <header className={`${styles.heading} ${styles.todayHeading}`}>
        <h1>{classesOnly ? "Classes" : "Today"}</h1>
        <Link className={styles.quietButton} href="/kiosk">
          Check in <span aria-hidden="true">↗</span>
        </Link>
      </header>
      {error ? (
        <div className={styles.empty} role="alert">
          <h2>Classes aren’t available yet.</h2>
          <p>Connect an authorized staff device or try loading again.</p>
          <div>
            <Link className={styles.button} href="/integration/pair">
              Connect device
            </Link>{" "}
            <button
              className={styles.quietButton}
              onClick={() => setRevision((n) => n + 1)}
            >
              Try again
            </button>
          </div>
        </div>
      ) : sessions === null ? (
        <div className={styles.loading} role="status">
          <span className={styles.loadingSymbol} aria-hidden="true">
            <NavIcon name="classes" />
          </span>
          <p>Loading your day…</p>
        </div>
      ) : (
        <>
          {!classesOnly && next && (
            <Link
              className={`${styles.hero} ${styles.nextClass}`}
              href={`/ops/sessions/${next.sessionId}`}
              aria-label={`Open ${next.title} roster`}
            >
              <div>
                <div className={styles.pill}>
                  {started ? "On the mat now" : "Up next"}
                </div>
                <h2>{next.title}</h2>
                <p>
                  {time(next.startsAt)} · {next.seatsTaken}/{next.capacity}{" "}
                  booked
                </p>
              </div>
              <span className={styles.roundAction} aria-hidden="true">
                ↗
              </span>
            </Link>
          )}
          {!classesOnly && !next && sessions.length > 0 && (
            <p className={styles.dayComplete}>
              All classes finished for today.
            </p>
          )}
          {!classesOnly && sessions.length > 0 && (
            <p className={styles.summaryLine}>
              <span>
                <strong>{sessions.length}</strong>{" "}
                {sessions.length === 1 ? "class" : "classes"}
              </span>
              <span>
                <strong>
                  {sessions.reduce((n, s) => n + s.seatsTaken, 0)}
                </strong>{" "}
                bookings
              </span>
            </p>
          )}
          <div className={styles.scheduleSection}>
            <section>
              <div className={styles.sectionHeading}>
                <h2>{classesOnly ? "Schedule" : "Today’s schedule"}</h2>
                {!classesOnly && <Link href="/ops">All classes →</Link>}
              </div>
              {sessions.length ? (
                schedule
              ) : (
                <div className={styles.empty}>
                  No classes are scheduled today.
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </section>
  );
}
