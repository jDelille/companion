"use client";
import { useEffect, useState } from "react";
import { startAttendanceRecovery } from "@/integrations/attendanceRecovery";
import styles from "./RecoveryStatus.module.scss";
export default function RecoveryStatus() {
  const [message, setMessage] = useState("");
  useEffect(() => startAttendanceRecovery(setMessage), []);
  return message ? <aside className={styles.status} role="status" aria-live="polite">{message}</aside> : null;
}
