import { odooTestMode } from "@/server/odoo-runtime";
import TodayByRole from "@/components/workspace/owner-today/TodayByRole";
// Owners and managers get the Owner / executive Today; everyone else the staff Today
export default function Home() {
  return <TodayByRole connected={odooTestMode()} />;
}
