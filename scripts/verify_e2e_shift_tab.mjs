import crypto from 'node:crypto';
import fs from 'node:fs';
import yaml from 'file:///C:/Users/admin/AppData/Roaming/npm/node_modules/@deepseek-ai/dsh/node_modules/yaml/dist/index.js';
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/admin/node_modules');
const { chromium } = require('playwright');

const CREDENTIALS_PATH = 'C:/Users/admin/.dsh/.credentials.yaml';
const credDoc = yaml.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
const secretStr = credDoc?.records?.['client-connection/browser-session']?.payload?.secret;

function encodeBase64Url(buf) { return buf.toString('base64url'); }
function signature(sec, body) { return crypto.createHmac('sha256', Buffer.from(sec, 'base64url')).update(body).digest(); }
function encodeCookie(payload, sec) {
  const body = encodeBase64Url(Buffer.from(JSON.stringify(payload), 'utf8'));
  return 'v1.' + body + '.' + encodeBase64Url(signature(sec, body));
}
function cookieName(authority) {
  return 'dsh-auth-' + encodeBase64Url(crypto.createHash('sha256').update(authority).digest());
}

const authority = '127.0.0.1:3080';
const now = Date.now();
const cookieVal = encodeCookie({
  version: 1,
  authority,
  issuedAt: now,
  expiresAt: now + 86400000 * 30
}, secretStr);
const cName = cookieName(authority);

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext();
  await context.addCookies([{ name: cName, value: cookieVal, domain: '127.0.0.1', path: '/' }]);
  const page = await context.newPage();
  
  await page.goto('http://127.0.0.1:3080');
  await page.waitForTimeout(3500);

  // Click new session in Obsidian Vault
  await page.evaluate(() => {
    const row = document.querySelector('.YDXeBa_projectRow');
    if (!row) return;
    const newBtn = Array.from(row.querySelectorAll('button')).find(b => {
      const title = b.getAttribute('title') || b.getAttribute('aria-label') || '';
      return title.includes('新会话') || title.includes('新建') || title.includes('New');
    });
    if (newBtn) newBtn.click();
  });
  await page.waitForSelector('[role="textbox"][contenteditable="true"]', { timeout: 8000 });
  await page.waitForTimeout(500);

  const composer = await page.$('[role="textbox"][contenteditable="true"]');
  await composer.click();
  await page.waitForTimeout(200);

  console.log('=== Test A: Empty Composer Shift+Tab Cycle ===');

  // 1. First Shift+Tab -> Plan Mode
  await page.keyboard.press('Shift+Tab');
  await page.waitForTimeout(600);

  let state1 = await page.evaluate(() => {
    const comp = document.querySelector('[role="textbox"][contenteditable="true"]');
    const yellowSpan = comp.querySelector('span[style*="var(--dsw-alias-state-warn-label)"]');
    return {
      innerHTML: comp.innerHTML,
      innerText: comp.innerText,
      hasYellowSpan: !!yellowSpan,
      yellowText: yellowSpan ? yellowSpan.textContent : null
    };
  });
  console.log('1. First Shift+Tab (Expect Yellow /plan ):', JSON.stringify(state1, null, 2));

  // 2. Second Shift+Tab -> Goal Mode
  await page.keyboard.press('Shift+Tab');
  await page.waitForTimeout(600);

  let state2 = await page.evaluate(() => {
    const comp = document.querySelector('[role="textbox"][contenteditable="true"]');
    const yellowSpan = comp.querySelector('span[style*="var(--dsw-alias-state-warn-label)"]');
    return {
      innerHTML: comp.innerHTML,
      innerText: comp.innerText,
      hasYellowSpan: !!yellowSpan,
      yellowText: yellowSpan ? yellowSpan.textContent : null
    };
  });
  console.log('2. Second Shift+Tab (Expect Yellow /goal ):', JSON.stringify(state2, null, 2));

  // 3. Third Shift+Tab -> Standard Mode
  await page.keyboard.press('Shift+Tab');
  await page.waitForTimeout(600);

  let state3 = await page.evaluate(() => {
    const comp = document.querySelector('[role="textbox"][contenteditable="true"]');
    const yellowSpan = comp.querySelector('span[style*="var(--dsw-alias-state-warn-label)"]');
    return {
      innerHTML: comp.innerHTML,
      innerText: comp.innerText,
      hasYellowSpan: !!yellowSpan
    };
  });
  console.log('3. Third Shift+Tab (Expect Standard / Empty):', JSON.stringify(state3, null, 2));

  console.log('=== Test B: Shift+Tab with Existing User Input ===');
  await page.keyboard.type('请帮我讲解多元函数微分法');
  await page.waitForTimeout(400);

  await page.keyboard.press('Shift+Tab');
  await page.waitForTimeout(600);

  let stateB = await page.evaluate(() => {
    const comp = document.querySelector('[role="textbox"][contenteditable="true"]');
    const yellowSpan = comp.querySelector('span[style*="var(--dsw-alias-state-warn-label)"]');
    return {
      innerHTML: comp.innerHTML,
      innerText: comp.innerText,
      hasYellowSpan: !!yellowSpan,
      yellowText: yellowSpan ? yellowSpan.textContent : null
    };
  });
  console.log('Test B (Plan Mode with user text):', JSON.stringify(stateB, null, 2));

  const allPassed = 
    state1.hasYellowSpan && state1.yellowText === '/plan ' &&
    state2.hasYellowSpan && state2.yellowText === '/goal ' &&
    !state3.hasYellowSpan &&
    stateB.hasYellowSpan && stateB.yellowText === '/plan ' && stateB.innerText.includes('请帮我讲解多元函数微分法');

  console.log('\n========================================');
  console.log('E2E Shift+Tab Verification Passed:', allPassed ? 'YES [PASS]' : 'NO [FAIL]');
  console.log('========================================\n');

  await browser.close();
  if (!allPassed) process.exit(1);
})();