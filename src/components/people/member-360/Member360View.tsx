import { Member, MemberAttendance } from "@/domain/member";
import styles from "./Member360View.module.scss";
import Identity from "./identity/Identity";
import Tabs from "./tabs/Tabs";
import MemberGrid from "./member-grid/MemberGrid";

type Props = {
  member: Member;
  attendance: MemberAttendance;
  liveTest?: boolean;
};

const Member360View = ({ member, attendance, liveTest = false }: Props) => {

  // console.log(member)

  return (
    <article className={styles.member360}>
      <Identity member={member} readOnly={liveTest}/>
      <Tabs />

      <MemberGrid attendance={attendance} liveMember={liveTest ? member : undefined} />

    
    </article>
  );
};

export default Member360View;
