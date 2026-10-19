// Staff-side member reads from the browser. Calls /api/v2/members, which only
// answers in the Odoo test mode, for a browser paired as staff.

// How many members this staff device may see, or null if we couldn't find out
// (not paired, Odoo down, timed out). Never throws.
export async function countMembers(signal: AbortSignal): Promise<number | null> {
  try {
    const response = await fetch("/api/v2/members", { cache: "no-store", signal });
    if (!response.ok) return null;
    const body = await response.json();
    return Array.isArray(body) ? body.length : null;
  } catch {
    return null;
  }
}

export type StaffMemberSummary = { id: string; name: string; membershipState?: string };

// The members this staff device may see (id, name, membership state), or null if we couldn't
// read them. Never throws.
export async function listMembers(
  signal: AbortSignal,
): Promise<StaffMemberSummary[] | null> {
  try {
    const response = await fetch("/api/v2/members", { cache: "no-store", signal });
    if (!response.ok) return null;
    const body = await response.json();
    if (!Array.isArray(body)) return null;
    return body.map((member) => ({
      id: String(member.id),
      name: String(member.name),
      membershipState: typeof member.membershipState === "string" ? member.membershipState : undefined,
    }));
  } catch {
    return null;
  }
}
