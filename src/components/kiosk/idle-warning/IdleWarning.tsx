"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import ActionCard from "@/components/primitives/action-card/ActionCard";
import Modal from "@/components/primitives/modal/Modal";
import styles from "./IdleWarning.module.scss";

type Props = {
  secondsLeft: number | null; // null = no warning
  onStillHere: () => void;
};

// "Still there?" shown in the last seconds before the privacy reset (K07).
// A real dialog, so screen readers announce the title and description when it
// opens. The countdown itself isn't announced every second, which would be noise.
const IdleWarning = ({ secondsLeft, onStillHere }: Props) => {
  const isOpen = secondsLeft !== null;

  // Give focus back to where it was (e.g. the search field) after "I'm still here",
  // so someone can carry on typing without tapping the field first.
  const focusBeforeWarning = useRef<HTMLElement | null>(null);

  // Remember it before the dialog opens and pulls focus inside. A layout effect
  // runs before the Modal's own effect that opens the dialog.
  useLayoutEffect(() => {
    if (isOpen) focusBeforeWarning.current = document.activeElement as HTMLElement | null;
  }, [isOpen]);

  // Hand it back after the dialog has closed. A normal effect runs after the
  // Modal's effect that closes it; before that, the page behind is blocked.
  useEffect(() => {
    if (isOpen) return;
    focusBeforeWarning.current?.focus();
    focusBeforeWarning.current = null;
  }, [isOpen]);

  return (
    <Modal
      open={isOpen}
      label="Check-in"
      title="Still there?"
      description="The screen clears soon to keep your details private."
      // Escape or a tap outside also means "I'm still here"
      onClose={onStillHere}
      // The small x is under 48px; the big card below does the same job
      hideClose
    >
      <div className={styles.content}>
        <p className={styles.countdown} aria-hidden="true">
          Clearing the screen in {secondsLeft ?? 0} {secondsLeft === 1 ? "second" : "seconds"}
        </p>
        <ActionCard
          label="I'm still here"
          description="Keep going where you left off"
          size="large"
          onClick={onStillHere}
        />
      </div>
    </Modal>
  );
};

export default IdleWarning;
