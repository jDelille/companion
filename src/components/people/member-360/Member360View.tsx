import { Member } from "@/domain/member";
import styles from "./Member360View.module.scss";
import Identity from "./identity/Identity";
import Tabs from "./tabs/Tabs";
import MemberGrid from "./member-grid/MemberGrid";

type Props = {
  member: Member;
};

const Member360View = ({ member }: Props) => {

  // console.log(member)

  return (
    <article className={styles.member360}>
      <Identity member={member}/>
      <Tabs />

      <MemberGrid />

    
    </article>
  );
};

export default Member360View;
