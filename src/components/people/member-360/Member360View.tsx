import { Member } from "@/domain/member";
import styles from "./Member360View.module.scss";

type Props = {
  member: Member;
};

const Member360View = ({ member }: Props) => {

  console.log(member)

  const btns = ['Check in', "Message", "Book", "Payment", "Edit", "...", "Do For Me"]

  return (
    <article className={styles.member360}>
      <div className={styles.identity}>
          <div className={styles.member}>
            <div className={styles.member__avatar}>MC</div>

            <div className={styles.memberName}>
              <div className={styles.text}>
                <h2>{member.name}</h2>
                <p>
                  Children Advanced · {member.householdName}
                </p>
              </div>
              <div className={styles.status}>{member.membershipState}  · {member.rank.name}</div>
            </div>
          </div>
      </div>

      <div className={styles.memberActions}>
        <ul>
          {btns.map((btn) => (
          <li key={btn}>{btn}</li>
        ))}
        </ul>
      </div>

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
