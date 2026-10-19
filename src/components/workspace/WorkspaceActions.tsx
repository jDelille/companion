"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";

export type PendingAction = {
  operation: string;
  payload: Record<string, unknown>;
  requestKey: string;
  messageId?: string;
  returnHref: string;
};
type Actions = {
  pending: RefObject<PendingAction | null>;
  hasPending: boolean;
  setPending: (action: PendingAction | null) => void;
};
const Context = createContext<Actions | null>(null);

// The shared layout retains the original operation/key across section changes.
export function WorkspaceActions({ children }: { children: ReactNode }) {
  const pending = useRef<PendingAction | null>(null);
  const [hasPending, setHasPending] = useState(false);
  const setPending = (action: PendingAction | null) => {
    pending.current = action;
    setHasPending(Boolean(action));
  };
  useEffect(() => {
    if (!hasPending) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasPending]);
  return <Context.Provider value={{ pending, hasPending, setPending }}>{children}</Context.Provider>;
}

export function useWorkspaceActions() {
  const value = useContext(Context);
  if (!value) throw Error("Workspace actions require the shared staff layout");
  return value;
}
export function useOptionalWorkspaceActions() { return useContext(Context); }
