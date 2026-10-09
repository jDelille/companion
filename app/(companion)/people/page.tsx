import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { odooRoute, odooTestMode } from "@/server/odoo-runtime";

export const dynamic = "force-dynamic";

// The People tab's landing page. There's no member list yet (Miro 09.02), so
// it opens a member that exists in the current mode instead of a fixed id.
export default async function PeoplePage() {
  if (odooTestMode()) {
    const incoming = await headers();
    const request = new Request("http://internal.invalid", {
      headers: { cookie: incoming.get("cookie") || "" },
    });
    const response = await odooRoute(request, "members");

    // Not paired as staff yet: the members page explains how
    if (!response.ok) redirect("/integration/members");

    const members = (await response.json()) as Array<{ id: string; name: string }>;
    if (members.length === 0) redirect("/integration/members");
    redirect(`/people/${members[0].id}`);
  }

  redirect("/people/5001"); // Maya Chen, the mock data's main member
}
