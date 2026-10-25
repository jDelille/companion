import type {
  AttendanceReceipt,
  RosterMember,
  SessionOption,
} from "@/contracts/kiosk-attendance";
import KioskButton from "@/components/kiosk/kiosk-button/KioskButton";
import ScreenHead from "@/components/kiosk/screen-head/ScreenHead";
import SuccessMark from "@/components/kiosk/success-mark/SuccessMark";
import SessionHeader from "@/components/kiosk/session-header/SessionHeader";
import StatusMessage, {
  type StatusAction,
} from "@/components/kiosk/status-message/StatusMessage";
import type { CheckInOutcome } from "@/domain/kiosk/checkInOutcome";
import { formatClockTime } from "@/domain/kiosk/sessionFormat";
import styles from "./ResultScreen.module.scss";

type Props = {
  session: SessionOption;
  member: RosterMember;
  outcome: CheckInOutcome;
  onDone: () => void;
  onRetry: () => void; // only offered when not confirmed
  onChooseClass: () => void; // only offered when this class can't take check-ins
  onStaffHelp: () => void; // offered with "see the front desk"
};

// K06: only ever shown after the server answered (or clearly didn't).
// No Back: the only ways out are Done, or the action the outcome offers.
const ResultScreen = ({
  session,
  member,
  outcome,
  onDone,
  onRetry,
  onChooseClass,
  onStaffHelp,
}: Props) => {
  const isReceipt =
    outcome.kind === "success" || outcome.kind === "alreadyCheckedIn";

  return (
    // the receipt is centered like Jodi's "You're all set"; the rest read left to right
    <div
      className={[styles.screen, isReceipt && styles.successScreen]
        .filter(Boolean)
        .join(" ")}
    >
      {outcome.kind === "success" && (
        <Receipt
          headline="You're checked in"
          animate
          session={session}
          member={member}
          receipt={outcome.receipt}
          onDone={onDone}
        />
      )}

      {outcome.kind === "alreadyCheckedIn" && (
        <Receipt
          headline="You're already checked in"
          animate={false}
          session={session}
          member={member}
          receipt={outcome.receipt}
          onDone={onDone}
        />
      )}

      {outcome.kind === "seeFrontDesk" && (
        <Refusal
          headline="Please see the front desk"
          message="We couldn't finish your check-in here."
          session={session}
          actions={[
            { label: "Get help from staff", onClick: onStaffHelp },
            { label: "Done", onClick: onDone },
          ]}
        />
      )}

      {outcome.kind === "chooseAnotherClass" && (
        <Refusal
          headline="This class can't take check-ins"
          message="Please choose a class from today's list."
          session={session}
          actions={[
            { label: "Choose a class", onClick: onChooseClass },
            { label: "Done", onClick: onDone },
          ]}
        />
      )}

      {outcome.kind === "kioskUnavailable" && (
        <Refusal
          headline="Check-in isn't available here"
          message="This kiosk can't check you in right now."
          detail="Please see the front desk."
          session={session}
          actions={[{ label: "Done", onClick: onDone }]}
        />
      )}

      {/* It may still have gone through, so never say it failed */}
      {outcome.kind === "notConfirmed" && (
        <Refusal
          headline="Check-in not confirmed"
          message="We couldn't confirm your check-in."
          detail="Try again, or see the front desk."
          session={session}
          actions={[
            { label: "Try again", onClick: onRetry },
            { label: "Done", onClick: onDone },
          ]}
        />
      )}
    </div>
  );
};

type ReceiptProps = {
  headline: string;
  animate: boolean; // draw the check in on a new check-in, not on "already checked in"
  session: SessionOption;
  member: RosterMember;
  receipt: AttendanceReceipt;
  onDone: () => void;
};

// Success and already-checked-in: Jodi's "You're all set". The receipt always
// names the selected session.
const Receipt = ({
  headline,
  animate,
  session,
  member,
  receipt,
  onDone,
}: ReceiptProps) => {
  return (
    <div
      className={styles.successContent}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className={styles.markWrap}>
        <SuccessMark animate={animate} />
      </div>
      <div className={styles.eyebrow}>Complete</div>
      <h1 className={styles.headline}>{headline}</h1>

      <div className={styles.nextAction}>
        <small>Checked in</small>
        <strong>{session.title}</strong>
        <p>
          {member.displayName} · {formatClockTime(session.startsAt)} class ·
          checked in at {formatClockTime(receipt.checkedInAt)}
          {/* Neutral, just information: not a warning */}
          {receipt.status === "late" && (
            <span className={styles.tag}>Late</span>
          )}
        </p>
      </div>

      <div className={styles.actions}>
        <KioskButton onClick={onDone}>Done</KioskButton>
      </div>

      <p className={styles.privacyNote}>
        This kiosk will reset automatically for privacy.
      </p>
    </div>
  );
};

type RefusalProps = {
  headline: string;
  message: string;
  detail?: string;
  session: SessionOption;
  actions: StatusAction[];
};

// Everything that isn't a receipt: neutral wording, never a reason
const Refusal = ({
  headline,
  message,
  detail,
  session,
  actions,
}: RefusalProps) => {
  return (
    <>
      <ScreenHead eyebrow="Check-in" title={headline} />
      <SessionHeader session={session} />
      <StatusMessage message={message} detail={detail} actions={actions} />
    </>
  );
};

export default ResultScreen;
