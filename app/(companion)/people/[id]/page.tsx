import Member360View from "@/components/people/member-360/Member360View";
import { getMember, getMemberAttendance } from "@/integrations/member";
import type { Member, MemberAttendance } from "@/domain/member";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { odooRoute, odooTestMode } from "@/server/odoo-runtime";
export const dynamic = "force-dynamic";
export default async function MemberPage({params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  if (odooTestMode()) {
    const incoming = await headers();
    const response = await odooRoute(new Request("http://internal.invalid", {headers: {cookie: incoming.get("cookie") || ""}}), "member", id);
    if (response.status === 404) notFound();
    if (!response.ok) return <section><h1>Member information unavailable</h1><p>Connect an authorized staff test device, then reload this record.</p><a href="/integration/pair">Connect device</a></section>;
    const data = await response.json() as {member: Member; attendance: MemberAttendance};
    return <><p role="status">Odoo test data. Attendance and identity are connected. Unconnected actions are not enabled.</p>
      <Member360View member={data.member} attendance={data.attendance} liveTest />
    </>;
  }
  const member = await getMember(id);
  if (!member) notFound();
  return <Member360View member={member} attendance={await getMemberAttendance(member.id)} />;
}
