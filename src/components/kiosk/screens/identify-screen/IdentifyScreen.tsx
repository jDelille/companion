"use client";

import { useEffect, useRef } from "react";
import type { RosterMember, SessionOption } from "@/contracts/kiosk-attendance";
import MemberMatch from "@/components/kiosk/member-match/MemberMatch";
import SessionHeader from "@/components/kiosk/session-header/SessionHeader";
import StatusMessage from "@/components/kiosk/status-message/StatusMessage";
import PlainButton from "@/components/primitives/plain-button/PlainButton";
import type { RosterLoad } from "@/domain/kiosk/checkInFlow";
import type { RosterSearch } from "@/domain/kiosk/rosterSearch";
import styles from "./IdentifyScreen.module.scss";

type Props = {
  session: SessionOption;
  rosterStatus: RosterLoad["status"];
  query: string;
  search: RosterSearch; // worked out by searchRoster(), not here
  onQueryChange: (query: string) => void;
  onSelectMember: (member: RosterMember) => void;
  onRetry: () => void;
  onChangeSession: () => void;
  onBack: () => void;
};

// K03: find your name in the selected class. Nobody is listed until you type,
// so the kiosk never shows the whole roster.
const IdentifyScreen = ({
  session,
  rosterStatus,
  query,
  search,
  onQueryChange,
  onSelectMember,
  onRetry,
  onChangeSession,
  onBack,
}: Props) => {
  const searchField = useRef<HTMLInputElement>(null);
  const canSearch = rosterStatus !== "unavailable";

  // Put the cursor in the field whenever it's usable: on arrival, and again
  // after Try again recovers, so nobody has to tap it first. Focusing also
  // opens the on-screen keyboard, which is what this screen is for.
  useEffect(() => {
    if (canSearch) searchField.current?.focus();
  }, [canSearch]);

  return (
    <div className={styles.screen}>
      <div className={styles.topBar}>
        <PlainButton onClick={onBack}>← Back</PlainButton>
      </div>

      <SessionHeader session={session} onChangeSession={onChangeSession} />

      <h1 id="find-your-name" className={styles.heading}>
        Find your name
      </h1>

      <input
        ref={searchField}
        className={styles.search}
        type="text"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Start typing your first name"
        aria-labelledby="find-your-name"
        disabled={!canSearch}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="search"
      />

      {/* Results sit right under the field so the on-screen keyboard doesn't cover them */}
      <div className={styles.results}>
        {rosterStatus === "loading" && (
          <StatusMessage message="Loading the class list…" />
        )}

        {rosterStatus === "unavailable" && (
          <StatusMessage
            message="The class list can't be loaded right now."
            actions={[
              { label: "Try again", onClick: onRetry },
              { label: "Change class", onClick: onChangeSession },
            ]}
          />
        )}

        {rosterStatus === "ready" && search.status === "noMatch" && (
          <StatusMessage
            message={`We couldn't find that name in ${session.title}.`}
            detail="Please see the front desk."
            actions={[{ label: "Change class", onClick: onChangeSession }]}
          />
        )}

        {rosterStatus === "ready" && search.status === "found" && (
          <ul className={styles.matches} aria-label="Matching names">
            {search.matches.map((member) => (
              <li key={member.memberId}>
                <MemberMatch
                  candidate={member}
                  onSelect={() => onSelectMember(member)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default IdentifyScreen;
