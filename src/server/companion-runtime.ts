import "server-only";
import { configFrom, fail } from "./odoo-gateway";
import { liveCompanion } from "./companion-live";
export async function companionRoute(request: Request, kind: "context" | "request" | "approval") {
  try { return await liveCompanion(request, configFrom(process.env), kind); }
  catch { return fail("CAPABILITY_DISABLED"); }
}
