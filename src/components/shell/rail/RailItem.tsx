// TO Today, PE people, OP ops, ...

import React from "react";
import styles from "./Rail.module.scss";

type Props = {
  item: { id: number; abbrv: string; label: string };
  isActive?: boolean;
};

const RailItem = ({ item, isActive }: Props) => {
  return (
    <li
      key={item.id}
      className={`${styles.rail__links__link} ${isActive ? styles.active : ""}`}
    >
      <span>{item.abbrv}</span>
      <p>{item.label}</p>
    </li>
  );
};

export default RailItem;
