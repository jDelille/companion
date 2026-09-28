// Whole 4-pane layout

import React from 'react'
import Rail from './rail/Rail'
import ContextPane from './ContextPane';
import styles from './Shell.module.scss';
import WorkspaceHeader from './workspace/WorkspaceHeader';
import WorkspaceTabs from './workspace/WorkspaceTabs';
import CompanionRail from './rail/companion-rail/CompanionRail';

type Layout = "compact" | "standard" | "expanded" | "wide";
type Environment = { layout: Layout; panes: 1 | 2 | 3 | 4 };

type Props = {
    children: React.ReactNode;
    context?: React.ReactNode;
    companion?: React.ReactNode;
}

const AdaptiveShell = ({children, context, companion }: Props) => {
  return (
    <div className={styles.adaptiveShell}>
        <Rail />
        <ContextPane />
        
        <div className={styles.workspaceContainer}>
          <WorkspaceHeader />
          <WorkspaceTabs />
        </div>

        <CompanionRail />
    </div>
  )
}

export default AdaptiveShell