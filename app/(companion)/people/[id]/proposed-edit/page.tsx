import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { odooRoute, odooTestMode } from "@/server/odoo-runtime";
import { getMember } from "@/integrations/member";
import type { Member } from "@/domain/member";
import ProposedEdit from "@/components/people/member-360/proposed-edit/ProposedEdit";
export const dynamic = "force-dynamic";

// AI-assisted edit (doc section 8): /people/<id>/proposed-edit?request=…
// The member is read the same way as the member page.
export default async function ProposedEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const request = typeof query.request === "string" ? query.request.slice(0, 300) : "";

  let member: Member | null = null;
  if (odooTestMode()) {
    const incoming = await headers();
    const response = await odooRoute(
      new Request("http://internal.invalid", { headers: { cookie: incoming.get("cookie") || "" } }),
      "member",
      id,
    );
    if (response.status === 404) notFound();
    if (!response.ok)
      return <p role="alert" style={{ padding: 24 }}>This member couldn’t be loaded. Connect an authorized staff device, then try again.</p>;
    member = ((await response.json()) as { member: Member }).member;
  } else {
    member = await getMember(id);
  }
  if (!member) notFound();

  return <ProposedEdit member={member} request={request} liveTest={odooTestMode()} />;
}
