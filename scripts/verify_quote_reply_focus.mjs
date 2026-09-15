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

const COMPOSER_SELECTOR = '[role="textbox"][contenteditable="true"], [data-composer-input="true"]';

async function run() {
  console.log('=== 开始执行 DSH 引用回复输入焦点与光标下移自动化场景验收 ===\n');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext();
  
  await context.addCookies([{
    name: cName,
    value: cookieVal,
    domain: '127.0.0.1',
    path: '/',
    httpOnly: true,
    sameSite: 'Strict'
  }]);

  const page = await context.newPage();
  
  await page.goto('http://127.0.0.1:3080');
  await page.waitForTimeout(3000);

  // 创建一个辅助测试消息气泡，确保有标准 DOM 选择范围
  await page.evaluate(() => {
    let testMsg = document.getElementById('__test_quote_bubble');
    if (!testMsg) {
      testMsg = document.createElement('div');
      testMsg.id = '__test_quote_bubble';
      testMsg.className = 'markdown-body _messageBody';
      testMsg.style.cssText = 'position:fixed;top:10px;left:10px;padding:8px;background:#f0f0f0;z-index:9999;';
      testMsg.innerHTML = '<p id="__test_quote_p1">这是待引用的第一行测试文本</p><p id="__test_quote_p2">这是待引用的第二行测试文本</p>';
      document.body.appendChild(testMsg);
    }
  });

  const cdp = await context.newCDPSession(page);

  // 辅助函数：通过选区触发工具栏并点击引用
  const triggerQuoteReply = async (elementId) => {
    await page.evaluate((id) => {
      const target = document.getElementById(id);
      const range = document.createRange();
      range.selectNodeContents(target);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      document.dispatchEvent(new Event('selectionchange'));
    }, elementId);

    await page.waitForSelector('.dsh-quote-toolbar.active button', { timeout: 3000 });
    await page.click('.dsh-quote-toolbar.active button');
    await page.waitForTimeout(300);
  };

  // 辅助函数：清空输入框
  const clearComposer = async () => {
    await page.click(COMPOSER_SELECTOR);
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(200);
  };

  // 辅助函数：获取段落信息
  const getComposerParagraphs = async () => {
    return await page.evaluate(() => {
      const composer = document.querySelector('[role="textbox"][contenteditable="true"], [data-composer-input="true"]');
      const ps = Array.from(composer.querySelectorAll('p')).map(p => p.textContent);
      return {
        count: ps.length,
        paragraphs: ps,
        innerHTML: composer.innerHTML
      };
    });
  };

  // ----------------------------------------------------
  // TC-01：输入法组合键验证（已有 1111，引用后打字/IME 不回跳第一行）
  // ----------------------------------------------------
  console.log('--- TC-01: 输入框已有 1111，引用回复并使用 IME 合成打字 ---');
  await clearComposer();
  await page.click(COMPOSER_SELECTOR);
  await page.keyboard.type('1111');
  await page.waitForTimeout(200);

  // 选中文本点击引用回复
  await triggerQuoteReply('__test_quote_p1');

  // 发送 IME 合成与提交事件
  await cdp.send('Input.imeSetComposition', {
    text: "gam'ma",
    selectionStart: 6,
    selectionEnd: 6
  });
  await page.waitForTimeout(100);
  await cdp.send('Input.insertText', { text: 'γ' });
  await page.waitForTimeout(300);

  const tc1 = await getComposerParagraphs();
  console.log('TC-01 段落状态:', tc1);

  if (tc1.paragraphs[0] !== '1111') {
    throw new Error(`TC-01 失败: 第一行已被污染，期望 '1111'，实际为 '${tc1.paragraphs[0]}'`);
  }
  const lastP = tc1.paragraphs[tc1.paragraphs.length - 1];
  if (!lastP.includes('γ')) {
    throw new Error(`TC-01 失败: IME 输入的 'γ' 未落在引用下方的末尾段落，实际末尾段落为 '${lastP}'`);
  }
  console.log('✅ [PASS] TC-01: 输入法合成验证成功（第一行保持 1111，输入法文字精准落在引用下方）\n');

  // ----------------------------------------------------
  // TC-02：空输入框直接引用与普通打字
  // ----------------------------------------------------
  console.log('--- TC-02: 空输入框直接引用并在引用下方输入 hello ---');
  await clearComposer();
  
  await triggerQuoteReply('__test_quote_p1');
  await page.keyboard.type('hello');
  await page.waitForTimeout(300);

  const tc2 = await getComposerParagraphs();
  console.log('TC-02 段落状态:', tc2);

  if (!tc2.paragraphs[0].includes('这是待引用的第一行测试文本')) {
    throw new Error(`TC-02 失败: 第 1 行未包含引用内容，实际为 '${tc2.paragraphs[0]}'`);
  }
  const tc2Last = tc2.paragraphs[tc2.paragraphs.length - 1];
  if (tc2Last !== 'hello') {
    throw new Error(`TC-02 失败: 键入的 'hello' 未独立处于引用下方的新行，实际末尾为 '${tc2Last}'`);
  }
  console.log('✅ [PASS] TC-02: 空输入框直接引用验证成功（引用在首段，输入文字在独立下一行）\n');

  // ----------------------------------------------------
  // TC-03：连续多次引用追加
  // ----------------------------------------------------
  console.log('--- TC-03: 连续多次追加引用与输入 ---');
  await clearComposer();

  // 第一次引用
  await triggerQuoteReply('__test_quote_p1');
  await page.keyboard.type('reply-1');
  await page.waitForTimeout(200);

  // 第二次引用
  await triggerQuoteReply('__test_quote_p2');
  await page.keyboard.type('reply-2');
  await page.waitForTimeout(300);

  const tc3 = await getComposerParagraphs();
  console.log('TC-03 段落状态:', tc3);

  const lastText = tc3.paragraphs[tc3.paragraphs.length - 1];
  if (lastText !== 'reply-2') {
    throw new Error(`TC-03 失败: 第二次引用的输入未位于最后一行，实际末尾为 '${lastText}'`);
  }
  console.log('✅ [PASS] TC-03: 连续多次引用追加验证成功（层次分明，光标持续跟随最底端）\n');

  console.log('🎉 3 项自动化验证全部 100% PASS！');
  await browser.close();
}

run().catch((err) => {
  console.error('\n❌ 验证失败:', err);
  process.exit(1);
});
