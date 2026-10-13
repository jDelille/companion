import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Link from "@/components/primitives/AppLink";
import AdaptiveShell from "@/components/shell/AdaptiveShell";
import { WorkspaceActions } from "@/components/workspace/WorkspaceActions";
import { odooTestMode } from "@/server/odoo-runtime";
import "./globals.scss";
import { ChevronRightIcon } from "@/icons";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
export const metadata: Metadata = {
  title: "Dojang Companion",
  description: "Front desk and member management",
};

export const dynamic = "force-dynamic";
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const connected = odooTestMode();
  const context = connected ? (
    <section className="connectedContextSection">
      <h2>Your workspace</h2>
      <p>
        Classes, member attendance and reviewed follow-ups share the same Odoo
        records.
      </p>
      <Link href="/integration/members" className="chooseMemberBtn">
        Choose a member
        <ChevronRightIcon color="white" size={20} />
      </Link>
      <p>
        Open a member to prepare a parent follow-up, or open a class to review
        its instructor roster.
      </p>
      <p className="testWorkspaceWrapper">
        Internal follow-ups, individual-account bookings, member management
        and Sales share this workspace. Customer replies require a configured
        channel and explicit approval.
      </p>
    </section>
  ) : undefined;
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <WorkspaceActions><AdaptiveShell connectedTest={connected} demoMode={process.env.NEXT_PUBLIC_DEMO_MODE === "true"} context={context}>
          {children}
        </AdaptiveShell></WorkspaceActions>
      </body>
    </html>
  );
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#0b0b0c" };
