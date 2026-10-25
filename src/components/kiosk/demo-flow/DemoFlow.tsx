"use client";

import { useEffect, useRef, useState } from "react";
import KioskHeader from "@/components/kiosk/kiosk-header/KioskHeader";
import styles from "./DemoFlow.module.scss";

// Demo-only walkthrough of Jodi's screens 2-8 (household, onboarding, plans,
// requirements, review, all set). Local state only: no API calls, fake data.
// /kiosk opens it from the "I'm new here" and "Family arrival" cards (demo mode).

type Method = "qr" | "pin" | "name";

// small label next to the logo + the eyebrow, one per screen (index = step - 1)
const STEP_NAMES = [
  "Arrival",
  "Identify",
  "Resolve",
  "Onboarding",
  "Recommend",
  "Requirements",
  "Review",
  "Complete",
];

const METHODS: { id: Method; title: string; note: string }[] = [
  { id: "qr", title: "Scan QR / pass", note: "Fastest" },
  { id: "pin", title: "Enter PIN", note: "Member credential" },
  { id: "name", title: "Search name", note: "Manual lookup" },
];

const PROFILES = [
  {
    initials: "RJ",
    name: "Reese Jackson",
    note: "Member · Active · Adult BJJ",
  },
  { initials: "AJ", name: "Ava Jackson", note: "Dependent · Kids BJJ" },
  { initials: "BJ", name: "Ben Jackson", note: "Dependent · Trial" },
];

const STEPPER = ["1 Profile", "2 Goals", "3 Program", "4 Review"];

const GOALS = [
  "Learn martial arts",
  "Fitness / conditioning",
  "Competition / progression",
  "For my child / family",
];

const PLANS = [
  {
    tag: "Best match",
    name: "Martial Arts Monthly",
    note: "Unlimited classes",
    price: "$120",
    per: "/ month",
  },
  {
    tag: "Low commitment",
    name: "Starter Trial",
    note: "2 classes + intro",
    price: "$25",
    per: "",
  },
  {
    tag: "Household option",
    name: "Family Plan",
    note: "Shared family benefits",
    price: "Custom",
    per: "",
  },
];

const REQUIREMENTS = [
  { label: "Identity details", state: "Complete" },
  { label: "Guardian authority", state: "Complete" },
  { label: "Payer relationship", state: "Needs review" }, // the active one
  { label: "Waiver / agreement", state: "Required" },
  { label: "Emergency contact", state: "Required" },
];

const PAYERS = [
  "I am the payer",
  "Choose household payer",
  "Invite payer securely",
];

const REVIEW = [
  { label: "Profile", value: "Reese Jackson · Adult member" },
  { label: "Program", value: "Adult BJJ · Main Gym" },
  { label: "Membership", value: "Martial Arts Monthly · $120/month" },
  { label: "First class", value: "BJJ Fundamentals · Tue 5:30 PM" },
  { label: "Payer", value: "Reese Jackson" },
  { label: "Documents", value: "Waiver signed · Emergency contact complete" },
];

type Props = {
  startAt: number; // screen to open on (2 = identify, 4 = onboarding)
  onExit: () => void; // back to the Welcome screen
};

export default function DemoFlow({ startAt, onExit }: Props) {
  // trail of visited steps, so Back goes to where you really came from
  const [trail, setTrail] = useState<number[]>([startAt]);
  const step = trail[trail.length - 1];

  // keep the latest onExit without making the timer below restart on every render
  const exitRef = useRef(onExit);
  useEffect(() => {
    exitRef.current = onExit;
  });

  const [method, setMethod] = useState<Method>("qr");
  const [goal, setGoal] = useState(0);
  const [plan, setPlan] = useState(0);
  const [payer, setPayer] = useState(PAYERS[0]);

  const go = (next: number) => setTrail((t) => [...t, next]);
  // Back on the first screen leaves the demo
  const back = () =>
    trail.length > 1 ? setTrail((t) => t.slice(0, -1)) : onExit();

  // "This kiosk will reset automatically": back to Welcome after 20s on the last screen
  useEffect(() => {
    if (step !== 8) return;
    const timer = setTimeout(() => exitRef.current(), 20000);
    return () => clearTimeout(timer);
  }, [step]);

  const backButton = (
    <button type="button" className={styles.backButton} onClick={back}>
      ← Back
    </button>
  );

  return (
    <div className={styles.root}>
      <KioskHeader label={STEP_NAMES[step - 1]} showDemoPill onReset={onExit} />

      {/* key={step} replays the fade-in each time the screen changes */}
      <section
        key={step}
        className={`${styles.screen} ${step === 8 ? styles.successScreen : ""}`}
      >
        {/* 2 · Identify */}
        {step === 2 && (
          <>
            {backButton}
            <div className={styles.eyebrow}>Identify</div>
            <h1 className={styles.compact}>Let&apos;s find your profile</h1>
            <p className={styles.lead}>
              Choose the easiest way to identify yourself.
            </p>

            <div className={styles.methodGrid}>
              {METHODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`${styles.methodCard} ${method === m.id ? styles.isActive : ""}`}
                  onClick={() => setMethod(m.id)}
                >
                  <strong>{m.title}</strong>
                  <small>{m.note}</small>
                </button>
              ))}
            </div>

            <div className={styles.methodPanel}>
              {method === "qr" && (
                <div className={styles.scanState}>
                  <div className={styles.scanBox}>QR / PASS</div>
                  <div>
                    <strong>Scanner ready</strong>
                    <p>Hold your member pass under the scanner.</p>
                  </div>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => go(3)}
                  >
                    Simulate scan
                  </button>
                </div>
              )}
              {method === "pin" && (
                <div className={styles.searchField}>
                  <input
                    type="password"
                    inputMode="numeric"
                    placeholder="Member PIN"
                    aria-label="Member PIN"
                  />
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={() => go(3)}
                  >
                    Continue
                  </button>
                </div>
              )}
              {method === "name" && (
                <div className={styles.searchField}>
                  <input
                    type="text"
                    placeholder="Type your name"
                    aria-label="Search by name"
                  />
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={() => go(3)}
                  >
                    Search
                  </button>
                </div>
              )}
            </div>

            <div className={styles.secureRow}>
              <div>
                <strong>Private continuation</strong>
                <p>
                  Continue on your phone for sensitive details or account
                  recovery.
                </p>
              </div>
              <button type="button" className={styles.secondaryButton}>
                Send secure handoff
              </button>
            </div>

            <button
              type="button"
              className={styles.textButton}
              onClick={() => go(4)}
            >
              No match? <strong>Start a new member or trial flow →</strong>
            </button>
          </>
        )}

        {/* 3 · Household */}
        {step === 3 && (
          <>
            {backButton}
            <div className={styles.eyebrow}>Resolve</div>
            <h1 className={styles.compact}>Who are you here for?</h1>
            <p className={styles.lead}>
              We found an authorized household connection.
            </p>

            <div className={styles.profileList}>
              {PROFILES.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  className={styles.profileCard}
                  onClick={() => go(4)}
                >
                  <span className={styles.avatar}>{p.initials}</span>
                  <span className={styles.profileCopy}>
                    <strong>{p.name}</strong>
                    <small>{p.note}</small>
                  </span>
                  <span className={styles.selectLabel}>Select →</span>
                </button>
              ))}
            </div>

            <div className={styles.policyStrip}>
              <strong>Household permissions</strong>
              <br />
              View, book, sign, pay and message are checked independently for
              the selected profile.
            </div>
          </>
        )}

        {/* 4 · Onboarding */}
        {step === 4 && (
          <>
            {backButton}
            <div className={styles.eyebrow}>Onboarding</div>
            <h1 className={styles.compact}>
              A few details, then we&apos;ll personalize the rest
            </h1>

            <div className={styles.stepper}>
              {STEPPER.map((label, i) => (
                <span key={label} className={i === 1 ? styles.isActive : ""}>
                  {label}
                </span>
              ))}
            </div>

            <h2>What brings you to Dojang?</h2>
            <div className={styles.choiceGrid}>
              {GOALS.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  className={`${styles.choiceCard} ${goal === i ? styles.isSelected : ""}`}
                  onClick={() => setGoal(i)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className={styles.aiNote}>
              <div className={styles.aiLabel}>AI intake</div>
              <p>
                I will use your answers only to decide which approved questions
                and program options to show next.
              </p>
            </div>

            <div className={styles.screenActions}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => go(5)}
              >
                Continue
              </button>
              <button
                type="button"
                className={styles.textButton}
                onClick={() => go(8)}
              >
                Save &amp; finish on phone
              </button>
            </div>
          </>
        )}

        {/* 5 · Recommendations */}
        {step === 5 && (
          <>
            {backButton}
            <div className={styles.eyebrow}>Recommend</div>
            <h1 className={styles.compact}>Recommended for you</h1>
            <p className={styles.lead}>
              Based on your goals, age, location, schedule and current
              eligibility.
            </p>

            <div className={styles.planGrid}>
              {PLANS.map((p, i) => (
                <article
                  key={p.name}
                  className={`${styles.planCard} ${plan === i ? styles.isSelected : ""}`}
                >
                  <span className={styles.planTag}>{p.tag}</span>
                  <h3>{p.name}</h3>
                  <p>{p.note}</p>
                  <div className={styles.price}>
                    {p.price} <small>{p.per}</small>
                  </div>
                  <button
                    type="button"
                    className={`${plan === i ? styles.primaryButton : styles.secondaryButton} ${styles.wideButton}`}
                    onClick={() => setPlan(i)}
                  >
                    {plan === i ? "Selected" : "View details"}
                  </button>
                </article>
              ))}
            </div>

            <div className={styles.screenActions}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => go(6)}
              >
                Select &amp; continue
              </button>
              <button type="button" className={styles.textButton}>
                Show all eligible options
              </button>
            </div>
          </>
        )}

        {/* 6 · Requirements */}
        {step === 6 && (
          <>
            {backButton}
            <div className={styles.eyebrow}>Requirements</div>
            <h1 className={styles.compact}>Finish the required pieces</h1>

            <div className={styles.requirementsLayout}>
              <div className={styles.requirementList}>
                {REQUIREMENTS.map((r, i) => (
                  <div
                    key={r.label}
                    className={`${styles.requirementItem} ${i === 2 ? styles.isActive : ""}`}
                  >
                    <span>{r.label}</span>
                    <span className={styles.requirementState}>{r.state}</span>
                  </div>
                ))}
              </div>

              <div className={styles.requirementPanel}>
                <div className={styles.eyebrow}>Current item</div>
                <h2>Payer relationship</h2>
                <p className={styles.lead}>
                  Who is responsible for this membership?
                </p>
                <div className={styles.radioStack}>
                  {PAYERS.map((label) => (
                    <label key={label} className={styles.radioOption}>
                      <input
                        type="radio"
                        name="payer"
                        value={label}
                        checked={payer === label}
                        onChange={() => setPayer(label)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => go(7)}
                >
                  Continue
                </button>
              </div>
            </div>
          </>
        )}

        {/* 7 · Review */}
        {step === 7 && (
          <>
            {backButton}
            <div className={styles.eyebrow}>Review</div>
            <h1 className={styles.compact}>Review your setup</h1>

            <dl className={styles.reviewList}>
              {REVIEW.map((row) => (
                <div key={row.label} className={styles.reviewRow}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>

            <div className={styles.aiNote}>
              <div className={styles.aiLabel}>AI preview</div>
              <p>
                You&apos;re about to create or update the member record,
                establish the selected membership, and prepare the next approved
                action.
              </p>
            </div>

            <div className={styles.screenActions}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => go(8)}
              >
                Confirm
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => go(4)}
              >
                Go back &amp; edit
              </button>
            </div>
          </>
        )}

        {/* 8 · All set */}
        {step === 8 && (
          <div className={styles.successContent}>
            <div className={styles.successMark}>✓</div>
            <div className={styles.eyebrow}>Complete</div>
            <h1 className={styles.compact}>You&apos;re all set</h1>

            <div className={styles.nextAction}>
              <small>Next action</small>
              <strong>BJJ Fundamentals</strong>
              <p>Today · 5:30 PM · Studio A</p>
            </div>

            <div className={`${styles.screenActions} ${styles.centered}`}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={onExit}
              >
                Check in / view class
              </button>
              <button type="button" className={styles.secondaryButton}>
                Send receipt to phone
              </button>
            </div>

            <p className={styles.privacyNote}>
              This kiosk will reset automatically for privacy.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
