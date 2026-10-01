import { Member } from "@/domain/member";
import styles from "./Member360View.module.scss";
import Identity from "./identity/Identity";
import Tabs from "./tabs/Tabs";

type Props = {
  member: Member;
};

const Member360View = ({ member }: Props) => {

  console.log(member)


  return (
    <article className={styles.member360}>
      <Identity member={member}/>
      <Tabs />

      

      <section aria-label="Status">
        {/* membership, attendance, readiness */}
      </section>
      <section aria-label="Actions">
        {/* check in, book, payment, message */}
      </section>
      <section aria-label="Relationships">{/* household, guardians */}</section>
      <section aria-label="History">
        {/* attendance, payments, rank changes */}
      </section>
    </article>
  );
};

export default Member360View;
