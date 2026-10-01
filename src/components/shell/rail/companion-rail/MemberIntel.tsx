import styles from "./CompanionRail.module.scss";

type Props = {
  items: { label: string; value: string }[];
};

const MemberIntel = ({ items }: Props) => {
  return (
    <>
      <p className={styles.intelLabel}>Member intelligence</p>
      <dl className={styles.intel}>
        {items.map((i) => (
          <div key={i.label}>
            <dt>{i.label}</dt>
            <dd>{i.value}</dd>
          </div>
        ))}
      </dl>
    </>
  );
};

export default MemberIntel;