import { copyToClipboard } from '../../shared/clipboard.js';
import { showToast } from '../../shared/toast.js';

export interface SessionLinkInfo {
  sessionId: string;
  title: string;
  url: string;
  markdown: string;
}

const STORAGE_KEY = 'dsh_copy_session_link_enabled';

export const LINK_ICON_SVG = `
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
</svg>
`;

export const CHECK_ICON_SVG = `
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="20 6 9 17 4 12"></polyline>
</svg>
`;

/**
 * 智能多级提取当前活跃会话的直达信息
 */
export function getCurrentSessionLinkInfo(ctx?: any): SessionLinkInfo | null {
  let sessionId = '';
  let title = '';

  // 1. 优先从 URL Hash 匹配提取: #/session/<sessionId>
  if (typeof window !== 'undefined' && window.location.hash) {
    const match = window.location.hash.match(/#\/session\/([a-zA-Z0-9_\-]+)/);
    if (match && match[1]) {
      sessionId = match[1];
    }
  }

  // 2. 尝试从 Cordis 上下文中的 sessions 服务快照提取
  let sessionsService: any = null;
  try {
    if (ctx && typeof ctx === 'object') {
      sessionsService = ctx.sessions;
    }
  } catch {}

  if (!sessionId && sessionsService?.list?.getSnapshot) {
    try {
      const snap = sessionsService.list.getSnapshot();
      if (snap?.current) {
        sessionId = snap.current;
        const curSession = snap.byId?.[sessionId];
        if (curSession) {
          title = curSession.displayTitle || curSession.title || '';
        }
      }
    } catch {}
  }

  // 3. 尝试从 localStorage 的当前会话缓存读取
  if (!sessionId && typeof localStorage !== 'undefined') {
    try {
      const saved = JSON.parse(localStorage.getItem('dsh.sessions.current') || '{}');
      if (saved?.sessionId) {
        sessionId = saved.sessionId;
      }
    } catch {}
  }

  // 4. 尝试从 DOM 中当前选中的会话行匹配
  if (typeof document !== 'undefined') {
    const activeRow = document.querySelector<HTMLElement>(
      '[class*="sessionRow"][aria-selected="true"], [class*="sessionRow"][aria-current="page"], [class*="sessionRow"].active, [class*="sessionRow"].selected'
    );
    if (activeRow) {
      if (!sessionId) {
        sessionId =
          activeRow.dataset.sessionId ||
          activeRow.getAttribute('data-id') ||
          '';
        if (!sessionId) {
          const a = activeRow.querySelector<HTMLAnchorElement>('a[href*="/session/"]');
          if (a?.href) {
            const m = a.href.match(/\/session\/([a-zA-Z0-9_\-]+)/);
            if (m && m[1]) sessionId = m[1];
          }
        }
      }
      if (!title) {
        const titleEl = activeRow.querySelector<HTMLElement>('[class*="title"], [class*="name"]');
        if (titleEl) {
          title = (titleEl.textContent || '').trim();
        }
      }
    }

    // 5. 如果还没有提取到标题，从会话顶部主标题元素提取
    if (!title) {
      const headerTitleEl = document.querySelector<HTMLElement>(
        '[class*="sessionHeader"] [class*="title"], [class*="conversation"] [class*="header"] [class*="title"], header [class*="title"]'
      );
      if (headerTitleEl) {
        title = (headerTitleEl.textContent || '').trim();
      }
    }
  }

  if (!sessionId) {
    return null;
  }

  if (!title) {
    title = `会话 ${sessionId.slice(0, 8)}`;
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:3080';
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
  const url = `${origin}${pathname}#/session/${sessionId}`;
  const markdown = `[${title}](${url})`;

  return { sessionId, title, url, markdown };
}

/**
 * 复制指定会话或当前会话的直达链接
 */
export async function copySessionLink(options?: {
  markdown?: boolean;
  sessionId?: string;
  title?: string;
  ctx?: any;
}): Promise<boolean> {
  const isMarkdown = Boolean(options?.markdown);
  let url = '';
  let title = options?.title || '';
  let sessionId = options?.sessionId || '';

  if (sessionId) {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:3080';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
    url = `${origin}${pathname}#/session/${sessionId}`;
    if (!title) title = `会话 ${sessionId.slice(0, 8)}`;
  } else {
    const cur = getCurrentSessionLinkInfo(options?.ctx);
    if (!cur) {
      showToast('未检测到有效会话', '请先进入或选中一个会话后再试', true);
      return false;
    }
    url = cur.url;
    title = cur.title;
    sessionId = cur.sessionId;
  }

  const copyText = isMarkdown ? `[${title}](${url})` : url;
  const ok = await copyToClipboard(copyText);

  if (ok) {
    showToast(
      isMarkdown ? '已复制 Markdown 会话链接' : '已复制会话直达链接',
      copyText,
      false,
    );
  } else {
    showToast('链接复制失败', '请检查剪贴板写入权限', true);
  }

  return ok;
}

export interface SessionLinkController {
  isEnabled: () => boolean;
  setEnabled: (val: boolean, notify?: boolean) => void;
  toggle: () => void;
  onChanged: (cb: (enabled: boolean) => void) => () => void;
  copyCurrent: (markdown?: boolean) => Promise<boolean>;
  dispose: () => void;
}

/**
 * 初始化会话链接特性（提供纯净的会话链接提取、复制服务与侧边栏/悬浮球支持）
 */
export function initSessionLink(ctx?: any): SessionLinkController {
  let isEnabled = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) !== 'false' : true;
  const listeners = new Set<(enabled: boolean) => void>();

  const syncState = () => {
    // 强制清理任何已挂载的顶部突兀按钮
    if (typeof document !== 'undefined') {
      document.querySelectorAll('.dsh-copy-session-link-btn').forEach((el) => el.remove());
    }
  };

  syncState();

  const setEnabled = (val: boolean, notify = true) => {
    isEnabled = val;
    try {
      localStorage.setItem(STORAGE_KEY, val ? 'true' : 'false');
    } catch {}
    syncState();
    listeners.forEach((cb) => {
      try {
        cb(isEnabled);
      } catch {}
    });
    if (notify) {
      showToast(
        val ? '会话链接复制已启用' : '会话链接复制已停用',
        val ? '可在左侧边栏 Hover 和悬浮球中一键复制会话直达链接' : '已停用会话链接复制',
      );
    }
  };

  return {
    isEnabled: () => isEnabled,
    setEnabled,
    toggle: () => setEnabled(!isEnabled),
    onChanged: (cb: (enabled: boolean) => void) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    copyCurrent: (markdown?: boolean) => copySessionLink({ markdown, ctx }),
    dispose: () => {
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('dsh-session-link-active');
        document.querySelectorAll('.dsh-copy-session-link-btn').forEach((el) => el.remove());
      }
      listeners.clear();
    },
  };
}
