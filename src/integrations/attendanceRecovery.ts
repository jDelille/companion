import { AttendanceOutbox, type QueueContext } from "../domain/kiosk/attendanceOutbox";
import type { CommandEnvelope, CheckInPayload } from "../contracts/kiosk-attendance";

type Command = CommandEnvelope<CheckInPayload>;
let context: QueueContext | undefined;
let box: AttendanceOutbox | undefined;
let drainBusy = false;
let message = "";
const listeners = new Set<(message: string) => void>();
const notify = (text: string) => { message = text; listeners.forEach(fn => fn(text)); };
const locked = async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
  if (typeof navigator === "undefined" || !navigator.locks) return undefined;
  return navigator.locks.request("dojang-attendance-outbox", fn);
};
const summary = () => {
  if (!box) return;
  const counts = box.summary(context);
  notify(counts.review ? `${counts.review} unconfirmed request(s) need staff review. Do not assume attendance was recorded.` : counts.pending ? `${counts.pending} attendance request(s) saved on this device, not yet confirmed by Odoo.` : "");
};

async function refreshContext() {
  const response = await fetch("/api/v2/kiosk/recovery", {cache: "no-store", credentials: "same-origin", signal: AbortSignal.timeout(5000)});
  if (!response.ok) throw new Error("Recovery unavailable");
  const data = await response.json();
  if (!/^[a-f0-9]{64}$/.test(data.scope) || !/^[a-f0-9]{64}$/.test(data.key) || !Number.isSafeInteger(data.expiresAt)) throw new Error("Recovery unavailable");
  context = data;
  box ||= new AttendanceOutbox(window.localStorage, window.crypto);
}

export async function saveUnconfirmedAttendance(command: Command) {
  if (!context || !box) return;
  try {
    const saved = await locked(async () => box!.enqueue(command, context!));
    if (saved) summary();
    else notify("Attendance is not confirmed and could not be saved on this device. Please retry or contact staff.");
  } catch { notify("Attendance is not confirmed. Device storage is unavailable. Please contact staff."); }
}

export async function clearConfirmedAttendance(command: Command) {
  if (!context || !box) return;
  try { await locked(async () => box!.acknowledge(command, context!)); summary(); } catch { /* Server receipt remains authoritative. */ }
}

export async function reconcileAttendance() {
  if (drainBusy || !navigator.onLine) return;
  drainBusy = true;
  try {
    await refreshContext();
    await locked(async () => {
      for (const entry of await box!.pending(context!)) {
        let response: Response;
        try {
          response = await fetch("/api/v2/attendance/check-ins", {method: "POST", credentials: "same-origin", headers: {"content-type": "application/json"}, body: JSON.stringify(entry.command), signal: AbortSignal.timeout(12000)});
        } catch { break; }
        const data = await response.json().catch(() => null);
        const receipt = data?.receipt;
        if (response.ok && typeof receipt?.attendanceId === "string" && /^[1-9][0-9]*$/.test(receipt.attendanceId) && receipt.memberId === entry.command.payload.memberId && receipt.sessionId === entry.command.payload.sessionId && data.correlationId === entry.command.correlationId && ["present", "late"].includes(receipt.status) && typeof receipt.checkedInAt === "string" && Number.isFinite(Date.parse(receipt.checkedInAt))) {
          await box!.acknowledge(entry.command, context!);
        } else if (response.status >= 400 && response.status < 500 && !["CONCURRENT_RETRY", "FORBIDDEN"].includes(data?.code)) {
          box!.review(entry.entryId, context!);
        } else break;
      }
    });
    summary();
  } catch { if (box) summary(); }
  finally { drainBusy = false; }
}

export function startAttendanceRecovery(onMessage: (message: string) => void) {
  listeners.add(onMessage);
  // Only a paired Odoo test device receives recovery material. Mock pages do not.
  void reconcileAttendance();
  const online = () => { void reconcileAttendance(); };
  window.addEventListener("online", online);
  const timer = window.setInterval(online, 15000);
  if (message) queueMicrotask(() => onMessage(message));
  return () => { listeners.delete(onMessage); window.removeEventListener("online", online); window.clearInterval(timer); };
}
