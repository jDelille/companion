import Link from "@/components/primitives/AppLink";
import { odooTestMode } from "@/server/odoo-runtime";
import ConnectedWorkflowView from "@/components/ai/follow-up/ConnectedWorkflowView";
import FollowUpQueue from "@/components/ai/follow-up/FollowUpQueue";
import styles from "@/components/workspace/Workspace.module.scss";
export default function FollowUpsPage() {
  if (odooTestMode())
    return (
      <>
        <ConnectedWorkflowView historyOnly />
        <div className={styles.page}>
          <Link className={styles.quietButton} href="/hub">
            Open staff Hub →
          </Link>
        </div>
      </>
    );
  return <FollowUpQueue />;
}
