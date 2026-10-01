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
  await page.waitForTimeout(3000);

  // Click new session in Obsidian Vault
  await page.evaluate(() => {
    const row = document.querySelector('.YDXeBa_projectRow');
    const newBtn = Array.from(row.querySelectorAll('button')).find(b => {
      const title = b.getAttribute('title') || b.getAttribute('aria-label') || '';
      return title.includes('新会话') || title.includes('新建') || title.includes('New');
    });
    if (newBtn) newBtn.click();
  });
  await page.waitForTimeout(2000);

  const composer = await page.$('[role="textbox"][contenteditable="true"]');
  await composer.click();
  await page.waitForTimeout(300);

  const getCompText = async () => {
    return page.evaluate(() => {
      const comp = document.querySelector('[role="textbox"][contenteditable="true"]');
      const editor = comp?.__lexicalEditor;
      if (editor) {
        let t = '';
        editor.getEditorState().read(() => {
          const root = editor.getEditorState()._nodeMap.get('root');
          t = root?.getTextContent?.() || '';
        });
        return t;
      }
      return comp?.innerText || '';
    });
  };

  const results = [];

  // Initial text
  results.push({ action: 'Initial text', text: await getCompText() });

  // Press Shift+Tab (empty -> plan)
  await page.keyboard.press('Shift+Tab');
  await page.waitForTimeout(300);
  results.push({ action: '1st Shift+Tab (empty -> plan)', text: await getCompText() });

  // Press Shift+Tab (plan -> goal)
  await page.keyboard.press('Shift+Tab');
  await page.waitForTimeout(300);
  results.push({ action: '2nd Shift+Tab (plan -> goal)', text: await getCompText() });

  // Press Shift+Tab (goal -> standard)
  await page.keyboard.press('Shift+Tab');
  await page.waitForTimeout(300);
  results.push({ action: '3rd Shift+Tab (goal -> standard)', text: await getCompText() });

  // Now type some prompt text
  await page.keyboard.type('帮我复习考研数学第六章');
  await page.waitForTimeout(300);
  results.push({ action: 'Typed prompt', text: await getCompText() });

  // Press Shift+Tab with text (standard -> plan)
  await page.keyboard.press('Shift+Tab');
  await page.waitForTimeout(300);
  results.push({ action: 'Shift+Tab with text (standard -> plan)', text: await getCompText() });

  // Press Shift+Tab with text (plan -> goal)
  await page.keyboard.press('Shift+Tab');
  await page.waitForTimeout(300);
  results.push({ action: 'Shift+Tab with text (plan -> goal)', text: await getCompText() });

  // Press Shift+Tab with text (goal -> standard)
  await page.keyboard.press('Shift+Tab');
  await page.waitForTimeout(300);
  results.push({ action: 'Shift+Tab with text (goal -> standard)', text: await getCompText() });

  console.log('Real Shift+Tab interactive results:\n', JSON.stringify(results, null, 2));

  await browser.close();
})();