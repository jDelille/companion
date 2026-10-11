import Select from "@/components/primitives/select/Select";
import styles from "./page.module.scss";

export default function IntegrationPairPage() {
  return <main className={styles.page}>
    <div className={styles.card}>
      <div className={styles.titles}>
        <h1>Connect an authorized test device</h1>
        <p>This connection is limited to synthetic records selected in Odoo. Kiosk and staff access use different pairing keys.</p>
      </div>
      <form method="post" action="/api/integration/pair" className={styles.form}>
        <label className={styles.field}>Access <Select name="role" ariaLabel="Access" defaultValue="kiosk" options={[{ value: "kiosk", label: "Kiosk" }, { value: "staff", label: "Staff review" }]} /></label>
        <label className={styles.field}>Pairing key <input required name="pairKey" type="password" minLength={32} autoComplete="off" className={styles.input} /></label>
        <button type="submit" className={styles.submit}>Connect test device</button>
      </form>
    </div>
  </main>;
}
