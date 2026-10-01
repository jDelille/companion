"use client";

import { useRef } from "react";

// Tap and hold on the same element. Holding for `ms` runs onLongPress (and skips the tap);
// moving more than a few pixels (e.g. starting a scroll) cancels the hold.
const useLongPress = (onLongPress: () => void, onTap: () => void, ms = 500) => {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);

  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    start.current = null;
  };

  return {
    onPointerDown: (e: React.PointerEvent) => {
      fired.current = false;
      start.current = { x: e.clientX, y: e.clientY };
      timer.current = setTimeout(() => {
        fired.current = true;
        onLongPress();
      }, ms);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!start.current) return;
      const moved = Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y);
      if (moved > 10) cancel();
    },
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    // the click that follows a hold shouldn't also count as a tap
    onClick: () => {
      if (fired.current) {
        fired.current = false;
        return;
      }
      onTap();
    },
    // stop the phone's own long-press menu (copy / select)
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  };
};

export default useLongPress;
