import { headers } from "next/headers";
import { odooRoute } from "@/server/odoo-runtime";
export const dynamic = "force-dynamic";
export default async function IntegrationMembers() {
  const incoming = await headers();
  const result = await odooRoute(new Request("http://internal.invalid", {headers: {cookie: incoming.get("cookie") || ""}}), "members");
  if (!result.ok) return <main><h1>Staff test access required</h1><a href="/integration/pair">Connect staff device</a></main>;
  const members = await result.json() as Array<{id: string; name: string}>;
  return <main><h1>Authorized test members</h1><p>These records are read from the configured Odoo test database.</p>
    <ul>{members.map(m => <li key={m.id}><a href={`/people/${m.id}`}>{m.name}</a></li>)}</ul>
  </main>;
}
