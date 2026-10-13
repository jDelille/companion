import {hubPhotoRoute} from '@/server/hub-gateway';
export const runtime='nodejs';
export async function POST(request:Request){return hubPhotoRoute(request,process.env);}
