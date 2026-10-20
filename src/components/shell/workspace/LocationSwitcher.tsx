// "Downtown ▾": the school location. There's only one location for now, so it's
// a label; the ▾ menu comes when Odoo has more than one.

import React from "react";
import styles from "./Workspace.module.scss";

const LocationSwitcher = ({ name }: { name: string }) => {
  return <div className={styles.location}>{name}</div>;
};

export default LocationSwitcher;
