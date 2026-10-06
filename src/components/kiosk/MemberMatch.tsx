import type { RosterMember } from "@/contracts/kiosk-attendance";
import styles from "./MemberMatch.module.scss";

// Only what someone needs to recognise themselves. attendanceState is left out
// on purpose: "already checked in" and "see the front desk" come from the
// server at confirm time, never from this list.
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
const MemberMatch = ({ candidate, onSelect }: Props) => {
  return (
    <button type="button" className={styles.match} onClick={onSelect}>
      {/* Decorative: the name next to it already says who this is */}
      <span className={styles.initials} aria-hidden="true">
        {initialsOf(candidate.displayName)}
      </span>
      <span className={styles.name}>{candidate.displayName}</span>
    </button>
  );
};

export default MemberMatch;
