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

  const testResult = await page.evaluate(() => {
    const composer = document.querySelector('[role="textbox"][contenteditable="true"], [data-composer-input="true"]');
    const editor = composer.__lexicalEditor;

    const log = [];
    editor.update(() => {
      try {
        const pendingState = editor._pendingEditorState;
        const root = pendingState._nodeMap.get('root');
        log.push('root found: ' + !!root);
        log.push('root proto methods: ' + Object.getOwnPropertyNames(Object.getPrototypeOf(root)).join(', '));
        
        const ParagraphKlass = editor._nodes.get('paragraph').klass;
        const TextKlass = editor._nodes.get('text').klass;
        const LineBreakKlass = editor._nodes.get('linebreak')?.klass;

        const p1 = new ParagraphKlass();
        const t1 = new TextKlass('1111');
        p1.append(t1);
        root.append(p1);

        const p2 = new ParagraphKlass();
        const t2 = new TextKlass('> 引用第一行');
        p2.append(t2);
        if (LineBreakKlass) {
          p2.append(new LineBreakKlass());
          p2.append(new TextKlass('> 引用第二行'));
        }
        root.append(p2);

        // 新建一个空段落供输入
        const p3 = new ParagraphKlass();
        root.append(p3);
        
        // 选中 p3 末尾
        p3.select();

        log.push('p3 selected successfully');
      } catch (e) {
        log.push('error in update: ' + e.message + '\n' + e.stack);
      }
    });

    return {
      log,
      composerHTML: composer.innerHTML,
      editorJSON: editor.getEditorState().toJSON()
    };
  });

  console.log('Result:', JSON.stringify(testResult, null, 2));
  await browser.close();
}
testOps();
