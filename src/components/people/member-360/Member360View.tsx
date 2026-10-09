import { Member, MemberAttendance } from "@/domain/member";
import styles from "./Member360View.module.scss";
import Identity from "./identity/Identity";
import Tabs from "./tabs/Tabs";
import MemberGrid from "./member-grid/MemberGrid";
import CheckInHistory from "./check-in-history/CheckInHistory";
import { SelectMember } from "@/components/shell/selected-member/selectedMember";

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
    <article className={styles.member360}>
      {/* Tells the side pane who's on screen */}
      <SelectMember id={member.id} name={member.name} detail={selectedDetail(member)} />
      <Identity member={member} readOnly={liveTest} />
      <Tabs
        panels={{
          Overview: (
            <MemberGrid attendance={attendance} liveMember={liveTest ? member : undefined} />
          ),
          Attendance: <CheckInHistory attendance={attendance} />,
        }}
      />
    </article>
  );
};

export default Member360View;
