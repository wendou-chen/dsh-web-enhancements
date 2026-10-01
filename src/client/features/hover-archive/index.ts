import { showToast } from '../../shared/toast.js';
import { copySessionLink, LINK_ICON_SVG, CHECK_ICON_SVG } from '../session-link/index.js';

const ARCHIVE_ICON_SVG = `
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="21 8 21 21 3 21 3 8"></polyline>
  <rect x="1" y="3" width="22" height="5"></rect>
  <line x1="10" y1="12" x2="14" y2="12"></line>
</svg>
`;

function triggerFullClick(el: HTMLElement) {
  const opts = { bubbles: true, cancelable: true, composed: true, view: window };
  el.dispatchEvent(new PointerEvent('pointerdown', opts));
  el.dispatchEvent(new MouseEvent('mousedown', opts));
  el.dispatchEvent(new PointerEvent('pointerup', opts));
  el.dispatchEvent(new MouseEvent('mouseup', opts));
  el.dispatchEvent(new MouseEvent('click', opts));
}

const STORAGE_KEY = 'dsh_hover_archive_enabled';

export interface HoverArchiveController {
  isEnabled: () => boolean;
  toggle: () => void;
  setEnabled: (val: boolean, notify?: boolean) => void;
  onChanged: (cb: (enabled: boolean) => void) => () => void;
  dispose: () => void;
}

/**
 * Codex 风格 Hover 一键归档特性
 * 鼠标悬停在左侧会话条目时，在更多操作前直接浮现归档图标，单击即刻归档。
 */
export function initHoverArchive(): HoverArchiveController {
  let isEnabled = localStorage.getItem(STORAGE_KEY) !== 'false';
  const listeners = new Set<(enabled: boolean) => void>();

  const syncState = () => {
    if (isEnabled) {
      document.documentElement.classList.add('dsh-hover-archive-active');
    } else {
      document.documentElement.classList.remove('dsh-hover-archive-active');
      document.querySelectorAll('.dsh-hover-archive-btn, .dsh-hover-copylink-btn').forEach((el) => el.remove());
    }
  };

  syncState();

  const setEnabled = (val: boolean, notify = true) => {
    isEnabled = val;
    try {
      localStorage.setItem(STORAGE_KEY, val ? 'true' : 'false');
    } catch (_) {}
    syncState();
    listeners.forEach((cb) => {
      try {
        cb(isEnabled);
      } catch (_) {}
    });
    if (notify) {
      showToast(
        val ? '会话悬停归档已开启' : '会话悬停归档已关闭',
        val ? '鼠标移至左侧会话即可一键归档' : '已隐藏左侧悬停归档按钮',
      );
    }
  };

  let rafId: number | null = null;
  let lastTarget: HTMLElement | null = null;

  const handleMouseOver = (event: MouseEvent) => {
    if (!isEnabled) return;
    try {
      const target = event.target as HTMLElement | null;
      if (!target || target === lastTarget) return;
      lastTarget = target;

      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (!isEnabled) return;
        // 寻找最近的会话行 (sessionRow)
        const row = target.closest<HTMLElement>('[class*="sessionRow"]');
        if (!row || !row.isConnected) return;

        // 忽略空白新建会话行
        if (row.getAttribute('aria-disabled') === 'true') return;

        // 找到放置操作按钮的容器
        const actionsContainer = row.querySelector<HTMLElement>('[class*="rowActions"]');
        if (!actionsContainer || !actionsContainer.isConnected) return;

        // 如果已经注入过归档按钮或复制按钮，直接跳过
        if (actionsContainer.querySelector('.dsh-hover-archive-btn') || actionsContainer.querySelector('.dsh-hover-copylink-btn')) return;

        // 寻找原生的三点更多菜单按钮
        const moreBtn = actionsContainer.querySelector<HTMLButtonElement>('button');
        if (!moreBtn) return;

        // 提取该会话行对应的 sessionId 与 title
        let rowSessionId = row.dataset.sessionId || row.getAttribute('data-id') || '';
        if (!rowSessionId) {
          const a = row.querySelector<HTMLAnchorElement>('a[href*="/session/"]');
          if (a?.href) {
            const m = a.href.match(/\/session\/([a-zA-Z0-9_\-]+)/);
            if (m && m[1]) rowSessionId = m[1];
          }
        }
        if (!rowSessionId) {
          // 兜底从整行的 HTML 或 class 查找匹配 session- 开头的 id
          const m = row.outerHTML.match(/session-([a-zA-Z0-9_\-]+)/);
          if (m && m[1]) rowSessionId = m[1];
        }

        const titleEl = row.querySelector<HTMLElement>('[class*="title"], [class*="name"]');
        const rowTitle = (titleEl?.textContent || '').trim();

        // 1. 创建 Codex 风格快捷复制链接按钮
        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'dsh-hover-copylink-btn';
        copyBtn.title = '复制会话链接 (点击复制 URL，按住 Shift 点击复制 Markdown 链接)';
        copyBtn.setAttribute('aria-label', '复制该会话直达链接');
        copyBtn.innerHTML = LINK_ICON_SVG;

        copyBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

          const isMarkdown = Boolean(e.shiftKey);
          const ok = await copySessionLink({
            markdown: isMarkdown,
            sessionId: rowSessionId,
            title: rowTitle,
          });

          if (ok) {
            copyBtn.innerHTML = CHECK_ICON_SVG;
            setTimeout(() => {
              if (copyBtn.isConnected) {
                copyBtn.innerHTML = LINK_ICON_SVG;
              }
            }, 1200);
          }
        });

        // 2. 创建 Codex 风格快捷归档按钮
        const archiveBtn = document.createElement('button');
        archiveBtn.type = 'button';
        archiveBtn.className = 'dsh-hover-archive-btn';
        archiveBtn.title = '快捷归档 (Archive)';
        archiveBtn.setAttribute('aria-label', '快捷归档此会话');
        archiveBtn.innerHTML = ARCHIVE_ICON_SVG;

        archiveBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

          executeArchive(moreBtn);
        });

        // 插入在 actionsContainer 的最前端：[🔗 复制] [📦 归档] [⋯ 更多]
        if (actionsContainer.isConnected && !actionsContainer.querySelector('.dsh-hover-archive-btn')) {
          actionsContainer.insertBefore(archiveBtn, actionsContainer.firstChild);
          actionsContainer.insertBefore(copyBtn, archiveBtn);
        }
      });
    } catch {
      // 容错捕获，严禁崩溃
    }
  };

  /**
   * 静默快速触发归档逻辑
   */
  const executeArchive = (moreBtn: HTMLButtonElement) => {
    // 注入临时静默样式，避免弹出菜单闪烁
    const tempStyle = document.createElement('style');
    tempStyle.id = 'dsh-archive-silent-pop';
    tempStyle.textContent = `
      [role="menu"], [data-radix-popper-content-wrapper], ._menu_1nxmc_1, [class*="_menu_"] {
        opacity: 0 !important;
        pointer-events: auto !important;
      }
    `;
    document.head.appendChild(tempStyle);

    // 完整派发事件展开菜单
    triggerFullClick(moreBtn);

    // 延迟 40ms 找到归档菜单项并点击
    setTimeout(() => {
      try {
        const menuItems = Array.from(
          document.querySelectorAll<HTMLElement>('[role="menuitem"], button[class*="_item_"], .menu-item, [class*="menuItem"]')
        );

        let targetItem: HTMLElement | null = null;
        for (const item of menuItems) {
          const text = (item.textContent || '').trim().toLowerCase();
          if (text.includes('归档') || text.includes('archive')) {
            targetItem = item;
            break;
          }
        }

        if (targetItem) {
          triggerFullClick(targetItem);
          showToast('会话已归档', '已移入已归档列表', false);
        } else {
          // 如果没有匹配到，则点击 body 关掉菜单
          document.body.click();
        }
      } catch (err) {
        console.warn('[dsh-hover-archive] archive trigger failed:', err);
        document.body.click();
      } finally {
        // 清除静默样式
        setTimeout(() => {
          tempStyle.remove();
        }, 100);
      }
    }, 40);
  };

  window.addEventListener('mouseover', handleMouseOver, true);

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
      document.documentElement.classList.remove('dsh-hover-archive-active');
      window.removeEventListener('mouseover', handleMouseOver, true);
      document.querySelectorAll('.dsh-hover-archive-btn, .dsh-hover-copylink-btn').forEach((el) => el.remove());
      listeners.clear();
    },
  };
}
