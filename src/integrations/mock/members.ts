import type { Member } from "@/domain/member";

const TENANT = "demo-downtown";

// The one list of people for both the Companion and the kiosk. Ids are numeric
// because Jodi's contract only accepts Odoo-style record ids (buildCheckIn checks).
// 5xxx so they don't clash with the kiosk-only students (1xxx-3xxx).
// The kiosk rosters in ./kiosk.ts are built from this list.

export const mockMembers: Member[] = [
  {
    tenantId: TENANT,
    id: "5001",
    memberNumber: "D-1042",
    name: "Maya Chen",
    membershipState: "active",
    rank: { name: "Blue Belt", stripes: 2 },
    householdName: "Chen Family",
    nextClass: "5:45 PM",
    testReadiness: 92,
    attendanceRate: 0.88,
  },
  {
    tenantId: TENANT,
    id: "5002",
    memberNumber: "D-1043",
    name: "Alex Rivera",
    membershipState: "active",
    rank: { name: "Orange Belt", stripes: 1 },
    householdName: "Rivera Family",
    nextClass: "5:00 PM",
    testReadiness: 64,
    attendanceRate: 0.72,
  },
  {
    tenantId: TENANT,
    id: "5003",
    memberNumber: "D-1044",
    name: "Jordan Parker",
    membershipState: "trial",
    rank: { name: "White Belt", stripes: 0 },
    nextClass: "4:15 PM",
    attendanceRate: 1,
  },
  {
    tenantId: TENANT,
    id: "5004",
    memberNumber: "D-1045",
    name: "Lena Soto",
    membershipState: "active",
    rank: { name: "Green Belt", stripes: 3 },
    nextClass: "6:30 PM",
    testReadiness: 78,
    attendanceRate: 0.81,
  },
  {
    tenantId: TENANT,
    id: "5005",
    memberNumber: "D-1046",
    name: "Theo Nguyen",
    membershipState: "paused",
    rank: { name: "Yellow Belt", stripes: 2 },
    householdName: "Nguyen Family",
    attendanceRate: 0.35,
  },
  {
    tenantId: TENANT,
    id: "5006",
    memberNumber: "D-1047",
    name: "Sam Kim",
    membershipState: "active",
    rank: { name: "Purple Belt", stripes: 0 },
    nextClass: "6:30 PM",
    testReadiness: 40,
    attendanceRate: 0.9,
  },
  {
    tenantId: TENANT,
    id: "5007",
    memberNumber: "D-1048",
    name: "Riley Lee",
    membershipState: "lead",
    rank: { name: "White Belt", stripes: 0 },
    attendanceRate: 0,
  },
  {
    tenantId: TENANT,
    id: "5008",
    memberNumber: "D-1049",
    name: "Casey Chen",
    membershipState: "cancelled",
    rank: { name: "Yellow Belt", stripes: 1 },
    householdName: "Chen Family",
    attendanceRate: 0.12,
  },
];