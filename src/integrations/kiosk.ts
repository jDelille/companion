import type {
  RecordId,
  RosterMember,
  SessionOption,
} from "@/contracts/kiosk-attendance";

// The only place kiosk screens get data from. Calls the /api/v2 routes,
// which are mocks for now and will be Jodi's real backend later.

// Today's sessions. The server decides what "today" means.
export async function getSessions(): Promise<SessionOption[]> {
  const response = await fetch("/api/v2/sessions", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Sessions request failed (${response.status})`);
  }
  return response.json();
}

// The students registered for one session. Screens must never list this as-is:
// it's only searched, so a public kiosk doesn't show everyone's names.
export async function getRoster(sessionId: RecordId): Promise<RosterMember[]> {
  const response = await fetch(
    `/api/v2/sessions/${encodeURIComponent(sessionId)}/roster`,
    {
      cache: "no-store",
    },
  );
  if (!response.ok) {
    throw new Error(`Roster request failed (${response.status})`);
  }
  return response.json();
}
