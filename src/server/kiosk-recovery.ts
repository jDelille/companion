import { createHmac } from "node:crypto";
import { authorized, fail, handle, type Fetcher, type GatewayConfig } from "./odoo-gateway";

/** Recovery key is device-scoped, returned only after current authorization.
 * It is never an Odoo credential and must not be persisted by the browser.
 */
export async function recoveryContext(request: Request, config: GatewayConfig, fetcher: Fetcher = fetch) {
  const cookies = request.headers.get("cookie") || "";
  if (!authorized(config, "kiosk", cookies)) return fail("FORBIDDEN", undefined, 403);
  const probe = await handle(request, config, "sessions", undefined, fetcher);
  if (!probe.ok) return probe;
  const cookie = cookies.split(";").map(v => v.trim()).find(v => v.startsWith("dojang_kiosk_test="))!;
  const encoded = cookie.slice("dojang_kiosk_test=".length).split(".")[0];
  const expiresAt = JSON.parse(Buffer.from(encoded, "base64url").toString()).expiresAt;
  const binding = [config.backend, config.origin, config.token, config.kioskKey].join(":");
  const derive = (purpose: string) => createHmac("sha256", config.cookieSecret).update(purpose + binding).digest("hex");
  return Response.json({scope: derive("queue-scope:"), key: derive("queue-encryption:"), expiresAt: Math.min(expiresAt, Date.now() + 15 * 60 * 1000)}, {headers: {"cache-control": "private, no-store", vary: "Cookie"}});
}
