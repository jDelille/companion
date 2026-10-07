import FrontDeskView from "@/components/operations/front-desk/FrontDeskView";
import { getMember } from "@/integrations/member";

export default async function OpsPage() {
     const activeMember = await getMember("5001"); // Maya Chen, as on slide 12
     return <FrontDeskView activeMember={activeMember} />;
}