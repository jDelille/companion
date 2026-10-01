"use client";

import { useState } from "react";
import styles from "./TagPicker.module.scss";

type Props = {
  options: string[]; // every tag you can choose from
  defaultSelected?: string[];
};

// Selected tags as chips, with "+ Add" to choose more
const TagPicker = ({ options, defaultSelected = [] }: Props) => {
  const [selected, setSelected] = useState(defaultSelected);
  const [menuOpen, setMenuOpen] = useState(false);

  const available = options.filter((t) => !selected.includes(t));

  const add = (tag: string) => {
    setSelected((s) => [...s, tag]);
    setMenuOpen(false);
  };

  const remove = (tag: string) => setSelected((s) => s.filter((t) => t !== tag));

  return (
    <div className={styles.tagPicker}>
      <span className={styles.label}>Tags</span>

      <div className={styles.field}>
        <ul className={styles.chips}>
          {selected.length === 0 && <li className={styles.empty}>No tags</li>}
          {selected.map((tag) => (
            <li key={tag} className={styles.chip}>
              {tag}
              <button
                type="button"
                onClick={() => remove(tag)}
                aria-label={`Remove ${tag}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>

        <div className={styles.add}>
          <button
            type="button"
            className={styles.addBtn}
            onClick={() => setMenuOpen((o) => !o)}
            disabled={available.length === 0}
            aria-expanded={menuOpen}
          >
            + Add
          </button>

          {menuOpen && (
            <ul className={styles.menu}>
              {available.map((tag) => (
                <li key={tag}>
                  <button type="button" onClick={() => add(tag)}>
                    {tag}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default TagPicker;
