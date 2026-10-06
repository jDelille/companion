import React from "react";
import Greeting from "@/components/kiosk/greeting/Greeting";
import ActionCard from "@/components/primitives/action-card/ActionCard";
import type { SecondaryAction } from "@/domain/kiosk/kioskConfig";
import styles from "./WelcomeScreen.module.scss";

type Props = {
  schoolName: string;
  actions: SecondaryAction[]; // from kioskConfig; hidden ones are skipped
  onCheckIn: () => void; // just reports the tap, the flow decides what's next
};

const WelcomeScreen = ({ schoolName, actions, onCheckIn }: Props) => {
  const shownActions = actions.filter((action) => action.shown);
  const cardActions = shownActions.filter((action) => action.prominence === "card");
  const textActions = shownActions.filter((action) => action.prominence === "text");

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
        onClick={onCheckIn}
        className={styles.checkIn}
      />

      {/* Secondary Classes / Events; Testing / Schedule / Staff where enabled  */}

      {/* No tap handlers yet since none are built. When one becomes available,
          add a callback for it like onCheckIn. */}
      {cardActions.length > 0 && (
        <div className={styles.secondaryActions}>
          {cardActions.map((action) => (
            <ActionCard
              key={action.id}
              label={action.label}
              description="Coming soon"
              disabled={!action.available}
              className={styles.secondaryCard}
            />
          ))}
        </div>
      )}

      {/* Muted placeholders: disabled so they can't be tapped or focused */}
      {textActions.length > 0 && (
        <div className={styles.tertiaryActions}>
          {textActions.map((action) => (
            <button key={action.id} type="button" disabled={!action.available}>
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default WelcomeScreen;
