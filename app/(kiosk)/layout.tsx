import type { Metadata } from "next";
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
          <main className={styles.main}>{children}</main>
        </div>
      </body>
    </html>
  );
}
