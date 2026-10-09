import type {
  AttendanceReceipt,
  RosterMember,
  SessionOption,
} from "@/contracts/kiosk-attendance";
import SessionHeader from "@/components/kiosk/session-header/SessionHeader";
import StatusMessage, {
  type StatusAction,
} from "@/components/kiosk/status-message/StatusMessage";
import ActionCard from "@/components/primitives/action-card/ActionCard";
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
  return (
    <div className={styles.screen}>
      <SessionHeader session={session} />

      {outcome.kind === "success" && (
        <Receipt
          headline="You're checked in"
          session={session}
          member={member}
          receipt={outcome.receipt}
          onDone={onDone}
        />
      )}

      {outcome.kind === "alreadyCheckedIn" && (
        <Receipt
          headline="You're already checked in"
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
          actions={[{ label: "Done", onClick: onDone }]}
        />
      )}

      {/* It may still have gone through, so never say it failed */}
      {outcome.kind === "notConfirmed" && (
        <Refusal
          headline="Check-in not confirmed"
          message="We couldn't confirm your check-in."
          detail="Try again, or see the front desk."
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
  session: SessionOption;
  member: RosterMember;
  receipt: AttendanceReceipt;
  onDone: () => void;
};

// Success and already-checked-in: the receipt always names the selected session
const Receipt = ({ headline, session, member, receipt, onDone }: ReceiptProps) => {
  return (
    <>
      <div className={styles.titles}>
        <p className={styles.eyebrow}>Check-in</p>
        <h1 className={styles.headline}>{headline}</h1>
      </div>

      <dl className={styles.details}>
        <div className={styles.detailRow}>
          <dt>Student</dt>
          <dd>{member.displayName}</dd>
        </div>
        <div className={styles.detailRow}>
          <dt>Class</dt>
          <dd>{session.title}</dd>
        </div>
        <div className={styles.detailRow}>
          <dt>Time</dt>
          <dd>{formatClockTime(session.startsAt)}</dd>
        </div>
        <div className={styles.detailRow}>
          <dt>Checked in at</dt>
          <dd>
            {formatClockTime(receipt.checkedInAt)}
            {/* Neutral, just information: not a warning */}
            {receipt.status === "late" && <span className={styles.tag}>Late</span>}
          </dd>
        </div>
      </dl>

      <ActionCard
        label="Done"
        description="Clears the screen for the next person"
        size="large"
        onClick={onDone}
      />
    </>
  );
};

type RefusalProps = {
  headline: string;
  message: string;
  detail?: string;
  actions: StatusAction[];
};

// Everything that isn't a receipt: neutral wording, never a reason
const Refusal = ({ headline, message, detail, actions }: RefusalProps) => {
  return (
    <>
      <div className={styles.titles}>
        <p className={styles.eyebrow}>Check-in</p>
        <h1 className={styles.headline}>{headline}</h1>
      </div>
      <StatusMessage message={message} detail={detail} actions={actions} />
    </>
  );
};

export default ResultScreen;
