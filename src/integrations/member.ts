import type { CheckIn, Member, MemberAttendance } from "@/domain/member";
import { mockMembers } from "./mock/members";
import { findSession, getMemberCheckIns } from "./mock/kiosk-store";

const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

// Simulate network time so the UI is built for real loading states
const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getMembers(): Promise<Member[]> {
  if (DEMO) {
    await delay();
    return mockMembers;
  }
  throw new Error("Odoo integration not implemented yet");
}

export async function getMember(id: string): Promise<Member | null> {
  if (DEMO) {
    await delay();
    return mockMembers.find((m) => m.id === id) ?? null;
  }
  throw new Error("Odoo integration not implemented yet");
}

export async function searchMembers(query: string): Promise<Member[]> {
  if (DEMO) {
    await delay(150);
    const q = query.toLowerCase();
    return mockMembers.filter(
      (m) => m.name.toLowerCase().includes(q) || m.memberNumber.toLowerCase().includes(q),
    );
  }
  throw new Error("Odoo integration not implemented yet");
}

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000; // ms

// What Member360 shows about attendance. In demo mode it reads the same store
// the kiosk writes to, so a kiosk check-in shows up here on the next load.
// Later: Jodi's API (Odoo), once it has a per-member attendance read.
export async function getMemberAttendance(memberId: string): Promise<MemberAttendance> {
  if (DEMO) {
    await delay(150);
    const receipts = getMemberCheckIns(memberId); // newest first

    const sevenDaysAgo = Date.now() - SEVEN_DAYS;
    const recent = receipts.filter(
      (receipt) => Date.parse(receipt.checkedInAt) >= sevenDaysAgo,
    );

    let latest: CheckIn | null = null;
    if (receipts.length > 0) {
      const newest = receipts[0];
      const session = findSession(newest.sessionId);
      latest = {
        sessionTitle: session ? session.title : "Class",
        checkedInAt: newest.checkedInAt,
        late: newest.status === "late",
      };
    }

    return { latest, lastSevenDays: recent.length };
  }
  throw new Error("Odoo integration not implemented yet");
}
