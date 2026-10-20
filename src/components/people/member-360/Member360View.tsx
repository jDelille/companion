import { Member, MemberAttendance } from "@/domain/member";
import styles from "./Member360View.module.scss";
import Identity from "./identity/Identity";
import Tabs from "./tabs/Tabs";
import MemberGrid from "./member-grid/MemberGrid";
import CheckInHistory from "./check-in-history/CheckInHistory";
import { SelectMember } from "@/components/shell/selected-member/selectedMember";
import ConnectedMemberDetails from "./ConnectedMemberDetails";
import ConnectedWorkflowView from "@/components/ai/follow-up/ConnectedWorkflowView";

type Props = {
  member: Member;
  attendance: MemberAttendance;
  liveTest?: boolean;
};

// "Blue Belt · 92% ready", or just the rank when readiness isn't known
const selectedDetail = (member: Member) => {
  if (member.testReadiness === undefined) return member.rank.name;
  return `${member.rank.name} · ${member.testReadiness}% ready`;
};

const Member360View = ({ member, attendance, liveTest = false }: Props) => {
  return (
    <article
      key={member.id}
      className={styles.member360}
      data-member-id={member.id}
    >
      {/* Tells the side pane who's on screen */}
      <SelectMember
        id={member.id}
        name={member.name}
        detail={selectedDetail(member)}
      />
      <Identity key={member.id} member={member} liveTest={liveTest} />
      <Tabs
        memberId={member.id}
        panels={{
          Overview: (
            <MemberGrid
              member={member}
              attendance={attendance}
              liveTest={liveTest}
            />
          ),
          Attendance: <><CheckInHistory attendance={attendance} />{liveTest&&<ConnectedMemberDetails memberId={member.id} section="attendance"/>}</>,
          ...(liveTest ? {
            Timeline: <ConnectedMemberDetails memberId={member.id} section="timeline" />,
            Progress: <ConnectedMemberDetails memberId={member.id} section="progress" />,
            Membership: <ConnectedMemberDetails memberId={member.id} section="membership" />,
            Billing: <ConnectedMemberDetails memberId={member.id} section="billing" />,
            // Messages also lists this member's reviewed follow-ups (filtered by the member page)
            Messages: <><ConnectedMemberDetails memberId={member.id} section="messages" /><ConnectedWorkflowView historyOnly embedded /></>,
            Family: <ConnectedMemberDetails memberId={member.id} section="family" />,
            Documents: <ConnectedMemberDetails memberId={member.id} section="documents" />,
            Safety: <ConnectedMemberDetails memberId={member.id} section="safety" />,
          } : {}),
        }}
      />
    </article>
  );
};

export default Member360View;
