import Member360View from '@/components/people/member-360/Member360View';
import { getMember } from '@/integrations/member';
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

    return <Member360View member={member} />
}