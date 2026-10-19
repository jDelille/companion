import { liveness } from '@/server/readiness';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export function GET() { return liveness(process.env); }
