import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { odooRoute, odooTestMode } from "@/server/odoo-runtime";
import { getMembers } from "@/integrations/member";
import MemberDirectory from "@/components/workspace/MemberDirectory";
export const dynamic = "force-dynamic";
export default async function PeoplePage() {
  if (odooTestMode()) {
    const incoming = await headers();
    const response = await odooRoute(
      new Request("http://internal.invalid", {
        headers: { cookie: incoming.get("cookie") || "" },
      }),
      "members",
    );
    if (!response.ok) redirect("/integration/members");
    return <MemberDirectory members={await response.json()} />;
  }
  return <MemberDirectory members={await getMembers()} />;
}
