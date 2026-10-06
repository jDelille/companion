import React from "react";
import Greeting from "@/components/kiosk/Greeting";
import styles from "./WelcomeScreen.module.scss";

type Props = {
  schoolName: string;
};

const WelcomeScreen = ({ schoolName }: Props) => {
  return (
    <div className={styles.screen}>
      <div className={styles.heading}>
        <Greeting />
        <h1>Welcome to {schoolName}</h1>
        <p>What would you like to do today?</p>
      </div>
      {/* check in call to action */}
      <button type="button" className={styles.checkInButton}>
        <span className={styles.buttonLabel}>Check In</span>
        <span className={styles.buttonDescription}>
          Pick your class, then find your name
        </span>
        <span className={styles.arrow}>→</span>
      </button>

      {/* Secondary Classes / Events; Testing / Schedule / Staff where enabled  */}

      <div className={styles.secondaryActions}>
        <button type="button" className={styles.secondaryButton}>
          <span className={styles.buttonLabel}>Classes</span>
          <span className={styles.buttonDescription}>Coming soon</span>
          <span className={styles.arrow}>→</span>
        </button>

        <button type="button" className={styles.secondaryButton}>
          <span className={styles.buttonLabel}>Events</span>
          <span className={styles.buttonDescription}>Coming soon</span>
          <span className={styles.arrow}>→</span>
        </button>
      </div>

      <div className={styles.tertiaryActions}>
        <button>Testing</button>
        <button>Schedule</button>
        <button>Staff</button>
      </div>
    </div>
  );
};

export default WelcomeScreen;
