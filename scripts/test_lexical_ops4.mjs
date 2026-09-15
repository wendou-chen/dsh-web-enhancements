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

async function testScenario1() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext();
  await context.addCookies([{ name: cName, value: cookieVal, domain: '127.0.0.1', path: '/' }]);
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:3080');
  await page.waitForTimeout(3000);

  console.log('--- 测试 1：已有 1111 时追加引用，随后打字 ---');
  await page.click('[role="textbox"][contenteditable="true"]');
  await page.keyboard.type('1111');
  await page.waitForTimeout(300);

  // 执行 appendComposerQuote 逻辑
  await page.evaluate(() => {
    const composer = document.querySelector('[role="textbox"][contenteditable="true"], [data-composer-input="true"]');
    const editor = composer.__lexicalEditor;

    editor.update(() => {
      const root = editor._pendingEditorState._nodeMap.get('root');
      const sel = root.selectEnd();
      const hasText = root.getTextContent().trim().length > 0;
      if (hasText) {
        sel.insertParagraph();
      }

      const quoteText = '> 第一行引用\n> 第二行引用';
      const lines = quoteText.split('\n');
      lines.forEach((line, idx) => {
        if (idx > 0) {
          sel.insertLineBreak();
        }
        sel.insertText(line);
      });

      sel.insertParagraph();
    });
    editor.focus();
  });

  await page.waitForTimeout(200);

  // 随后直接键入 'typing-after-quote'
  await page.keyboard.type('typing-after-quote');
  await page.waitForTimeout(300);

  const state1 = await page.evaluate(() => {
    const composer = document.querySelector('[role="textbox"][contenteditable="true"]');
    const editor = composer.__lexicalEditor;
    const paragraphs = Array.from(composer.querySelectorAll('p')).map(p => p.textContent);
    return {
      innerHTML: composer.innerHTML,
      paragraphs,
      editorJSON: editor.getEditorState().toJSON()
    };
  });
  console.log('State 1 (已有 1111 + 引用 + 打字):', JSON.stringify(state1, null, 2));

  // 测试 IME 输入模拟
  console.log('--- 测试 2：IME 输入模拟 ---');
  const client = await context.newCDPSession(page);
  await client.send('Input.imeSetComposition', {
    text: "gam'ma",
    selectionStart: 6,
    selectionEnd: 6
  });
  await page.waitForTimeout(200);
  await client.send('Input.insertText', { text: 'γ' });
  await page.waitForTimeout(300);

  const state2 = await page.evaluate(() => {
    const composer = document.querySelector('[role="textbox"][contenteditable="true"]');
    const paragraphs = Array.from(composer.querySelectorAll('p')).map(p => p.textContent);
    return {
      innerHTML: composer.innerHTML,
      paragraphs
    };
  });
  console.log('State 2 (IME 输入后):', JSON.stringify(state2, null, 2));

  await browser.close();
}
testScenario1();
