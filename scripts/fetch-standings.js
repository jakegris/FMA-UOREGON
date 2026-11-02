const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const GAME_URL = process.env.MARKETWATCH_GAME_URL || 'https://www.marketwatch.com/games/fma-fall-2026-investment-game-/rankings';
const GAME_PASSWORD = process.env.GAME_PASSWORD || 'Fall2026';
const MW_EMAIL = process.env.MARKETWATCH_EMAIL;
const MW_PASSWORD = process.env.MARKETWATCH_PASSWORD;
const OUTPUT_FILE = path.resolve(__dirname, '../rankings.csv');

async function run() {
  console.log('Starting MarketWatch rankings automation...');

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu'
    ]
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    acceptDownloads: true
  });

  const page = await context.newPage();

  try {
    // 1. Authenticate via MarketWatch if credentials provided
    if (MW_EMAIL && MW_PASSWORD) {
      console.log('Logging into MarketWatch account...');
      await page.goto('https://accounts.marketwatch.com/login', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
      await page.waitForTimeout(3000);

      const userInput = page.locator('input[type="email"], input[name="username"], input#username, input[type="text"]').first();
      if (await userInput.isVisible({ timeout: 10000 }).catch(() => false)) {
        await userInput.fill(MW_EMAIL);

        const continueBtn = page.locator('button:has-text("Continue"), button:has-text("Next")').first();
        if (await continueBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await continueBtn.click();
          await page.waitForTimeout(2000);
        }

        const passInput = page.locator('input[type="password"], input[name="password"], input#password').first();
        if (await passInput.isVisible({ timeout: 8000 }).catch(() => false)) {
          await passInput.fill(MW_PASSWORD);
          const submitBtn = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Log In")').first();
          if (await submitBtn.isVisible().catch(() => false)) {
            await submitBtn.click();
            console.log('Submitted login credentials. Waiting for session...');
            await page.waitForTimeout(6000);
          }
        }
      }
    }

    // 2. Navigate directly to the Game Rankings Page
    console.log(`Navigating to tournament rankings page: ${GAME_URL}`);
    await page.goto(GAME_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(5000);

    console.log('Current page URL:', page.url());
    console.log('Current page title:', await page.title());

    // 3. Handle Game Password prompt if required
    const gamePassInput = page.locator('input[type="password"], input[name*="pass" i], input[placeholder*="pass" i]').first();
    if (await gamePassInput.isVisible({ timeout: 4000 }).catch(() => false)) {
      console.log('Game password prompt detected. Submitting game password...');
      await gamePassInput.fill(GAME_PASSWORD);
      const enterBtn = page.locator('button[type="submit"], button:has-text("Enter"), button:has-text("Submit"), button:has-text("Join")').first();
      if (await enterBtn.isVisible().catch(() => false)) {
        await enterBtn.click();
        await page.waitForTimeout(5000);
      }
    }

    // 4. Locate and click the Download button on the right side of rankings
    console.log('Searching for the rankings download button...');

    const downloadSelectors = [
      'button:has-text("Download")',
      'a:has-text("Download")',
      'button:has-text("Export")',
      'a:has-text("Export")',
      '[aria-label*="download" i]',
      '[title*="download" i]',
      'a[href*="download" i]',
      'a[href*=".csv" i]',
      'button[class*="download" i]',
      'a[class*="download" i]',
      '.ranking button',
      '.rankings button'
    ];

    let downloaded = false;
    for (const sel of downloadSelectors) {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
        console.log(`Found download button with selector: ${sel}. Clicking to download...`);
        try {
          const [download] = await Promise.all([
            page.waitForEvent('download', { timeout: 15000 }),
            btn.click()
          ]);
          const tempPath = await download.path();
          if (tempPath && fs.existsSync(tempPath)) {
            fs.copyFileSync(tempPath, OUTPUT_FILE);
            console.log(`Successfully downloaded rankings to ${OUTPUT_FILE}`);
            downloaded = true;
            break;
          }
        } catch (dlErr) {
          console.log(`Download event failed for ${sel}:`, dlErr.message);
        }
      }
    }

    // 5. Fallback: If direct download didn't trigger, scrape the rendered table
    if (!downloaded) {
      console.log('Download button not triggered. Falling back to table extraction...');
      await page.waitForSelector('table, [role="table"], tbody tr', { timeout: 10000 }).catch(() => {});

      const rows = await page.locator('table tr, .table tr, [role="row"]').all();
      console.log(`Found ${rows.length} table rows on page.`);
      const csvLines = ['Rank,Player,Portfolio Value,Overall Return'];

      let extractedCount = 0;
      for (const row of rows) {
        const text = await row.innerText().catch(() => '');
        if (!text || (text.toLowerCase().includes('rank') && text.toLowerCase().includes('player'))) continue;

        const cells = await row.locator('td, [role="cell"]').all();
        if (cells.length >= 3) {
          const rowVals = [];
          for (const cell of cells) {
            const raw = (await cell.innerText()).trim().replace(/\n+/g, ' ');
            if (raw) rowVals.push(raw);
          }
          if (rowVals.length >= 3) {
            const line = rowVals.map(v => v.includes(',') ? `"${v}"` : v).join(',');
            csvLines.push(line);
            extractedCount++;
          }
        }
      }

      if (extractedCount > 0) {
        fs.writeFileSync(OUTPUT_FILE, csvLines.join('\n') + '\n', 'utf8');
        console.log(`Successfully extracted ${extractedCount} player rows to ${OUTPUT_FILE}`);
      } else {
        const bodySnippet = (await page.locator('body').innerText().catch(() => '')).slice(0, 500);
        console.log('Page preview text:', bodySnippet);
        throw new Error('Unable to download or extract standings data.');
      }
    }

    console.log('Automation finished successfully!');
  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error('Automation encountered an error:', err);
  process.exit(1);
});
