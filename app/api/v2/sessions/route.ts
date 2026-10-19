import { odooRoute, odooTestMode } from "@/server/odoo-runtime";
import { GET as mockGET } from "@/integrations/mock/routes/sessions";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return odooTestMode() ? odooRoute(request, "sessions") : mockGET();
}
