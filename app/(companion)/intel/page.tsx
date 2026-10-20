import { odooTestMode } from "@/server/odoo-runtime";
import ActionContract from "@/components/workbench/ActionContract";
export const dynamic = "force-dynamic";

// Intel → AI Workbench: the Action contract for a goal (/intel?goal=…)
export default async function IntelPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const query = await searchParams;
  const goal = typeof query.goal === "string" ? query.goal.trim().slice(0, 200) : "";
  return <ActionContract key={goal} goal={goal} liveTest={odooTestMode()} />;
}
