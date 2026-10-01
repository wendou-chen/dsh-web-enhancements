import { selectionToMarkdown } from './deserializer.js';
import {
  appendComposerQuote,
  findDshComposer,
} from '../../shared/dom-utils.js';
import { showToast } from '../../shared/toast.js';

const STORAGE_KEY = 'dsh_quote_reply_enabled';

export interface QuoteReplyController {
  isEnabled: () => boolean;
  toggle: () => void;
  setEnabled: (val: boolean, notify?: boolean) => void;
  onChanged: (cb: (enabled: boolean) => void) => () => void;
  dispose: () => void;
}

export function initQuoteReply(): QuoteReplyController {
  let isEnabled = localStorage.getItem(STORAGE_KEY) !== 'false';
  const listeners = new Set<(enabled: boolean) => void>();

  const notifyListeners = () => {
    listeners.forEach((cb) => {
      try {
        cb(isEnabled);
      } catch (_) {}
    });
  };

  const setEnabled = (val: boolean, notify = true) => {
    isEnabled = val;
    if (!val) {
      toolbar.classList.remove('active', 'is-visible');
    }
    try {
      localStorage.setItem(STORAGE_KEY, val ? 'true' : 'false');
    } catch (_) {}
    notifyListeners();
    if (notify) {
      showToast(
        val ? '划词引用已开启' : '划词引用已关闭',
        val ? '选中文本将弹出引用按钮' : '已完全释放划词监听，与 Trancy 翻译零冲突'
      );
    }
  };

  // 1. 创建极简单按钮浮动气泡
  const toolbar = document.createElement('div');
  toolbar.className = 'dsh-quote-toolbar';
  toolbar.innerHTML = `
    <button type="button" class="dsh-quote-btn-reply" title="将选中文本作为引用追加到输入框 (快捷键: Alt+Q)">
      <span class="dsh-quote-icon">💬</span>
      <span class="dsh-quote-text">引用回复</span>
    </button>
  `;
  document.body.appendChild(toolbar);

  let currentMarkdown = '';
  let isMouseDown = false;
  let rafId: number | null = null;

  const hide = () => {
    toolbar.classList.remove('active', 'is-visible');
    currentMarkdown = '';
  };

  const show = (rect: DOMRect) => {
    if (!isEnabled || !rect || (rect.width === 0 && rect.height === 0)) {
      hide();
      return;
    }
    toolbar.classList.add('active', 'is-visible');
    const width = toolbar.offsetWidth || 100;
    const height = toolbar.offsetHeight || 30;

    // 默认定位在选区上方居中
    let x = rect.left + rect.width / 2 - width / 2;
    let y = rect.top - height - 6;

    // 顶部空间不足时翻转到选区下方
    if (y < 8) {
      y = rect.bottom + 6;
    }

    // 视口水平边界防御
    if (x < 8) x = 8;
    if (x + width > window.innerWidth - 8) {
      x = window.innerWidth - width - 8;
    }
    if (y + height > window.innerHeight - 8) {
      y = window.innerHeight - height - 8;
    }

    toolbar.style.left = `${Math.round(x)}px`;
    toolbar.style.top = `${Math.round(y)}px`;
  };

  const checkSelection = () => {
    try {
      if (isMouseDown || !isEnabled) return;
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        hide();
        return;
      }

      const range = sel.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const el = container.nodeType === Node.TEXT_NODE ? container.parentElement : (container as Element);
      if (!el || !el.closest('[class*="_bubble"], [class*="_flowItem"], [class*="_messageBody"], .markdown-body')) {
        hide();
        return;
      }

      const md = selectionToMarkdown(range);
      if (!md || !md.trim()) {
        hide();
        return;
      }

      currentMarkdown = md;
      show(range.getBoundingClientRect());
    } catch {
      hide();
    }
  };

  const scheduleCheck = () => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(checkSelection);
  };

  // 执行引用操作
  const executeQuote = (markdownText: string) => {
    if (!markdownText) return;
    try {
      const composer = findDshComposer();
      if (composer) {
        const formatted = markdownText
          .split('\n')
          .map((l) => (l.trim() ? `> ${l}` : '>'))
          .join('\n');
        appendComposerQuote(composer, formatted);
      }
      window.getSelection()?.removeAllRanges();
      hide();
    } catch (err) {
      console.warn('[dsh-quote-reply] executeQuote failed:', err);
    }
  };

  // 按钮事件：单按钮直接触发引用
  const btnReply = toolbar.querySelector('.dsh-quote-btn-reply');
  btnReply?.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
  btnReply?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentMarkdown) {
      executeQuote(currentMarkdown);
    }
  });

  // 全局键盘快捷键 Alt+Q / Alt+q
  const onKeyDown = (e: KeyboardEvent) => {
    if (!isEnabled) return;
    if (e.altKey && (e.key === 'q' || e.key === 'Q')) {
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const md = selectionToMarkdown(range);
        if (md && md.trim()) {
          e.preventDefault();
          e.stopPropagation();
          executeQuote(md);
          showToast('已通过快捷键 Alt+Q 引用', md.slice(0, 35));
        }
      }
    }
  };

  const onMouseDown = (e: MouseEvent) => {
    if (!isEnabled) return;
    isMouseDown = true;
    if (!toolbar.contains(e.target as Node)) {
      hide();
    }
  };

  const onMouseUp = () => {
    isMouseDown = false;
    if (!isEnabled) return;
    scheduleCheck();
  };

  document.addEventListener('mousedown', onMouseDown, true);
  document.addEventListener('mouseup', onMouseUp, true);
  document.addEventListener('selectionchange', scheduleCheck, true);
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('scroll', hide, { passive: true });

  return {
    isEnabled: () => isEnabled,
    toggle: () => setEnabled(!isEnabled),
    setEnabled,
    onChanged: (cb: (enabled: boolean) => void) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    dispose: () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      document.removeEventListener('mousedown', onMouseDown, true);
      document.removeEventListener('mouseup', onMouseUp, true);
      document.removeEventListener('selectionchange', scheduleCheck, true);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('scroll', hide);
      toolbar.remove();
      listeners.clear();
    },
  };
}

