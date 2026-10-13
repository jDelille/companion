import type { SVGProps } from "react";
export type NavIconName =
  "today" | "classes" | "members" | "followups" | "companion" | "sales";
export default function NavIcon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: NavIconName }) {
  const paths: Record<NavIconName, React.ReactNode> = {
    sales: <><rect x="3" y="4" width="5" height="16" rx="1" /><rect x="10" y="4" width="5" height="10" rx="1" /><rect x="17" y="4" width="4" height="13" rx="1" /></>,
    today: (
      <>
        <path d="m3 10 9-7 9 7v10H3Z" />
        <path d="M9 20v-7h6v7" />
      </>
    ),
    classes: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M7 3v4m10-4v4M3 11h18M7 15h2m4 0h2m-8 3h2" />
      </>
    ),
    members: (
      <>
        <circle cx="9" cy="8" r="4" />
        <path d="M2 21v-3a7 7 0 0 1 14 0v3m0-17a4 4 0 0 1 0 8m3 3a6 6 0 0 1 3 5v1" />
      </>
    ),
    followups: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="3" />
        <path d="m3 8 9 6 9-6" />
      </>
    ),
    companion: (
      <>
        <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z" />
        <path d="M20 2v4m-2-2h4" />
      </>
    ),
  };
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
