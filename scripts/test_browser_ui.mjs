import { createRequire } from 'node:module';
const require = createRequire('C:\\Users\\admin\\node_modules');
const { chromium } = require('playwright');

async function testUI() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });
  page.on('pageerror', err => {
    consoleMessages.push({ type: 'pageerror', text: err.message });
  });

  console.log('Navigating to http://127.0.0.1:3080 ...');
  await page.goto('http://127.0.0.1:3080');
  await page.waitForTimeout(4000);

  const errors = consoleMessages.filter(m => m.type === 'error' || m.type === 'pageerror');
  console.log(`Captured ${errors.length} errors:`);
  for (const e of errors) {
    console.log(`[${e.type}] ${e.text}`);
  }

  const pageTitle = await page.title();
  console.log('Page Title:', pageTitle);

  // Check if any error dialog or toast is visible
  const failedToLoad = await page.evaluate(() => {
    const text = document.body.innerText || '';
    return {
      hasFailedToLoadPlugins: text.includes('Failed to load plugins'),
      hasOpencodeError: text.includes('@opencode2dsh/dsh-plugin'),
      bodySnippet: text.slice(0, 300)
    };
  });
  console.log('Failed to load check:', failedToLoad);

  await browser.close();
}

testUI().catch(console.error);
