"use client";

import NextLink from "next/link";
import type { ComponentPropsWithRef, MouseEvent } from "react";
import { useOptionalWorkspaceActions } from "@/components/workspace/WorkspaceActions";

type Props = ComponentPropsWithRef<"a"> & { href: string };

// The alternate preview runtime can serve every page directly but its soft
// navigation can stall. Let the browser load documents there; keep Next's
// normal client navigation in the Next deployment.
export default function AppLink(props: Props) {
  const actions = useOptionalWorkspaceActions();
  const locked = actions?.hasPending && props.href !== actions.pending.current?.returnHref;
  const guarded = {
    ...props,
    "aria-disabled": locked || props["aria-disabled"],
    onClick: (event: MouseEvent<HTMLAnchorElement>) => {
      if (locked) { event.preventDefault(); return; }
      props.onClick?.(event);
    },
  };
  if (process.env.NEXT_PUBLIC_DOCUMENT_NAVIGATION === "true") {
    return <a {...guarded} data-navigation="document" />;
  }
  return <NextLink {...guarded} />;
}
