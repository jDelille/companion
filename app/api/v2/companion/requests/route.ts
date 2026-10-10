import { odooTestMode } from "@/server/odoo-runtime";
import { companionRoute } from "@/server/companion-runtime";
import { POST as mockPOST } from "@/integrations/mock/routes/companion-requests";
export function POST(request: Request) { return odooTestMode() ? companionRoute(request, "request") : mockPOST(request); }
