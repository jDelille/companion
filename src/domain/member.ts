export type MembershipState = "lead" | "trial" | "active" | "paused" | "cancelled";

export type Rank = {
  name: string;      // "Blue Belt"
  stripes: number;   // stripes on the current belt
};

export type Member = {
  tenantId: string;            // which school; every entity carries this, per the doc
  id: string;
  memberNumber: string;
  name: string;
  membershipState: MembershipState;
  rank: Rank;
  householdName?: string;      // "Chen Family"
  nextClass?: string;          // "5:45 PM", computed from sessions later
  testReadiness?: number;      // 0–100, computed from belt tests later
  attendanceRate: number;      // 0–1
};

// One attended class, as Member360 shows it
export type CheckIn = {
  sessionTitle: string;        // "Children Advanced"
  checkedInAt: string;         // ISO time; the browser formats it
  late: boolean;
};

// PROVISIONAL: what Member360 knows about attendance until Jodi's API has a
// per-member read. No attendance % on purpose: nobody has defined it yet.
export type MemberAttendance = {
  latest: CheckIn | null;      // null = no check-ins yet
  lastSevenDays: number;       // rolling 7 days, so it doesn't depend on a time zone
};
