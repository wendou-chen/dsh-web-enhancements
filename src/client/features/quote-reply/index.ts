import { selectionToMarkdown } from './deserializer.js';
import {
  appendComposerQuote,
  findDshComposer,
  focusComposerEnd,
} from '../../shared/dom-utils.js';

export function initQuoteReply(): () => void {
  const toolbar = document.createElement('div');
  toolbar.className = 'dsh-quote-toolbar';
  toolbar.innerHTML = `<button type="button"><span>💬</span><span>引用回复</span></button>`;
  document.body.appendChild(toolbar);

  let currentMarkdown = '';
  let isMouseDown = false;
  let rafId: number | null = null;

  const hide = () => {
    toolbar.classList.remove('active');
    currentMarkdown = '';
  };

  const show = (rect: DOMRect) => {
    toolbar.classList.add('active');
    const width = toolbar.offsetWidth || 116;
    const height = toolbar.offsetHeight || 36;

    let x = rect.left + rect.width / 2 - width / 2;
    if (x < 8) x = 8;
    if (x + width > window.innerWidth - 8) x = window.innerWidth - width - 8;

    let y = rect.top - height - 8;
    if (y < 8) y = rect.bottom + 8;

    toolbar.style.left = `${Math.round(x)}px`;
    toolbar.style.top = `${Math.round(y)}px`;
  };

  const checkSelection = () => {
    if (isMouseDown) return;
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
    if (!md) {
      hide();
      return;
    }

    currentMarkdown = md;
    show(range.getBoundingClientRect());
  };

  const scheduleCheck = () => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(checkSelection);
  };

  const onMouseDown = (e: MouseEvent) => {
    isMouseDown = true;
    if (!toolbar.contains(e.target as Node)) {
      hide();
    }
  };

  const onMouseUp = () => {
    isMouseDown = false;
    scheduleCheck();
  };

  toolbar.querySelector('button')?.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  toolbar.querySelector('button')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentMarkdown) return;

    const composer = findDshComposer();
    const markdown = currentMarkdown;

    // 1. 先关闭浮动工具栏，并清除聊天气泡上的原始选区高亮
    hide();
    try {
      window.getSelection()?.removeAllRanges();
    } catch (_) {}

    // 2. 将引用内容追加到输入框，并确保光标自动聚焦在输入框末尾
    if (composer) {
      const formatted = markdown
        .split('\n')
        .map((l) => (l.trim() ? `> ${l}` : '>'))
        .join('\n');

      appendComposerQuote(composer, formatted);

      // 微任务与动画帧多重加固：确保在 Lexical / React 异步渲染完成后，光标始终锁定在最新空段落末尾
      queueMicrotask(() => {
        focusComposerEnd(composer);
      });
      requestAnimationFrame(() => {
        focusComposerEnd(composer);
      });
      setTimeout(() => {
        focusComposerEnd(composer);
      }, 30);
    }
  });

  document.addEventListener('mousedown', onMouseDown, true);
  document.addEventListener('mouseup', onMouseUp, true);
  document.addEventListener('selectionchange', scheduleCheck, true);
  window.addEventListener('scroll', hide, { passive: true });

  return () => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    document.removeEventListener('mousedown', onMouseDown, true);
    document.removeEventListener('mouseup', onMouseUp, true);
    document.removeEventListener('selectionchange', scheduleCheck, true);
    window.removeEventListener('scroll', hide);
    toolbar.remove();
  };
}
