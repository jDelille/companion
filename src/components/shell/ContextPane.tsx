import { useEffect, useState, type ReactNode } from "react";
import styles from "./ContextPane.module.scss";
import Link from "@/components/primitives/AppLink";
import { usePathname, useSearchParams } from "next/navigation";
import { useSelectedMember } from "./selected-member/selectedMember";
import { listMembers, type StaffMemberSummary } from "@/integrations/staff-members";
import { getStaffSessions } from "@/integrations/staff-sessions";
import type { SessionOption } from "@/contracts/kiosk-attendance";

type Props = {
  children: ReactNode;
  section?: "people" | "classes"; // which section's column to show; the shell decides
};

const arrivals = [
  { time: "4:15", name: "Pee Wee", detail: "18 booked · 4 in" },
  { time: "5:00", name: "Children Beginner", detail: "21 booked · 2 trials" },
  {
    time: "5:45",
    name: "Children Advanced",
    detail: "17 booked",
    active: true,
  },
];

const kiosks = [{ name: "Lobby iPad", detail: "Online · Queue 0" }];

// Mock data's saved views. Against Odoo only "All members" is shown, with the
// real count: the other views have no data source yet.
const IS_MOCK = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

const savedViews = [
  { name: "All members", count: 386, active: true },
  { name: "Testing eligible", count: 32 },
  { name: "At risk", count: 11 },
];

// "Maya Chen" -> "MC"
const initials = (name: string) => {
  return name
    .split(" ")
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
};

const ContextPane = ({ children, section }: Props) => {
  const pathname = usePathname();
  const params = useSearchParams();
  const hubView = pathname === "/hub" ? params.get("view") : null;
  const onPeople = section ? section === "people" : pathname.startsWith("/people");
  const selectedMember = useSelectedMember();

  // Odoo mode: load the members this device may see once the People pane is open.
  // The count and the search both use this list.
  const [members, setMembers] = useState<StaffMemberSummary[] | null>(null);
  const [query, setQuery] = useState("");
  useEffect(() => {
    if (IS_MOCK || !onPeople) return;
    const controller = new AbortController();
    listMembers(controller.signal).then((list) => {
      if (!controller.signal.aborted) setMembers(list);
    });
    return () => controller.abort();
  }, [onPeople]);
  // Odoo mode: today's real classes for "Arriving soon"
  const [sessions, setSessions] = useState<SessionOption[] | null>(null);
  const [sessionsFailed, setSessionsFailed] = useState(false);
  const [classQuery, setClassQuery] = useState("");
  useEffect(() => {
    if (IS_MOCK || onPeople) return;
    const controller = new AbortController();
    getStaffSessions(controller.signal)
      .then((list) => {
        if (controller.signal.aborted) return;
        setSessions([...list].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt)));
        setSessionsFailed(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setSessionsFailed(true);
      });
    return () => controller.abort();
  }, [onPeople]);
  const search = query.trim().toLowerCase();
  const matches = search && members
    ? members.filter((member) => member.name.toLowerCase().includes(search)).slice(0, 8)
    : [];

  if (onPeople) {
    return (
      <div className={styles.contextPane}>
        <div className={styles.contextPane__header}>
          <h2>Members</h2>
        </div>
        {/* Search only shows when there's a real list to search */}
        {members && (
          <input
            type="search"
            className={styles.searchBar}
            placeholder="Search members..."
            aria-label="Search members"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        )}

        {search && (
          <>
            <p className={styles.label}>
              {matches.length ? "Results" : "No members match"}
            </p>
            {matches.map((member) => (
              <Link
                key={member.id}
                href={`/people/${member.id}`}
                className={styles.item}
                onClick={() => setQuery("")}
              >
                <div className={styles.avatar}>{initials(member.name)}</div>
                <div className={styles.info}>
                  <p>{member.name}</p>
                </div>
              </Link>
            ))}
          </>
        )}

        <p className={styles.label}>Saved views</p>
        {IS_MOCK ? (
          savedViews.map((v) => (
            <div
              key={v.name}
              className={`${styles.item} ${v.active ? styles.active : ""}`}
            >
              <div className={styles.info}>
                <p>{v.name}</p>
              </div>
              <span>{v.count}</span>
            </div>
          ))
        ) : (
          <Link
            href="/people"
            className={`${styles.item} ${pathname === "/people" ? styles.active : ""}`}
          >
            <div className={styles.info}>
              <p>All members</p>
            </div>
            {/* blank until loaded, or if this device can't read members */}
            <span>{members ? members.length : ""}</span>
          </Link>
        )}
        {!IS_MOCK && (
          <Link
            href="/hub?view=archived"
            className={`${styles.item} ${hubView === "archived" ? styles.active : ""}`}
          >
            <div className={styles.info}>
              <p>Archived students</p>
            </div>
          </Link>
        )}

        {!IS_MOCK && (
          <>
            <p className={styles.label}>Actions</p>
            <Link
              href="/hub?view=intake"
              className={`${styles.item} ${hubView === "intake" ? styles.active : ""}`}
            >
              <div className={styles.info}>
                <p>+ New student</p>
              </div>
            </Link>
            <Link
              href="/hub?view=courses"
              className={`${styles.item} ${hubView === "courses" ? styles.active : ""}`}
            >
              <div className={styles.info}>
                <p>Course rosters</p>
              </div>
            </Link>
          </>
        )}

        {/* The member on screen, as the page reported it */}
        {selectedMember && (
          <>
            <p className={styles.label}>Selected</p>
            <Link
              href={`/people/${selectedMember.id}`}
              className={`${styles.item} ${styles.active}`}
            >
              <div className={styles.avatar}>
                {initials(selectedMember.name)}
              </div>
              <div className={styles.info}>
                <p>{selectedMember.name}</p>
                <span>{selectedMember.detail}</span>
              </div>
            </Link>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={styles.contextPane}>
      <div className={styles.contextPane__header}>
        <h2>Arriving soon</h2>
      </div>
      {!IS_MOCK ? (
        <ArrivingClasses
          sessions={sessions}
          failed={sessionsFailed}
          query={classQuery}
          onQuery={setClassQuery}
          pathname={pathname}
        />
      ) : (
      <>
      <input
        type="text"
        className={styles.searchBar}
        placeholder="Search arrivals..."
      />

      {arrivals.map((a) => (
        <div
          key={a.time}
          className={`${styles.item} ${a.active ? styles.active : ""}`}
        >
          <div className={styles.time}>{a.time}</div>
          <div className={styles.info}>
            <p>{a.name}</p>
            <span>{a.detail}</span>
          </div>
        </div>
      ))}

      <div className={styles.kioskSection}>
        <p className={styles.label}>Kiosk</p>
        {kiosks.map((k) => (
          <div key={k.name} className={styles.kioskItem}>
            <div className={styles.status}></div>
            <div className={styles.info}>
              <p>{k.name}</p>
              <span>{k.detail}</span>
            </div>
          </div>
        ))}
      </div>
      </>
      )}
    </div>
  );
};

// "5:45" style start time in the browser's timezone
const startTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M$/i, "");

// Today's classes from Odoo: start time, name, bookings. The running class is highlighted.
function ArrivingClasses({
  sessions,
  failed,
  query,
  onQuery,
  pathname,
}: {
  sessions: SessionOption[] | null;
  failed: boolean;
  query: string;
  onQuery: (value: string) => void;
  pathname: string;
}) {
  if (failed) return <p className={styles.label}>Classes couldn’t be loaded</p>;
  if (sessions === null) return <p className={styles.label}>Loading classes…</p>;
  if (sessions.length === 0) return <p className={styles.label}>No classes today</p>;
  const now = Date.now();
  const search = query.trim().toLowerCase();
  const shown = search
    ? sessions.filter((session) => session.title.toLowerCase().includes(search))
    : sessions;
  return (
    <>
      <input
        type="search"
        className={styles.searchBar}
        placeholder="Search classes..."
        aria-label="Search today's classes"
        value={query}
        onChange={(event) => onQuery(event.target.value)}
      />
      {shown.length === 0 && <p className={styles.label}>No classes match</p>}
      {shown.map((session) => {
        const running = Date.parse(session.startsAt) <= now && Date.parse(session.endsAt) > now;
        const href = `/ops/sessions/${session.sessionId}`;
        return (
          <Link
            key={session.sessionId}
            href={href}
            className={`${styles.item} ${running || pathname === href ? styles.active : ""}`}
          >
            <div className={styles.time}>{startTime(session.startsAt)}</div>
            <div className={styles.info}>
              <p>{session.title}</p>
              <span>
                {session.seatsTaken} booked{running ? " · on the mat now" : ""}
              </span>
            </div>
          </Link>
        );
      })}
    </>
  );
}

export default ContextPane;
