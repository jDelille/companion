import type { Member } from "./member";

export type MemberAction =
  "message" | "book" | "payment" | "edit" | "ask" | "details" | "quickActions";

export const membershipLabel = (member: Member) =>
  ({
    active: "Active",
    paused: "Paused",
    trial: "Trial",
    lead: "Lead",
    cancelled: "Cancelled",
  })[member.membershipState];

export const memberInitials = (member: Member) =>
  member.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

// Every member dialog receives the actual selected record, with no default member.
export function memberActionCopy(action: MemberAction, member: Member) {
  const copy = {
    message: {
      label: "Message draft",
      title: `Message ${member.name}`,
      description:
        "Review a draft. Contact details and sending are not connected.",
    },
    book: {
      label: "Classes & bookings",
      title: `Bookings for ${member.name}`,
      description: `${member.memberNumber} · ${membershipLabel(member)} membership`,
    },
    payment: {
      label: "Membership & payments",
      title: member.name,
      description: member.householdName || member.memberNumber,
    },
    edit: {
      label: "Member profile",
      title: member.name,
      description:
        "Current profile details. Profile editing is not connected yet.",
    },
    ask: {
      label: "Companion context",
      title: `Work with ${member.name}`,
      description: "This member's current record.",
    },
    details: {
      label: "Member overview",
      title: member.name,
      description: [member.rank.name, member.householdName]
        .filter(Boolean)
        .join(" · "),
    },
    quickActions: {
      label: "Member actions",
      title: `Work with ${member.name}`,
      description: member.memberNumber,
    },
  };
  return copy[action];
}
