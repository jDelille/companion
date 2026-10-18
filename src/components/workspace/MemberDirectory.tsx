"use client";
import { useState } from "react";
import Link from "@/components/primitives/AppLink";
import Select from "@/components/primitives/select/Select";
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
  const [membership, setMembership] = useState("");
  const states = [...new Set(members.map((member) => member.membershipState).filter((state): state is string => Boolean(state)))].sort();
  const filtered = members.filter((m) =>
    `${m.name} ${m.memberNumber ?? ""}`
      .toLowerCase()
      .includes(query.toLowerCase().trim()) && (!membership || m.membershipState === membership),
  );
  return (
    <section className={styles.page}>
      <header className={styles.heading}>
        <div>
          <h1>Members</h1>
          <p>Profiles, memberships and attendance.</p>
        </div>
        <Link className={styles.button} href="/hub?view=intake">New student <span aria-hidden="true">+</span></Link>
      </header>
      <div className={styles.directoryToolbar}>
      <input
        className={styles.search}
        type="search"
        placeholder="Search by name or member number"
        aria-label="Search members"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <Select
        ariaLabel="Filter by membership status"
        value={membership}
        onChange={setMembership}
        options={[{ value: "", label: "All membership statuses" }, ...states.map((state) => ({ value: state, label: state }))]}
      />
      </div>
      <div className={styles.sectionHeading}>
        <span aria-live="polite">
          {filtered.length} of {members.length} members in this view
        </span>
        {(query || membership) && <button className={styles.quietButton} onClick={() => { setQuery(""); setMembership(""); }}>Clear filters</button>}
      </div>
      <div className={styles.directoryColumns} aria-hidden="true"><span>Member</span><span>Rank</span><span>Membership</span><span /></div>
      {filtered.length ? (
        <ul className={styles.directory}>
          {filtered.map((m) => (
            <li key={m.id}>
              <Link href={`/people/${m.id}`} aria-label={m.name}>
                <div className={styles.directoryIdentity}>
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
                    {m.memberNumber ? `#${m.memberNumber}` : "View member record"}
                  </p>
                </div>
                </div>
                <span className={styles.directoryRank}><span className={styles.mobileFieldLabel}>Rank · </span>{m.rank?.name || "Not recorded"}</span>
                <span className={styles.directoryState}>{m.membershipState || "Status not recorded"}</span>
                <span className={styles.arrow} aria-hidden="true">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.empty}>
          {query || membership
            ? "No members match these filters."
            : "No members are available in this scope."}
        </div>
      )}
    </section>
  );
}
