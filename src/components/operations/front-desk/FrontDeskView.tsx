import type { Member } from "@/domain/member";
// import MemberCard from "@/components/people/member-card/MemberCard";
// import ServiceQueue from "@/components/operations/service-queue/ServiceQueue";
import styles from "./FrontDeskView.module.scss";
import MemberCard from "@/components/people/member-card/MemberCard";
import ServiceQueue from "@/components/people/service-queue/ServiceQueue";

type Props = { activeMember: Member | null };

export default function FrontDeskView({ activeMember }: Props) {
  return (
    <section className={styles.frontDesk}>
      <div className={styles.header}>
        <p className={styles.eyebrow}>Front desk · Current work</p>
        {/* <p className={styles.hint}>
          Tap a member for details · hold for actions
        </p> */}
      </div>

      <input
        type="search"
        className={styles.search}
        placeholder="Search member, family, lead, booking, payment, or command…"
        aria-label="Search members and commands"
      />

      <div className={styles.grid}>
        {activeMember ? (
          <MemberCard member={activeMember} />
        ) : (
          <p>No member selected</p>
        )}
        <ServiceQueue />
      </div>
    </section>
  );
}
