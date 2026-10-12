import type { SessionOption } from "@/contracts/kiosk-attendance";
import { getCompanionContext } from "./companion";

// Staff devices have their own authenticated scope. A kiosk cookie is neither
// required nor borrowed to populate the staff workspace.
export async function getStaffSessions(
  signal?: AbortSignal,
): Promise<SessionOption[]> {
  const result = await getCompanionContext("/ops", signal);
  if (result.outcome !== "loaded" || !Array.isArray(result.context.sessions)) {
    throw new Error("Staff schedule unavailable");
  }
  return result.context.sessions;
}
