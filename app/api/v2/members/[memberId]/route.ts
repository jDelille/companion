import { odooRoute } from "@/server/odoo-runtime";
export const dynamic = "force-dynamic";
export async function GET(request: Request, context: {params: Promise<{memberId: string}>}) {
  return odooRoute(request, "member", (await context.params).memberId);
}
