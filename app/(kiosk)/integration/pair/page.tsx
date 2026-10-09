export default function IntegrationPairPage() {
  return <main><h1>Connect an authorized test device</h1>
    <p>This connection is limited to synthetic records selected in Odoo. Kiosk and staff access use different pairing keys.</p>
    <form method="post" action="/api/integration/pair">
      <label>Access <select name="role"><option value="kiosk">Kiosk</option><option value="staff">Staff review</option></select></label>
      <label>Pairing key <input required name="pairKey" type="password" minLength={32} autoComplete="off" /></label>
      <button type="submit">Connect test device</button>
    </form>
  </main>;
}
