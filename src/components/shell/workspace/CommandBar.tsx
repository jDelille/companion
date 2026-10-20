// "Search, navigate, or ask AI…": the top bar's search and command box.
// Typing a name lists matching members with their actions (Open, Check In, Book, …)
// and a few commands for the first match. Anything else can be sent to Do For Me.
"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Avatar from "@/components/primitives/avatar/Avatar";
import { listMembers } from "@/integrations/staff-members";
import { mockMembers } from "@/integrations/mock/members";
import type { MemberAction } from "@/domain/member-presentation";
import { openWorkspaceTab } from "./openTabs";
import { recognizeGoal } from "@/components/workbench/contractRules";
import {
  ASK_AGENT_EVENT,
  DO_FOR_ME_EVENT,
  MEMBER_ACTION_EVENT,
  MEMBER_TAB_EVENT,
  OPEN_COMMAND_EVENT,
  sendShellEvent,
} from "./shellEvents";
import styles from "./Workspace.module.scss";

const CONNECTED = process.env.NEXT_PUBLIC_DEMO_MODE !== "true";
const MAX_PEOPLE = 5;

type SearchMember = { id: string; name: string; detail: string };

// Members from the Hub, with the staff member's own Odoo sign-in (only the parts used here)
type HubContext = { members: { id: string; name: string; state?: string; rank?: string }[] };

async function hubMembers(): Promise<SearchMember[] | null> {
  try {
    const response = await fetch("/api/hub", {
      method: "POST",
      headers: { "content-type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ operation: "context", payload: {}, requestKey: null }),
    });
    if (!response.ok) return null;
    const context = (await response.json()) as HubContext;
    if (!Array.isArray(context.members)) return null;
    return context.members.map((member) => ({
      id: String(member.id),
      name: String(member.name),
      detail: [member.rank, member.state].filter(Boolean).join(" · ") || "Member",
    }));
  } catch {
    return null;
  }
}

// The paired staff device's member list first; if this browser isn't paired, the Hub's
async function loadConnectedMembers(): Promise<SearchMember[] | null> {
  const fromDevice = await listMembers(new AbortController().signal);
  if (fromDevice) {
    return fromDevice.map((member) => ({
      id: member.id,
      name: member.name,
      detail: member.membershipState ? `Membership ${member.membershipState}` : "Member",
    }));
  }
  return hubMembers();
}

// One row in the dropdown. Arrow keys move between them; Enter runs the highlighted one.
type Option = {
  id: string;
  group: "people" | "actions" | "commands" | "ask";
  label: string;
  detail?: string;
  member?: SearchMember; // people rows show the member's avatar
  run: () => void;
};

// An event to send once a page has opened (e.g. ask the agent on the member's page)
type AfterNavigation = { path: string; name: string; detail: unknown };

const CommandBar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [members, setMembers] = useState<SearchMember[] | null>(null);
  const [membersFailed, setMembersFailed] = useState(false);
  const [afterNavigation, setAfterNavigation] = useState<AfterNavigation | null>(null);

  // Ctrl+K (⌘K on a Mac) jumps to the search box from anywhere; so do page buttons
  // like "+ Quick action" and Today's big search box (they send OPEN_COMMAND_EVENT)
  useEffect(() => {
    const focusSearch = () => {
      input.current?.focus();
      input.current?.select();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        focusSearch();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_COMMAND_EVENT, focusSearch);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_COMMAND_EVENT, focusSearch);
    };
  }, []);

  // Clicking anywhere else closes the dropdown
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Once the page we went to is open, send its waiting event
  useEffect(() => {
    if (!afterNavigation || afterNavigation.path !== pathname) return;
    // A moment for the new page to start listening
    const timer = setTimeout(() => {
      sendShellEvent(afterNavigation.name, afterNavigation.detail);
      setAfterNavigation(null);
    }, 150);
    return () => clearTimeout(timer);
  }, [afterNavigation, pathname]);

  // Members load the first time the box is used, not on every page
  // (and again next time if they couldn't be loaded)
  const loadMembers = () => {
    if (members !== null) return;
    setMembersFailed(false);
    if (!CONNECTED) {
      setMembers(
        mockMembers.map((member) => ({
          id: member.id,
          name: member.name,
          detail: [member.rank.name, member.householdName].filter(Boolean).join(" · "),
        })),
      );
      return;
    }
    loadConnectedMembers().then((list) => {
      if (list) setMembers(list);
      else setMembersFailed(true);
    });
  };

  const close = () => {
    setOpen(false);
    setQuery("");
    // Leave the search box (the focused element), so typing goes back to the page
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  };

  const goTo = (href: string) => {
    close();
    router.push(href);
  };

  const openMember = (member: SearchMember) => {
    const href = `/people/${member.id}`;
    openWorkspaceTab({ href, label: member.name });
    goTo(href);
  };

  // Send an event on the member's page, opening it first when it isn't the page on screen
  const onMemberPage = (member: SearchMember, name: string, detail: unknown) => {
    const href = `/people/${member.id}`;
    if (pathname === href) {
      close();
      sendShellEvent(name, detail);
      return;
    }
    setAfterNavigation({ path: href, name, detail });
    openMember(member);
  };

  const memberAction = (member: SearchMember, action: MemberAction) =>
    onMemberPage(member, MEMBER_ACTION_EVENT, { memberId: member.id, action });

  const askAgent = (text: string) => {
    close();
    sendShellEvent(ASK_AGENT_EVENT, { text });
  };

  // Build the dropdown's rows from what's typed
  const search = query.trim().toLowerCase();
  const matches = search && members
    ? members.filter((member) => member.name.toLowerCase().includes(search)).slice(0, MAX_PEOPLE)
    : [];
  const first = matches[0];

  const options: Option[] = [];
  if (first) {
    options.push({ id: `person-${first.id}`, group: "people", label: first.name, detail: first.detail, member: first, run: () => openMember(first) });
    // The first match's actions, as in the design
    const actions: { label: string; run: () => void }[] = [
      { label: "Open", run: () => openMember(first) },
      { label: "Check In", run: () => goTo("/kiosk") },
      { label: "Book", run: () => memberAction(first, "book") },
      { label: "Message", run: () => memberAction(first, "message") },
      { label: "Edit", run: () => memberAction(first, "edit") },
      // No per-member evaluation screen yet: Belt testing is where results are recorded
      { label: "Evaluate", run: () => goTo("/hub?view=testing") },
      { label: "Take Payment", run: () => memberAction(first, "payment") },
      { label: "✦ Ask AI", run: () => onMemberPage(first, DO_FOR_ME_EVENT, { memberId: first.id }) },
    ];
    for (const action of actions) {
      options.push({ id: `action-${action.label}`, group: "actions", label: action.label, run: action.run });
    }
    // Other people who match
    for (const member of matches.slice(1)) {
      options.push({ id: `person-${member.id}`, group: "people", label: member.name, detail: member.detail, member, run: () => openMember(member) });
    }

    const firstName = first.name.split(" ")[0];
    options.push({
      id: "command-classes",
      group: "commands",
      label: `Find ${firstName}'s eligible classes`,
      // The Book window lists the classes they can join
      run: () => memberAction(first, "book"),
    });
    options.push({
      id: "command-readiness",
      group: "commands",
      label: `Explain ${firstName}'s test readiness`,
      run: () =>
        onMemberPage(first, ASK_AGENT_EVENT, { text: `Explain ${first.name}'s test readiness` }),
    });
    // The Family tab only exists with Odoo records
    if (CONNECTED) {
      options.push({
        id: "command-household",
        group: "commands",
        label: "Show household",
        run: () => onMemberPage(first, MEMBER_TAB_EVENT, { memberId: first.id, tab: "Family" }),
      });
    }
  }
  // A goal Do For Me can plan ("invite testing candidates") opens an Action contract
  if (recognizeGoal(query)) {
    options.push({
      id: "contract",
      group: "ask",
      label: `✦ Prepare action contract: “${query.trim()}”`,
      run: () => goTo(`/intel?goal=${encodeURIComponent(query.trim())}`),
    });
  }
  // Anything typed can go to Do For Me (live views aren't built yet)
  if (search.length >= 2) {
    options.push({ id: "ask", group: "ask", label: `✦ Ask Do For Me: “${query.trim()}”`, run: () => askAgent(query.trim()) });
  }

  const showDropdown = open && search.length > 0;
  const active = Math.min(highlighted, Math.max(0, options.length - 1));

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (!showDropdown || options.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((active + 1) % options.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((active - 1 + options.length) % options.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      options[active].run();
    }
  };

  const renderOption = (option: Option) => {
    const index = options.indexOf(option);
    return (
      <li
        key={option.id}
        id={`command-option-${option.id}`}
        role="option"
        aria-selected={index === active}
        className={`${styles.commandOption} ${styles[`commandOption_${option.group}`] ?? ""} ${index === active ? styles.commandOptionActive : ""}`}
        // pointerdown, not click: keeps the input from losing focus first
        onPointerDown={(event) => event.preventDefault()}
        onClick={() => option.run()}
        onPointerEnter={() => setHighlighted(index)}
      >
        {option.member && <Avatar name={option.member.name} size="small" />}
        <span className={styles.commandText}>
          <strong>{option.label}</strong>
          {option.detail && <small>{option.detail}</small>}
        </span>
      </li>
    );
  };

  const people = options.filter((option) => option.group === "people" || option.group === "actions");
  const commands = options.filter((option) => option.group === "commands");
  const ask = options.filter((option) => option.group === "ask");

  return (
    <div className={styles.commandBox} ref={box}>
      <input
        ref={input}
        type="text"
        role="combobox"
        className={styles.commandBar}
        placeholder="Search, navigate, or ask AI…"
        aria-label="Search, navigate, or ask AI"
        aria-expanded={showDropdown}
        aria-controls="command-results"
        aria-autocomplete="list"
        aria-activedescendant={showDropdown && options[active] ? `command-option-${options[active].id}` : undefined}
        value={query}
        onFocus={() => {
          loadMembers();
          setOpen(true);
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setHighlighted(0);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />
      <kbd className={styles.keyBtn} title="Ctrl+K (⌘K on a Mac)">⌘K</kbd>

      {showDropdown && (
        <div className={styles.commandResults}>
          <ul id="command-results" role="listbox" aria-label="Results">
            {people.length > 0 && (
              <>
                <li role="presentation" className={styles.commandGroup}>People</li>
                {people.map(renderOption)}
              </>
            )}
            {commands.length > 0 && (
              <>
                <li role="presentation" className={styles.commandGroup}>Commands</li>
                {commands.map(renderOption)}
              </>
            )}
            {search && members === null && CONNECTED && !membersFailed && (
              <li role="presentation" className={styles.commandNote}>Loading members…</li>
            )}
            {search && membersFailed && (
              <li role="presentation" className={styles.commandNote}>
                Members couldn’t be loaded. Sign in on the Hub page or connect this device, then try again.
              </li>
            )}
            {search && members !== null && matches.length === 0 && (
              <li role="presentation" className={styles.commandNote}>No members match</li>
            )}
            {ask.map(renderOption)}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CommandBar;
