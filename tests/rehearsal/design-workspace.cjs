// UI-only regression against the existing explicit demo mode. Never use real tenants.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const base = process.env.DESIGN_TEST_URL || 'http://127.0.0.1:3101';
  assert(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Local demo only');
  const evidence = process.env.DESIGN_EVIDENCE_DIR || '/tmp/dojang-design-evidence';
  fs.mkdirSync(evidence, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/people`);
    await page.getByText('Preview · Sample data', { exact: true }).waitFor();
    await page.getByRole('heading', { name: 'Members', exact: true }).waitFor();
    assert.equal(await page.locator('main a[href^="/people/"]').count(), 8);
    await page.screenshot({ animations: 'disabled', path: path.join(evidence, 'members-desktop.png') });
    await page.getByRole('button', { name: 'Filter by membership status' }).click();
    await page.getByRole('option', { name: 'paused', exact: true }).click();
    assert.equal(await page.locator('main a[href^="/people/"]').count(), 1);
    await page.getByRole('link', { name: 'Theo Nguyen', exact: true }).waitFor();
    await page.getByRole('searchbox', { name: 'Search members' }).fill('Maya');
    await page.getByText('No members match these filters.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await page.getByRole('searchbox', { name: 'Search members' }).fill('D-1046');
    await page.getByRole('link', { name: 'Theo Nguyen', exact: true }).click();
    await page.getByRole('heading', { name: 'Theo Nguyen', exact: true }).waitFor();
    assert.equal(await page.getByRole('heading', { name: 'Maya Chen', exact: true }).count(), 0);
    await page.screenshot({ animations: 'disabled', path: path.join(evidence, 'member-desktop.png') });
    await page.goto(base);
    await page.getByRole('heading', { name: 'Today', exact: true }).waitFor();
    await page.getByText('Today’s schedule', { exact: true }).waitFor();
    await page.screenshot({ animations: 'disabled', path: path.join(evidence, 'today-desktop.png') });
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`${base}/people`);
      await page.getByRole('link', { name: 'Theo Nguyen', exact: true }).waitFor();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `page overflow at ${width}`);
      assert(await page.locator('main').evaluate(el => el.scrollWidth <= el.clientWidth), `main overflow at ${width}`);
      await page.screenshot({ animations: 'disabled', path: path.join(evidence, `members-${width}.png`) });
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(base);
    await page.getByRole('heading', { name: 'Today', exact: true }).waitFor();
    await page.getByText('Today’s schedule', { exact: true }).waitFor();
    const dock = page.locator('[data-collapsed]');
    await page.locator('main').evaluate(el => el.scrollTop = 80);
    await page.waitForFunction(() => document.querySelector('[data-collapsed]')?.getAttribute('data-collapsed') === 'true');
    assert.equal(await dock.getAttribute('data-collapsed'), 'true');
    assert.deepEqual(errors, []);
    console.log('PASS: directory search + status filter + clear, exact member navigation, desktop/390/320 layouts, existing dock collapse. Demo records only; no Odoo or staging acceptance claim.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
