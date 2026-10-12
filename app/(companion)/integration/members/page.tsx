import { headers } from "next/headers";
import Link from "@/components/primitives/AppLink";
import { odooRoute } from "@/server/odoo-runtime";
import { ChevronRightIcon } from "@/icons";
import styles from "@/components/ai/follow-up/FollowUp.module.scss";
export const dynamic = "force-dynamic";

// Same layout as the staff workspace: title + intro, then a list of cards
export default async function IntegrationMembers() {
  const incoming = await headers();
  const result = await odooRoute(new Request("http://internal.invalid", {headers: {cookie: incoming.get("cookie") || ""}}), "members");

  if (!result.ok) {
    return (
      <section className={styles.workspace}>
        <header className={styles.pageTitles}>
          <h1 className={styles.pageTitle}>Staff test access required</h1>
          <p className={styles.intro}>
            <Link href="/integration/pair" className={styles.textLink}>Connect staff device</Link>
          </p>
        </header>
      </section>
    );
  }

  const members = await result.json() as Array<{id: string; name: string}>;

  return (
    <section className={styles.workspace}>
      <header className={styles.pageTitles}>
        <h1 className={styles.pageTitle}>Members</h1>
        <p className={styles.intro}>
          Choose a member to view attendance and prepare a follow-up. These are authorized records from the Odoo test database.
        </p>
      </header>

      {members.length ? (
        <ul className={styles.itemList}>
          {members.map((m) => (
            <li key={m.id}>
              {/* The whole card opens the member */}
              <Link href={`/people/${m.id}`} className={styles.memberItem}>
                <span className={styles.itemTitle}>{m.name}</span>
                <span className={styles.chevron} aria-hidden="true">
                  <ChevronRightIcon color="currentColor" size={16} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>No members are available in this authorized scope.</p>
      )}
    </section>
  );
}
