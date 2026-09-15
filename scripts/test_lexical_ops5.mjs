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

async function testFocus() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext();
  await context.addCookies([{ name: cName, value: cookieVal, domain: '127.0.0.1', path: '/' }]);
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:3080');
  await page.waitForTimeout(3000);

  const focusInfo = await page.evaluate(() => {
    function findDeepestLastLeaf(root) {
      let curr = root;
      while (curr.lastChild) {
        curr = curr.lastChild;
      }
      if (curr === root) {
        return { node: root, offset: 0 };
      }
      if (curr.nodeType === Node.TEXT_NODE) {
        return { node: curr, offset: curr.nodeValue?.length || 0 };
      }
      const parent = curr.parentNode;
      if (parent) {
        const idx = Array.prototype.indexOf.call(parent.childNodes, curr);
        return { node: parent, offset: idx + 1 };
      }
      return { node: curr, offset: 0 };
    }

    const composer = document.querySelector('[role="textbox"][contenteditable="true"]');
    const editor = composer.__lexicalEditor;

    editor.update(() => {
      const root = editor._pendingEditorState._nodeMap.get('root');
      const sel = root.selectEnd();
      sel.insertText('> 引用内容');
      sel.insertParagraph();
    });

    const leaf = findDeepestLastLeaf(composer);
    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.setStart(leaf.node, leaf.offset);
      range.setEnd(leaf.node, leaf.offset);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    return {
      innerHTML: composer.innerHTML,
      anchorNodeName: selection.anchorNode.nodeName,
      anchorOffset: selection.anchorOffset,
      isCollapsed: selection.isCollapsed
    };
  });

  console.log('Focus Info after append & focusComposerEnd:', focusInfo);

  // 打字测试
  await page.keyboard.type('typed_on_new_line');
  await page.waitForTimeout(200);

  const finalHtml = await page.evaluate(() => {
    const composer = document.querySelector('[role="textbox"][contenteditable="true"]');
    return composer.innerHTML;
  });
  console.log('Final HTML:', finalHtml);

  await browser.close();
}
testFocus();
