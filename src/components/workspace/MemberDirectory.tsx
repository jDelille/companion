"use client";
import { useState } from "react";
import Link from "@/components/primitives/AppLink";
import styles from "./Workspace.module.scss";
type DirectoryMember = {
  id: string;
  name: string;
  memberNumber?: string;
  rank?: { name: string };
  membershipState?: string;
};
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
      <header className={styles.heading}>
        <div>
          <div className={styles.eyebrow}>The heart of your school</div>
          <h1>Your people.</h1>
          <p>Find a familiar face. See their story. Take the next step.</p>
        </div>
        <Link href="/hub?view=intake">New student →</Link>
      </header>
      <input
        className={styles.search}
        type="search"
        placeholder="Search by name or member number"
        aria-label="Search members"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className={styles.sectionHeading}>
        <h2>Members</h2>
        <span aria-live="polite">
          {filtered.length} {filtered.length === 1 ? "member" : "members"}
        </span>
      </div>
      {filtered.length ? (
        <ul className={styles.directory}>
          {filtered.map((m) => (
            <li key={m.id}>
              <Link href={`/people/${m.id}`} aria-label={m.name}>
                <span className={styles.avatar} aria-hidden="true">
                  {m.name
                    .split(" ")
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <div>
                  <strong>{m.name}</strong>
                  <p>
                    {[m.rank?.name, m.membershipState]
                      .filter(Boolean)
                      .join(" · ") || "View member record"}
                  </p>
                </div>
                <span className={styles.arrow} aria-hidden="true">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.empty}>
          {query
            ? "No members match that search."
            : "No members are available in this scope."}
        </div>
      )}
    </section>
  );
}
