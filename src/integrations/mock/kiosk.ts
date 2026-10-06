import type {
  RecordId,
  RosterMember,
  SessionOption,
} from "@/contracts/kiosk-attendance";

// Fake data for the kiosk, using Jodi's contract types.
// Kept separate from the companion's mockMembers since those don't fit the contract.

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
    capacity: 24,
  },
  {
    sessionId: "103",
    title: "Adult Taekwondo",
    startTime: "18:30",
    endTime: "19:30",
    version: 2,
    capacity: 20,
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
