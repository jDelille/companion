"use client";

import { useEffect, useRef } from "react";
import styles from "./CrestBackdrop.module.scss";

type Props = { fixed?: boolean; paused?: boolean };

/** The original kiosk crest, used only as quiet decorative atmosphere. */
export default function CrestBackdrop({ fixed = false, paused = false }: Props) {
  const backdrop = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = backdrop.current;
    if (!element) return;
    let visible = true;
    const syncVisibility = () => {
      element.dataset.visible = String(visible && !document.hidden);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncVisibility();
    });
    observer.observe(element);
    document.addEventListener("visibilitychange", syncVisibility);
    syncVisibility();
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, []);

  return (
    <div
      ref={backdrop}
      className={`${styles.backdrop} ${fixed ? styles.fixed : ""}`}
      aria-hidden="true"
      data-brand-background="uft-crest"
      data-paused={paused}
      data-visible="false"
    >
      <div className={styles.crest}>
        <span className={styles.shine} />
      </div>
    </div>
  );
}
