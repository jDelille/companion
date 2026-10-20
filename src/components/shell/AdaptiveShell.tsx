"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import Link from "@/components/primitives/AppLink";
import { usePathname, useSearchParams } from "next/navigation";
import styles from "./Shell.module.scss";
import ConnectedNavigation from "./ConnectedNavigation";
import ContextPane from "./ContextPane";
import TodayContext from "./TodayContext";
import WorkspaceTabs from "./workspace/WorkspaceTabs";
import WorkspaceHeader from "./workspace/WorkspaceHeader";
import { ASK_AGENT_EVENT } from "./workspace/shellEvents";
// Loaded with the page, not separately: a separate load swapped the dock for a short
// "Opening Companion…" line on every page load, which pushed the page content sideways.
// The dock's own content still loads in afterwards, with placeholders.
import CompanionRail from "./rail/companion-rail/CompanionRail";
import { useWorkspaceActions } from "@/components/workspace/WorkspaceActions";

type Props = {
  children: ReactNode;
  context?: ReactNode;
  companion?: ReactNode;
  connectedTest?: boolean;
  demoMode?: boolean;
};

// Layout from the VNext build: navigation | workspace guide | page | Companion.
// The guide and Companion are permanent columns on wide screens and slide in below that.
export default function AdaptiveShell({
  children,
  context,
  companion,
  connectedTest = false,
  demoMode = false,
}: Props) {
  const [contextOpen, setContextOpen] = useState(false);
  const [companionOpen, setCompanionOpen] = useState(false);
  const pathname = usePathname();
  const params = useSearchParams();
  const routeView = params.get("view");
  const routeMember = params.get("memberId");
  const { hasPending, pending } = useWorkspaceActions();
  const companionTrigger = useRef<HTMLButtonElement>(null);
  const contextTrigger = useRef<HTMLButtonElement>(null);
  const companionClose = useRef<HTMLButtonElement>(null);
  const contextClose = useRef<HTMLButtonElement>(null);
  const workspace = useRef<HTMLElement>(null);
  // The second column follows the section, as in the VNext design
  const onPeople =
    pathname.startsWith("/people") ||
    (pathname === "/hub" && ["intake", "archived", "courses", "manage", "book"].includes(routeView ?? ""));
  // Classes pages show "Arriving soon" (today's classes), as in the VNext mockup's Ops section.
  // Instructor, Attendance and Reports show the "Your workspace" placeholder for now.
  const onClasses = pathname.startsWith("/ops");
  // Today has its own column: search, saved views, filters, object list (master shell layout)
  const onToday = pathname === "/";
  const sectionPane = onPeople || onClasses || onToday;

  // Shared-device privacy: hide staff pages when the browser restores them from history,
  // and follow other tabs to the kiosk when one switches to public mode.
  useEffect(() => {
    if (demoMode) return;
    const hide = () => {
      document.documentElement.style.visibility = "hidden";
    };
    const restored = (event: PageTransitionEvent) => {
      if (event.persisted) {
        hide();
        window.location.reload();
      }
    };
    const channel =
      typeof BroadcastChannel === "undefined"
        ? null
        : new BroadcastChannel("dojang-privacy");
    if (channel) {
      channel.onmessage = (event) => {
        if (event.data === "public-mode") {
          hide();
          window.location.replace("/kiosk");
        }
      };
    }
    window.addEventListener("pagehide", hide);
    window.addEventListener("pageshow", restored);
    return () => {
      window.removeEventListener("pagehide", hide);
      window.removeEventListener("pageshow", restored);
      channel?.close();
    };
  }, [demoMode]);

  // A new page starts at the top
  useEffect(() => {
    workspace.current?.scrollTo(0, 0);
  }, [pathname, routeView, routeMember]);

  // Escape closes whichever panel is open and returns focus to its button
  useEffect(() => {
    if (companionOpen) companionClose.current?.focus();
    else if (contextOpen) contextClose.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (companionOpen) {
        setCompanionOpen(false);
        companionTrigger.current?.focus();
      } else if (contextOpen) {
        setContextOpen(false);
        contextTrigger.current?.focus();
      }
    };
    if (companionOpen || contextOpen)
      window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [companionOpen, contextOpen]);

  // Companion slides in over the page (Jodi #43); "Companion" in the navigation opens it
  const openCompanion = () => {
    setContextOpen(false);
    setCompanionOpen(true);
  };
  const closeCompanion = () => {
    setCompanionOpen(false);
    companionTrigger.current?.focus();
  };

  // A page's "Do For Me" button opens the Companion too (the rail then shows Do For Me)
  useEffect(() => {
    const onDoForMe = () => {
      setContextOpen(false);
      setCompanionOpen(true);
    };
    window.addEventListener("dojang:do-for-me", onDoForMe);
    // A question from the top bar goes to the Do For Me agent: show it
    window.addEventListener(ASK_AGENT_EVENT, onDoForMe);
    return () => {
      window.removeEventListener("dojang:do-for-me", onDoForMe);
      window.removeEventListener(ASK_AGENT_EVENT, onDoForMe);
    };
  }, []);

  return (
    <div
      className={styles.adaptiveShell}
      data-context-open={contextOpen}
      data-companion-open={companionOpen}
    >
      <div className={styles.railSlot}>
        <ConnectedNavigation
          onCompanion={openCompanion}
          companionOpen={companionOpen}
          triggerRef={companionTrigger}
        />
      </div>

      <div
        id="workspace-context"
        className={`${styles.contextSlot} ${sectionPane ? "" : styles.connectedContext}`}
        onClick={(event) => {
          // A link in the guide goes to another page: close the slide-in panel
          if ((event.target as HTMLElement).closest("a")) setContextOpen(false);
        }}
      >
        <button
          ref={contextClose}
          className={styles.contextClose}
          onClick={() => {
            setContextOpen(false);
            contextTrigger.current?.focus();
          }}
          aria-label="Close context panel"
        >
          ✕
        </button>
        {onToday ? (
          <TodayContext />
        ) : sectionPane ? (
          <ContextPane section={onPeople ? "people" : "classes"}>{undefined}</ContextPane>
        ) : context ?? (
          <section>
            <h2>Your Dojang workspace</h2>
            <p>
              Explore classes, open a member, or use Companion to review a task.
            </p>
            <p>
              This preview runs the Companion app with fictional sample records.
              Demo actions are temporary and may reset.
            </p>
          </section>
        )}
        {!sectionPane && <nav className={styles.guideLinks} aria-label="Workspace sections">
          <Link href="/hub?view=crm">Sales pipeline and tasks →</Link>
          <Link href="/hub">Customer inbox and bookings →</Link>
          <Link href="/follow-ups">Internal follow-ups →</Link>
          <Link href="/hub?view=ai">AI drafting settings →</Link>
        </nav>}
      </div>

      <div className={styles.workspaceSlot}>
        <WorkspaceHeader
          location={demoMode ? "Downtown" : connectedTest ? "Test workspace" : "Dojang"}
          contextOpen={contextOpen}
          contextLabel={onToday ? "Views & filters" : "Workspace guide"}
          contextTriggerRef={contextTrigger}
          onToggleContext={() => {
            setCompanionOpen(false);
            setContextOpen((open) => !open);
          }}
        />
        <WorkspaceTabs />
        {demoMode && (
          <div className={styles.demoBanner}>Preview · Sample data</div>
        )}
        {hasPending && (
          <div className={styles.actionNotice} role="status">
            An action is awaiting confirmation. Keep this workspace open until
            its result is resolved.
            {pending.current && (
              <Link href={pending.current.returnHref}>
                Return to the action →
              </Link>
            )}
          </div>
        )}
        <main
          ref={workspace}
          id="main-content"
          className={styles.workspaceBody}
        >
          {children}
        </main>
      </div>

      {/* Clicking outside the open Companion closes it */}
      {companionOpen && (
        <button
          className={styles.backdrop}
          aria-label="Close companion"
          onClick={closeCompanion}
          tabIndex={-1}
        />
      )}
      <div id="roster-companion" className={styles.companionSlot}>
        <button
          ref={companionClose}
          className={styles.companionClose}
          onClick={closeCompanion}
          aria-label="Close companion"
        >
          ✕
        </button>
        {companion ?? <CompanionRail />}
      </div>

      <div className={styles.bottomNavSlot}>
        <ConnectedNavigation
          mobile
          onCompanion={openCompanion}
          companionOpen={companionOpen}
        />
      </div>
    </div>
  );
}
