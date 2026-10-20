import type { CompanionContext, Suggestion } from "@/domain/companion";
import AppLink from "@/components/primitives/AppLink";
import styles from "./DoForMe.module.scss";

type Props = {
  suggestion: Suggestion | null;
  records?: CompanionContext["records"];
};

// A class's detail is its start time ("2026-10-19T23:45:00Z" -> "4:45 PM"); other details show as sent
const formatDetail = (detail: string) => {
  if (!/^\d{4}-\d\d-\d\dT/.test(detail)) return detail;
  const date = new Date(detail);
  if (Number.isNaN(date.getTime())) return detail;
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

// Do For Me's Evidence tab: why the picked task is suggested, and the Odoo records
// the Companion read for this page (today's classes, or a class roster)
const EvidenceTab = ({ suggestion, records }: Props) => {
  const hasRecords = records && records.length > 0;

  if (!suggestion && !hasRecords) {
    return <p className={styles.why}>No evidence on this page yet.</p>;
  }

  return (
    <>
      {suggestion && (
        <>
          <p className={styles.label}>Evidence</p>
          <h3>{suggestion.title}</h3>
          <p className={styles.why}>{suggestion.explanation}</p>
        </>
      )}

      {hasRecords && (
        <>
          <p className={styles.label}>Records read</p>
          <ul className={styles.records}>
            {records.map((record) => (
              <li key={record.id}>
                <AppLink href={record.href}>
                  <strong>{record.label}</strong>
                  <span>{formatDetail(record.detail)}</span>
                </AppLink>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
};

export default EvidenceTab;
