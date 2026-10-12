"use client";

import NextLink from "next/link";
import type { ComponentPropsWithRef } from "react";

type Props = ComponentPropsWithRef<"a"> & { href: string };

// The alternate preview runtime can serve every page directly but its soft
// navigation can stall. Let the browser load documents there; keep Next's
// normal client navigation in the Next deployment.
export default function AppLink(props: Props) {
  if (process.env.NEXT_PUBLIC_DOCUMENT_NAVIGATION === "true") {
    return <a {...props} data-navigation="document" />;
  }
  return <NextLink {...props} />;
}
