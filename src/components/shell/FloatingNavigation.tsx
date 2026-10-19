"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { advanceDock, expandedDock } from "@/domain/dock-scroll";
import ConnectedNavigation from "./ConnectedNavigation";
import NavIcon from "./NavIcon";
import styles from "./Shell.module.scss";

export default function FloatingNavigation({
  workspace,
  pathname,
  panelOpen,
  companionOpen,
  onCompanion,
}: {
  workspace: RefObject<HTMLDivElement | null>;
  pathname: string;
  panelOpen: boolean;
  companionOpen: boolean;
  onCompanion: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const tracker = useRef(expandedDock());
  const dock = useRef<HTMLDivElement>(null);
  const expanded = useRef<HTMLDivElement>(null);
  const compact = pathname === "/" && !panelOpen && collapsed;

  useEffect(() => {
    const main = workspace.current;
    if (!main) return;
    const mobile = window.matchMedia("(max-width: 767px)");
    const reset = () => {
      tracker.current = expandedDock(main.scrollTop);
      setCollapsed(false);
    };
    const resetFrame = requestAnimationFrame(reset);
    const onScroll = () => {
      if (pathname !== "/" || panelOpen || !mobile.matches) return;
      const y = Math.max(
        0,
        Math.min(main.scrollTop, main.scrollHeight - main.clientHeight),
      );
      if (dock.current?.querySelector(":focus-visible")) {
        tracker.current = expandedDock(y);
        setCollapsed(false);
        return;
      }
      const next = advanceDock(tracker.current, y);
      if (next.collapsed !== tracker.current.collapsed)
        setCollapsed(next.collapsed);
      tracker.current = next;
    };
    main.addEventListener("scroll", onScroll, { passive: true });
    mobile.addEventListener("change", reset);
    return () => {
      cancelAnimationFrame(resetFrame);
      main.removeEventListener("scroll", onScroll);
      mobile.removeEventListener("change", reset);
    };
  }, [pathname, panelOpen, workspace]);

  return (
    <div
      ref={dock}
      className={styles.bottomNavSlot}
      data-collapsed={compact}
      inert={panelOpen}
    >
      <div className={styles.dockSurface} aria-hidden="true" />
      <div
        ref={expanded}
        className={styles.dockExpanded}
        inert={compact}
        aria-hidden={compact}
      >
        <ConnectedNavigation
          mobile
          onCompanion={onCompanion}
          companionOpen={companionOpen}
        />
      </div>
      <button
        className={styles.dockCompact}
        inert={!compact}
        aria-hidden={!compact}
        aria-label="Expand navigation"
        aria-expanded={false}
        aria-controls="mobile-staff-navigation"
        onClick={(event) => {
          tracker.current = expandedDock(workspace.current?.scrollTop ?? 0);
          setCollapsed(false);
          if (event.detail === 0)
            requestAnimationFrame(() =>
              expanded.current?.querySelector<HTMLAnchorElement>("a")?.focus(),
            );
        }}
      >
        <NavIcon name="today" />
        <span className={styles.dockIndicator} aria-hidden="true" />
      </button>
    </div>
  );
}
