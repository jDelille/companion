import Link from "@/components/primitives/AppLink";
import styles from "./WelcomeScreen.module.scss";

// Jodi's extra utility buttons (Business Companion link, Language, Accessibility)
// only show in demo mode: on a real kiosk they would lead nowhere
const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

type Props = {
  schoolName: string;
  onCheckIn: () => void; // just reports the tap, the flow decides what's next
  onNewHere?: () => void; // demo walkthrough; leave out and the card is disabled
  onFamily?: () => void; // demo walkthrough; leave out and the card is disabled
  onAsk?: () => void; // the AI Concierge; leave out when it's turned off
  onEvents?: () => void; // demo events list; leave out when events aren't connected
  onStaffHelp: () => void; // always there (Miro 09.13), AI or not
};

// K01: Jodi's welcome. Four intent cards, then small text buttons.
// Check in and Find a class both start the real class-first check-in.
const WelcomeScreen = ({
  schoolName,
  onCheckIn,
  onNewHere,
  onFamily,
  onAsk,
  onEvents,
  onStaffHelp,
}: Props) => {
  const cards = [
    { title: "Check in", note: "Existing member", onClick: onCheckIn },
    { title: "I'm new here", note: "Trial or join", onClick: onNewHere },
    { title: "Family arrival", note: "Check in household", onClick: onFamily },
    {
      title: "Find a class",
      note: "Browse eligible sessions",
      onClick: onCheckIn,
    },
  ];

  return (
    <div className={styles.screen}>
      <div className={styles.eyebrow}>Arrival</div>
      <h1>Welcome to {schoolName}</h1>
      <p className={styles.lead}>What would you like to do today?</p>

      <div className={styles.intentGrid}>
        {cards.map((card) => (
          <button
            key={card.title}
            type="button"
            className={styles.intentCard}
            onClick={card.onClick}
            disabled={!card.onClick} // not connected yet: can't be tapped or focused
          >
            <span>
              <strong>{card.title}</strong>
              <small>{card.note}</small>
            </span>
            <span className={styles.arrow} aria-hidden="true">
              →
            </span>
          </button>
        ))}
      </div>

      <div className={styles.utilityRow}>
        {DEMO && (
          <Link
            href="/"
            className={`${styles.utilityButton} ${styles.utilityPrimary}`}
          >
            Open Business Companion →
          </Link>
        )}
        {onAsk && (
          <button
            type="button"
            className={styles.utilityButton}
            onClick={onAsk}
          >
            Ask a question
          </button>
        )}
        {onEvents && (
          <button
            type="button"
            className={styles.utilityButton}
            onClick={onEvents}
          >
            Events
          </button>
        )}
        {DEMO && (
          <>
            <button type="button" className={styles.utilityButton}>
              Language
            </button>
            <button type="button" className={styles.utilityButton}>
              Accessibility
            </button>
          </>
        )}
        <button
          type="button"
          className={styles.utilityButton}
          onClick={onStaffHelp}
        >
          Need staff help?
        </button>
      </div>
    </div>
  );
};

export default WelcomeScreen;
