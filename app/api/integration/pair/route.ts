import { pairingRoute } from "@/server/odoo-runtime";
export async function POST(request: Request) { return pairingRoute(request); }
