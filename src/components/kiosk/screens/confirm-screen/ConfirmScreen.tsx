import type { RosterMember, SessionOption } from "@/contracts/kiosk-attendance";
import KioskButton from "@/components/kiosk/kiosk-button/KioskButton";
import ScreenHead from "@/components/kiosk/screen-head/ScreenHead";
import SessionHeader from "@/components/kiosk/session-header/SessionHeader";
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

// K05: one last look before checking in, laid out like Jodi's Review screen.
// Eligibility (K04) is decided by the server when this is submitted, so
// nothing here says "you're allowed".
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
      <ScreenHead
        eyebrow="Review"
        title="Review your check-in"
        onBack={onBack}
        backDisabled={isSending}
      />

      <SessionHeader
        session={session}
        onChangeSession={onChangeSession}
        changeDisabled={isSending}
      />

      <dl className={styles.reviewList}>
        <div className={styles.reviewRow}>
          <dt>Student</dt>
          <dd>{member.displayName}</dd>
        </div>
        <div className={styles.reviewRow}>
          <dt>Class</dt>
          <dd>
            {session.title} · {time} {period}
          </dd>
        </div>
      </dl>

      {/* The one committing action on this screen */}
      <div className={styles.actions}>
        <KioskButton disabled={isSending} onClick={onConfirm}>
          {isSending ? "Checking in…" : "Confirm check-in"}
        </KioskButton>
      </div>

      {/* The button's text changes silently; this tells screen readers it's working */}
      <p className={styles.visuallyHidden} role="status">
        {isSending ? "Checking in, please wait." : ""}
      </p>
    </div>
  );
};

export default ConfirmScreen;
