import ConnectedWorkflowView from "@/components/ai/follow-up/ConnectedWorkflowView";
import Member360View from "@/components/people/member-360/Member360View";
import { getMember, getMemberAttendance } from "@/integrations/member";
import type { Member, MemberAttendance } from "@/domain/member";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { odooRoute, odooTestMode } from "@/server/odoo-runtime";
import { InfoIcon } from "@/icons";
import styles from "@/components/people/member-360/Member360View.module.scss";
import pageStyles from "@/components/ai/follow-up/FollowUp.module.scss";
import Link from "@/components/primitives/AppLink";
export const dynamic = "force-dynamic";

// Hidden for the VNext design. Set to true to show the "Connected Odoo records" notice again.
const SHOW_CONNECTION_NOTICE = false;
// Hidden for the VNext design: the school-wide follow-up list lives on the Follow-ups page.
// Set to true to show it under the member profile again.
const SHOW_FOLLOW_UP_HISTORY = false;
export default async function MemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (odooTestMode()) {
    const incoming = await headers();
    const response = await odooRoute(
      new Request("http://internal.invalid", {
        headers: { cookie: incoming.get("cookie") || "" },
      }),
      "member",
      id,
    );
    if (response.status === 404) notFound();
    if (!response.ok)
      // Same look as the Follow-ups page when its records can't load
      return (
        <section className={pageStyles.workspace}>
          <header className={pageStyles.pageTitles}>
            <span className={pageStyles.kicker}>People · Member</span>
            <h1 className={pageStyles.pageTitle}>Member information unavailable</h1>
          </header>
          <div className={pageStyles.empty} role="alert">
            <strong>This record couldn&apos;t be loaded</strong>
            Connect an authorized staff test device, then reload this record.
            <Link href="/integration/pair" className={pageStyles.connectButton}>
              Connect staff device
            </Link>
          </div>
        </section>
      );
    const data = (await response.json()) as {
      member: Member;
      attendance: MemberAttendance;
    };
    return (
      <>
        {SHOW_CONNECTION_NOTICE && (
          <p role="status" className={styles.notice}>
            <InfoIcon color="currentColor" size={16} />
            <span>
              Connected Odoo records. Private tabs and reviewed actions use your
              individual staff account. Billing and private member information
              require manager access; invoice checkout depends on school payment setup.
            </span>
          </p>
        )}
        <Member360View
          member={data.member}
          attendance={data.attendance}
          liveTest
        />
        {SHOW_FOLLOW_UP_HISTORY && <ConnectedWorkflowView historyOnly />}
      </>
    );
  }
  const [member, attendance] = await Promise.all([
    getMember(id),
    getMemberAttendance(id),
  ]);
  if (!member) notFound();
  return <Member360View member={member} attendance={attendance} />;
}
