import type { Member } from "@/domain/member";
import { mockMembers } from "./mock/members";

const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

// Simulate network time so the UI is built for real loading states
const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getMembers(): Promise<Member[]> {
  if (DEMO) {
    await delay();
    return mockMembers;
  }
  throw new Error("Odoo integration not implemented yet");
}

export async function getMember(id: string): Promise<Member | null> {
  if (DEMO) {
    await delay();
    return mockMembers.find((m) => m.id === id) ?? null;
  }
  throw new Error("Odoo integration not implemented yet");
}

export async function searchMembers(query: string): Promise<Member[]> {
  if (DEMO) {
    await delay(150);
    const q = query.toLowerCase();
    return mockMembers.filter(
      (m) => m.name.toLowerCase().includes(q) || m.memberNumber.toLowerCase().includes(q),
    );
  }
  throw new Error("Odoo integration not implemented yet");
}