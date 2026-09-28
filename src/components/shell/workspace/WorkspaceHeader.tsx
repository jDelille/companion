// Location, search, '+'

import styles from "./Workspace.module.scss";
import LocationSwitcher from "./LocationSwitcher";
import CommandBar from "./CommandBar";

type Props = {
  onToggleContext: () => void;
  contextOpen: boolean;
};

const WorkspaceHeader = ({ onToggleContext, contextOpen }: Props) => {
  return (
    <div className={styles.workspaceHeader}>
      <button
        className={styles.contextTrigger}
        onClick={onToggleContext}
        aria-label="Toggle context panel"
        aria-expanded={contextOpen}
      >
        ☰
      </button>
      <LocationSwitcher />
      <CommandBar />
      <div className={styles.keyBtn}>⌘K</div>
      <div className={styles.addBtn}>+</div>
    </div>
  );
};

export default WorkspaceHeader;
