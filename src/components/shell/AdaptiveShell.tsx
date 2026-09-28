// Whole 4-pane layout
"use client";

import { ReactNode, useState } from "react";
import Rail from "./rail/Rail";
import ContextPane from "./ContextPane";
import styles from "./Shell.module.scss";
import WorkspaceHeader from "./workspace/WorkspaceHeader";
import WorkspaceTabs from "./workspace/WorkspaceTabs";
import CompanionRail from "./rail/companion-rail/CompanionRail";

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
        <button
          className={styles.contextTrigger}
          onClick={() => setContextOpen((open) => !open)}
          aria-label="Toggle context panel"
          aria-expanded={contextOpen}
        >
          ☰
        </button>
        <WorkspaceHeader />
        <WorkspaceTabs />
        <div className={styles.workspaceBody}>{children}</div>
      </div>

      <div className={styles.companionSlot}>
        <CompanionRail>{companion}</CompanionRail>
      </div>
    </div>
  );
};

export default AdaptiveShell;
