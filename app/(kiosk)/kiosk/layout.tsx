import type { Metadata } from "next";
import { Inter } from "next/font/google";
import styles from "./KioskShell.module.scss";
import "./kiosk.scss";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Placeholder until the school name comes from tenant config
const SCHOOL_NAME = "Dojang Downtown";

export const metadata: Metadata = {
  title: `${SCHOOL_NAME} · Check in`,
  description: "Public check-in kiosk",
};

export default function KioskLayout({ children }: LayoutProps<"/kiosk">) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <div className={styles.shell}>
          <header className={styles.topBar}>
            <span className={styles.schoolName}>{SCHOOL_NAME}</span>
          </header>
          <main className={styles.main}>{children}</main>
        </div>
      </body>
    </html>
  );
}
