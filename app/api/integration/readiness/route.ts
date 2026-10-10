import { readiness } from '@/server/readiness';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export function GET(request: Request) { return readiness(request,process.env); }
