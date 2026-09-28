// Location, search, '+'

import React from 'react'
import styles from './Workspace.module.scss';
import LocationSwitcher from './LocationSwitcher';
import CommandBar from './CommandBar';

const WorkspaceHeader = () => {
  return (
    <div className={styles.workspaceHeader}>
      <LocationSwitcher />
      <CommandBar />
    </div>
  )
}

export default WorkspaceHeader