import type { CheckIn, Member, MemberAttendance } from "@/domain/member";
import { mockMembers } from "./mock/members";
import { findSession, getMemberCheckIns, getRoster } from "./mock/kiosk-store";
import { todaysSessions } from "./mock/kiosk";

const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

// Use the same roster membership as the kiosk, never another member's story.
function withBookings(member: Member): Member {
  const bookings = todaysSessions()
    .filter((session) =>
      getRoster(session.sessionId)?.some((row) => row.memberId === member.id),
    )
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
    .map(({ sessionId, title, startsAt, endsAt }) => ({
      sessionId,
      title,
      startsAt,
      endsAt,
    }));
  return { ...member, bookings };
}

export async function getMembers(): Promise<Member[]> {
  if (DEMO) {
    return mockMembers.map(withBookings);
  }
  throw new Error("Odoo integration not implemented yet");
}

export async function getMember(id: string): Promise<Member | null> {
  if (DEMO) {
    const member = mockMembers.find((m) => m.id === id);
    return member ? withBookings(member) : null;
  }
  throw new Error("Odoo integration not implemented yet");
}

export async function searchMembers(query: string): Promise<Member[]> {
  if (DEMO) {
    const q = query.toLowerCase();
    return mockMembers
      .filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.memberNumber.toLowerCase().includes(q),
      )
      .map(withBookings);
  }
  throw new Error("Odoo integration not implemented yet");
}

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000; // ms

// PROVISIONAL: how many past check-ins the Attendance tab gets. No paging yet.
const HISTORY_LIMIT = 50;

// What Member360 shows about attendance. In demo mode it reads the same store
// the kiosk writes to, so a kiosk check-in shows up here on the next load.
// Later: Jodi's API (Odoo), once it has a per-member attendance read.
export async function getMemberAttendance(
  memberId: string,
): Promise<MemberAttendance> {
  if (DEMO) {
    const receipts = getMemberCheckIns(memberId); // newest first

    const sevenDaysAgo = Date.now() - SEVEN_DAYS;
    const recent = receipts.filter(
      (receipt) => Date.parse(receipt.checkedInAt) >= sevenDaysAgo,
    );

    const history: CheckIn[] = receipts
      .slice(0, HISTORY_LIMIT)
      .map((receipt) => {
        const session = findSession(receipt.sessionId);
        return {
          sessionTitle: session ? session.title : "Class",
          checkedInAt: receipt.checkedInAt,
          late: receipt.status === "late",
        };
      });
    const latest = history.length > 0 ? history[0] : null;

    return { latest, lastSevenDays: recent.length, history };
  }
  throw new Error("Odoo integration not implemented yet");
}
