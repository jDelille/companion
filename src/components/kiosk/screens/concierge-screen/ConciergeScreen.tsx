import type { FormEvent } from "react";
import type { SessionOption } from "@/contracts/kiosk-attendance";
import StatusMessage from "@/components/kiosk/status-message/StatusMessage";
import ActionCard from "@/components/primitives/action-card/ActionCard";
import PlainButton from "@/components/primitives/plain-button/PlainButton";
import type { SessionsLoad } from "@/domain/kiosk/checkInFlow";
import {
  CONCIERGE_TOPICS,
  type ConciergeAction,
  type ConciergeAnswer,
  type ConciergeReceipt,
} from "@/domain/kiosk/concierge";
import type { ConciergeState } from "@/domain/kiosk/conciergeFlow";
import { formatDuration, formatStartTime } from "@/domain/kiosk/sessionFormat";
import styles from "./ConciergeScreen.module.scss";

type Props = {
  state: ConciergeState;
  sessions: SessionsLoad | null; // today's classes, when the view needs them
  canSubmit: boolean;
  onTextChange: (text: string) => void;
  onAsk: (question: string) => void;
  onStartAction: (action: ConciergeAction) => void;
  onFirstNameChange: (firstName: string) => void;
  onPickSession: (session: SessionOption) => void;
  onConfirm: () => void;
  onRetry: () => void; // only offered when not confirmed
  onRetrySessions: () => void;
  onAskAgain: () => void;
  onExit: () => void; // back to Welcome
  onGoToCheckIn: () => void; // the "Check In" suggestion
  onDone: () => void; // privacy reset
};

// The kiosk AI Concierge. Only display: the state and callbacks come from the
// Concierge container, the decisions from conciergeFlow.
const ConciergeScreen = (props: Props) => {
  const { state } = props;

  return (
    <div className={styles.screen}>
      <div className={styles.topBar}>
        {state.view === "ask" && (
          <PlainButton onClick={props.onExit}>← Back</PlainButton>
        )}
        {/* No way back from a receipt, same as the check-in Result: only Done */}
        {state.view !== "ask" && state.view !== "done" && (
          <PlainButton onClick={props.onAskAgain} disabled={state.view === "sending"}>
            ← Ask something else
          </PlainButton>
        )}
        {state.view === "done" && <span />}
        {/* --agent marks AI context, so it's clear these answers come from the assistant */}
        <span className={styles.aiTag}>AI assistant</span>
      </div>

      {(state.view === "ask" || state.view === "thinking") && (
        <AskView {...props} />
      )}

      {state.view === "reply" && (
        <ReplyView
          question={state.question}
          answer={state.answer}
          sessions={props.sessions}
          onStartAction={props.onStartAction}
          onRetrySessions={props.onRetrySessions}
          onAskAgain={props.onAskAgain}
          onGoToCheckIn={props.onGoToCheckIn}
        />
      )}

      {(state.view === "preview" || state.view === "sending") && (
        <PreviewView {...props} />
      )}

      {state.view === "done" && (
        <ReceiptView receipt={state.receipt} onDone={props.onDone} />
      )}

      {state.view === "notConfirmed" && (
        <>
          <Titles eyebrow={state.action.title} headline="Not confirmed" />
          {/* It may still have gone through, so never say it failed */}
          <StatusMessage
            message="We couldn't confirm that went through."
            detail="Try again, or see the front desk."
            actions={[
              { label: "Try again", onClick: props.onRetry },
              { label: "Done", onClick: props.onDone },
            ]}
          />
        </>
      )}

      {state.view === "failed" && (
        <>
          <Titles eyebrow={state.action.title} headline="Please see the front desk" />
          <StatusMessage
            message="We couldn't do that from here."
            actions={[{ label: "Done", onClick: props.onDone }]}
          />
        </>
      )}
    </div>
  );
};

const Titles = ({ eyebrow, headline }: { eyebrow: string; headline: string }) => {
  return (
    <div className={styles.titles}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h1 className={styles.headline}>{headline}</h1>
    </div>
  );
};

// Questions: one-tap chips, or type your own
const AskView = ({ state, onTextChange, onAsk }: Props) => {
  const isThinking = state.view === "thinking";
  const text = state.view === "ask" ? state.text : state.view === "thinking" ? state.question.question : "";

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onAsk(text);
  };

  return (
    <>
      <Titles eyebrow="Ask" headline="How can we help?" />

      <div className={styles.topics}>
        {CONCIERGE_TOPICS.map((topic) => (
          <button
            key={topic.id}
            type="button"
            className={styles.topic}
            disabled={isThinking}
            onClick={() => onAsk(topic.question)}
          >
            {topic.label}
          </button>
        ))}
      </div>

      <form className={styles.askForm} onSubmit={handleSubmit}>
        <input
          className={styles.field}
          type="text"
          value={text}
          onChange={(event) => onTextChange(event.target.value)}
          placeholder="Or type a question"
          aria-label="Type a question"
          maxLength={200}
          disabled={isThinking}
          autoComplete="off"
        />
        <button type="submit" className={styles.askButton} disabled={isThinking || text.trim() === ""}>
          Ask
        </button>
      </form>

      <p className={styles.thinking} role="status">
        {isThinking ? "Thinking…" : ""}
      </p>
    </>
  );
};

type ReplyProps = {
  question: string;
  answer: ConciergeAnswer;
  sessions: SessionsLoad | null;
  onStartAction: (action: ConciergeAction) => void;
  onRetrySessions: () => void;
  onAskAgain: () => void;
  onGoToCheckIn: () => void;
};

const ReplyView = ({
  question,
  answer,
  sessions,
  onStartAction,
  onRetrySessions,
  onAskAgain,
  onGoToCheckIn,
}: ReplyProps) => {
  if (answer.kind === "unavailable") {
    return (
      <>
        <Titles eyebrow={question} headline="The assistant isn't available" />
        <StatusMessage
          message="Please try again, or see the front desk."
          actions={[{ label: "Try again", onClick: onAskAgain }]}
        />
      </>
    );
  }

  if (answer.kind === "notUnderstood") {
    return (
      <>
        <Titles eyebrow={question} headline="Sorry, I can't help with that here" />
        <StatusMessage
          message="Try one of the suggested questions, or see the front desk."
          actions={[{ label: "See suggestions", onClick: onAskAgain }]}
        />
      </>
    );
  }

  if (answer.kind === "schedule") {
    return (
      <>
        <Titles eyebrow={question} headline={answer.title} />
        <ScheduleList sessions={sessions} onRetry={onRetrySessions} />
      </>
    );
  }

  // A page suggestion: the normal Check In, from the start
  if (answer.kind === "goTo") {
    return (
      <>
        <Titles eyebrow={question} headline={answer.title} />
        <div className={styles.answer}>
          {answer.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <ActionCard
          label="Check In"
          description="Pick your class, then find your name"
          size="large"
          onClick={onGoToCheckIn}
        />
      </>
    );
  }

  if (answer.kind === "action") {
    return (
      <>
        <Titles eyebrow={question} headline={answer.action.title} />
        <ActionCard
          label={answer.action.title}
          description="See what happens before anything is sent"
          size="large"
          onClick={() => onStartAction(answer.action)}
        />
      </>
    );
  }

  // answer or privateHandoff: a few lines of text, maybe with a next step
  const nextAction = answer.kind === "answer" ? answer.action : undefined;

  return (
    <>
      <Titles eyebrow={question} headline={answer.title} />
      <div className={styles.answer}>
        {answer.lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      {nextAction && (
        <ActionCard
          label={nextAction.title}
          description="See what happens before anything is sent"
          onClick={() => onStartAction(nextAction)}
        />
      )}
    </>
  );
};

// Today's classes, read only: checking in still goes through Check In
const ScheduleList = ({ sessions, onRetry }: { sessions: SessionsLoad | null; onRetry: () => void }) => {
  if (!sessions || sessions.status === "loading") {
    return <p className={styles.thinking} role="status">Loading today’s classes…</p>;
  }
  if (sessions.status === "unavailable") {
    return (
      <StatusMessage
        message="Classes can't be loaded right now."
        actions={[{ label: "Try again", onClick: onRetry }]}
      />
    );
  }
  if (sessions.list.length === 0) {
    return <StatusMessage message="No more classes today." />;
  }

  return (
    <dl className={styles.schedule}>
      {sessions.list.map((session) => {
        const { time, period } = formatStartTime(session.startsAt);
        return (
          <div key={session.sessionId} className={styles.scheduleRow}>
            <dt>
              {time} {period}
            </dt>
            <dd>
              <span>{session.title}</span>
              <span className={styles.muted}>{formatDuration(session.startsAt, session.endsAt)}</span>
            </dd>
          </div>
        );
      })}
    </dl>
  );
};

// What will and won't happen, any details needed, then one confirm
const PreviewView = ({
  state,
  sessions,
  canSubmit,
  onFirstNameChange,
  onPickSession,
  onConfirm,
  onRetrySessions,
}: Props) => {
  if (state.view !== "preview" && state.view !== "sending") return null;
  const isSending = state.view === "sending";
  const action = state.action;
  const firstName = state.view === "preview" ? state.firstName : state.command.trial?.firstName ?? "";
  const pickedSessionId =
    state.view === "preview" ? state.session?.sessionId : state.command.trial?.sessionId;

  return (
    <>
      <Titles eyebrow="Before anything is sent" headline={action.title} />

      {action.needsTrialDetails && (
        <>
          <label className={styles.label}>
            Your first name
            <input
              className={styles.field}
              type="text"
              value={firstName}
              onChange={(event) => onFirstNameChange(event.target.value)}
              maxLength={40}
              disabled={isSending}
              autoComplete="off"
            />
          </label>

          <div className={styles.label}>
            Which class?
            <SessionPicker
              sessions={sessions}
              pickedSessionId={pickedSessionId}
              disabled={isSending}
              onPick={onPickSession}
              onRetry={onRetrySessions}
            />
          </div>
        </>
      )}

      <div className={styles.consequences}>
        <ConsequenceList title="What will happen" items={action.willHappen} />
        <ConsequenceList title="What won't happen" items={action.willNotHappen} />
      </div>

      <ActionCard
        label={isSending ? "Sending…" : action.confirmLabel}
        description={canSubmit || isSending ? "Nothing is sent until you tap this" : "Add your first name and pick a class"}
        size="large"
        disabled={isSending || !canSubmit}
        onClick={onConfirm}
      />

      <p className={styles.visuallyHidden} role="status">
        {isSending ? "Sending, please wait." : ""}
      </p>
    </>
  );
};

type PickerProps = {
  sessions: SessionsLoad | null;
  pickedSessionId: string | undefined;
  disabled: boolean;
  onPick: (session: SessionOption) => void;
  onRetry: () => void;
};

const SessionPicker = ({ sessions, pickedSessionId, disabled, onPick, onRetry }: PickerProps) => {
  if (!sessions || sessions.status === "loading") {
    return <p className={styles.muted} role="status">Loading today’s classes…</p>;
  }
  if (sessions.status === "unavailable") {
    return (
      <StatusMessage
        message="Classes can't be loaded right now."
        actions={[{ label: "Try again", onClick: onRetry }]}
      />
    );
  }
  if (sessions.list.length === 0) {
    return <p className={styles.muted}>No more classes today. Please see the front desk.</p>;
  }

  return (
    <div className={styles.picker}>
      {sessions.list.map((session) => {
        const { time, period } = formatStartTime(session.startsAt);
        const isPicked = session.sessionId === pickedSessionId;
        return (
          <button
            key={session.sessionId}
            type="button"
            className={isPicked ? `${styles.pick} ${styles.picked}` : styles.pick}
            aria-pressed={isPicked}
            disabled={disabled}
            onClick={() => onPick(session)}
          >
            <span className={styles.pickTime}>
              {time} {period}
            </span>
            <span>{session.title}</span>
          </button>
        );
      })}
    </div>
  );
};

const ConsequenceList = ({ title, items }: { title: string; items: string[] }) => {
  return (
    <div className={styles.consequence}>
      <h2>{title}</h2>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
};

const ReceiptView = ({ receipt, onDone }: { receipt: ConciergeReceipt; onDone: () => void }) => {
  return (
    <>
      <Titles eyebrow="Done" headline={receipt.headline} />
      <dl className={styles.details}>
        {receipt.details.map((detail) => (
          <div key={detail.label} className={styles.detailRow}>
            <dt>{detail.label}</dt>
            <dd>{detail.value}</dd>
          </div>
        ))}
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

export default ConciergeScreen;
