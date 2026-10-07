"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  createApprovalCommand,
  type ApprovalCommand,
  type CompanionContext,
  type CompanionRequestAnswer,
  type ContextAnswer,
  type Receipt,
  type Suggestion,
} from "@/domain/companion";
import {
  getCompanionContext,
  sendApproval,
  sendRequest,
  viewFromPath,
} from "@/integrations/companion";

// working: sent, waiting for the route
// done: the route returned a receipt
// failed: the route said no; trying again is a new attempt
// notConfirmed: no usable answer; trying again resends the same command
export type TaskStatus = "working" | "done" | "failed" | "notConfirmed";

export type RequestStatus =
  | "idle"
  | "thinking"
  | "understood"
  | "notUnderstood"
  | "unavailable";

export type ContextStatus = "loading" | "loaded" | "unavailable";

// Everything the rail remembers for one page. Kept per page so an answer
// that arrives after you've moved on lands on the page it was for.
type PageState = {
  openId: string | null;
  status: Record<string, TaskStatus>;
  receipts: Receipt[];
  requested: Suggestion[]; // tasks made from typed or spoken requests
  requestStatus: RequestStatus;
};

const emptyPage: PageState = {
  openId: null,
  status: {},
  receipts: [],
  requested: [],
  requestStatus: "idle",
};

// How a request's answer changes the page it was asked on
function applyRequestAnswer(
  page: PageState,
  answer: CompanionRequestAnswer,
): PageState {
  if (answer.outcome === "newTask") {
    const task = answer.suggestion;
    const others = page.requested.filter((request) => request.id !== task.id);
    return {
      ...page,
      requested: [task, ...others], // requested tasks show first
      openId: task.id, // arrives already open
      requestStatus: "understood",
    };
  }
  if (answer.outcome === "existingTask") {
    return { ...page, openId: answer.suggestionId, requestStatus: "understood" };
  }
  if (answer.outcome === "notUnderstood") {
    return { ...page, requestStatus: "notUnderstood" };
  }
  return { ...page, requestStatus: "unavailable" };
}

const useCompanion = () => {
  const pathname = usePathname();
  const view = viewFromPath(pathname);

  const [loadedContext, setLoadedContext] = useState<{
    viewKey: string;
    answer: ContextAnswer;
  } | null>(null);
  const [pages, setPages] = useState<Record<string, PageState>>({});

  // Approvals running right now, by "viewKey:suggestionId". A ref, not state,
  // so a second click that lands before React re-renders is still ignored.
  const approvalsInFlight = useRef(new Set<string>());
  // Commands whose answer never came, kept so the retry sends the same key
  const unconfirmedCommands = useRef(new Map<string, ApprovalCommand>());
  // Newest request number per page, so an older answer can't replace a newer one
  const latestRequest = useRef(new Map<string, number>());

  // Load the context for this page. Changing page cancels the old load.
  useEffect(() => {
    const controller = new AbortController();
    const viewKey = viewFromPath(pathname).key;

    getCompanionContext(pathname, controller.signal).then((answer) => {
      if (controller.signal.aborted) return; // the page changed, drop it
      setLoadedContext({ viewKey, answer });
    });

    return () => controller.abort();
  }, [pathname]);

  // Only show context that was loaded for this page
  let context: CompanionContext | null = null;
  let contextStatus: ContextStatus = "loading";
  if (loadedContext && loadedContext.viewKey === view.key) {
    if (loadedContext.answer.outcome === "loaded") {
      context = loadedContext.answer.context;
      contextStatus = "loaded";
    } else {
      contextStatus = "unavailable";
    }
  }

  const page = pages[view.key] ?? emptyPage;

  const updatePage = (viewKey: string, change: (page: PageState) => PageState) => {
    setPages((all) => {
      const current = all[viewKey] ?? emptyPage;
      return { ...all, [viewKey]: change(current) };
    });
  };

  const setTaskStatus = (viewKey: string, taskId: string, status: TaskStatus) => {
    updatePage(viewKey, (current) => ({
      ...current,
      status: { ...current.status, [taskId]: status },
    }));
  };

  // Requested tasks show first
  const suggestions = [...page.requested, ...(context?.suggestions ?? [])];
  const featured = context?.featured;

  const toggle = (id: string) => {
    updatePage(view.key, (current) => ({
      ...current,
      openId: current.openId === id ? null : id,
    }));
  };

  const approve = async (suggestion: Suggestion) => {
    // Remember where this started; the answer goes back there
    const viewKey = view.key;
    const taskKey = `${viewKey}:${suggestion.id}`;

    // 1. Ignore a second approve while one is working, or once it's done
    if (approvalsInFlight.current.has(taskKey)) return;
    if (page.status[suggestion.id] === "done") return;
    approvalsInFlight.current.add(taskKey);

    // 2. After notConfirmed, resend the same command and key. Otherwise it's a new attempt.
    let command = unconfirmedCommands.current.get(taskKey);
    if (!command) {
      command = createApprovalCommand(suggestion.id, view.memberId);
    }

    setTaskStatus(viewKey, suggestion.id, "working");
    const answer = await sendApproval(command);
    approvalsInFlight.current.delete(taskKey);

    // 3. Record the answer on the page it started on
    if (answer.outcome === "notConfirmed") {
      unconfirmedCommands.current.set(taskKey, command);
      setTaskStatus(viewKey, suggestion.id, "notConfirmed");
      return;
    }

    unconfirmedCommands.current.delete(taskKey);

    if (answer.outcome === "failed") {
      setTaskStatus(viewKey, suggestion.id, "failed");
      return;
    }

    updatePage(viewKey, (current) => ({
      ...current,
      status: { ...current.status, [suggestion.id]: "done" },
      receipts: [answer.receipt, ...current.receipts],
    }));
  };

  // A typed or spoken request
  const request = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Remember where this started; the answer goes back there
    const viewKey = view.key;

    // 1. Number it, so a newer request on this page replaces it
    const requestNumber = (latestRequest.current.get(viewKey) ?? 0) + 1;
    latestRequest.current.set(viewKey, requestNumber);

    // 2. Tell the agent what's on screen, so it can open a task that's already listed
    const onScreenIds = suggestions.map((suggestion) => suggestion.id);
    if (featured) {
      onScreenIds.push(featured.suggestion.id);
    }

    updatePage(viewKey, (current) => ({ ...current, requestStatus: "thinking" }));
    const answer = await sendRequest({
      text: trimmed,
      memberId: view.memberId,
      onScreenIds,
    });

    // 3. Drop it if a newer request started meanwhile, otherwise apply it to its own page
    if (latestRequest.current.get(viewKey) !== requestNumber) return;
    updatePage(viewKey, (current) => applyRequestAnswer(current, answer));
  };

  // Typing again clears the last answer's message, but not "Thinking…"
  const clearRequestStatus = () => {
    if (page.requestStatus === "idle" || page.requestStatus === "thinking") return;
    updatePage(view.key, (current) => ({ ...current, requestStatus: "idle" }));
  };

  return {
    contextStatus,
    label: context?.label,
    heading: context?.heading,
    suggestions,
    intel: context?.intel,
    featured,
    openId: page.openId,
    toggle,
    status: page.status,
    receipts: page.receipts,
    approve,
    request,
    requestStatus: page.requestStatus,
    clearRequestStatus,
  };
};

export default useCompanion;
