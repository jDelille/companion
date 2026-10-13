import Link from "@/components/primitives/AppLink";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { SCHOOL_NAME } from "@/domain/kiosk/kioskConfig";
import styles from "./KioskShell.module.scss";
import "./kiosk.scss";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${SCHOOL_NAME} · Check in`,
  description: "Public check-in kiosk",
};

export default function KioskLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <div className={styles.shell}>
          {process.env.NEXT_PUBLIC_DEMO_MODE === "true" && <div className={styles.previewNotice}><Link href="/">← Staff workspace</Link><span>Sample check-ins · Preview</span></div>}
          <main className={styles.main}>{children}</main>
        </div>
      </body>
    </html>
  );
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#08080a" }; // = --canvas (a meta tag cannot read CSS variables)
