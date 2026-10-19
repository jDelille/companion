import { odooTestMode } from "@/server/odoo-runtime";
import { companionRoute } from "@/server/companion-runtime";
import { GET as mockGET } from "@/integrations/mock/routes/companion-context";
export const dynamic = "force-dynamic";
export function GET(request: Request) { return odooTestMode() ? companionRoute(request, "context") : mockGET(request); }
