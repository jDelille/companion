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