import PlainButton from "@/components/primitives/plain-button/PlainButton";
import { DEMO_EVENTS } from "@/domain/kiosk/demoEvents";
import styles from "./EventsScreen.module.scss";

type Props = {
  onBack: () => void;
};

// read-only list of what's coming up. demo data for now
const EventsScreen = ({ onBack }: Props) => {
  return (
    <div className={styles.screen}>
      <div className={styles.topBar}>
        <PlainButton flush onClick={onBack}>
          ← Back
        </PlainButton>
      </div>

      <div className={styles.titles}>
        <p className={styles.eyebrow}>Events</p>
        <h1 className={styles.headline}>What&apos;s coming up</h1>
      </div>

      <ul className={styles.list}>
        {DEMO_EVENTS.map((event) => (
          <li key={event.id} className={styles.card}>
            <p className={styles.title}>{event.title}</p>
            <p className={styles.when}>{event.when}</p>
            <p className={styles.note}>{event.note}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default EventsScreen;
