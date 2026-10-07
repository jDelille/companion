export type NavItem = { id: string; abbrv: string; label: string; href: string };

export const navItems: NavItem[] = [
  { id: "today", abbrv: "TO", label: "Today", href: "/" },
  { id: "people", abbrv: "PE", label: "People", href: "/people/5001" },
  { id: "ops", abbrv: "OP", label: "Ops", href: "/ops" },
  { id: "ma", abbrv: "MA", label: "MA", href: "/martial-arts" },
  { id: "revenue", abbrv: "RE", label: "Revenue", href: "/revenue" },
  { id: "engage", abbrv: "EN", label: "Engage", href: "/engage" },
  { id: "intel", abbrv: "IN", label: "Intel", href: "/intel" },
  { id: "platform", abbrv: "PL", label: "Platform", href: "/platform" },
];

// The doc's phone nav shows only these two, plus + and More
export const bottomNavIds = ["today", "people", "ops"];