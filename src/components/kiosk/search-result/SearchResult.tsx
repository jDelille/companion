import type { RosterMember } from "@/contracts/kiosk-attendance";
import styles from "./SearchResult.module.scss";

export type MatchCandidate = Pick<RosterMember, "memberId" | "displayName">;

type Props = {
  candidate: MatchCandidate;
  onSelect: () => void;
};

// First letter of the first and last word: "Ava M." -> "AM", "Mary Ann K." -> "MK"
const initialsOf = (displayName: string) => {
  const words = displayName.split(" ").filter((word) => word.length > 0);
  if (words.length === 0) return "";

  const first = words[0].charAt(0);
  const last = words.length > 1 ? words[words.length - 1].charAt(0) : "";
  return (first + last).toUpperCase();
};

// One search result on the Identify screen (K03)
const SearchResult = ({ candidate, onSelect }: Props) => {
  return (
    <button type="button" className={styles.result} onClick={onSelect}>
      <span className={styles.initials} aria-hidden="true">
        {initialsOf(candidate.displayName)}
      </span>
      <span className={styles.name}>{candidate.displayName}</span>
    </button>
  );
};

export default SearchResult;
