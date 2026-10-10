import {hubRoute} from '@/server/hub-gateway';
export const runtime='nodejs';
export async function POST(request:Request){return hubRoute(request,process.env);}
