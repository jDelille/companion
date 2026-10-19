import { odooRoute, odooTestMode } from "@/server/odoo-runtime";
import { GET as mockGET } from "@/integrations/mock/routes/roster";
export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{sessionId: string}> }) {
  const { sessionId } = await context.params;
  return odooTestMode() ? odooRoute(request, "roster", sessionId) : mockGET(request, context);
}
