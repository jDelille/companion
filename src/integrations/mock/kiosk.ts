import type {
  RecordId,
  RosterMember,
  SessionOption,
} from "@/contracts/kiosk-attendance";
import { mockMembers } from "./members";

// Fake data for the kiosk, using Jodi's contract types.
// Companion members (./members.ts) are on these rosters too, so a kiosk
// check-in shows up on their Member360. The other students are kiosk-only.

type SessionSeed = {
  sessionId: RecordId;
  title: string;
  startTime: string; // "16:00", server's local time
  endTime: string;
  version: number;
  capacity: number;
};

const sessionSeeds: SessionSeed[] = [
  {
    sessionId: "101",
    title: "Little Dragons",
    startTime: "16:00",
    endTime: "16:45",
    version: 1,
    capacity: 12,
  },
  {
    sessionId: "102",
    title: "Junior Taekwondo",
    startTime: "17:00",
    endTime: "18:00",
    version: 3,
    capacity: 25, // one under full, now that Alex is on it too
  },
  {
    sessionId: "103",
    title: "Adult Taekwondo",
    startTime: "18:30",
    endTime: "19:30",
    version: 2,
    capacity: 20,
  },
  // Maya's class in the Companion story ("Master Kim's 5:45 Children Advanced")
  {
    sessionId: "104",
    title: "Children Advanced",
    startTime: "17:45",
    endTime: "18:45",
    version: 1,
    capacity: 16,
  },
];

const student = (
  memberId: RecordId,
  displayName: string,
  attendanceState: RosterMember["attendanceState"] = "pending",
): RosterMember => {
  return {
    memberId,
    displayName,
    enrollmentStatus: "registered",
    attendanceState,
  };
};

// "Maya Chen" -> "Maya C.", the minimum a public kiosk shows
const shortName = (fullName: string) => {
  const parts = fullName.split(" ");
  const firstName = parts[0];
  const lastName = parts[parts.length - 1];
  if (parts.length < 2) return firstName;
  return `${firstName} ${lastName[0]}.`;
};

// A Companion member on a roster, looked up by id so there's only one copy of them
const companionStudent = (memberId: RecordId): RosterMember => {
  const member = mockMembers.find((candidate) => candidate.id === memberId);
  if (!member) {
    throw new Error(`No Companion member ${memberId} in members.ts`);
  }
  return student(member.id, shortName(member.name));
};

// Jamie is on both 101 and 103 so we can check rosters really are per session
const jamie = student("3001", "Jamie H.");

export const rosterSeeds: Record<RecordId, RosterMember[]> = {
  "101": [
    student("1001", "Eli B."),
    student("1002", "Ivy C."),
    student("1003", "Kai D."),
    student("1004", "Ruby F."),
    student("1005", "Max G."),
    student("1006", "Rosa H."),
    jamie,
    companionStudent("5003"), // Jordan Parker, trial
  ],
  // Almost full, and has all the edge cases
  "102": [
    student("2001", "Ava M."),
    student("2002", "Ava N."), // close to Ava M.
    student("2003", "Leo P.", "present"), // already checked in
    student("2004", "Mia R.", "excused"),
    student("2005", "Noah S.", "absent"),
    student("2006", "Zoe T."), // not eligible (see ineligibleMemberIds)
    student("2007", "Ben A."),
    student("2008", "Chloe B."),
    student("2009", "Dylan C."),
    student("2010", "Emma D."),
    student("2011", "Finn E."),
    student("2012", "Grace F."),
    student("2013", "Hugo G."),
    student("2014", "Isla H."),
    student("2015", "Jack J."),
    student("2016", "Lily K."),
    student("2017", "Mason L."),
    student("2018", "Nora M."),
    student("2019", "Owen O."),
    student("2020", "Piper Q."),
    student("2021", "Ryan R."),
    student("2022", "Sofia V."),
    student("2023", "Theo W."),
    companionStudent("5002"), // Alex Rivera
  ],
  "103": [
    jamie,
    student("3002", "Alicia P."),
    student("3003", "Ben K."),
    student("3004", "Carmen L."),
    student("3005", "Daniel O."),
    student("3006", "Erin S."),
    student("3007", "Felix T."),
    student("3008", "Hana Y."),
    student("3009", "Marco Z."),
    companionStudent("5004"), // Lena Soto
    companionStudent("5006"), // Sam Kim
  ],
  "104": [
    companionStudent("5001"), // Maya Chen
  ],
};

// Eligibility isn't in the contract, so this stays server side and never goes to the browser
export const ineligibleMemberIds = ["2006"];

// "17:00" -> today at 5pm as an ISO string
const todayAt = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
};

// Rebuilt every request so the dates are always today
export function todaysSessions(): SessionOption[] {
  return sessionSeeds.map((seed) => ({
    sessionId: seed.sessionId,
    title: seed.title,
    startsAt: todayAt(seed.startTime),
    endsAt: todayAt(seed.endTime),
    version: seed.version,
    capacity: seed.capacity,
    seatsTaken: rosterSeeds[seed.sessionId].length,
  }));
}
