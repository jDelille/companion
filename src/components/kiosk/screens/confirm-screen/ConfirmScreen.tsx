import type { RosterMember, SessionOption } from "@/contracts/kiosk-attendance";
import SessionHeader from "@/components/kiosk/session-header/SessionHeader";
import ActionCard from "@/components/primitives/action-card/ActionCard";
import PlainButton from "@/components/primitives/plain-button/PlainButton";
import { formatStartTime } from "@/domain/kiosk/sessionFormat";
import styles from "./ConfirmScreen.module.scss";

type Props = {
  session: SessionOption;
  member: RosterMember;
  isSending: boolean; // request in flight: everything locks
  onConfirm: () => void;
  onBack: () => void;
  onChangeSession: () => void;
};

// K05: one last look before checking in. Eligibility (K04) is decided by the
// server when this is submitted, so nothing here says "you're allowed".
const ConfirmScreen = ({
  session,
  member,
  isSending,
  onConfirm,
  onBack,
  onChangeSession,
}: Props) => {
  const { time, period } = formatStartTime(session.startsAt);

  return (
    <div className={styles.screen}>
      <div className={styles.topBar}>
        <PlainButton onClick={onBack} disabled={isSending}>
          ← Back
        </PlainButton>
      </div>

      <SessionHeader
        session={session}
        onChangeSession={onChangeSession}
        changeDisabled={isSending}
      />

      <h1 className={styles.heading}>Check in</h1>

      <dl className={styles.summary}>
        <div className={styles.summaryRow}>
          <dt>Student</dt>
          <dd>{member.displayName}</dd>
        </div>
        <div className={styles.summaryRow}>
          <dt>Class</dt>
          <dd>
            {session.title} · {time} {period}
          </dd>
        </div>
      </dl>

      {/* Same big card as Check In on Welcome: the big card is always the next step */}
      <ActionCard
        label={isSending ? "Checking in…" : "Confirm check-in"}
        description={`${member.displayName} → ${session.title}`}
        size="large"
        disabled={isSending}
        onClick={onConfirm}
      />

      {/* The card's text changes silently; this tells screen readers it's working */}
      <p className={styles.visuallyHidden} role="status">
        {isSending ? "Checking in, please wait." : ""}
      </p>
    </div>
  );
};

export default ConfirmScreen;
