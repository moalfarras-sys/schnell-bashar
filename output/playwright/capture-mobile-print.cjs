const { chromium, devices } = require('@playwright/test');
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
  const context = await browser.newContext(devices['iPhone 12']);
  const page = await context.newPage();
  await page.goto('https://schnellsicherumzug.de/pdf-anlage/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="password"]', env.ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);
  const create = await page.request.post('https://schnellsicherumzug.de/pdf-anlage/api/jobs', {
    data: { companyId: 'punktlich-umzuege' },
    headers: { cookie: (await context.cookies()).map(c => `${c.name}=${c.value}`).join('; ') }
  });
  const job = await create.json();
  await page.goto(`https://schnellsicherumzug.de/pdf-anlage/print/angebot/${job.id}`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'output/playwright/mobile-print-punktlich-fixed.png', fullPage: true });
  console.log(`${create.status()} ${job.id}`);
  await browser.close();
})();
