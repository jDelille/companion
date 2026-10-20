// Action contract (doc: "✦ ACTION CONTRACT"): what Do For Me will and won't do for a goal,
// built only from Odoo records. The one kind of goal it understands so far is inviting
// belt-testing candidates. Matching the goal is keyword matching, not a language model.

export type TestingCandidate = { memberId: string; name: string; status: string; nextRank: { name: string } | null };
export type TestEvent = { id: string; name: string; date: string; state: string; count: number };
export type TestingEligibility = { rows: TestingCandidate[]; tests: TestEvent[] };

export type Audience = { id: string; label: string };
export type BroadcastSummary = { id: string; name: string; state: string };
export type BroadcastContext = { audiences: Audience[]; broadcasts: BroadcastSummary[]; provider: string };

export type ContractKind = "testing_invitations";

// "Invite September testing candidates" → testing invitations
export function recognizeGoal(goal: string): ContractKind | null {
  const text = goal.toLowerCase();
  if (/invit/.test(text) && /test/.test(text)) return "testing_invitations";
  return null;
}

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

// The test the goal names: a month ("September") matched against each test's date or name.
// With no month, the only test there is. Otherwise none (staff choose one in Edit).
export function matchTest(goal: string, tests: TestEvent[]): TestEvent | null {
  const text = goal.toLowerCase();
  const month = MONTHS.findIndex((name) => text.includes(name));
  if (month >= 0) {
    const matches = tests.filter((test) => {
      const sameMonth = new Date(`${test.date}T12:00:00`).getMonth() === month;
      return sameMonth || test.name.toLowerCase().includes(MONTHS[month]);
    });
    return matches.length === 1 ? matches[0] : null;
  }
  return tests.length === 1 ? tests[0] : null;
}

// The Odoo broadcast audience for testing candidates, if the school has one
// (its name mentions testing). Two possibilities = no guess.
export function matchTestingAudience(audiences: Audience[]): Audience | null {
  const matches = audiences.filter((audience) => /test/i.test(`${audience.id} ${audience.label}`));
  return matches.length === 1 ? matches[0] : null;
}

export function eligibleCandidates(eligibility: TestingEligibility): TestingCandidate[] {
  return eligibility.rows.filter((row) => row.status === "eligible");
}
