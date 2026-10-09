"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";

type Options = {
  active: boolean; // the timer only runs while this is true
  restartKey: string; // changing it (e.g. moving to a new step) restarts the timer
  timeoutSeconds: number;
  warningSeconds: number;
  onTimeout: () => void;
};

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "input"] as const;

// Privacy idle timer (K07).
export function useIdleTimer({
  active,
  restartKey,
  timeoutSeconds,
  warningSeconds,
  onTimeout,
}: Options) {
  const lastActivityAt = useRef(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const timeout = useEffectEvent(onTimeout);

  const stillHere = () => {
    lastActivityAt.current = Date.now();
    setSecondsLeft(null);
  };

  useEffect(() => {
    if (!active) return;

    lastActivityAt.current = Date.now();
    const recordActivity = () => {
      lastActivityAt.current = Date.now();
    };
    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, recordActivity, true);
    }

    const tick = setInterval(() => {
      const idleSeconds = (Date.now() - lastActivityAt.current) / 1000;
      const remaining = timeoutSeconds - idleSeconds;

      if (remaining <= 0) {
        clearInterval(tick);
        setSecondsLeft(null);
        timeout();
        return;
      }
      setSecondsLeft(remaining <= warningSeconds ? Math.ceil(remaining) : null);
    }, 250);

    return () => {
      clearInterval(tick);
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, recordActivity, true);
      }
    };
  }, [active, restartKey, timeoutSeconds, warningSeconds]);

  return {
    secondsLeft: active ? secondsLeft : null,
    stillHere,
  };
}
