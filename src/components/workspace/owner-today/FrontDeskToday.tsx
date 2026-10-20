"use client";

import Link from "@/components/primitives/AppLink";
import { useEffect, useState } from "react";
import { callHub } from "@/components/people/member-360/edit-leaf/memberEdits";
import { mockMembers } from "@/integrations/mock/members";
import { useWorkspaceTabs } from "@/components/shell/workspace/openTabs";
import { DO_FOR_ME_EVENT, OPEN_COMMAND_EVENT, sendShellEvent } from "@/components/shell/workspace/shellEvents";
import { useTodayDecisions } from "./decisions";
import styles from "./OwnerToday.module.scss";
import frontDesk from "./FrontDeskToday.module.scss";

// Staff / instructor Today, laid out like do-for-me-1.png: "Current work".
// Active context is the member most recently opened (the newest member tab); the Service
// queue is today's decisions. Values come from Odoo (or the sample data in preview).

type Props = { role: string; connected: boolean };

// The active member, as this page shows them
type ActiveMember = {
  id: string;
  name: string;
  detail: string; // "Blue Belt · Children Advanced"
  state: string;
  nextClass: string;
  testReadiness: string;
};

const memberHref = /^\/people\/([^/]+)$/;

const stateLabel = (state: string) => state.charAt(0).toUpperCase() + state.slice(1);

// "Today 5:45 PM" / "Oct 21, 5:45 PM"
function classTime(iso: string) {
  const date = new Date(iso);
  const sameDay = date.toDateString() === new Date().toDateString();
  const clock = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return sameDay ? clock : `${date.toLocaleDateString([], { month: "short", day: "numeric" })}, ${clock}`;
}

async function loadActiveMember(memberId: string, connected: boolean): Promise<ActiveMember | null> {
  if (!connected) {
    const member = mockMembers.find((item) => item.id === memberId);
    if (!member) return null;
    return {
      id: member.id,
      name: member.name,
      detail: [member.rank.name, member.householdName].filter(Boolean).join(" · "),
      state: member.membershipState,
      nextClass: member.nextClass ?? "None booked",
      testReadiness: member.testReadiness === undefined ? "Not recorded" : `${member.testReadiness}%`,
    };
  }
  const value = await callHub("member_workspace", { memberId }, null);
  const member = value.member as { id: string; name: string; state: string; rank: string };
  const courses: { name: string }[] = Array.isArray(value.courses) ? value.courses : [];
  const bookings: { startsAt: string }[] = Array.isArray(value.bookings) ? value.bookings : [];
  const next = bookings
    .filter((booking) => Date.parse(booking.startsAt) > Date.now())
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))[0];
  return {
    id: member.id,
    name: member.name,
    detail: [member.rank, courses.map((course) => course.name).join(", ")].filter(Boolean).join(" · "),
    state: member.state,
    nextClass: next ? classTime(next.startsAt) : "None booked",
    testReadiness: "Not recorded", // Odoo has no readiness score yet
  };
}

export default function FrontDeskToday({ role, connected }: Props) {
  const tabs = useWorkspaceTabs();
  const lastMemberTab = [...tabs].reverse().find((tab) => memberHref.test(tab.href));
  const activeId = lastMemberTab ? lastMemberTab.href.match(memberHref)?.[1] ?? null : null;

  const [active, setActive] = useState<ActiveMember | null>(null);
  const [activeError, setActiveError] = useState(false);
  const { decisions, checking } = useTodayDecisions(connected);

  useEffect(() => {
    if (!activeId) return;
    let current = true;
    loadActiveMember(activeId, connected)
      .then((member) => {
        if (!current) return;
        setActive(member);
        setActiveError(member === null);
      })
      .catch(() => {
        if (current) setActiveError(true);
      });
    return () => {
      current = false;
    };
  }, [activeId, connected]);

  const shown = activeId && active?.id === activeId ? active : null;
  const workLabel = role === "instructor" ? "Instructor" : "Front desk";
  const memberPage = shown ? `/people/${shown.id}` : "";

  return (
    <section className={styles.page}>
      <div className={frontDesk.top}>
        <span className={styles.kicker}>{workLabel} · Current work</span>
        <span className={frontDesk.hint}>Tap a member for details</span>
      </div>

      {/* The big search: the same search and commands as the top bar (Ctrl+K) */}
      <button type="button" className={frontDesk.search} onClick={() => sendShellEvent(OPEN_COMMAND_EVENT, null)}>
        <span>Search member, family, lead, booking, payment, or command…</span>
        <kbd>⌘K</kbd>
      </button>

      <div className={frontDesk.columns}>
        {/* ACTIVE CONTEXT: the member being worked with */}
        <article className={frontDesk.card}>
          <small className={frontDesk.label}>Active context</small>
          {!activeId && <p className={frontDesk.note}>Open a member (search above) to work with them here.</p>}
          {activeId && !shown && !activeError && <p className={frontDesk.note}>Loading member…</p>}
          {activeId && activeError && <p className={frontDesk.note}>This member couldn’t be loaded. Sign in on the Hub page and try again.</p>}
          {shown && (
            <>
              <div className={frontDesk.member}>
                <span className={frontDesk.avatar} aria-hidden="true">
                  {shown.name
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0].toUpperCase())
                    .join("")}
                </span>
                <span className={frontDesk.memberName}>
                  <Link href={memberPage}>{shown.name}</Link>
                  <small>{shown.detail}</small>
                </span>
                <span className={frontDesk.state}>{stateLabel(shown.state)}</span>
              </div>
              <div className={frontDesk.facts}>
                <span>
                  <small>Membership</small>
                  <strong>{stateLabel(shown.state)}</strong>
                </span>
                <span>
                  <small>Next class</small>
                  <strong>{shown.nextClass}</strong>
                </span>
                <span>
                  <small>Test readiness</small>
                  <strong>{shown.testReadiness}</strong>
                </span>
              </div>
              <div className={frontDesk.actions}>
                <Link href="/kiosk" className={frontDesk.checkIn}>
                  Check in
                </Link>
                <Link href={`${memberPage}?action=book`}>Book</Link>
                <Link href={`${memberPage}?action=payment`}>Payment</Link>
                <Link href={`${memberPage}?action=message`}>Message</Link>
                <Link href={`${memberPage}?action=edit`}>✎ Edit</Link>
                <button
                  type="button"
                  aria-label={`Do For Me for ${shown.name}`}
                  onClick={() => sendShellEvent(DO_FOR_ME_EVENT, { memberId: shown.id })}
                >
                  ✦
                </button>
              </div>
            </>
          )}
        </article>

        {/* SERVICE QUEUE: today's decisions */}
        <article className={frontDesk.card}>
          <small className={frontDesk.label}>Service queue</small>
          {checking && <p className={frontDesk.note}>Checking…</p>}
          {!checking && decisions.length === 0 && <p className={frontDesk.note}>Nothing is waiting.</p>}
          {!checking && (
            <ul className={frontDesk.queue}>
              {decisions.slice(0, 4).map((decision) => (
                <li key={decision.key}>
                  <Link href={decision.href}>
                    <strong>{decision.title}</strong>
                    <span>{decision.detail}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/hub" className={frontDesk.openQueue}>
            Open queue →
          </Link>
        </article>
      </div>
    </section>
  );
}
