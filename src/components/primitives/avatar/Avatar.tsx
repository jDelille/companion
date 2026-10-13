import styles from "./Avatar.module.scss";

// "Maya Chen" -> "MC"
export function initials(name: string) {
  return name
    .split(" ")
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

type Props = {
  name: string;
  size?: "small" | "medium"; // small: 28px, for dense rows; medium: 36px
};

// Avatar + bold name on one line, for rows in a list of people.
// label replaces the shown text when the row says more than the name (e.g. "Maya Chen · Blue belt").
export function PersonName({ name, label, size = "small" }: { name: string; label?: string; size?: "small" | "medium" }) {
  return (
    <span className={styles.person}>
      <Avatar name={name} size={size} />
      <strong>{label ?? name}</strong>
    </span>
  );
}

// A person's initials in a circle, next to their name in any list of people.
// Avatars use the darkest black with a thin border, never a colour.
export default function Avatar({ name, size = "medium" }: Props) {
  return (
    <span
      className={`${styles.avatar} ${size === "small" ? styles.small : ""}`}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
