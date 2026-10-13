"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import Link from "@/components/primitives/AppLink";
import { usePathname, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import styles from "./Shell.module.scss";
import ConnectedNavigation from "./ConnectedNavigation";
import ContextPane from "./ContextPane";
import { useWorkspaceActions } from "@/components/workspace/WorkspaceActions";

const CompanionRail = dynamic(
  () => import("./rail/companion-rail/CompanionRail"),
  { loading: () => <p role="status">Opening Companion…</p> },
);

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
  // Operations pages show "Arriving soon" (today's classes), as in the VNext mockup's Ops section
  const onClasses =
    pathname.startsWith("/ops") ||
    (pathname === "/hub" && ["instructor", "operations", "attendance"].includes(routeView ?? ""));
  const sectionPane = onPeople || onClasses;
  // Today uses the full width, like the VNext Owner Today screen
  const fullWidth = pathname === "/";

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

  return (
    <div
      className={styles.adaptiveShell}
      data-context-open={contextOpen}
      data-companion-open={companionOpen}
    >
      <div className={styles.railSlot}>
        <ConnectedNavigation />
      </div>

      {!fullWidth && <div
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
        {sectionPane ? (
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
      </div>}

      <div className={styles.workspaceSlot}>
        <header className={styles.connectedHeader}>
          <div>
            <strong>{demoMode ? "Dojang Downtown" : "Dojang Companion"}</strong>
            <span>{connectedTest ? "Test workspace" : "Staff workspace"}</span>
          </div>
          {!fullWidth && <button
            ref={contextTrigger}
            className={styles.contextTrigger}
            aria-controls="workspace-context"
            aria-expanded={contextOpen}
            onClick={() => {
              setCompanionOpen(false);
              setContextOpen((open) => !open);
            }}
          >
            Workspace guide
          </button>}
        </header>
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

      <div id="roster-companion" className={styles.companionSlot}>
        <button
          ref={companionClose}
          className={styles.companionClose}
          onClick={() => {
            setCompanionOpen(false);
            companionTrigger.current?.focus();
          }}
          aria-label="Close companion"
        >
          ✕
        </button>
        {companion ?? <CompanionRail />}
      </div>
      <button
        ref={companionTrigger}
        className={styles.companionTrigger}
        aria-controls="roster-companion"
        aria-expanded={companionOpen}
        onClick={() => {
          setContextOpen(false);
          setCompanionOpen(true);
        }}
        aria-label="Open companion"
      >
        ✦
      </button>

      <div className={styles.bottomNavSlot}>
        <ConnectedNavigation mobile />
      </div>
    </div>
  );
}
