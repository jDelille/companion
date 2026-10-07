import type {
  AttendanceReceipt,
  RecordId,
  RosterMember,
  SessionOption,
} from "@/contracts/kiosk-attendance";
import { rosterSeeds, todaysSessions } from "./kiosk";

// Basically the mock kiosk API's database. It's just in memory, so restarting the server resets it.

type AttendanceState = RosterMember["attendanceState"];

// What an idempotency key was first used for, so we can tell if it gets reused
export type UsedKey = {
  checkIn: string; // "sessionId:memberId"
  receipt: AttendanceReceipt;
};

type KioskStore = {
  attendance: Map<string, AttendanceState>; // "sessionId:memberId" -> state
  receipts: Map<string, AttendanceReceipt>; // "sessionId:memberId" -> check-in receipt
  usedKeys: Map<string, UsedKey>; // idempotencyKey -> first successful result
  nextAttendanceId: number;
};

// Key for one student in one session, like "102:2003"
export const checkInKey = (sessionId: RecordId, memberId: RecordId) => {
  return `${sessionId}:${memberId}`;
};

function createStore(): KioskStore {
  const store: KioskStore = {
    attendance: new Map(),
    receipts: new Map(),
    usedKeys: new Map(),
    nextAttendanceId: 9001,
  };
  const seededAt = new Date().toISOString(); // so seeded check-ins are never in the future

  for (const sessionId of Object.keys(rosterSeeds)) {
    for (const member of rosterSeeds[sessionId]) {
      const key = checkInKey(sessionId, member.memberId);
      store.attendance.set(key, member.attendanceState);

      // Anyone seeded as present needs a receipt for the "already checked in" case
      if (member.attendanceState === "present") {
        store.receipts.set(key, {
          attendanceId: String(store.nextAttendanceId),
          memberId: member.memberId,
          sessionId,
          checkedInAt: seededAt,
          status: "present",
          alreadyRecorded: false,
          correlationId: `seed-front-desk-${member.memberId}`,
        });
        store.nextAttendanceId += 1;
      }
    }
  }
  return store;
}

// Stored on globalThis so hot reload doesn't wipe it and all the routes share it
const serverMemory = globalThis as typeof globalThis & {
  kioskStore?: KioskStore;
};

export function getStore(): KioskStore {
  if (!serverMemory.kioskStore) {
    serverMemory.kioskStore = createStore();
  }
  return serverMemory.kioskStore;
}

export function resetStore() {
  serverMemory.kioskStore = createStore();
}

export function findSession(sessionId: RecordId): SessionOption | undefined {
  return todaysSessions().find((session) => session.sessionId === sessionId);
}

// Every check-in receipt for one member, newest first. Member360 reads this,
// so a kiosk check-in shows up there straight away.
export function getMemberCheckIns(memberId: RecordId): AttendanceReceipt[] {
  const { receipts } = getStore();
  const checkIns: AttendanceReceipt[] = [];
  for (const receipt of receipts.values()) {
    if (receipt.memberId === memberId) {
      checkIns.push(receipt);
    }
  }
  return checkIns.sort(
    (first, second) => Date.parse(second.checkedInAt) - Date.parse(first.checkedInAt),
  );
}

// Roster with current attendance. undefined if the session doesn't exist
export function getRoster(sessionId: RecordId): RosterMember[] | undefined {
  const roster = rosterSeeds[sessionId];
  if (!roster) return undefined;

  const { attendance } = getStore();
  return roster.map((member) => ({
    ...member,
    attendanceState:
      attendance.get(checkInKey(sessionId, member.memberId)) ??
      member.attendanceState,
  }));
}
