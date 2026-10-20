"use client";

import Link from "@/components/primitives/AppLink";
import { useEffect, useState } from "react";
import { getStaffSessions } from "@/integrations/staff-sessions";
import type { SessionOption } from "@/contracts/kiosk-attendance";
import { callHub } from "@/components/people/member-360/edit-leaf/memberEdits";
import { openWorkspaceTab } from "@/components/shell/workspace/openTabs";
import { useTodayDecisions, type Decision } from "./decisions";
import styles from "./OwnerToday.module.scss";
import executive from "./ExecutiveToday.module.scss";

// Owner / executive Today, laid out like owner-screen.png, for owners and managers.
// It's a page of its own (/owner), outside the staff shell: so the morning brief opens here
// on the page, and "+ Quick action" is a small menu of existing screens.
// Only what Odoo has data for. Left out until Odoo sends them: revenue, the monthly change
// in members, and "Recently joined" (no join dates).

type Props = { name: string; role: string };

type Report = { attendance: { recorded: number; attended: number } };
type Eligibility = { rows: { status: string }[] };
type Broadcasts = { broadcasts: { state: string }[] };

const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

function greeting(hour: number) {
  if (hour < 12) return "Good morning.";
  if (hour < 17) return "Good afternoon.";
  return "Good evening.";
}

// YYYY-MM-DD in the browser's time zone, `days` from today
function localDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString("en-CA");
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export default function ExecutiveToday({ role }: Props) {
  const [now, setNow] = useState<Date | null>(null);
  const [sessions, setSessions] = useState<SessionOption[] | null>(null);
  const [activeMembers, setActiveMembers] = useState<number | null>(null);
  const [attendance, setAttendance] = useState<Report["attendance"] | null>(null);
  const [eligible, setEligible] = useState<number | null>(null);
  const [awaitingApproval, setAwaitingApproval] = useState<number | null>(null);
  const [briefOpen, setBriefOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);

  // The same decisions the Companion panel shows (messages, coverage, full classes)
  const { decisions, checking } = useTodayDecisions(true);

  useEffect(() => {
    const controller = new AbortController();
    const done = () => !controller.signal.aborted;

    getStaffSessions(controller.signal)
      .then((list) => {
        if (!done()) return;
        setSessions([...list].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt)));
        setNow(new Date());
      })
      .catch(() => {
        if (done()) setSessions([]);
      });
    callHub("context", {}, null)
      .then((value: { members?: { state?: string }[] }) => {
        if (done() && Array.isArray(value.members)) {
          setActiveMembers(value.members.filter((member) => member.state === "active").length);
        }
      })
      .catch(() => {});
    callHub("operations_report", { fromDate: localDate(-29), toDate: localDate(0) }, null)
      .then((value: Report) => {
        if (done()) setAttendance(value.attendance);
      })
      .catch(() => {});
    callHub("testing_eligibility", { query: "" }, null)
      .then((value: Eligibility) => {
        if (done()) setEligible(value.rows.filter((row) => row.status === "eligible").length);
      })
      .catch(() => {});
    callHub("broadcast_context", {}, null)
      .then((value: Broadcasts) => {
        if (done()) setAwaitingApproval(value.broadcasts.filter((item) => item.state === "awaiting_approval").length);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const nowTime = now?.getTime() ?? 0;
  const attendanceRate =
    attendance && attendance.recorded > 0 ? Math.round((attendance.attended / attendance.recorded) * 100) : null;

  // Priority queue: today's decisions, broadcasts waiting for approval, students ready to test
  const queue: Decision[] = [...decisions];
  if (awaitingApproval) {
    queue.push({
      key: "broadcasts",
      tone: "warning",
      title: "Broadcasts awaiting approval",
      detail: `${plural(awaitingApproval, "broadcast needs", "broadcasts need")} an authorized approval`,
      href: "/hub?view=communications",
    });
  }
  if (eligible) {
    queue.push({
      key: "testing",
      tone: "info",
      title: "Progress reviews",
      detail: `${plural(eligible, "member is", "members are")} eligible to test`,
      href: "/hub?view=testing",
    });
  }

  // Morning brief: exceptions are everything in the queue except the testing opportunity
  const exceptions = queue.filter((item) => item.key !== "testing");

  const roleLabel = role === "owner" ? "Owner" : "Manager";

  return (
    <section className={styles.page}>
      <header className={executive.intro}>
        <div>
          <span className={styles.kicker}>{roleLabel} · Live operations</span>
          <h1>
            {now ? greeting(now.getHours()) : "Today."}{" "}
            {!checking && (queue.length ? "Here’s what needs your attention." : "Here’s your day.")}
          </h1>
          <p>{now ? now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" }) : " "}</p>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primary}
            aria-expanded={briefOpen}
            aria-controls="morning-brief"
            onClick={() => setBriefOpen((open) => !open)}
          >
            ✦ {briefOpen ? "Close" : "Open"} morning brief
          </button>
          <div className={executive.quick}>
            <button
              type="button"
              className={styles.secondary}
              aria-expanded={quickOpen}
              aria-haspopup="menu"
              onClick={() => setQuickOpen((open) => !open)}
            >
              + Quick action
            </button>
            {quickOpen && (
              <div className={executive.quickMenu} role="menu">
                <Link role="menuitem" href="/intel">✦ New action contract</Link>
                <Link role="menuitem" href="/hub?view=intake">New student</Link>
                <Link role="menuitem" href="/kiosk">Check in ↗</Link>
                <Link role="menuitem" href="/people">Members</Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ✦ MORNING BRIEF (doc section 3): exceptions and opportunities, from the same records */}
      {briefOpen && (
        <article className={`${styles.panel} ${executive.brief}`} id="morning-brief">
          <header>
            <span>
              <small>✦ Morning brief</small>
              <h2>
                {checking
                  ? "Checking…"
                  : `${plural(exceptions.length, "exception", "exceptions")} · ${plural(eligible ?? 0, "opportunity", "opportunities")}`}
              </h2>
            </span>
          </header>
          <div className={executive.briefBody}>
            <small>Primary attention</small>
            {exceptions.length === 0 && <p>Nothing needs a decision right now.</p>}
            <ul>
              {exceptions
                .slice(0, 4)
                .map((item) => (
                  <li key={item.key}>
                    <Link href={item.href}>{item.title}</Link>
                  </li>
                ))}
            </ul>
            <small>Opportunity</small>
            <ul>
              <li>
                {eligible === null ? (
                  "Testing eligibility unavailable"
                ) : (
                  <Link href="/hub?view=testing">{plural(eligible, "student is", "students are")} eligible to test</Link>
                )}
              </li>
            </ul>
            <div className={executive.briefActions}>
              <a
                className={styles.secondary}
                href="#needs-attention"
                onClick={(event) => {
                  event.preventDefault();
                  document.getElementById("needs-attention")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                Review exceptions
              </a>
              {/* Do For Me prepares reviewed work only; nothing runs until it's approved */}
              <Link className={styles.secondary} href="/intel">
                ✦ Handle safe work
              </Link>
            </div>
          </div>
        </article>
      )}

      {/* KPIs: only numbers Odoo has */}
      <div className={`${styles.metrics} ${executive.metrics}`}>
        <Link href="/people" className={styles.metric}>
          <small>Active members</small>
          <strong>{activeMembers ?? "—"}</strong>
          <span>View members</span>
        </Link>
        <Link href="/ops" className={styles.metric}>
          <small>Sessions today</small>
          <strong>{sessions ? sessions.length : "—"}</strong>
          <span>{sessions?.length ? "Ready for check-in" : "None scheduled"}</span>
        </Link>
        <Link href="/hub?view=operations" className={styles.metric}>
          <small>Attendance health</small>
          <strong>{attendanceRate === null ? "—" : `${attendanceRate}%`}</strong>
          <span>Last 30 days</span>
        </Link>
        <Link href="/hub?view=testing" className={styles.metric}>
          <small>Ready to test</small>
          <strong>{eligible ?? "—"}</strong>
          <span>Eligible for their next belt</span>
        </Link>
      </div>

      <div className={executive.columns}>
        {/* PRIORITY QUEUE */}
        <article className={styles.panel} id="needs-attention">
          <header>
            <span>
              <small>Priority queue</small>
              <h2>Needs attention</h2>
            </span>
            {!checking && queue.length > 0 && <b className={styles.count}>{queue.length}</b>}
          </header>
          {checking && <p className={styles.panelNote}>Checking…</p>}
          {!checking && queue.length === 0 && <p className={styles.panelNote}>Nothing needs a decision right now.</p>}
          {!checking &&
            queue.map((item) => (
              <Link key={item.key} className={styles.decision} href={item.href}>
                <i className={item.tone === "warning" ? styles.warning : styles.info} aria-hidden="true">
                  {item.tone === "warning" ? "!" : "●"}
                </i>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.detail}</small>
                </span>
                <em aria-hidden="true">›</em>
              </Link>
            ))}
        </article>

        {/* TODAY · OPERATING RHYTHM */}
        <article className={styles.panel}>
          <header>
            <span>
              <small>Today</small>
              <h2>Operating rhythm</h2>
            </span>
            <Link className={styles.headerLink} href="/ops">
              Full calendar
            </Link>
          </header>
          {sessions === null && <p className={styles.panelNote}>Loading classes…</p>}
          {sessions?.length === 0 && <p className={styles.panelNote}>No classes are scheduled today.</p>}
          {sessions?.map((session) => {
            const running = Date.parse(session.startsAt) <= nowTime && Date.parse(session.endsAt) > nowTime;
            const href = `/ops/sessions/${session.sessionId}`;
            const detail = [session.instructor ?? "No instructor", session.location].filter(Boolean).join(" · ");
            return (
              <Link key={session.sessionId} className={styles.row} href={href} onClick={() => openWorkspaceTab({ href, label: session.title })}>
                <b>{time(session.startsAt)}</b>
                <span>
                  <strong>{session.title}</strong>
                  <small className={running ? styles.onMat : ""}>
                    {detail}
                    {running ? " · On the mat now" : ""}
                  </small>
                </span>
                <span className={executive.seats}>
                  {session.seatsTaken} / {session.capacity}
                </span>
              </Link>
            );
          })}
        </article>
      </div>
    </section>
  );
}
