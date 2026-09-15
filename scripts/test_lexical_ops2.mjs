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

async function testOps() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext();
  await context.addCookies([{ name: cName, value: cookieVal, domain: '127.0.0.1', path: '/' }]);
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:3080');
  await page.waitForTimeout(3000);

  // 先在输入框打字 '1111'
  await page.click('[role="textbox"][contenteditable="true"]');
  await page.keyboard.type('1111');
  await page.waitForTimeout(500);

  const testResult = await page.evaluate(() => {
    const composer = document.querySelector('[role="textbox"][contenteditable="true"], [data-composer-input="true"]');
    const editor = composer.__lexicalEditor;

    const editorState = editor.getEditorState();
    const nodeMap = editorState._nodeMap;
    const nodeKeys = Array.from(nodeMap.keys());
    const nodesInfo = nodeKeys.map(k => {
      const n = nodeMap.get(k);
      return {
        key: k,
        type: n.__type,
        text: n.__text,
        parent: n.__parent,
        children: n.__children,
        methods: Object.getOwnPropertyNames(Object.getPrototypeOf(n))
      };
    });

    return {
      composerHTML: composer.innerHTML,
      nodesInfo
    };
  });

  console.log('Result with 1111:', JSON.stringify(testResult, null, 2));
  await browser.close();
}
testOps();
