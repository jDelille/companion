"use client";
import { ReactNode, useEffect, useRef, useState } from "react";
import Link from "@/components/primitives/AppLink";
import { usePathname } from "next/navigation";
import styles from "./Shell.module.scss";
import dynamic from "next/dynamic";
import ConnectedNavigation from "./ConnectedNavigation";
import FloatingNavigation from "./FloatingNavigation";
import CrestBackdrop from "@/components/branding/CrestBackdrop";

const CompanionRail = dynamic(
  () => import("./rail/companion-rail/CompanionRail"),
  {
    loading: () => <p role="status">Opening Companion…</p>,
  },
);

type Props = {
  children: ReactNode;
  context?: ReactNode;
  companion?: ReactNode;
  connectedTest?: boolean;
  demoMode?: boolean;
};
export default function AdaptiveShell({
  children,
  context,
  companion,
  connectedTest = false,
  demoMode = false,
}: Props) {
  const [contextOpen, setContextOpen] = useState(false);
  const [companionOpen, setCompanionOpen] = useState(false);
  const [companionVisited, setCompanionVisited] = useState(false);
  const pathname = usePathname();
  const contextTrigger = useRef<HTMLButtonElement>(null);
  const companionClose = useRef<HTMLButtonElement>(null);
  const contextClose = useRef<HTMLButtonElement>(null);
  const lastTrigger = useRef<HTMLElement | null>(null);
  const workspace = useRef<HTMLDivElement>(null);
  const closePanel = () => {
    setContextOpen(false);
    setCompanionOpen(false);
    requestAnimationFrame(() => lastTrigger.current?.focus());
  };
  const openCompanion = () => {
    setCompanionVisited(true);
    lastTrigger.current = document.activeElement as HTMLElement;
    setContextOpen(false);
    setCompanionOpen(true);
  };
  useEffect(() => {
    workspace.current?.scrollTo(0, 0);
  }, [pathname]);
  useEffect(() => {
    if (!contextOpen && !companionOpen) return;
    const panel = document.getElementById(
      companionOpen ? "roster-companion" : "workspace-context",
    );
    (companionOpen ? companionClose : contextClose).current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setContextOpen(false);
        setCompanionOpen(false);
        requestAnimationFrame(() => lastTrigger.current?.focus());
      }
      if (e.key !== "Tab" || !panel) return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex="0"]',
        ),
      ).filter((el) => el.getClientRects().length);
      const first = focusable[0],
        last = focusable.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [companionOpen, contextOpen]);
  const panelOpen = contextOpen || companionOpen;
  return (
    <div
      className={styles.adaptiveShell}
      data-context-open={contextOpen}
      data-companion-open={companionOpen}
    >
      <div className={styles.railSlot} inert={panelOpen}>
        <ConnectedNavigation
          onCompanion={openCompanion}
          companionOpen={companionOpen}
        />
      </div>
      <div className={styles.workspaceSlot} inert={panelOpen}>
        <CrestBackdrop paused={panelOpen} />
        <header className={styles.connectedHeader}>
          <Link href="/" className={styles.mobileBrand}>
            DOJANG<span>.</span>
          </Link>
          <div className={styles.headerLocation}>
            <span className={styles.locationDot} />
            <strong>Dojang Downtown</strong>
            <span className={styles.headerDate}>
              {connectedTest ? "Test workspace" : "Staff workspace"}
            </span>
          </div>
          <button
            ref={contextTrigger}
            className={styles.contextTrigger}
            aria-controls="workspace-context"
            aria-expanded={contextOpen}
            onClick={() => {
              lastTrigger.current = contextTrigger.current;
              setCompanionOpen(false);
              setContextOpen(true);
            }}
          >
            Workspace guide
          </button>
        </header>
        {demoMode && (
          <div className={styles.demoBanner}>Preview · Sample data</div>
        )}
        <main
          ref={workspace}
          id="main-content"
          className={styles.workspaceBody}
        >
          {children}
        </main>
      </div>
      <FloatingNavigation
        workspace={workspace}
        pathname={pathname}
        panelOpen={panelOpen}
        onCompanion={openCompanion}
        companionOpen={companionOpen}
      />
      {panelOpen && (
        <button
          className={styles.backdrop}
          aria-label="Close panel"
          onClick={closePanel}
          tabIndex={-1}
        />
      )}
      <aside
        id="workspace-context"
        role={contextOpen ? "dialog" : undefined}
        aria-modal={contextOpen || undefined}
        aria-label="Workspace guide"
        className={styles.contextSlot}
        inert={!contextOpen}
        onClick={(event) => {
          // A link in the guide goes to another page: close the panel so it isn't left over it
          if ((event.target as HTMLElement).closest("a")) setContextOpen(false);
        }}
      >
        <button
          ref={contextClose}
          className={styles.panelClose}
          onClick={closePanel}
          aria-label="Close context panel"
        >
          ✕
        </button>
        {context ?? (
          <section className={styles.guide}>
            <h2>Your Dojang workspace</h2>
            <p>
              Explore classes, open a member, or use Companion to review a task.
            </p>
            <p>
              This preview runs the Companion app with fictional sample records.
              Demo actions are temporary and may reset.
            </p>
            <Link href="/kiosk" onClick={closePanel}>
              Try the check-in kiosk →
            </Link>
          </section>
        )}
      </aside>
      <aside
        id="roster-companion"
        role={companionOpen ? "dialog" : undefined}
        aria-modal={companionOpen || undefined}
        aria-label="Companion"
        className={styles.companionSlot}
        inert={!companionOpen}
      >
        <button
          ref={companionClose}
          className={styles.panelClose}
          onClick={closePanel}
          aria-label="Close companion"
        >
          ✕
        </button>
        {companionVisited && (companion ?? <CompanionRail />)}
      </aside>
    </div>
  );
}
