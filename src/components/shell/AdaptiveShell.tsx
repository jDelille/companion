// Whole 4-pane layout
"use client";

import { ReactNode, useState } from "react";
import Rail from "./rail/Rail";
import ContextPane from "./ContextPane";
import styles from "./Shell.module.scss";
import WorkspaceHeader from "./workspace/WorkspaceHeader";
import WorkspaceTabs from "./workspace/WorkspaceTabs";
import CompanionRail from "./rail/companion-rail/CompanionRail";
import AdaptiveBottomNav from "./bottom-nav/AdaptiveBottomNav";

type Layout = "compact" | "standard" | "expanded" | "wide";
type Environment = { layout: Layout; panes: 1 | 2 | 3 | 4 };

type Props = {
  children: ReactNode;
  context?: ReactNode;
  companion?: ReactNode;
};

const AdaptiveShell = ({ children, context, companion }: Props) => {
  const [contextOpen, setContextOpen] = useState(false);
  const [companionOpen, setCompanionOpen] = useState(false);

  return (
    <div
      className={styles.adaptiveShell}
      data-context-open={contextOpen}
      data-companion-open={companionOpen}
    >
      <div className={styles.railSlot}>
        <Rail />
      </div>

      <div className={styles.contextSlot}>
        <button
          className={styles.contextClose}
          onClick={() => setContextOpen(false)}
          aria-label="Close context panel"
        >
          ✕
        </button>
        <ContextPane>{context}</ContextPane>
      </div>

      <div className={styles.workspaceSlot}>
        <WorkspaceHeader
          onToggleContext={() => setContextOpen((open) => !open)}
          contextOpen
        />
        <WorkspaceTabs />
        <div className={styles.workspaceBody}>{children}</div>
      </div>

      <div className={styles.companionSlot}>
        <button
          className={styles.companionClose}
          onClick={() => setCompanionOpen(false)}
          aria-label="Close companion"
        >
          ✕
        </button>
        <CompanionRail>{companion}</CompanionRail>
      </div>

      <button
        className={styles.companionTrigger}
        onClick={() => setCompanionOpen(true)}
        aria-label="Open companion"
      >
        ✦
      </button>

      <div className={styles.bottomNavSlot}>
        <AdaptiveBottomNav />
      </div>
    </div>
  );
};

export default AdaptiveShell;
