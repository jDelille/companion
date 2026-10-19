import { odooTestMode } from "@/server/odoo-runtime";
import { companionRoute } from "@/server/companion-runtime";
import { POST as mockPOST } from "@/integrations/mock/routes/companion-approvals";
export function POST(request: Request) { return odooTestMode() ? companionRoute(request, "approval") : mockPOST(request); }
