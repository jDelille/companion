import Select from "@/components/primitives/select/Select";
import styles from "./page.module.scss";
import AutoConnect from "./AutoConnect";

// A kiosk link can carry its key: /integration/pair?key=… fills it in and connects at once
export default async function IntegrationPairPage({ searchParams }: { searchParams: Promise<{ key?: string }> }) {
  const { key } = await searchParams;
  const linkKey = typeof key === "string" && key.length >= 32 ? key : "";
  return <main className={styles.page}>
    <div className={styles.card}>
      <div className={styles.titles}>
        <h1>Connect an authorized test device</h1>
        <p>This connection is limited to synthetic records selected in Odoo. Kiosk and staff access use different pairing keys.</p>
      </div>
      <form id="pair-form" method="post" action="/api/integration/pair" className={styles.form}>
        <label className={styles.field}>Access <Select name="role" ariaLabel="Access" defaultValue="kiosk" options={[{ value: "kiosk", label: "Kiosk" }, { value: "staff", label: "Staff review" }]} /></label>
        <label className={styles.field}>Pairing key <input required name="pairKey" type="password" minLength={32} autoComplete="off" defaultValue={linkKey} className={styles.input} /></label>
        <button type="submit" className={styles.submit}>Connect test device</button>
      </form>
    </div>
    {linkKey && <AutoConnect formId="pair-form" />}
  </main>;
}
