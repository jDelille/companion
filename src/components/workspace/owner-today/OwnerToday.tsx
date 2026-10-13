"use client";
import Link from "@/components/primitives/AppLink";
import { useEffect, useState } from "react";
import { getStaffSessions } from "@/integrations/staff-sessions";
import { getSessions } from "@/integrations/kiosk";
import { listMembers, type StaffMemberSummary } from "@/integrations/staff-members";
import type { SessionOption } from "@/contracts/kiosk-attendance";
import { useTodayDecisions } from "./decisions";
import styles from "./OwnerToday.module.scss";

// The Today page, after Paul's write-up: TODAY (classes) → DECISIONS → BUSINESS PULSE.
// "A decision surface, not a reporting surface." Every item comes from real records.

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

function greeting(hour: number) {
  if (hour < 12) return "Good morning.";
  if (hour < 17) return "Good afternoon.";
  return "Good evening.";
}

export default function OwnerToday({ connected = false }: { connected?: boolean }) {
  const [sessions, setSessions] = useState<SessionOption[] | null>(null);
  const [sessionsFailed, setSessionsFailed] = useState(false);
  const [members, setMembers] = useState<StaffMemberSummary[] | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [revision, setRevision] = useState(0);

  // Today's classes, refreshed every minute and when the window regains focus
  useEffect(() => {
    const controller = new AbortController();
    const loadSessions = connected ? getStaffSessions : getSessions;
    loadSessions(controller.signal)
      .then((list) => {
        if (controller.signal.aborted) return;
        setSessions([...list].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt)));
        setSessionsFailed(false);
        setNow(new Date());
      })
      .catch(() => {
        if (!controller.signal.aborted) setSessionsFailed(true);
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

  // Members, for the pulse
  useEffect(() => {
    if (!connected) return;
    const controller = new AbortController();
    listMembers(controller.signal).then((list) => {
      if (!controller.signal.aborted) setMembers(list);
    });
    return () => controller.abort();
  }, [connected, revision]);

  // The same decisions the Companion panel shows
  const { decisions, hub, checking } = useTodayDecisions(connected);

  const nowTime = now?.getTime() ?? 0;
  const upcoming = sessions?.find((s) => Date.parse(s.startsAt) > nowTime);
  const booked = sessions?.reduce((total, s) => total + s.seatsTaken, 0) ?? 0;
  const activeMembers = members?.filter((m) => m.membershipState === "active").length;
  const knowsStates = members?.some((m) => m.membershipState !== undefined);

  return (
    <section className={styles.page}>
      <header className={styles.intro}>
        <div>
          <span className={styles.kicker}>Today · Live operations</span>
          <h1>
            {now ? greeting(now.getHours()) : "Today."}{" "}
            {decisions.length
              ? `${decisions.length} ${decisions.length === 1 ? "thing needs" : "things need"} your attention.`
              : "Here’s your day."}
          </h1>
          <p>{now?.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}</p>
        </div>
        <div className={styles.actions}>
          <Link className={styles.primary} href="/kiosk">
            Check in ↗
          </Link>
          <Link className={styles.secondary} href="/ops">
            All classes
          </Link>
        </div>
      </header>

      {/* TODAY */}
      <article className={styles.panel}>
        <header>
          <span>
            <small>Today</small>
            <h2>Classes</h2>
          </span>
          <Link className={styles.headerLink} href="/ops">
            All classes
          </Link>
        </header>
        {sessionsFailed ? (
          <p className={styles.panelNote} role="alert">
            Classes aren’t available yet. <Link href="/integration/pair">Connect device</Link>{" "}
            <button className={styles.textButton} onClick={() => setRevision((n) => n + 1)}>
              Try again
            </button>
          </p>
        ) : sessions === null ? (
          <p className={styles.panelNote} role="status">
            Loading your day…
          </p>
        ) : sessions.length ? (
          sessions.map((s) => {
            const running = Date.parse(s.startsAt) <= nowTime && Date.parse(s.endsAt) > nowTime;
            const finished = Date.parse(s.endsAt) <= nowTime;
            return (
              <Link
                key={s.sessionId}
                className={`${styles.row} ${finished ? styles.finished : ""}`}
                href={`/ops/sessions/${s.sessionId}`}
              >
                <b>{time(s.startsAt)}</b>
                <span>
                  <strong>{s.title}</strong>
                  <small>{running ? "On the mat now" : finished ? "Finished" : `Until ${time(s.endsAt)}`}</small>
                </span>
                <em className={running ? styles.live : ""}>
                  {s.seatsTaken} / {s.capacity}
                </em>
              </Link>
            );
          })
        ) : (
          <p className={styles.panelNote}>No classes are scheduled today.</p>
        )}
      </article>

      {/* DECISIONS (the Companion panel's "Review all" scrolls here) */}
      <article className={styles.panel} id="today-decisions">
        <header>
          <span>
            <small>Decisions</small>
            <h2>Needs attention</h2>
          </span>
          {decisions.length > 0 && <b className={styles.count}>{decisions.length}</b>}
        </header>
        {decisions.map((d) => (
          <Link key={d.key} className={styles.decision} href={d.href}>
            <i className={d.tone === "warning" ? styles.warning : styles.info} aria-hidden="true">
              {d.tone === "warning" ? "!" : "●"}
            </i>
            <span>
              <strong>{d.title}</strong>
              <small>{d.detail}</small>
            </span>
            <em aria-hidden="true">›</em>
          </Link>
        ))}
        {decisions.length === 0 && hub?.kind !== "signedOut" && (
          <p className={styles.panelNote}>
            {checking ? "Checking what needs attention…" : "Nothing needs a decision right now."}
          </p>
        )}
        {hub?.kind === "signedOut" && (
          <p className={styles.panelNote}>
            <Link href="/hub">Sign in</Link> to see messages, replies and instructor coverage.
          </p>
        )}
        {hub?.kind === "unavailable" && (
          <p className={styles.panelNote}>Messages and coverage couldn’t be checked right now.</p>
        )}
      </article>

      {/* BUSINESS PULSE */}
      <span className={styles.sectionLabel}>Business pulse</span>
      <div className={styles.metrics}>
        <Link href="/people" className={styles.metric}>
          <small>{knowsStates ? "Active members" : "Members"}</small>
          <strong>{members ? (knowsStates ? activeMembers : members.length) : "—"}</strong>
          <span>{members ? "View members" : connected ? "Couldn’t load members" : "Not connected"}</span>
        </Link>
        <Link href="/ops" className={styles.metric}>
          <small>Classes today</small>
          <strong>{sessions ? sessions.length : "—"}</strong>
          <span>{sessions?.length ? "Ready for check-in" : "None scheduled"}</span>
        </Link>
        <Link href="/ops" className={styles.metric}>
          <small>Booked today</small>
          <strong>{sessions ? booked : "—"}</strong>
          <span>Across all classes</span>
        </Link>
        <div className={styles.metric}>
          <small>Next class</small>
          <strong>{upcoming ? time(upcoming.startsAt) : "—"}</strong>
          <span>{upcoming ? upcoming.title : "No more classes today"}</span>
        </div>
      </div>
    </section>
  );
}
