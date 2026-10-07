import Member360View from '@/components/people/member-360/Member360View';
import { getMember, getMemberAttendance } from '@/integrations/member';
import { notFound } from 'next/navigation';

type Props = {
    params: Promise<{id: string}>
}

export default async function MemberPage({params}: Props) {
    const {id} = await params;
    const member = await getMember(id);

    if(!member) {
        notFound();
    }

    // Read fresh on every visit, so a kiosk check-in shows up on the next load
    const attendance = await getMemberAttendance(member.id);

    return <Member360View member={member} attendance={attendance} />
}
