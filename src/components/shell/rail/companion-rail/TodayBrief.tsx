"use client";
import Link from "@/components/primitives/AppLink";
import { useEffect, useState } from "react";
import { useTodayDecisions } from "@/components/workspace/owner-today/decisions";
import styles from "./CompanionRail.module.scss";

// The Companion's greeting on Today, after Paul's write-up:
// "Good afternoon. 3 things need your attention." + the list + [Review all].
// Same real decisions as the Today page; nothing is added here.

const CONNECTED = process.env.NEXT_PUBLIC_DEMO_MODE !== "true";

function greeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function TodayBrief() {
  const { decisions, hub, checking } = useTodayDecisions(CONNECTED);
  const [hour, setHour] = useState<number | null>(null);
  useEffect(() => setHour(new Date().getHours()), []);

  const reviewAll = () =>
    document.getElementById("today-decisions")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <section className={styles.todayBrief} aria-label="Today brief">
      {/* A non-breaking space keeps the heading's height until the greeting is known */}
      <h3>{hour === null ? " " : greeting(hour)}</h3>
      {/* Placeholders until the whole check is done, so the list arrives once, not item by item */}
      {checking ? (
        <div className={styles.skeletonGroup} role="status" aria-label="Checking what needs your attention">
          <i className={`${styles.skeleton} ${styles.skeletonSentence}`} aria-hidden="true" />
          {[1, 2, 3].map((placeholder) => (
            <i key={placeholder} className={`${styles.skeleton} ${styles.skeletonLine}`} aria-hidden="true" />
          ))}
        </div>
      ) : (
        <p>
          {decisions.length
            ? `${decisions.length} ${decisions.length === 1 ? "thing needs" : "things need"} your attention.`
            : "Nothing needs a decision right now."}
        </p>
      )}
      {!checking && decisions.length > 0 && (
        <>
          <ul>
            {decisions.map((d) => (
              <li key={d.key}>
                <Link href={d.href}>
                  {/* Amber for warnings, blue for information, like the Today page */}
                  <i className={d.tone === "warning" ? styles.dotWarning : styles.dotInfo} aria-hidden="true" />
                  {d.title}
                </Link>
              </li>
            ))}
          </ul>
          <button type="button" onClick={reviewAll}>
            Review all
          </button>
        </>
      )}
      {hub?.kind === "signedOut" && (
        <p className={styles.todayBriefNote}>
          <Link href="/hub">Sign in</Link> to include messages and instructor coverage.
        </p>
      )}
    </section>
  );
}
