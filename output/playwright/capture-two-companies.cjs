const { chromium } = require('@playwright/test');
const fs = require('fs');
function readEnv(path) {
  const out = {};
  for (const line of fs.readFileSync(path, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#') || !line.includes('=')) continue;
    const idx = line.indexOf('=');
    out[line.slice(0, idx).trim()] = line.slice(idx + 1);
  }
  return out;
}
(async () => {
  const env = readEnv('anlage/.env.local');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto('https://schnellsicherumzug.de/pdf-anlage/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="password"]', env.ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'output/playwright/final-two-companies-dashboard.png', fullPage: false });
  const options = await page.locator('select option').allTextContents();
  console.log(options.join(' | '));
  await browser.close();
})();
