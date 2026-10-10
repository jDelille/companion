import FrontDeskView from "@/components/operations/front-desk/FrontDeskView";
import { getMember } from "@/integrations/member";
import { odooTestMode } from "@/server/odoo-runtime";
import ConnectedWorkflowView from "@/components/ai/follow-up/ConnectedWorkflowView";
export const dynamic = "force-dynamic";
export default async function OpsPage() {
  if (odooTestMode()) return <ConnectedWorkflowView />;
  const activeMember = await getMember("5001");
  return <FrontDeskView activeMember={activeMember} />;
}
