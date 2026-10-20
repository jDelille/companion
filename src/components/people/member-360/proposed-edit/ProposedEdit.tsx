"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "@/components/primitives/AppLink";
import type { Member } from "@/domain/member";
import { explainHubError } from "@/domain/hub-actions";
import { SelectMember } from "@/components/shell/selected-member/selectedMember";
import { ShowEvidence, type EvidenceItem } from "@/components/shell/rail/companion-rail/pageEvidence";
import { proposeEdit, type EditProposal, type ProgramOption } from "../edit-leaf/proposeEdit";
import {
  loadEditWorkspace,
  loadPrograms,
  prepareSteps,
  runSteps,
  type EditStep,
} from "../edit-leaf/memberEdits";
import styles from "./ProposedEdit.module.scss";

// AI-assisted edit (doc section 8, mockup do-for-me-4): the proposed changes from a staff
// request, their effects, and what won't change. Apply writes only what Odoo can save
// (the program); the instructor is shown but can't be applied yet. Nothing saves until Apply.

type Props = {
  member: Member;
  request: string;
  liveTest: boolean;
};

// Sample data has no course list; these are the sample school's classes
const SAMPLE_PROGRAMS: ProgramOption[] = [
  { id: "Pee Wee", name: "Pee Wee" },
  { id: "Children Beginner", name: "Children Beginner" },
  { id: "Children Advanced", name: "Children Advanced" },
];

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "noChange" }
  | { kind: "ready"; proposal: EditProposal; steps: EditStep[] }
  | { kind: "applied"; message: string };

export default function ProposedEdit({ member, request, liveTest }: Props) {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const [applyError, setApplyError] = useState("");

  const editHref = `/people/${member.id}?action=edit`;
  const currentInstructor = member.training?.primaryInstructor ?? "Not recorded";

  // Match the request, then let Odoo preview the program change
  useEffect(() => {
    let current = true;
    async function load() {
      try {
        if (!liveTest) {
          const proposal = proposeEdit(request, SAMPLE_PROGRAMS, member.training?.program ?? "No program", currentInstructor);
          if (current) setState(proposal ? { kind: "ready", proposal, steps: [] } : { kind: "noChange" });
          return;
        }
        const [workspace, programs] = await Promise.all([loadEditWorkspace(member.id), loadPrograms()]);
        const currentProgram = workspace.courses?.[0]?.name ?? "No program";
        const proposal = proposeEdit(request, programs, currentProgram, currentInstructor);
        if (!proposal) {
          if (current) setState({ kind: "noChange" });
          return;
        }
        const steps = proposal.program
          ? await prepareSteps(member.id, workspace, programs, null, proposal.program.to.id)
          : [];
        if (current) setState({ kind: "ready", proposal, steps });
      } catch (error) {
        if (current) setState({ kind: "error", message: explainHubError((error as Error).message) });
      }
    }
    load();
    return () => {
      current = false;
    };
  }, [member.id, member.training?.program, request, liveTest, currentInstructor]);

  async function apply() {
    if (state.kind !== "ready" || busy || state.steps.length === 0) return;
    setBusy(true);
    setApplyError("");
    // The request is the recorded reason for the course change
    const result = await runSteps(state.steps, `AI-assisted edit: “${request}”`, (steps) =>
      setState({ ...state, steps }),
    );
    setBusy(false);
    if (!result.ok) {
      setState({ ...state, steps: result.steps });
      setApplyError(result.message);
      return;
    }
    setState({ kind: "applied", message: result.message });
    router.refresh();
  }

  const membershipValid = member.membershipState === "active" || member.membershipState === "trial";

  // What the Do For Me rail shows under Evidence: real records only
  const evidence: EvidenceItem[] = [
    {
      title: "Membership",
      detail: membershipValid ? `Membership is ${member.membershipState}.` : `Membership is ${member.membershipState}: a program change may not be allowed.`,
    },
    {
      title: "Rank",
      detail: `${member.rank.name}${member.rank.stripes ? ` · ${member.rank.stripes} stripes` : ""}. No rank rule is checked for programs yet.`,
    },
  ];
  if (state.kind === "ready") {
    const booked = state.steps.reduce((total, step) => total + (step.booked ?? 0), 0);
    const cancelled = state.steps.reduce((total, step) => total + (step.cancelled ?? 0), 0);
    evidence.push({
      title: "Schedule",
      detail: liveTest
        ? `Odoo’s preview: ${booked} upcoming ${booked === 1 ? "class" : "classes"} booked, ${cancelled} ${cancelled === 1 ? "booking" : "bookings"} cancelled.`
        : "Odoo previews the bookings once connected.",
    });
  }

  const proposal = state.kind === "ready" ? state.proposal : null;
  const fieldCount = proposal ? (proposal.program ? 1 : 0) + (proposal.instructor ? 1 : 0) : 0;
  const applyCount = proposal?.program ? 1 : 0;

  return (
    <section className={styles.page}>
      {/* The context column shows this member; the rail shows the evidence */}
      <SelectMember id={member.id} name={member.name} detail={member.rank.name} />
      <ShowEvidence evidence={{ items: evidence, sourcesHref: `/hub?memberId=${encodeURIComponent(member.id)}&view=manage` }} />

      <nav className={styles.crumbs}>
        <Link href={editHref}>← Edit member</Link>
        <span className={styles.kicker}>✦ Proposed edit</span>
      </nav>

      <header className={styles.header}>
        <div>
          <h1>{member.name}</h1>
          <p>Review the exact changes and their effects before applying.</p>
        </div>
        {fieldCount > 0 && (
          <span className={styles.pill}>
            {fieldCount} field {fieldCount === 1 ? "change" : "changes"}
          </span>
        )}
      </header>

      {state.kind === "loading" && <p className={styles.note} role="status">Checking the request with Odoo…</p>}
      {state.kind === "error" && <p className={styles.error} role="alert">{state.message}</p>}
      {state.kind === "noChange" && (
        <p className={styles.note}>
          No change found in “{request}”. <Link href={editHref}>Edit member</Link> and name a program or an instructor.
        </p>
      )}
      {state.kind === "applied" && (
        <div className={styles.applied} role="status">
          <p>{state.message}</p>
          <Link href={`/people/${member.id}`}>Back to {member.name} →</Link>
        </div>
      )}

      {proposal && (
        <>
          <div className={styles.changes}>
            {proposal.program && (
              <div className={styles.change}>
                <small>Program</small>
                <div className={styles.values}>
                  <span>{proposal.program.from}</span>
                  <strong>→ {proposal.program.to.name}</strong>
                </div>
              </div>
            )}
            {proposal.instructor && (
              <div className={styles.change}>
                <small>Primary instructor</small>
                <div className={styles.values}>
                  <span>{proposal.instructor.from}</span>
                  <strong>→ {proposal.instructor.to}</strong>
                </div>
                <p className={styles.cannot}>Can’t apply yet: Odoo has no instructor field to save.</p>
              </div>
            )}
          </div>

          <div className={styles.cards}>
            <article>
              <small>Effects</small>
              <ul>
                <li>
                  {membershipValid ? "✓" : "✕"} Membership {membershipValid ? "permits a program change" : `is ${member.membershipState}`}
                </li>
                {state.kind === "ready" &&
                  state.steps.map((step) => (
                    <li key={step.requestKey}>
                      {step.done ? "✓ Done: " : "✓ "}
                      {step.label.replace("Program: ", "")}
                      {step.effect ? ` · ${step.effect}` : ""}
                    </li>
                  ))}
                {!liveTest && proposal.program && <li>Odoo previews the bookings once connected.</li>}
              </ul>
            </article>
            <article>
              <small>Will not change</small>
              <ul>
                <li>Membership</li>
                <li>Billing</li>
                <li>Rank</li>
              </ul>
            </article>
          </div>

          {applyError && <p className={styles.error} role="alert">{applyError}</p>}

          <footer className={styles.footer}>
            <Link href={editHref} className={styles.secondary}>
              Edit proposal
            </Link>
            <button
              type="button"
              className={styles.primary}
              onClick={apply}
              disabled={busy || !liveTest || applyCount === 0 || state.kind !== "ready" || state.steps.length === 0}
              title={!liveTest ? "Not connected in this preview" : undefined}
            >
              {busy ? "Applying…" : applyError ? "Try again" : `Apply ${applyCount} ${applyCount === 1 ? "change" : "changes"}`}
            </button>
          </footer>
        </>
      )}
    </section>
  );
}
