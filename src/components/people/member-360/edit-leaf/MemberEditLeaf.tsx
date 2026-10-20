"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Member } from "@/domain/member";
import { explainHubError } from "@/domain/hub-actions";
import type { ProgramOption } from "./proposeEdit";
import {
  loadEditWorkspace,
  loadPrograms,
  prepareSteps,
  runSteps,
  type EditStep,
  type EditWorkspace,
} from "./memberEdits";
import styles from "./MemberEditLeaf.module.scss";

// Member quick-edit leaf (doc section 7): a panel beside Do For Me, over the member page.
// Only what Odoo can save is editable (Name, Program; see memberEdits.ts).
// Primary instructor and Tags are shown but can't be saved yet.
// Save shows the review first; only Confirm writes.
// "Ask AI to edit" takes a request and opens the Proposed edit page (doc section 8).

type Props = {
  member: Member;
  liveTest: boolean;
  onClose: () => void;
};

// form: the fields · ask: "what should change?"
type Mode = "form" | "ask";

export default function MemberEditLeaf({ member, liveTest, onClose }: Props) {
  const router = useRouter();
  const panel = useRef<HTMLDivElement>(null);

  const [workspace, setWorkspace] = useState<EditWorkspace | null>(null);
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [loadError, setLoadError] = useState("");

  const [mode, setMode] = useState<Mode>("form");
  const [name, setName] = useState(member.name);
  const currentCourse = workspace?.courses?.[0] ?? null;
  const [programId, setProgramId] = useState<string | null>(null); // null = unchanged
  const chosenProgramId = programId ?? currentCourse?.id ?? "";
  const [request, setRequest] = useState("");

  const [steps, setSteps] = useState<EditStep[] | null>(null); // the review, once Save is pressed
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  // Focus the panel when it opens; Escape closes it
  useEffect(() => {
    panel.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, onClose]);

  // Odoo: the member's current record (with its versions) and the school's courses
  useEffect(() => {
    if (!liveTest) return;
    let current = true;
    loadEditWorkspace(member.id)
      .then((value) => {
        if (!current) return;
        setWorkspace(value);
        setName(value.member.name);
      })
      .catch((error: Error) => {
        if (current) setLoadError(explainHubError(error.message));
      });
    loadPrograms().then((list) => {
      if (current) setPrograms(list);
    });
    return () => {
      current = false;
    };
  }, [liveTest, member.id]);

  const nameChanged = workspace !== null && name.trim() !== "" && name.trim() !== workspace.member.name;
  const programChanged = chosenProgramId !== "" && chosenProgramId !== (currentCourse?.id ?? "");
  const canSave = liveTest && workspace !== null && (nameChanged || programChanged) && !busy;

  // Save: show the review of exactly what will be written
  async function review() {
    if (!workspace || !canSave) return;
    setBusy(true);
    setMessage("");
    try {
      setSteps(
        await prepareSteps(member.id, workspace, programs, nameChanged ? name.trim() : null, programChanged ? chosenProgramId : null),
      );
    } catch (error) {
      setMessage(explainHubError((error as Error).message));
    } finally {
      setBusy(false);
    }
  }

  // Confirm: write the reviewed steps
  async function confirm() {
    if (!steps || busy) return;
    if (programChanged && !reason.trim()) return;
    setBusy(true);
    setMessage("");
    const result = await runSteps(steps, reason.trim(), setSteps);
    setBusy(false);
    setMessage(result.message);
    if (!result.ok) return;
    router.refresh(); // the page shows the saved values
    setSteps(null);
    setProgramId(null);
    setReason("");
    // Read the new versions, so another change can be made straight away
    loadEditWorkspace(member.id)
      .then(setWorkspace)
      .catch(() => {});
  }

  // Ask AI to edit → Propose: the Proposed edit page reads the request and shows the changes
  const propose = () => {
    const text = request.trim();
    if (!text) return;
    router.push(`/people/${member.id}/proposed-edit?request=${encodeURIComponent(text)}`);
  };

  const membershipValid = member.membershipState === "active" || member.membershipState === "trial";

  return (
    <>
      <button className={styles.backdrop} aria-label="Close edit member" tabIndex={-1} onClick={() => !busy && onClose()} />
      <div ref={panel} className={styles.leaf} role="dialog" aria-labelledby="edit-leaf-title" tabIndex={-1}>
        <header className={styles.header}>
          <div>
            <small className={mode === "ask" ? styles.agentLabel : ""}>
              {mode === "ask" ? "✦ Ask AI to edit" : "Edit member"}
            </small>
            <h2 id="edit-leaf-title">{member.name}</h2>
          </div>
          <button type="button" className={styles.close} onClick={onClose} disabled={busy} aria-label="Close">
            ✕
          </button>
        </header>

        <div className={styles.body}>
          {!liveTest && <p className={styles.note}>Changes are not connected in this preview.</p>}
          {loadError && <p className={styles.error} role="alert">{loadError}</p>}

          {mode === "form" && (
            <>
              <label className={styles.field}>
                Preferred name
                <input
                  value={name}
                  maxLength={200}
                  onChange={(event) => {
                    setName(event.target.value);
                    setSteps(null);
                  }}
                  disabled={!workspace?.canEditContact || busy || steps !== null}
                />
                {liveTest && <small>Changes the member’s name in Odoo.</small>}
              </label>

              <label className={styles.field}>
                Program
                {liveTest && programs.length > 0 ? (
                  <select
                    value={chosenProgramId}
                    onChange={(event) => {
                      setProgramId(event.target.value);
                      setSteps(null);
                    }}
                    disabled={busy || steps !== null}
                  >
                    {!currentCourse && <option value="">No program</option>}
                    {programs.map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select disabled value="">
                    <option value="">{currentCourse?.name ?? member.training?.program ?? "Not recorded"}</option>
                  </select>
                )}
              </label>

              <label className={styles.field}>
                Primary instructor
                <select disabled value="">
                  <option value="">{member.training?.primaryInstructor ?? "Not recorded"}</option>
                </select>
                <small>Not connected to Odoo yet.</small>
              </label>

              <div className={styles.field}>
                Tags
                <div className={styles.tags}>
                  {member.training?.team && <span>{member.training.team}</span>}
                  <button type="button" disabled>
                    + Add
                  </button>
                </div>
                <small>Not connected to Odoo yet.</small>
              </div>

              <section className={styles.eligibility} aria-label="Eligibility">
                <small>✦ Eligibility</small>
                <p>
                  {membershipValid ? "✓" : "✕"} Membership {membershipValid ? "valid" : member.membershipState}
                </p>
              </section>

              {/* The review: exactly what Confirm will save */}
              {steps && (
                <section className={styles.review} aria-label="Review changes">
                  <small>Review changes</small>
                  <ul>
                    {steps.map((step) => (
                      <li key={step.requestKey}>
                        <strong>
                          {step.done ? "✓ " : ""}
                          {step.label}
                        </strong>
                        {step.effect && <span>{step.effect}</span>}
                      </li>
                    ))}
                  </ul>
                  {programChanged && (
                    <label className={styles.field}>
                      Reason for the program change
                      <input value={reason} maxLength={200} onChange={(event) => setReason(event.target.value)} disabled={busy} />
                    </label>
                  )}
                </section>
              )}
            </>
          )}

          {mode === "ask" && (
            <label className={styles.field}>
              What should change?
              <textarea
                className={styles.request}
                value={request}
                maxLength={300}
                rows={4}
                placeholder={`Move ${member.name.split(" ")[0]} to Advanced and assign Master Kim.`}
                onChange={(event) => setRequest(event.target.value)}
                autoFocus
              />
              <small>The proposed edit shows every change and its effects before anything is saved.</small>
            </label>
          )}

          {message && (
            <p className={styles.message} role="status">
              {message}
            </p>
          )}
        </div>

        <footer className={styles.footer}>
          {mode === "form" && steps && (
            <>
              <button type="button" onClick={() => setSteps(null)} disabled={busy}>
                Back
              </button>
              <button
                type="button"
                className={styles.primary}
                onClick={confirm}
                disabled={busy || (programChanged && !reason.trim())}
              >
                {busy ? "Saving…" : "Confirm in Odoo"}
              </button>
            </>
          )}
          {mode === "form" && !steps && (
            <>
              <button type="button" onClick={onClose} disabled={busy}>
                Cancel
              </button>
              <button type="button" className={styles.primary} onClick={review} disabled={!canSave}>
                {busy ? "Checking…" : "Save changes"}
              </button>
              <button type="button" onClick={() => setMode("ask")} disabled={busy}>
                Ask AI to edit
              </button>
            </>
          )}
          {mode === "ask" && (
            <>
              <button type="button" onClick={() => setMode("form")}>
                Back
              </button>
              <button type="button" className={styles.primary} onClick={propose} disabled={!request.trim()}>
                Propose
              </button>
            </>
          )}
        </footer>
      </div>
    </>
  );
}
