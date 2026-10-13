import { odooTestMode } from "@/server/odoo-runtime";
import ClassSchedule from "@/components/workspace/class-schedule/ClassSchedule";
export const dynamic = "force-dynamic";
export default function OpsPage() {
  return <ClassSchedule connected={odooTestMode()} />;
}
