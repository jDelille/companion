"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import styles from "./Select.module.scss";

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean; // shown dimmed, can't be picked, skipped by the arrow keys
};

type Props = {
  options: SelectOption[];
  value: string; // "" = nothing picked yet
  onChange: (value: string) => void;
  placeholder?: string; // shown while value is ""
  disabled?: boolean;
  ariaLabel?: string; // only needed when it isn't inside a <label>
  ariaDescribedBy?: string; // id of a hint, e.g. why an option is disabled
  className?: string; // for layout from the parent
};

// A dropdown that matches the app instead of the browser's own list.
// Works like a native <select>: the keyboard (arrows, Home/End, Enter, Space,
// Escape) and screen readers (listbox) behave the same.
const Select = ({
  options,
  value,
  onChange,
  placeholder = "Choose…",
  disabled = false,
  ariaLabel,
  ariaDescribedBy,
  className,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1); // highlighted while open
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  // Close when clicking anywhere outside
  useEffect(() => {
    if (!open) return;
    const closeIfOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", closeIfOutside);
    return () => document.removeEventListener("mousedown", closeIfOutside);
  }, [open]);

  const isPickable = (index: number) => !!options[index] && !options[index].disabled;

  // The next pickable option from `from`, moving by `step` (+1 down, -1 up).
  // Stays put when there's nothing pickable that way.
  const nextPickable = (from: number, step: number) => {
    for (let index = from + step; index >= 0 && index < options.length; index += step) {
      if (isPickable(index)) return index;
    }
    return from;
  };

  const openList = () => {
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : nextPickable(-1, 1));
    setOpen(true);
  };

  const pick = (index: number) => {
    if (!isPickable(index)) return;
    onChange(options[index].value);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        openList();
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => nextPickable(index, 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => nextPickable(index, -1));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(nextPickable(-1, 1));
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(nextPickable(options.length, -1));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      pick(activeIndex);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  const optionId = (index: number) => `${listId}-option-${index}`;

  return (
    <div ref={rootRef} className={[styles.select, className].filter(Boolean).join(" ")}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.trigger}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-activedescendant={open && activeIndex >= 0 ? optionId(activeIndex) : undefined}
      >
        <span className={selected ? styles.value : styles.placeholder}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          className={styles.chevron}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul id={listId} role="listbox" className={styles.list}>
          {options.length === 0 && <li className={styles.empty}>Nothing to choose</li>}
          {options.map((option, index) => (
            <li
              key={option.value}
              id={optionId(index)}
              role="option"
              data-value={option.value} // lets tests pick an option by value, like selectOption on a <select>
              aria-selected={option.value === value}
              aria-disabled={option.disabled || undefined}
              className={[
                styles.option,
                index === activeIndex && styles.active,
                option.value === value && styles.chosen,
                option.disabled && styles.disabled,
              ]
                .filter(Boolean)
                .join(" ")}
              // mousedown, not click: picks before the button loses focus
              onMouseDown={(event) => {
                event.preventDefault();
                pick(index);
              }}
              onMouseEnter={() => {
                if (isPickable(index)) setActiveIndex(index);
              }}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Select;
