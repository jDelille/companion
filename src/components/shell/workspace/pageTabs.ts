// Which tab a page gets in the workspace tab bar: its address and its label.
// Every page gets one, except Today (always the first tab) and the kiosk (its own app).
// The address keeps only the query values that make it a different page
// (/hub?view=crm is Sales, /intel?goal=… is that contract), so the same page isn't
// opened twice because of a passing value like ?action=book.

export type PageTab = {
  href: string;
  label: string;
  // false: a placeholder until the page says its real name ("Member" → "Maya Chen")
  final: boolean;
};

type Query = { get: (name: string) => string | null };

// The Hub's pages, by ?view=. Same names as the navigation and page titles.
const hubViews: Record<string, string> = {
  messages: "Inbox",
  crm: "Sales",
  instructor: "Instructor",
  attendance: "Attendance",
  testing: "Belt testing",
  communications: "Messaging",
  operations: "Reports",
  setup: "School setup",
  ai: "AI settings",
  intake: "New student",
  archived: "Archived students",
  courses: "Course rosters",
  manage: "Manage member",
  book: "Book a class",
};

const shorten = (text: string, length = 28) => (text.length > length ? `${text.slice(0, length - 1)}…` : text);

export function tabForPage(pathname: string, query: Query): PageTab | null {
  if (pathname === "/" || pathname.startsWith("/kiosk")) return null;

  // Members
  if (pathname === "/people") return { href: pathname, label: "Members", final: true };
  if (/^\/people\/[^/]+\/proposed-edit$/.test(pathname)) return { href: pathname, label: "Proposed edit", final: true };
  if (/^\/people\/[^/]+$/.test(pathname)) return { href: pathname, label: "Member", final: false };

  // Classes
  if (pathname === "/ops") return { href: pathname, label: "Classes", final: true };
  if (/^\/ops\/sessions\/[^/]+$/.test(pathname)) return { href: pathname, label: "Class", final: false };

  // The Hub's pages; a member-specific Hub page keeps its member in the address
  if (pathname === "/hub") {
    const memberId = query.get("memberId");
    const view = query.get("view") || (memberId ? "book" : "messages");
    const label = hubViews[view] ?? "Hub";
    const params = new URLSearchParams();
    if (view !== "messages") params.set("view", view);
    if (memberId) params.set("memberId", memberId);
    const search = params.toString();
    return { href: search ? `/hub?${search}` : "/hub", label, final: true };
  }

  // Intel: the AI Workbench, or one contract by its goal
  if (pathname === "/intel") {
    const goal = query.get("goal");
    if (!goal) return { href: "/intel", label: "AI Workbench", final: true };
    return { href: `/intel?goal=${encodeURIComponent(goal)}`, label: shorten(goal), final: true };
  }

  if (pathname === "/follow-ups") return { href: pathname, label: "Follow-ups", final: true };
  if (pathname === "/integration/pair") return { href: pathname, label: "Connect device", final: true };

  // Any other page: its last address segment, e.g. /platform → "Platform"
  const last = pathname.split("/").filter(Boolean).pop() ?? "";
  const label = last.replaceAll("-", " ");
  return { href: pathname, label: label.charAt(0).toUpperCase() + label.slice(1), final: true };
}
