import { Member } from "@/domain/member";
import styles from "./MemberCard.module.scss";

type Props = {
  member: Member;
};

const MemberCard = ({ member }: Props) => {
  console.log(member);

  const actions = [
    {id: 1, label: "Check in"},
    {id: 2, label: "Book"},
    {id: 3, label: "Payment"},
    {id: 4, label: "Message"},
    {id: 5, label: "Edit", icon: ""},
    {id: 6, label: "+"}
  ]

  return (
    <div className={styles.memberCard}>
      <p className={styles.label}>active context</p>
      <div className={styles.member}>
        <div className={styles.member__avatar}>MC</div>

        <div className={styles.memberName}>
          <div className={styles.text}>
            <h2>{member.name}</h2>
            <p>
              {member.rank.name} · {member.householdName}
            </p>
          </div>
          <div className={styles.status}>{member.membershipState}</div>
        </div>
      </div>

      <div className={styles.memberInfo}>
        <div className={styles.infoBox}>
          <span>Membership</span>
          <p>Current</p>
        </div>
        <div className={styles.infoBox}>
          <span>Next class</span>
          <p>{member.nextClass}</p>
        </div>
        <div className={styles.infoBox}>
          <span>Test readiness</span>
          <p>{member.testReadiness}%</p>
        </div>
      </div>

      <div className={styles.memberActions}>
        <ul>
          {actions.map(a => (
            <li key={a.id}>{a.label}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default MemberCard;
