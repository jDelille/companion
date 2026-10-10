import {notFound} from 'next/navigation';
import {odooTestMode} from '@/server/odoo-runtime';
import ConnectedWorkflowView from '@/components/ai/follow-up/ConnectedWorkflowView';
export default async function SessionPage({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  if(!odooTestMode() || !/^[1-9][0-9]{0,9}$/.test(id)) notFound();
  return <ConnectedWorkflowView />;
}
