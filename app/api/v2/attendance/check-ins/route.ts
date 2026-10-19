import { odooRoute, odooTestMode } from "@/server/odoo-runtime";
import { POST as mockPOST } from "@/integrations/mock/routes/checkins";
export async function POST(request: Request) {
  return odooTestMode() ? odooRoute(request, "checkin") : mockPOST(request);
}
