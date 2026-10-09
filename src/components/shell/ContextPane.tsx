import { useEffect, useState, type ReactNode } from "react";
import styles from "./ContextPane.module.scss";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSelectedMember } from "./selected-member/selectedMember";
import { countMembers } from "@/integrations/staff-members";

type Props = {
  children: ReactNode;
}

const arrivals = [
  { time: "4:15", name: "Pee Wee", detail: "18 booked · 4 in" },
  { time: "5:00", name: "Children Beginner", detail: "21 booked · 2 trials" },
  { time: "5:45", name: "Children Advanced", detail: "17 booked", active: true },
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

const ContextPane = ({ children }: Props) => {
  const pathname = usePathname();
  const onPeople = pathname.startsWith("/people");
  const selectedMember = useSelectedMember();

  // Odoo mode: fetch the real member count once the People pane is open
  const [memberCount, setMemberCount] = useState<number | null>(null);
  useEffect(() => {
    if (IS_MOCK || !onPeople) return;
    const controller = new AbortController();
    countMembers(controller.signal).then((count) => {
      if (!controller.signal.aborted) setMemberCount(count);
    });
    return () => controller.abort();
  }, [onPeople]);

  if (onPeople) {
    return (
      <div className={styles.contextPane}>
        <div className={styles.contextPane__header}>
          <h2>Members</h2>
        </div>
        <input type="text" className={styles.searchBar} placeholder="Search members..." />

        <p className={styles.label}>Saved views</p>
        {IS_MOCK ? (
          savedViews.map((v) => (
            <div key={v.name} className={`${styles.item} ${v.active ? styles.active : ""}`}>
              <div className={styles.info}>
                <p>{v.name}</p>
              </div>
              <span>{v.count}</span>
            </div>
          ))
        ) : (
          <div className={`${styles.item} ${styles.active}`}>
            <div className={styles.info}>
              <p>All members</p>
            </div>
            {/* blank until loaded, or if this device can't read members */}
            <span>{memberCount ?? ""}</span>
          </div>
        )}

        {/* The member on screen, as the page reported it */}
        {selectedMember && (
          <>
            <p className={styles.label}>Selected</p>
            <Link
              href={`/people/${selectedMember.id}`}
              className={`${styles.item} ${styles.active}`}
            >
              <div className={styles.avatar}>{initials(selectedMember.name)}</div>
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
        <h2>Arriving Soon</h2>
      </div>
      <input type="text" className={styles.searchBar} placeholder="Search arrivals..." />

      {arrivals.map((a) => (
        <div key={a.time} className={`${styles.item} ${a.active ? styles.active : ""}`}>
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
    </div>
  );
};

export default ContextPane;