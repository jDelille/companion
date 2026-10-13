import { enterPublicMode } from '@/server/hub-gateway';
export const runtime = 'nodejs';
export async function POST(request: Request) { return enterPublicMode(request, process.env); }
