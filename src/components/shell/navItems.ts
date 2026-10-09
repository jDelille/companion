export type NavItem = { id: string; abbrv: string; label: string; href: string };

export const navItems: NavItem[] = [
  { id: "today", abbrv: "TO", label: "Today", href: "/" },
  { id: "people", abbrv: "PE", label: "People", href: "/people" }, // opens a member for the current mode
  { id: "ops", abbrv: "OP", label: "Ops", href: "/ops" },
  { id: "ma", abbrv: "MA", label: "MA", href: "/martial-arts" },
  { id: "revenue", abbrv: "RE", label: "Revenue", href: "/revenue" },
  { id: "engage", abbrv: "EN", label: "Engage", href: "/engage" },
  { id: "intel", abbrv: "IN", label: "Intel", href: "/intel" },
  { id: "platform", abbrv: "PL", label: "Platform", href: "/platform" },
];

// A nav item is active anywhere in its section: People stays lit on /people/1,
// /people/5001 and any other member, not only on the exact link
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.href === "/") return pathname === "/";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

// The doc's phone nav shows only these two, plus + and More
export const bottomNavIds = ["today", "people", "ops"];