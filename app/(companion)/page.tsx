import { odooTestMode } from "@/server/odoo-runtime";
import OwnerToday from "@/components/workspace/owner-today/OwnerToday";
export default function Home() {
  return <OwnerToday connected={odooTestMode()} />;
}
