import DemoRoster from "@/components/workspace/DemoRoster";
import { notFound } from "next/navigation";
import { odooTestMode } from "@/server/odoo-runtime";
import ConnectedWorkflowView from "@/components/ai/follow-up/ConnectedWorkflowView";
export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[1-9][0-9]{0,9}$/.test(id)) notFound();
  if (!odooTestMode()) {
    if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") notFound();
    return <DemoRoster id={id}/>;
  }
  return <ConnectedWorkflowView />;
}
