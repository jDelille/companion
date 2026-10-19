"use client";
import { useState } from "react";
import Link from "@/components/primitives/AppLink";
// Same page, panel and row styles as Today and Classes
import styles from "./owner-today/OwnerToday.module.scss";

type DirectoryMember = {
  id: string;
  name: string;
  memberNumber?: string;
  rank?: { name: string };
  membershipState?: string;
};

// "Maya Chen" -> "MC"
const initials = (name: string) =>
  name
    .split(" ")
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

export default function MemberDirectory({
  members,
}: {
  members: DirectoryMember[];
}) {
  const [query, setQuery] = useState("");
  const filtered = members.filter((m) =>
    `${m.name} ${m.memberNumber ?? ""}`
      .toLowerCase()
      .includes(query.toLowerCase().trim()),
  );
  return (
    <section className={styles.page}>
      <header className={styles.intro}>
        <div>
          <span className={styles.kicker}>People · Members</span>
          <h1>Members</h1>
          <p>
            {members.length} {members.length === 1 ? "member" : "members"}
          </p>
        </div>
        <div className={styles.actions}>
          <Link className={styles.primary} href="/hub?view=intake">
            + New student
          </Link>
        </div>
      </header>

      <article className={styles.panel}>
        <header>
          <span>
            <small>Directory</small>
            <h2>All members</h2>
          </span>
          <span className={styles.headerNote} aria-live="polite">
            {filtered.length} {filtered.length === 1 ? "member" : "members"}
          </span>
        </header>
        <div className={styles.panelSearch}>
          <input
            type="search"
            placeholder="Filter by name or member number"
            aria-label="Filter members"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {filtered.length ? (
          filtered.map((m) => (
            <Link key={m.id} className={styles.memberRow} href={`/people/${m.id}`} aria-label={m.name}>
              <i aria-hidden="true">{initials(m.name)}</i>
              <span>
                <strong>{m.name}</strong>
                <small>
                  {[m.memberNumber, m.rank?.name, m.membershipState].filter(Boolean).join(" · ") ||
                    "View member record"}
                </small>
              </span>
              <em aria-hidden="true">›</em>
            </Link>
          ))
        ) : (
          <p className={styles.panelNote}>
            {query ? "No members match that search." : "No members are available in this scope."}
          </p>
        )}
      </article>
    </section>
  );
}
