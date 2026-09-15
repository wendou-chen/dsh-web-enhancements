import crypto from 'node:crypto';
import fs from 'node:fs';
import yaml from 'file:///C:/Users/admin/AppData/Roaming/npm/node_modules/@deepseek-ai/dsh/node_modules/yaml/dist/index.js';
import { createRequire } from 'node:module';
const require = createRequire('C:\\Users\\admin\\node_modules');
const { chromium } = require('playwright');

const CREDENTIALS_PATH = 'C:\\Users\\admin\\.dsh\\.credentials.yaml';
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

async function testBrowser() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext();
  
  // Set the auth cookie
  await context.addCookies([{
    name: cName,
    value: cookieVal,
    domain: '127.0.0.1',
    path: '/',
    httpOnly: true,
    sameSite: 'Strict'
  }]);

  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => {
    consoleErrors.push('PAGEERROR: ' + err.message);
  });

  await page.goto('http://127.0.0.1:3080');
  await page.waitForTimeout(4000);

  const title = await page.title();
  console.log('Page title:', title);
  console.log('Console errors count:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.log('Errors:', consoleErrors);
  }

  const check = await page.evaluate(() => {
    const text = document.body.innerText || '';
    return {
      hasFailedToLoad: text.includes('Failed to load plugins'),
      hasOpencodeError: text.includes('@opencode2dsh/dsh-plugin'),
      hasInput: !!document.querySelector('textarea, [contenteditable="true"]'),
      pillCount: document.querySelectorAll('.dsh-action-pill').length
    };
  });
  console.log('UI state check:', check);

  await browser.close();
}

testBrowser().catch(console.error);
