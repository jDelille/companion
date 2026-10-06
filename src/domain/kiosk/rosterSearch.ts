import type { RosterMember } from "@/contracts/kiosk-attendance";

// Kiosk name search. Kept in this one file, with no React, so it can move
// to the server later without the screen changing.

// Fewer letters than this shows nobody, so a passer-by can't page through
// the roster one letter at a time.
export const MIN_SEARCH_LETTERS = 2;

// Case-insensitive match on the start of the name. Display names start with
// the first name ("Ava M."), so "av" and "Ava" both work, and typing on to
// "Ava M" narrows it down to one student.
export function findMatches(
  roster: RosterMember[],
  query: string,
): RosterMember[] {
  const search = query.trim().toLocaleLowerCase();
  if (search.length < MIN_SEARCH_LETTERS) {
    return [];
  }

  return roster.filter((member) =>
    member.displayName.toLocaleLowerCase().startsWith(search),
  );
}

// What the Identify screen should show for the current search text
export type RosterSearch =
  | { status: "tooShort" } // under MIN_SEARCH_LETTERS: show nobody
  | { status: "noMatch" }
  | { status: "found"; matches: RosterMember[] }; // one or more

export function searchRoster(
  roster: RosterMember[],
  query: string,
): RosterSearch {
  if (query.trim().length < MIN_SEARCH_LETTERS) {
    return { status: "tooShort" };
  }

  const matches = findMatches(roster, query);
  if (matches.length === 0) {
    return { status: "noMatch" };
  }
  return { status: "found", matches };
}
