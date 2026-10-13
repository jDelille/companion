import { odooRoute, odooTestMode } from "@/server/odoo-runtime";
import { fail } from "@/server/odoo-gateway";
export async function POST(request: Request) {
  return odooTestMode() ? odooRoute(request, "guardianVerify") : fail("CAPABILITY_DISABLED");
}
