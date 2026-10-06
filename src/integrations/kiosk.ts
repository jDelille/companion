import type { SessionOption } from "@/contracts/kiosk-attendance";

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
