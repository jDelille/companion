// TO Today, PE people, OP ops, ...

import React from "react";
import styles from "./Rail.module.scss";
import Link from "next/link";

type Props = {
  item: { id: string; abbrv: string; label: string; href: string };
  isActive: boolean;
};

const RailItem = ({ item, isActive }: Props) => {
  return (
    <li>
      <Link
        href={item.href}
        className={`${styles.rail__links__link} ${isActive ? styles.active : ""}`}
        aria-current={isActive ? "page" : undefined}
      >
        <span>{item.abbrv}</span>
        <p>{item.label}</p>
      </Link>
    </li>
  );
};

export default RailItem;
