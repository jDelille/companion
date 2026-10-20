"use client";

import { useEffect, useRef, useState } from "react";
import { explainHubError } from "@/domain/hub-actions";
import { callHub } from "@/components/people/member-360/edit-leaf/memberEdits";
import type { RunReceipt, RunState, RunStep } from "@/components/shell/rail/companion-rail/pageRun";
import {
  eligibleCandidates,
  matchTestingAudience,
  type Audience,
  type BroadcastContext,
  type TestingEligibility,
} from "./contractRules";

// The testing-invitation plan, run step by step (doc 45) with one Hub call per step.
// Steps before approval only read, so Pause and Stop never leave half a write.
// Approval saves one Odoo broadcast awaiting approval (one request key per run, so a retry
// never saves twice), then the receipt (doc 46) reports what Odoo did. Nothing is sent.

// What staff chose in Edit. audienceId null = the school's testing audience, if Odoo has one.
export type InvitationSettings = {
  audienceId: string | null;
  channel: string;
  purpose: string;
  message: string;
};

export type BroadcastPreview = {
  audience: string;
  recipientCount: number;
  excludedCounts: Record<string, number>;
  reviewToken: string;
};

const STOPPED = "RUN_STOPPED";

function firstSteps(): RunStep[] {
  return [
    { label: "Loading members", status: "running" },
    { label: "Checking rank requirements", status: "pending" },
    { label: "Identifying candidates", status: "pending" },
    { label: "Evaluation gaps", status: "pending" },
    { label: "Belt inventory", status: "pending" },
    { label: "Preparing invitations", status: "pending" },
    { label: "Waiting approval", status: "pending" },
  ];
}

// The audience the invitation goes to: staff's choice, else the matched testing audience
function chosenAudience(settings: InvitationSettings, messaging: BroadcastContext | null): Audience | null {
  if (!messaging) return null;
  const id = settings.audienceId ?? matchTestingAudience(messaging.audiences)?.id;
  return messaging.audiences.find((audience) => audience.id === id) ?? null;
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export function useInvitationRun(enabled: boolean, goal: string, settings: InvitationSettings) {
  const [attempt, setAttempt] = useState(0); // Start again = a new run
  const [steps, setSteps] = useState<RunStep[]>(firstSteps);
  const [state, setState] = useState<RunState>("running");
  const [error, setError] = useState("");
  const [eligibility, setEligibility] = useState<TestingEligibility | null>(null);
  const [broadcasts, setBroadcasts] = useState<BroadcastContext | null>(null);
  const [preview, setPreview] = useState<BroadcastPreview | null>(null);
  const [receipt, setReceipt] = useState<RunReceipt | null>(null);

  const audience = chosenAudience(settings, broadcasts);
  const ready = audience !== null && settings.message.trim() !== "";

  // The latest settings and audience, for the steps that run later
  const settingsRef = useRef({ settings, audience });
  useEffect(() => {
    settingsRef.current = { settings, audience };
  });

  // What the running plan is waiting on: resuming, the staff's inputs, or approval
  const control = useRef({
    paused: false,
    stopped: false,
    waiting: false, // waiting on staff (inputs or approval), so Resume goes back to waiting
    onResume: null as null | (() => void),
    onInputs: null as null | (() => void),
    onApprove: null as null | (() => void),
  });

  // The plan waits at "Preparing invitations" until an audience and a message are set
  useEffect(() => {
    if (control.current.onInputs && ready) {
      const go = control.current.onInputs;
      control.current.onInputs = null;
      go();
    }
  }, [ready]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const run = control.current;
    run.paused = false;
    run.stopped = false;
    run.waiting = false;
    const requestKey = crypto.randomUUID();

    const update = (index: number, patch: Partial<RunStep>) =>
      setSteps((previous) => previous.map((step, at) => (at === index ? { ...step, ...patch } : step)));

    // After every Hub call: an old run (after Start again or leaving the page) stops here,
    // so it never writes over the new one's screen
    const alive = () => {
      if (cancelled) throw Error(STOPPED);
    };

    // Between steps: stop here if stopped, wait here if paused
    const checkpoint = async () => {
      if (run.stopped || cancelled) throw Error(STOPPED);
      if (run.paused) await new Promise<void>((resolve) => (run.onResume = resolve));
      if (run.stopped || cancelled) throw Error(STOPPED);
    };

    let at = 0; // the step running now, to mark it if something fails
    async function runPlan() {
      const context = await callHub("context", {}, null);
      alive();
      const memberCount = Array.isArray(context.members) ? context.members.length : 0;
      update(0, { label: `Loaded ${plural(memberCount, "member", "members")}`, status: "done" });
      await checkpoint();

      at = 1;
      update(1, { status: "running" });
      const testing: TestingEligibility = await callHub("testing_eligibility", { query: "" }, null);
      alive();
      setEligibility(testing);
      update(1, { label: "Checked rank requirements", status: "done" });
      await checkpoint();

      at = 2;
      const candidates = eligibleCandidates(testing).length;
      update(2, { label: `Identified ${plural(candidates, "candidate", "candidates")}`, status: "done" });
      // Odoo has no data for these two yet; they're shown, not faked
      update(3, { status: "skipped", detail: "Not in Odoo yet" });
      update(4, { status: "skipped", detail: "Not in Odoo yet" });
      await checkpoint();

      at = 5;
      update(5, { status: "running" });
      const messaging: BroadcastContext = await callHub("broadcast_context", {}, null);
      alive();
      setBroadcasts(messaging);
      // Ready once staff have written the message and an audience is chosen (or matched)
      const hasInputs = () => {
        const latest = settingsRef.current;
        return latest.settings.message.trim() !== "" && chosenAudience(latest.settings, messaging) !== null;
      };
      if (!hasInputs()) {
        update(5, { status: "waiting", detail: "Choose an audience and write the message in Edit" });
        setState("waiting");
        run.waiting = true;
        await new Promise<void>((resolve) => (run.onInputs = resolve));
        run.waiting = false;
        await checkpoint();
        setState("running");
        update(5, { status: "running", detail: undefined });
      }
      const chosen = settingsRef.current.settings;
      const chosenAudienceId = chosenAudience(chosen, messaging)?.id;
      const prepared: BroadcastPreview = await callHub(
        "broadcast_preview",
        { channel: chosen.channel, purpose: chosen.purpose, audience: chosenAudienceId, body: chosen.message.trim() },
        null,
      );
      alive();
      setPreview(prepared);
      const excluded = Object.values(prepared.excludedCounts ?? {}).reduce((total, count) => total + count, 0);
      update(5, {
        label: `Prepared invitations for ${plural(prepared.recipientCount, "recipient", "recipients")}`,
        status: "done",
        detail: excluded ? `${excluded} excluded (consent or missing contact)` : undefined,
      });
      await checkpoint();

      at = 6;
      update(6, { status: "waiting", detail: "Approve on the contract to save the invitation" });
      setState("waiting");
      run.waiting = true;
      await new Promise<void>((resolve) => (run.onApprove = resolve));
      run.waiting = false;
      await checkpoint();
      setState("running");
      update(6, { label: "Saving for approval", status: "running", detail: undefined });

      // One write. A dropped connection is retried once with the same request key.
      const payload = {
        channel: chosen.channel,
        purpose: chosen.purpose,
        audience: chosenAudienceId,
        body: chosen.message.trim(),
        name: goal.slice(0, 120),
        reason: `Action contract: “${goal}”`,
        reviewToken: prepared.reviewToken,
      };
      let saved: { broadcastId?: string; messageSent?: boolean };
      try {
        saved = await callHub("create_broadcast", payload, requestKey);
      } catch (problem) {
        if (!(problem instanceof TypeError)) throw problem;
        saved = await callHub("create_broadcast", payload, requestKey);
      }
      alive();
      update(6, { label: "Saved for approval", status: "done" });

      const lines: RunReceipt["lines"] = [
        { ok: true, text: `${plural(prepared.recipientCount, "recipient", "recipients")} saved for approval (${chosen.channel.toUpperCase()})` },
      ];
      for (const [reason, count] of Object.entries(prepared.excludedCounts ?? {})) {
        if (count) lines.push({ ok: true, text: `${count} excluded: ${reason.replaceAll("_", " ")}` });
      }
      lines.push({ ok: saved.messageSent === false, text: saved.messageSent === false ? "0 messages sent (sending needs its own approval)" : "Message status unknown" });
      lines.push({ ok: false, text: "Instructor tasks: not connected to Odoo yet" });
      lines.push({ ok: true, text: "0 rank changes" });
      lines.push({ ok: true, text: "0 charges" });
      setReceipt({
        title: "Testing invitations",
        lines,
        auditId: `Broadcast ${saved.broadcastId ?? "?"} · request ${requestKey.slice(0, 8)}`,
        detailsHref: "/hub?view=communications",
      });
      setState("done");
    }

    runPlan().catch((problem: Error) => {
      if (cancelled) return;
      if (problem.message === STOPPED) {
        setState("stopped");
        return;
      }
      update(at, { status: "failed" });
      setError(explainHubError(problem.message));
      setState("failed");
    });

    return () => {
      cancelled = true;
      run.stopped = true;
      run.onResume?.();
      run.onInputs?.();
      run.onApprove?.();
    };
  }, [enabled, goal, attempt]);

  // Stop: wake anything waiting so the plan reaches its next checkpoint and ends there
  const stop = () => {
    const run = control.current;
    run.stopped = true;
    setState("stopped");
    for (const wake of [run.onResume, run.onInputs, run.onApprove]) wake?.();
    run.onResume = run.onInputs = run.onApprove = null;
  };

  return {
    audience,
    steps,
    state,
    error,
    eligibility,
    broadcasts,
    preview,
    receipt,
    pause: () => {
      control.current.paused = true;
      setState("paused");
    },
    resume: () => {
      const run = control.current;
      run.paused = false;
      setState(run.waiting ? "waiting" : "running");
      const wake = run.onResume;
      run.onResume = null;
      wake?.();
    },
    stop,
    approve: () => {
      const wake = control.current.onApprove;
      control.current.onApprove = null;
      wake?.();
    },
    // Start again from the first step, with a new request key
    restart: () => {
      setSteps(firstSteps());
      setState("running");
      setError("");
      setPreview(null);
      setReceipt(null);
      setAttempt((count) => count + 1);
    },
  };
}
