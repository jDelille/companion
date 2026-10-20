"use client";
import Link from "@/components/primitives/AppLink";
import { useEffect, useState } from "react";
import styles from "./SchoolDashboard.module.scss";

// School dashboard, modeled on the old HTML app's Dashboard page.
// Reads only: the Hub context (members) and, for owners and managers,
// today's operations report and class rosters. Nothing is written.

type Member = { id: string; name: string; state: string; rank: string };
type HubContext = {
  principal: { name: string; role: string };
  members: Member[];
};
type TodayReport = {
  attendance: { attended: number };
  classes: { id: string; name: string; startsAt: string }[];
};
type Roster = {
  session: { id: string; name: string; startsAt: string };
  members: { id: string; name: string; attendance: string }[];
};
type CheckIn = { memberName: string; className: string; status: string };

type DashboardState =
  | { kind: "loading" }
  | { kind: "signedOut" }
  | { kind: "unavailable" }
  | {
      kind: "ready";
      members: Member[];
      isManager: boolean;
      todayCheckIns: number | null;
      recentCheckIns: CheckIn[] | null;
    };

const MAX_ROSTERS = 6;

async function readHub<T>(
  operation: string,
  payload: Record<string, unknown>,
  signal: AbortSignal,
): Promise<T> {
  const response = await fetch("/api/hub", {
    method: "POST",
    headers: { "content-type": "application/json" },
    cache: "no-store",
    signal,
    body: JSON.stringify({ operation, payload, requestKey: null }),
  });
  const value = await response.json();
  if (!response.ok) throw Error(value.error?.code || "UNAVAILABLE");
  return value as T;
}

function todayDate() {
  // YYYY-MM-DD in the browser's timezone
  return new Date().toLocaleDateString("en-CA");
}

async function loadCheckIns(
  report: TodayReport,
  signal: AbortSignal,
): Promise<CheckIn[]> {
  const classes = [...report.classes]
    .sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt))
    .slice(0, MAX_ROSTERS);
  const rosters = await Promise.all(
    classes.map((oneClass) =>
      readHub<Roster>("session_roster", { sessionId: oneClass.id }, signal),
    ),
  );
  const checkIns: CheckIn[] = [];
  for (const roster of rosters) {
    for (const member of roster.members) {
      if (member.attendance === "present" || member.attendance === "late") {
        checkIns.push({
          memberName: member.name,
          className: roster.session.name,
          status: member.attendance,
        });
      }
    }
  }
  return checkIns;
}

function countByRank(members: Member[]) {
  const counts = new Map<string, number>();
  for (const member of members) {
    counts.set(member.rank, (counts.get(member.rank) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

export default function SchoolDashboard() {
  const [state, setState] = useState<DashboardState>({ kind: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      let context: HubContext;
      try {
        context = await readHub<HubContext>("context", {}, controller.signal);
      } catch (error) {
        if (controller.signal.aborted) return;
        const code = error instanceof Error ? error.message : "";
        setState({
          kind: code === "SIGN_IN_REQUIRED" ? "signedOut" : "unavailable",
        });
        return;
      }
      const isManager = ["owner", "manager"].includes(context.principal.role);
      let todayCheckIns: number | null = null;
      let recentCheckIns: CheckIn[] | null = null;
      if (isManager) {
        try {
          const report = await readHub<TodayReport>(
            "operations_report",
            { fromDate: todayDate(), toDate: todayDate() },
            controller.signal,
          );
          todayCheckIns = report.attendance.attended;
          recentCheckIns = await loadCheckIns(report, controller.signal);
        } catch {
          // Leave the numbers empty; the tiles say they could not load.
        }
      }
      if (controller.signal.aborted) return;
      setState({
        kind: "ready",
        members: context.members,
        isManager,
        todayCheckIns,
        recentCheckIns,
      });
    }
    void load();
    return () => controller.abort();
  }, []);

  if (state.kind === "loading") {
    return (
      <p className={styles.status} role="status">
        Loading school numbers…
      </p>
    );
  }
  if (state.kind === "signedOut") {
    return (
      <section className={styles.signIn}>
        <div>
          <h2>School dashboard</h2>
          <p>Sign in with your staff account to see students, check-ins and belts.</p>
        </div>
        <Link className={styles.signInButton} href="/hub">
          Sign in
        </Link>
      </section>
    );
  }
  if (state.kind === "unavailable") {
    return (
      <p className={styles.status} role="alert">
        School numbers couldn’t be loaded right now. Refresh to try again.
      </p>
    );
  }

  const enrolled = state.members.filter(
    (member) => member.state === "active" || member.state === "trial",
  );
  const activeCount = state.members.filter(
    (member) => member.state === "active",
  ).length;
  const trialCount = enrolled.length - activeCount;
  const belts = countByRank(enrolled);
  const managerOnly = "Managers and owners only";

  return (
    <section className={styles.dashboard} aria-label="School dashboard">
      <div className={styles.tiles}>
        <div className={`${styles.tile} ${styles.tileBrand}`}>
          <span className={styles.tileLabel}>Total students</span>
          <strong className={styles.tileValue}>{activeCount}</strong>
          <span className={styles.tileNote}>
            Active members{trialCount > 0 ? ` · ${trialCount} on trial` : ""}
          </span>
        </div>
        <div className={`${styles.tile} ${styles.tileMastery}`}>
          <span className={styles.tileLabel}>Today’s check-ins</span>
          <strong className={styles.tileValue}>
            {state.todayCheckIns ?? "—"}
          </strong>
          <span className={styles.tileNote}>
            {state.isManager
              ? state.todayCheckIns === null
                ? "Couldn’t load today’s attendance"
                : "Across all classes"
              : managerOnly}
          </span>
        </div>
        <div className={`${styles.tile} ${styles.tileSuccess} ${styles.tileSoon}`}>
          <span className={styles.tileLabel}>Birthdays this month</span>
          <strong className={styles.tileValue}>—</strong>
          <span className={styles.tileNote}>Coming soon</span>
        </div>
        <div className={`${styles.tile} ${styles.tileInfo} ${styles.tileSoon}`}>
          <span className={styles.tileLabel}>Expiring soon</span>
          <strong className={styles.tileValue}>—</strong>
          <span className={styles.tileNote}>Coming soon</span>
        </div>
      </div>

      <div className={styles.panels}>
        <section className={styles.panel}>
          <h2>Recent check-ins</h2>
          {!state.isManager ? (
            <p className={styles.muted}>{managerOnly}.</p>
          ) : state.recentCheckIns === null ? (
            <p className={styles.muted}>Couldn’t load today’s check-ins.</p>
          ) : state.recentCheckIns.length === 0 ? (
            <p className={styles.muted}>No check-ins yet today.</p>
          ) : (
            <ul className={styles.list}>
              {state.recentCheckIns.map((checkIn, index) => (
                <li key={`${checkIn.memberName}-${checkIn.className}-${index}`}>
                  <span>{checkIn.memberName}</span>
                  <span className={styles.muted}>
                    {checkIn.className}
                    {checkIn.status === "late" ? " · late" : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.panel}>
          <h2>Belt distribution</h2>
          {belts.length === 0 ? (
            <p className={styles.muted}>No belt data yet.</p>
          ) : (
            <ul className={styles.list}>
              {belts.map(([rank, count]) => (
                <li key={rank}>
                  <span>{rank}</span>
                  <strong>{count}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`${styles.panel} ${styles.panelSoon}`}>
          <h2>Upcoming birthdays</h2>
          <p className={styles.muted}>Coming soon.</p>
        </section>

        <section className={`${styles.panel} ${styles.panelSoon}`}>
          <h2>Memberships expiring soon</h2>
          <p className={styles.muted}>Coming soon.</p>
        </section>
      </div>
    </section>
  );
}
