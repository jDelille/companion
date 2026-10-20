"use client"; // has a live clock, which only works in the browser

import { useEffect, useState } from "react";
import styles from "./KioskHeader.module.scss";

// logo on the left, clock on the right. sits at the top of every kiosk screen
const KioskHeader = () => {
  // null first so the server and browser agree (avoids a time mismatch error)
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id); // stop ticking when the page goes away
  }, []);

  return (
    <header className={styles.header}>
      <span className={styles.logo}>DOJANG</span>
      <span className={styles.clock}>
        {now?.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
      </span>
    </header>
  );
};

export default KioskHeader;
