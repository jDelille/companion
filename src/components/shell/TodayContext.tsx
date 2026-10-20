"use client";

import { useEffect, useState } from "react";
import styles from "./ContextPane.module.scss";
import Link from "@/components/primitives/AppLink";
import Avatar from "@/components/primitives/avatar/Avatar";
import { getStaffSessions } from "@/integrations/staff-sessions";
import { getSessions } from "@/integrations/kiosk";
import { listMembers, type StaffMemberSummary } from "@/integrations/staff-members";
import type { SessionOption } from "@/contracts/kiosk-attendance";
import { useTodayDecisions } from "@/components/workspace/owner-today/decisions";
import { openWorkspaceTab } from "./workspace/openTabs";

// The Today context column, after the master shell layout:
// Search → Saved views → Filters → Object list.
// Everything here is read only and comes from the same records as the Today page.

const CONNECTED = process.env.NEXT_PUBLIC_DEMO_MODE !== "true";

type View = "attention" | "classes" | "members";

// Each saved view has its own filters; the first one is the default
const filtersByView: Record<View, { id: string; label: string }[]> = {
  attention: [
    { id: "all", label: "All" },
    { id: "warning", label: "Urgent" },
  ],
  classes: [
    { id: "all", label: "All" },
    { id: "upcoming", label: "Upcoming" },
    { id: "running", label: "On the mat" },
    { id: "finished", label: "Finished" },
  ],
  members: [
    { id: "all", label: "All" },
    { id: "active", label: "Active" },
  ],
};

const startTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export default function TodayContext() {
  const [view, setView] = useState<View>("attention");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  const { decisions, checking } = useTodayDecisions(CONNECTED);

  const [sessions, setSessions] = useState<SessionOption[] | null>(null);
  const [sessionsFailed, setSessionsFailed] = useState(false);
  // The time "On the mat" and "Finished" are judged against: set when the classes
  // arrive, then every minute
  const [now, setNow] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const loadSessions = CONNECTED ? getStaffSessions : getSessions;
    loadSessions(controller.signal)
      .then((list) => {
        if (controller.signal.aborted) return;
        setNow(Date.now());
        setSessions([...list].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt)));
      })
      .catch(() => {
        if (!controller.signal.aborted) setSessionsFailed(true);
      });
    return () => controller.abort();
  }, []);

  // Members only come from Odoo; with sample data the Members view isn't offered
  const [members, setMembers] = useState<StaffMemberSummary[] | null>(null);
  useEffect(() => {
    if (!CONNECTED) return;
    const controller = new AbortController();
    listMembers(controller.signal).then((list) => {
      if (!controller.signal.aborted) setMembers(list);
    });
    return () => controller.abort();
  }, []);

  const chooseView = (next: View) => {
    setView(next);
    setFilter("all");
  };

  const search = query.trim().toLowerCase();

  // Needs attention
  const shownDecisions = decisions.filter((decision) => {
    if (filter === "warning" && decision.tone !== "warning") return false;
    return !search || decision.title.toLowerCase().includes(search);
  });

  // Today's classes
  const classState = (session: SessionOption) => {
    if (Date.parse(session.endsAt) <= now) return "finished";
    if (Date.parse(session.startsAt) <= now) return "running";
    return "upcoming";
  };
  const shownSessions = (sessions ?? []).filter((session) => {
    if (filter !== "all" && classState(session) !== filter) return false;
    return !search || session.title.toLowerCase().includes(search);
  });

  // Members (a long list, so only the first matches show)
  const shownMembers = (members ?? [])
    .filter((member) => {
      if (filter === "active" && member.membershipState !== "active") return false;
      return !search || member.name.toLowerCase().includes(search);
    })
    .slice(0, 30);

  const savedViews: { id: View; name: string; count: number | null }[] = [
    { id: "attention", name: "Needs attention", count: checking ? null : decisions.length },
    { id: "classes", name: "Today’s classes", count: sessions ? sessions.length : null },
  ];
  if (members) savedViews.push({ id: "members", name: "Members", count: members.length });

  const placeholder =
    view === "attention" ? "Search decisions..." : view === "classes" ? "Search classes..." : "Search members...";

  return (
    <div className={styles.contextPane}>
      <div className={styles.contextPane__header}>
        <h2>Today</h2>
      </div>

      <input
        type="search"
        className={styles.searchBar}
        placeholder={placeholder}
        aria-label={placeholder.replace("...", "")}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      <p className={styles.label}>Saved views</p>
      {savedViews.map((saved) => (
        <button
          key={saved.id}
          type="button"
          className={`${styles.item} ${styles.viewButton} ${view === saved.id ? styles.active : ""}`}
          aria-pressed={view === saved.id}
          onClick={() => chooseView(saved.id)}
        >
          <div className={styles.info}>
            <p>{saved.name}</p>
          </div>
          {/* blank until loaded */}
          <span>{saved.count ?? ""}</span>
        </button>
      ))}

      <p className={styles.label}>Filters</p>
      <div className={styles.filters}>
        {filtersByView[view].map((option) => (
          <button
            key={option.id}
            type="button"
            className={filter === option.id ? styles.filterOn : ""}
            aria-pressed={filter === option.id}
            onClick={() => setFilter(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <p className={styles.label}>
        {view === "attention" ? "Decisions" : view === "classes" ? "Classes" : "Members"}
      </p>

      {view === "attention" && (
        <>
          {checking && <p className={styles.note}>Checking…</p>}
          {!checking && shownDecisions.length === 0 && (
            <p className={styles.note}>{search || filter !== "all" ? "Nothing matches" : "Nothing needs a decision"}</p>
          )}
          {!checking &&
            shownDecisions.map((decision) => (
              <Link key={decision.key} href={decision.href} className={styles.item}>
                <div className={styles.info}>
                  <p>
                    {decision.tone === "warning" ? "! " : ""}
                    {decision.title}
                  </p>
                  <span>{decision.detail}</span>
                </div>
              </Link>
            ))}
        </>
      )}

      {view === "classes" && (
        <>
          {sessionsFailed && <p className={styles.note}>Classes couldn’t be loaded</p>}
          {!sessionsFailed && sessions === null && <p className={styles.note}>Loading classes…</p>}
          {sessions !== null && shownSessions.length === 0 && (
            <p className={styles.note}>{sessions.length ? "No classes match" : "No classes today"}</p>
          )}
          {shownSessions.map((session) => {
            const href = `/ops/sessions/${session.sessionId}`;
            const state = classState(session);
            return (
              <Link
                key={session.sessionId}
                href={href}
                className={`${styles.item} ${state === "running" ? styles.active : ""}`}
                onClick={() => openWorkspaceTab({ href, label: session.title })}
              >
                <div className={styles.time}>{startTime(session.startsAt)}</div>
                <div className={styles.info}>
                  <p>{session.title}</p>
                  <span>
                    {session.seatsTaken} / {session.capacity} booked
                    {state === "running" ? " · on the mat now" : state === "finished" ? " · finished" : ""}
                  </span>
                </div>
              </Link>
            );
          })}
        </>
      )}

      {view === "members" && (
        <>
          {shownMembers.length === 0 && <p className={styles.note}>No members match</p>}
          {shownMembers.length > 0 && (
            <div className={styles.results}>
              {shownMembers.map((member) => {
                const href = `/people/${member.id}`;
                return (
                  <Link
                    key={member.id}
                    href={href}
                    className={styles.result}
                    onClick={() => openWorkspaceTab({ href, label: member.name })}
                  >
                    <Avatar name={member.name} size="small" />
                    <span>{member.name}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
