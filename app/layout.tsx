import type { Metadata } from "next";
import { Inter } from "next/font/google";
import AdaptiveShell from "@/components/shell/AdaptiveShell";
import "./globals.scss";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dojang Companion",
  description: "AI-first front desk and member management",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AdaptiveShell>{children}</AdaptiveShell>
      </body>
    </html>
  );
}
