"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "@/components/primitives/AppLink";
import styles from "./DemoKiosk.module.scss";

// Demo-only kiosk: Jodi's slides 1-8, local state only. No API calls, fake data.
// Open it at /kiosk/demo

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

// each card says which step it opens
const INTENTS = [
  { title: "Check in", note: "Existing member", go: 2 },
  { title: "I'm new here", note: "Trial or join", go: 4 },
  { title: "Family arrival", note: "Check in household", go: 2 },
  { title: "Find a class", note: "Browse eligible sessions", go: 5 },
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

// the kiosk panel from the layout is narrower than Jodi's frame, so widen it
// and hide the layout's own header (this page draws its own top bar)
const SHELL_OVERRIDE = `
  :root:has([data-jodi]) { --kiosk-column-width: 1180px; }
  main:has([data-jodi]) { padding: 0; border-radius: 18px; overflow: hidden; }
  main:has([data-jodi]) > header { display: none; }
`;

export default function DemoKioskPage() {
  // trail of visited steps, so Back goes to where you really came from
  const [trail, setTrail] = useState<number[]>([1]);
  const step = trail[trail.length - 1];

  const [method, setMethod] = useState<Method>("qr");
  const [goal, setGoal] = useState(0);
  const [plan, setPlan] = useState(0);
  const [payer, setPayer] = useState(PAYERS[0]);

  const go = (next: number) => setTrail((t) => [...t, next]);
  const back = () => setTrail((t) => (t.length > 1 ? t.slice(0, -1) : t));
  // back to Welcome and forget the last person's picks
  const reset = useCallback(() => {
    setTrail([1]);
    setMethod("qr");
    setGoal(0);
    setPlan(0);
    setPayer(PAYERS[0]);
  }, []);

  // "This kiosk will reset automatically": back to Welcome after 20s on the last screen
  useEffect(() => {
    if (step !== 8) return;
    const timer = setTimeout(reset, 20000);
    return () => clearTimeout(timer);
  }, [step, reset]);

  const backButton = (
    <button type="button" className={styles.backButton} onClick={back}>
      ← Back
    </button>
  );

  return (
    <div className={styles.root} data-jodi>
      <style>{SHELL_OVERRIDE}</style>

      {/* top bar: logo + current screen name, reset on the right */}
      <div className={styles.topbar}>
        <button type="button" className={styles.brand} onClick={reset}>
          <span className={styles.brandWord}>DOJANG</span>
          <span className={styles.brandContext}>{STEP_NAMES[step - 1]}</span>
        </button>
        <span className={styles.spacer} />
        <span className={styles.pill}>
          <i /> Premium design pass
        </span>
        <button
          type="button"
          className={styles.iconButton}
          aria-label="Reset preview"
          onClick={reset}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 7h-9a5 5 0 0 0-5 5" />
            <path d="m16 3 4 4-4 4" />
            <path d="M4 17h9a5 5 0 0 0 5-5" />
            <path d="m8 21-4-4 4-4" />
          </svg>
        </button>
      </div>

      {/* key={step} replays the fade-in each time the screen changes */}
      <section
        key={step}
        className={`${styles.screen} ${step === 8 ? styles.successScreen : ""}`}
      >
        {/* 1 · Welcome */}
        {step === 1 && (
          <>
            <div className={styles.eyebrow}>Arrival</div>
            <h1>Welcome to Dojang</h1>
            <p className={styles.lead}>What would you like to do today?</p>

            <div className={styles.intentGrid}>
              {INTENTS.map((item) => (
                <button
                  key={item.title}
                  type="button"
                  className={styles.intentCard}
                  onClick={() => go(item.go)}
                >
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.note}</small>
                  </span>
                  <span className={styles.arrow}>→</span>
                </button>
              ))}
            </div>

            <div className={styles.utilityRow}>
              <Link
                href="/"
                className={`${styles.utilityButton} ${styles.utilityPrimary}`}
              >
                Open Business Companion →
              </Link>
              <button type="button" className={styles.utilityButton}>
                Language
              </button>
              <button type="button" className={styles.utilityButton}>
                Accessibility
              </button>
              <button type="button" className={styles.utilityButton}>
                Need staff help?
              </button>
            </div>
          </>
        )}

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
                onClick={reset}
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
