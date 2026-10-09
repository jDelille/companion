import { odooRoute } from "@/server/odoo-runtime";
export const dynamic = "force-dynamic";
export async function GET(request: Request) { return odooRoute(request, "members"); }
