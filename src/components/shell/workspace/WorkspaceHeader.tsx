// The top bar: location, search/command box, ⌘K, and "+" (create)
"use client";

import React, { useEffect, useRef, useState, type RefObject } from "react";
import Link from "@/components/primitives/AppLink";
import styles from "./Workspace.module.scss";
import LocationSwitcher from "./LocationSwitcher";
import CommandBar from "./CommandBar";

type Props = {
  location: string;
  onToggleContext: () => void;
  contextOpen: boolean;
  contextLabel: string;
  contextTriggerRef: RefObject<HTMLButtonElement | null>;
};

// What "+" can create today: only screens that already exist
const createItems = [
  { label: "New student", href: "/hub?view=intake" },
  { label: "Check in", href: "/kiosk" },
];

const WorkspaceHeader = ({ location, onToggleContext, contextOpen, contextLabel, contextTriggerRef }: Props) => {
  const [createOpen, setCreateOpen] = useState(false);
  const createMenu = useRef<HTMLDivElement>(null);

  // Clicking elsewhere or Escape closes the "+" menu
  useEffect(() => {
    if (!createOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!createMenu.current?.contains(event.target as Node)) setCreateOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCreateOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [createOpen]);

  return (
    <header className={styles.workspaceHeader}>
      {/* Narrow screens: opens the side column */}
      <button
        ref={contextTriggerRef}
        className={styles.contextTrigger}
        onClick={onToggleContext}
        aria-label={contextLabel}
        aria-controls="workspace-context"
        aria-expanded={contextOpen}
      >
        ☰
      </button>
      <LocationSwitcher name={location} />
      <CommandBar />
      <div className={styles.createMenu} ref={createMenu}>
        <button
          type="button"
          className={styles.addBtn}
          aria-label="Create"
          aria-expanded={createOpen}
          aria-haspopup="menu"
          onClick={() => setCreateOpen((isOpen) => !isOpen)}
        >
          +
        </button>
        {createOpen && (
          <div className={styles.createItems} role="menu">
            {createItems.map((item) => (
              <Link key={item.href} role="menuitem" href={item.href} onClick={() => setCreateOpen(false)}>
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </header>
  );
};

export default WorkspaceHeader;
