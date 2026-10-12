import { odooTestMode } from "@/server/odoo-runtime";
import TodayView from "@/components/workspace/TodayView";
export default function Home() {
  return <TodayView connected={odooTestMode()} />;
}
