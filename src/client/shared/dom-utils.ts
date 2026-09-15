/**
 * DSH 客户端通用 DOM 与 React 受控组件穿透工具
 *
 * 同时兼容两种 DSH Composer：
 * - Web 端 / Desktop 端：<div contenteditable="true" role="textbox" data-composer-input="true">（基于 Lexical）
 * - 纯文本兜底端：<textarea>
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

export function findDshComposer(): DshComposer | null {
  // 桌面/Web 端 Lexical contenteditable 优先，避免误匹配页面中的隐藏 textarea
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

function findDeepestLastLeaf(root: Node): { node: Node; offset: number } {
  let curr: Node = root;
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

export function focusComposerEnd(composer: DshComposer): void {
  try {
    composer.focus({ preventScroll: false });
  } catch (_) {
    composer.focus();
  }

  if (isTextArea(composer)) {
    const len = composer.value.length;
    try {
      composer.setSelectionRange(len, len);
    } catch (_) {}
    composer.scrollTop = composer.scrollHeight;
    return;
  }

  const anyComposer = composer as any;
  const lexicalEditor = anyComposer.__lexicalEditor;
  if (lexicalEditor && typeof lexicalEditor.update === 'function') {
    try {
      lexicalEditor.update(() => {
        const root = lexicalEditor._pendingEditorState?._nodeMap?.get('root');
        root?.selectEnd();
      });
      lexicalEditor.focus?.();
    } catch (_) {}
  }

  const selection = window.getSelection();
  if (!selection) return;

  try {
    const leaf = findDeepestLastLeaf(composer);
    const range = document.createRange();
    range.setStart(leaf.node, leaf.offset);
    range.setEnd(leaf.node, leaf.offset);
    selection.removeAllRanges();
    selection.addRange(range);
  } catch (_) {
    const range = document.createRange();
    range.selectNodeContents(composer);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

export function setComposerValue(composer: DshComposer, value: string): void {
  if (isTextArea(composer)) {
    setReactInputValue(composer, value);
    return;
  }

  const anyComposer = composer as any;
  const lexicalEditor = anyComposer.__lexicalEditor;

  if (lexicalEditor && typeof lexicalEditor.update === 'function') {
    lexicalEditor.update(() => {
      const root = lexicalEditor._pendingEditorState?._nodeMap?.get('root');
      if (!root) return;
      root.clear();

      if (!value) {
        const ParagraphKlass = lexicalEditor._nodes?.get('paragraph')?.klass;
        if (ParagraphKlass) {
          const p = new ParagraphKlass();
          root.append(p);
          p.select();
        }
        return;
      }

      const sel = root.selectEnd();
      const lines = value.split('\n');
      lines.forEach((line: string, idx: number) => {
        if (idx > 0) {
          sel.insertLineBreak();
        }
        if (line) {
          sel.insertText(line);
        }
      });
      if (/\n\s*$/.test(value)) {
        sel.insertParagraph();
      }
    });

    try {
      lexicalEditor.focus();
    } catch (_) {
      composer.focus();
    }
    focusComposerEnd(composer);
    composer.dispatchEvent(new Event('input', { bubbles: true, cancelable: true, composed: true }));
    return;
  }

  composer.focus();
  focusComposerEnd(composer);
  document.execCommand('selectAll', false);
  document.execCommand('insertText', false, value);
  focusComposerEnd(composer);
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

  const anyComposer = composer as any;
  const lexicalEditor = anyComposer.__lexicalEditor;

  if (lexicalEditor && typeof lexicalEditor.update === 'function') {
    lexicalEditor.update(() => {
      const root = lexicalEditor._pendingEditorState?._nodeMap?.get('root');
      if (!root) return;

      const sel = root.selectEnd();
      const hasText = (root.getTextContent() || '').trim().length > 0;
      if (hasText) {
        sel.insertParagraph();
      }

      const lines = quoteText.split('\n');
      lines.forEach((line: string, idx: number) => {
        if (idx > 0) {
          sel.insertLineBreak();
        }
        if (line) {
          sel.insertText(line);
        }
      });

      // 引用插入完成后，再次调用 insertParagraph() 生成供用户直接输入的独立空段落
      sel.insertParagraph();
    });

    try {
      lexicalEditor.focus();
    } catch (_) {
      composer.focus();
    }
    focusComposerEnd(composer);
    composer.dispatchEvent(new Event('input', { bubbles: true, cancelable: true, composed: true }));
    return;
  }

  // 非 Lexical contenteditable 降级兜底
  composer.focus();
  const prev = composer.innerText || '';
  const next = `${prev.trim() ? prev.replace(/\s+$/, '') + '\n\n' : ''}${quoteText}\n\n`;
  const selection = window.getSelection();
  selection?.selectAllChildren(composer);
  document.execCommand('insertText', false, next);
  focusComposerEnd(composer);
  composer.dispatchEvent(new Event('input', { bubbles: true, cancelable: true, composed: true }));
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

  // contenteditable：优先走 Lexical 官方 INSERT_LINE_BREAK_COMMAND，保留编辑器 state
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
    composer.textContent = composer.textContent || '';
    if (!composer.textContent.endsWith('\n')) composer.textContent += '\n';
  }
  composer.dispatchEvent(new Event('input', { bubbles: true, cancelable: true, composed: true }));
}

export function isStopButton(btn: HTMLButtonElement): boolean {
  const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
  const title = (btn.getAttribute('title') || '').toLowerCase();
  const text = (btn.innerText || '').toLowerCase();
  return /停止|stop|终止|cancel|取消/.test(aria) || /停止|stop|终止|cancel|取消/.test(title) || /停止|stop|终止|cancel|取消/.test(text);
}

export function findSendButton(): HTMLButtonElement | null {
  const candidates = Array.from(document.querySelectorAll<HTMLButtonElement>(
    'button[aria-label*="发送"], button[aria-label*="send"], [class*="_sendButton"] button, button[class*="_primary"]'
  ));
  for (const btn of candidates) {
    if (isStopButton(btn)) {
      continue;
    }
    const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
    const text = (btn.innerText || '').toLowerCase();
    if (/发送|send/.test(aria) || /发送|send/.test(text) || btn.className.includes('_sendButton')) {
      return btn;
    }
  }
  return null;
}

export function isAgentRunning(): boolean {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('button')).some(isStopButton);
}
