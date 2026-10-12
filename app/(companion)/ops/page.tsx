import { odooTestMode } from "@/server/odoo-runtime";
import TodayView from "@/components/workspace/TodayView";
export const dynamic = "force-dynamic";
export default function OpsPage() {
  return <TodayView classesOnly connected={odooTestMode()} />;
}
