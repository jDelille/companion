"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import styles from "./CrestBackdrop.module.scss";

type Props = { fixed?: boolean; paused?: boolean };

// An irregular, stable scatter: identical during SSR/hydration and route changes.
// Keep the central crest's immediate area clear rather than tiling a rigid grid.
const miniCrests = [
  [8, 8, 3.5, -18], [34, 5, 4, 12], [63, 10, 3, -9], [91, 6, 4.5, 22],
  [20, 19, 3, 16], [49, 17, 3.8, -24], [80, 23, 4.2, -14],
  [5, 32, 4, 10], [30, 30, 3.2, -12], [66, 28, 3.6, 24], [94, 38, 3, -21],
  [14, 48, 3.5, -25], [87, 53, 4, 17],
  [6, 65, 3.2, 20], [27, 72, 4.1, -8], [70, 73, 3, -19], [95, 69, 3.8, 9],
  [14, 87, 4.3, -14], [45, 82, 3.1, 21], [82, 88, 3.6, -24],
  [34, 95, 3.8, 11], [64, 94, 4.2, -6],
  [20, 4, 3.1, 27], [47, 8, 3.6, -17], [77, 4, 3.3, 14],
  [6, 21, 3.2, -11], [35, 21, 3.7, 19], [65, 19, 3.1, -26], [94, 20, 3.6, 8],
  [17, 36, 3.4, 24], [43, 27, 3.1, -8], [82, 36, 3.5, 29],
  [4, 49, 3.2, -22], [96, 48, 3.6, 12],
  [19, 60, 3.4, 16], [83, 64, 3.1, -27], [43, 74, 3.5, 9], [58, 77, 3.2, -18],
  [7, 78, 3.8, 11], [94, 84, 3.3, -16], [28, 84, 3.4, 26], [62, 86, 3.1, -13],
  [6, 96, 3.2, 18], [91, 97, 3.7, -21],
] as const;

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
      {miniCrests.map(([x, y, size, angle], index) => (
        <span
          key={index}
          className={styles.mini}
          data-mini-crest=""
          style={{
            left: `${x}%`,
            top: `${y}%`,
            "--mini-size": `${size}vw`,
            "--mini-angle": `${angle}deg`,
          } as CSSProperties}
        />
      ))}
      <div className={styles.crest}>
        <span className={styles.shine} />
      </div>
    </div>
  );
}
