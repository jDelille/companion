// The member edits Odoo can save today, shared by the quick-edit leaf and the
// Proposed edit page. Read and written with the staff member's own Odoo sign-in.
//   Name    → update_member
//   Program → the member's course: course_assignment_preview, then assign_course_members
// Every write is previewed first and keeps one request key, so a retry never saves twice.

import { runHubAction } from "@/domain/hub-actions";
import type { ProgramOption } from "./proposeEdit";

export type EditWorkspace = {
  member: { id: string; name: string; version: number; partnerVersion: number };
  canEditContact: boolean;
  courses?: { id: string; name: string }[];
};

type Preview = {
  reviewToken: string | null;
  version: number;
  valid: boolean;
  add: { memberId: string; futureBookings: number }[];
  remove: { memberId: string; cancelledBookings: number }[];
};

// One write, ready to confirm
export type EditStep = {
  label: string; // "Name: Maya Chen → Maya Lin"
  effect?: string; // "3 upcoming classes booked"
  booked?: number; // for the Schedule evidence
  cancelled?: number;
  operation: string;
  payload: Record<string, unknown>;
  requestKey: string;
  done: boolean;
};

export async function callHub(operation: string, payload: Record<string, unknown>, requestKey: string | null) {
  const response = await fetch("/api/hub", {
    method: "POST",
    cache: "no-store",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ operation, payload, requestKey }),
  });
  const value = await response.json();
  if (!response.ok) throw Error(value.error?.code || "CONNECTION_UNAVAILABLE");
  return value;
}

export function loadEditWorkspace(memberId: string): Promise<EditWorkspace> {
  return callHub("member_workspace", { memberId }, null);
}

// The school's courses (the program choices). Empty without course access.
export async function loadPrograms(): Promise<ProgramOption[]> {
  try {
    const value = await callHub("course_roster", { templateId: "" }, null);
    return Array.isArray(value.templates) ? value.templates : [];
  } catch {
    return [];
  }
}

// The writes for a name and/or program change, with Odoo's preview of each program step.
// Throws (with the Hub's error code) when Odoo won't allow the change.
export async function prepareSteps(
  memberId: string,
  workspace: EditWorkspace,
  programs: ProgramOption[],
  newName: string | null,
  newProgramId: string | null,
): Promise<EditStep[]> {
  const steps: EditStep[] = [];
  const currentCourse = workspace.courses?.[0] ?? null;

  if (newName) {
    steps.push({
      label: `Name: ${workspace.member.name} → ${newName}`,
      operation: "update_member",
      payload: {
        memberId,
        expectedVersion: workspace.member.version,
        expectedPartnerVersion: workspace.member.partnerVersion,
        changes: { name: newName },
      },
      requestKey: crypto.randomUUID(),
      done: false,
    });
  }

  if (newProgramId) {
    const newProgram = programs.find((program) => program.id === newProgramId);
    // Join the new course first, so a failure never leaves them with no program
    const joinPreview: Preview = await callHub(
      "course_assignment_preview",
      { templateId: newProgramId, addMemberIds: [memberId], removeMemberIds: [] },
      null,
    );
    if (!joinPreview.reviewToken || !joinPreview.valid) throw Error("COURSE_CHANGE_NOT_ALLOWED");
    const booked = joinPreview.add[0]?.futureBookings ?? 0;
    steps.push({
      label: `Program: join ${newProgram?.name ?? "the new course"}`,
      effect: `${booked} upcoming ${booked === 1 ? "class" : "classes"} booked`,
      booked,
      operation: "assign_course_members",
      payload: {
        templateId: newProgramId,
        expectedVersion: joinPreview.version,
        addMemberIds: [memberId],
        removeMemberIds: [],
        reviewToken: joinPreview.reviewToken,
      },
      requestKey: crypto.randomUUID(),
      done: false,
    });

    if (currentCourse) {
      const leavePreview: Preview = await callHub(
        "course_assignment_preview",
        { templateId: currentCourse.id, addMemberIds: [], removeMemberIds: [memberId] },
        null,
      );
      if (!leavePreview.reviewToken || !leavePreview.valid) throw Error("COURSE_CHANGE_NOT_ALLOWED");
      const cancelled = leavePreview.remove[0]?.cancelledBookings ?? 0;
      steps.push({
        label: `Program: leave ${currentCourse.name}`,
        effect: `${cancelled} upcoming ${cancelled === 1 ? "booking" : "bookings"} cancelled`,
        cancelled,
        operation: "assign_course_members",
        payload: {
          templateId: currentCourse.id,
          expectedVersion: leavePreview.version,
          addMemberIds: [],
          removeMemberIds: [memberId],
          reviewToken: leavePreview.reviewToken,
        },
        requestKey: crypto.randomUUID(),
        done: false,
      });
    }
  }
  return steps;
}

export type RunResult = { ok: boolean; steps: EditStep[]; message: string };

// Run each step in order; stops at the first that doesn't succeed. Steps already done are
// skipped, so running the same list again retries only what's left (same request keys).
export async function runSteps(
  steps: EditStep[],
  reason: string,
  onProgress: (steps: EditStep[]) => void,
): Promise<RunResult> {
  let progress = steps;
  const results: string[] = [];
  for (const step of steps) {
    if (step.done) continue;
    const payload = step.operation === "assign_course_members" ? { ...step.payload, reason } : step.payload;
    const feedback = await runHubAction(
      () => callHub(step.operation, payload, step.requestKey),
      async () => {},
      () => {},
    );
    if (feedback.kind !== "success") return { ok: false, steps: progress, message: feedback.text };
    progress = progress.map((item) => (item.requestKey === step.requestKey ? { ...item, done: true } : item));
    onProgress(progress);
    results.push(feedback.text);
  }
  return { ok: true, steps: progress, message: results.join(" ") };
}
