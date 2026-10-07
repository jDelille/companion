import {
  buildCheckIn,
  type CheckInPayload,
  type CommandEnvelope,
  type RosterMember,
  type SessionOption,
} from "@/contracts/kiosk-attendance";

export type CheckInCommand = CommandEnvelope<CheckInPayload>;

// Builds the check-in command once, when Confirm is first tapped. The ids are
// fresh here and never again: a retry resends this exact command, same key,
// so the server can recognise it and return the original receipt instead of
// recording a second attendance.
//
// Returns null if Jodi's buildCheckIn rejects the inputs (bad ids or a student
// not registered for the session). That shouldn't happen with server data.
export function createCheckInCommand(
  session: SessionOption,
  member: RosterMember,
): CheckInCommand | null {
  const ids = {
    idempotencyKey: `kiosk-${crypto.randomUUID()}`,
    correlationId: `kiosk-${crypto.randomUUID()}`,
  };

  try {
    return buildCheckIn(session, member, ids);
  } catch {
    return null;
  }
}
