import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import AdaptiveShell from "@/components/shell/AdaptiveShell";
import { odooTestMode } from "@/server/odoo-runtime";
import "./globals.scss";
const inter = Inter({variable: "--font-inter", subsets: ["latin"]});
export const metadata: Metadata = {title: "Dojang Companion", description: "Front desk and member management"};
export const dynamic = "force-dynamic";
export default function RootLayout({children}: {children: React.ReactNode}) {
  const connected = odooTestMode();
  const context = connected ? <section><h2>Your workspace</h2><p>Classes, member attendance and reviewed follow-ups share the same Odoo records.</p><Link href="/integration/members">Choose a member</Link><p>Open a member to prepare a parent follow-up, or open a class to review its instructor roster.</p><p>Test workspace: reports are entered by staff. Follow-ups are saved internally; messages and bookings require further integration.</p></section> : undefined;
  return <html lang="en" className={`${inter.variable} h-full antialiased`}><body className="min-h-full flex flex-col"><AdaptiveShell connectedTest={connected} context={context}>{children}</AdaptiveShell></body></html>;
}
