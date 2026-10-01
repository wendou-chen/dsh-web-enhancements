/**
 * DSH 客户端通用 DOM 与 React 受控组件穿透工具
 *
 * 同时兼容两种 DSH Composer：
 * - Web 端：<textarea>
 * - DSH Desktop（Electron 2.0.x）：<div contenteditable="true" role="textbox" data-composer-input="true">
 */

export type DshComposer = HTMLTextAreaElement | HTMLElement;

export function unescapeHtml(str: string): string {
  const entityMap: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&#x27;': "'",
    '&#x2F;': '/',
    '&#x60;': '`',
    '&#x3D;': '=',
    '&nbsp;': ' ',
  };
  return str.replace(/&(?:amp|lt|gt|quot|#39|#x27|#x2F|#x60|#x3D|nbsp);/g, (m) => entityMap[m] || m);
}

export function isTextArea(el: Element | null): el is HTMLTextAreaElement {
  return el?.tagName === 'TEXTAREA';
}

export function isContentEditable(el: Element | null): el is HTMLElement {
  return el instanceof HTMLElement && el.isContentEditable;
}

export function findDshTextArea(): HTMLTextAreaElement | null {
  return document.querySelector<HTMLTextAreaElement>(
    'textarea[class*="_input"], textarea[placeholder*="发消息"], textarea[placeholder*="message"], textarea[placeholder*="输入"], textarea',
  );
}

export function findDshComposer(event?: Event): DshComposer | null {
  if (event && event.target instanceof Element) {
    const fromTarget = event.target.closest<HTMLElement>(
      '[data-composer-input="true"], [role="textbox"][contenteditable="true"], [contenteditable="true"], textarea',
    );
    if (fromTarget) return fromTarget;
  }
  if (document.activeElement instanceof Element) {
    const fromActive = document.activeElement.closest<HTMLElement>(
      '[data-composer-input="true"], [role="textbox"][contenteditable="true"], [contenteditable="true"], textarea',
    );
    if (fromActive) return fromActive;
  }

  // 桌面版 Lexical contenteditable 优先，避免误匹配页面中的隐藏 textarea
  const ce = document.querySelector<HTMLElement>(
    '[data-composer-input="true"], [role="textbox"][contenteditable="true"], [role="textbox"][data-lexical-editor="true"]',
  );
  if (ce) return ce;

  const textarea = findDshTextArea();
  if (textarea) return textarea;

  return null;
}

export function getComposerValue(composer: DshComposer): string {
  if (isTextArea(composer)) return composer.value;
  return composer.innerText || composer.textContent || '';
}

export function setReactInputValue(element: HTMLTextAreaElement, value: string): void {
  const proto = window.HTMLTextAreaElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');

  if (descriptor && descriptor.set) {
    descriptor.set.call(element, value);
  } else {
    element.value = value;
  }

  element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true, composed: true }));
  element.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
}

export function setComposerValue(composer: DshComposer, value: string): void {
  if (isTextArea(composer)) {
    setReactInputValue(composer, value);
    return;
  }

  composer.focus();
  const anyComposer = composer as any;
  const lexicalEditor = anyComposer.__lexicalEditor;

  // 先清空 Lexical 编辑器，再整体插入；避免逐命令插入时光标不移动导致重复
  if (lexicalEditor && lexicalEditor._commands) {
    try {
      const clearCmd = Array.from(lexicalEditor._commands.keys()).find((c: any) => c?.type === 'CLEAR_EDITOR_COMMAND');
      if (clearCmd) lexicalEditor.dispatchCommand(clearCmd, undefined);
    } catch (_) {}
  }

  focusComposerEnd(composer);
  document.execCommand('insertText', false, value);

  // 值以换行结尾时，补一个真正的空段落（引用回复后空一行）
  if (/\n\s*$/.test(value) && lexicalEditor && lexicalEditor._commands) {
    try {
      const paragraphCmd = Array.from(lexicalEditor._commands.keys()).find((c: any) => c?.type === 'INSERT_PARAGRAPH_COMMAND');
      if (paragraphCmd) {
        focusComposerEnd(composer);
        lexicalEditor.dispatchCommand(paragraphCmd, undefined);
      }
    } catch (_) {}
  }

  composer.dispatchEvent(new Event('input', { bubbles: true, cancelable: true, composed: true }));
}

export function appendComposerQuote(composer: DshComposer, quoteText: string): void {
  if (isTextArea(composer)) {
    const prev = getComposerValue(composer);
    const next = `${prev.trim() ? prev.replace(/\s+$/, '') + '\n\n' : ''}${quoteText}\n\n`;
    setComposerValue(composer, next);
    focusComposerEnd(composer);
    return;
  }

  composer.focus();
  const anyComposer = composer as any;
  const lexicalEditor = anyComposer.__lexicalEditor;
  if (!lexicalEditor || !lexicalEditor._commands) {
    // 非 Lexical contenteditable 兜底：追加文本 + 两个换行
    const prev = composer.innerText || '';
    const next = `${prev.trim() ? prev.replace(/\s+$/, '') + '\n\n' : ''}${quoteText}\n\n`;
    const selection = window.getSelection();
    selection?.selectAllChildren(composer);
    document.execCommand('insertText', false, next);
    composer.dispatchEvent(new Event('input', { bubbles: true, cancelable: true, composed: true }));
    return;
  }

  try {
    const cmdOf = (type: string) => Array.from(lexicalEditor._commands.keys()).find((c: any) => c?.type === type);
    const insertCmd = cmdOf('CONTROLLED_TEXT_INSERTION_COMMAND');
    const paragraphCmd = cmdOf('INSERT_PARAGRAPH_COMMAND');

    // 光标移到末尾；已有内容时先插入一个段落分隔
    focusComposerEnd(composer);
    const hasPrevious = (composer.innerText || '').trim().length > 0;
    if (hasPrevious && paragraphCmd) {
      lexicalEditor.dispatchCommand(paragraphCmd, undefined);
    }

    // 插入引用文本（仅一次，避免重复）
    if (insertCmd) lexicalEditor.dispatchCommand(insertCmd, quoteText);

    // 引用后补一个空段落（空一行）
    if (paragraphCmd) lexicalEditor.dispatchCommand(paragraphCmd, undefined);

    focusComposerEnd(composer);
    composer.dispatchEvent(new Event('input', { bubbles: true, cancelable: true, composed: true }));
  } catch (_) {}
}

export function focusComposerEnd(composer: DshComposer): void {
  composer.focus();
  if (isTextArea(composer)) {
    const len = composer.value.length;
    composer.setSelectionRange(len, len);
    composer.scrollTop = composer.scrollHeight;
    return;
  }

  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(composer);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

export function insertComposerLineBreak(composer: DshComposer): void {
  composer.focus();

  if (isTextArea(composer)) {
    const start = composer.selectionStart ?? composer.value.length;
    const end = composer.selectionEnd ?? start;
    if (typeof composer.setRangeText === 'function') {
      composer.setRangeText('\n', start, end, 'end');
    } else {
      composer.value = composer.value.slice(0, start) + '\n' + composer.value.slice(end);
      const pos = start + 1;
      composer.selectionStart = pos;
      composer.selectionEnd = pos;
    }
    setReactInputValue(composer, composer.value);
    return;
  }

  // Lexical contenteditable：优先派发 Shift+Enter 原生命令（DSH Lexical 官方注册换行契约）
  try {
    const shiftEnterEv = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    composer.dispatchEvent(shiftEnterEv);
  } catch (_) {}

  // 内部 command 兜底
  const anyComposer = composer as any;
  const lexicalEditor = anyComposer.__lexicalEditor;
  if (lexicalEditor && lexicalEditor._commands) {
    try {
      const cmd = Array.from(lexicalEditor._commands.keys()).find((c: any) => c?.type === 'INSERT_LINE_BREAK_COMMAND');
      if (cmd) {
        lexicalEditor.dispatchCommand(cmd, undefined);
        composer.dispatchEvent(new Event('input', { bubbles: true, cancelable: true, composed: true }));
        return;
      }
    } catch (_) {}
  }

  let inserted = document.execCommand('insertLineBreak');
  if (!inserted) {
    inserted = document.execCommand('insertText', false, '\n');
  }
  if (!inserted) {
    // 最后兜底：直接追加换行
    composer.textContent = composer.textContent || '';
    if (!composer.textContent.endsWith('\n')) composer.textContent += '\n';
  }
  composer.dispatchEvent(new Event('input', { bubbles: true, cancelable: true, composed: true }));
}

export function findSendButton(composer?: DshComposer | null): HTMLButtonElement | null {
  const card = composer ? composer.closest('[data-composer-card="true"], form, [class*="_card"], [class*="_root"]') : null;
  const scope: Element | Document = card || document;
  const buttons = Array.from(scope.querySelectorAll<HTMLButtonElement>('button'));

  const isMenuOrSelectButton = (btn: HTMLButtonElement): boolean => {
    const popup = btn.getAttribute('aria-haspopup');
    if (popup && popup !== 'false') return true;
    const cls = btn.className || '';
    if (cls.includes('select') || cls.includes('Select') || cls.includes('_model')) return true;
    if (btn.hasAttribute('aria-expanded') && !cls.includes('_primary')) return true;
    return false;
  };

  const isStopButton = (btn: HTMLButtonElement): boolean => {
    const label = (btn.getAttribute('aria-label') || '').toLowerCase();
    return label.includes('停止') || label.includes('stop');
  };

  // 1. 优先匹配明确是 primary 的发送/排队按钮
  for (const btn of buttons) {
    if (isMenuOrSelectButton(btn) || isStopButton(btn)) continue;
    const cls = btn.className || '';
    const isPrimary = cls.includes('_primary') || cls.includes('_sendButton') || cls.includes('_send');
    const label = (btn.getAttribute('aria-label') || '').toLowerCase();
    const hasSendLabel = /发送|排队|插话|send|queue|steer/.test(label);
    if (isPrimary && (hasSendLabel || !label)) {
      return btn;
    }
  }

  // 2. 匹配带有明确发送/排队语义的按钮
  for (const btn of buttons) {
    if (isMenuOrSelectButton(btn) || isStopButton(btn)) continue;
    const label = (btn.getAttribute('aria-label') || '').toLowerCase();
    if (/发送|排队|插话|send|queue|steer/.test(label)) {
      return btn;
    }
  }

  // 3. 兜底匹配 trailing 区域中的 primary 按钮（排除模型与停止按钮）
  for (const btn of buttons) {
    if (isMenuOrSelectButton(btn) || isStopButton(btn)) continue;
    if (!btn.closest('[class*="_trailing"]')) continue;
    if ((btn.className || '').includes('_primary')) {
      return btn;
    }
  }

  return document.querySelector<HTMLButtonElement>(
    'button[aria-label="发送消息"], button[aria-label*="发送"], button[aria-label="send message"], button[aria-label*="send"]',
  );
}