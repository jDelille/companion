import { headers } from "next/headers";
import Link from "next/link";
import { odooRoute } from "@/server/odoo-runtime";
import styles from "@/components/ai/follow-up/FollowUp.module.scss";
export const dynamic = "force-dynamic";
export default async function IntegrationMembers() {
  const incoming = await headers();
  const result = await odooRoute(new Request("http://internal.invalid", {headers: {cookie: incoming.get("cookie") || ""}}), "members");
  if (!result.ok) return <section className={styles.workspace}><h1>Staff test access required</h1><Link href="/integration/pair">Connect staff device</Link></section>;
  const members = await result.json() as Array<{id: string; name: string}>;
  return <section className={styles.workspace}><h1>Members</h1><p>Choose a member to view attendance and prepare a follow-up. These are authorized records from the Odoo test database.</p>
    {members.length ? <ul>{members.map(m => <li key={m.id}><Link href={`/people/${m.id}`}>{m.name}</Link></li>)}</ul> : <p>No members are available in this authorized scope.</p>}
  </section>;
}
