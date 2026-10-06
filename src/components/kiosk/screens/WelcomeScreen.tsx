import React from "react";
import Greeting from "@/components/kiosk/Greeting";
import ActionCard from "@/components/primitives/action-card/ActionCard";
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
      
      <ActionCard
        label="Check In"
        description="Pick your class, then find your name"
        size="large"
        className={styles.checkIn}
      />

      {/* Secondary Classes / Events; Testing / Schedule / Staff where enabled  */}

      <div className={styles.secondaryActions}>
        <ActionCard
          label="Classes"
          description="Coming soon"
          disabled
          className={styles.secondaryCard}
        />
        <ActionCard
          label="Events"
          description="Coming soon"
          disabled
          className={styles.secondaryCard}
        />
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
