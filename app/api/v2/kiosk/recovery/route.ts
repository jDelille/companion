import { configFrom, fail } from "@/server/odoo-gateway";
import { recoveryContext } from "@/server/kiosk-recovery";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try { return await recoveryContext(request, configFrom(process.env)); }
  catch { return fail("CAPABILITY_DISABLED"); }
}
