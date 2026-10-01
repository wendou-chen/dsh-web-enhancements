import { chime } from './chime.js';
import { useToastStore } from './toast-store.js';
import { useNotifierPrefsStore } from './prefs-store.js';

export { chime } from './chime.js';
export { useToastStore } from './toast-store.js';
export { ToastContainer } from './ToastContainer.js';
export { useNotifierPrefsStore, PRESET_DIMENSIONS } from './prefs-store.js';
export type { NotifierPrefs, NotifierSizePreset } from './prefs-store.js';

/**
 * 完整模拟真实鼠标点击序列（与 hover-archive 实机验证机制一致）
 */
function triggerFullClick(el: HTMLElement): void {
  const opts = { bubbles: true, cancelable: true, composed: true, view: window };
  el.dispatchEvent(new PointerEvent('pointerdown', opts));
  el.dispatchEvent(new MouseEvent('mousedown', opts));
  el.dispatchEvent(new PointerEvent('pointerup', opts));
  el.dispatchEvent(new MouseEvent('mouseup', opts));
  el.dispatchEvent(new MouseEvent('click', opts));
}

/**
 * 安全非阻塞地从 Cordis Context 读取可选服务（绝不触发未声明 inject 异常）
 */
export function safeGetService<T = any>(ctx: any, key: string): T | undefined {
  if (!ctx) return undefined;
  try {
    if (typeof ctx.get === 'function') {
      const val = ctx.get(key);
      if (val !== undefined) return val as T;
    }
  } catch {}
  try {
    // 尝试从底层符号表或原型读取而不触发 Cordis 严格代理告警
    const raw = (ctx as any)[Symbol.for('cordis.context')] || ctx;
    return Reflect.get(raw, key);
  } catch {
    return undefined;
  }
}

/**
 * 判断会话是否为主会话（顶级主代理会话，非子代理）
 */
export function isTopLevelSession(summary: any): boolean {
  if (!summary) return false;
  if (summary.origin === 'subagent') return false;
  if (summary.parentSessionId || summary.parentId) return false;
  if (typeof summary.depth === 'number' && summary.depth > 0) return false;
  return true;
}

/**
 * 获取某个主会话的所有直接或间接子会话列表
 */
export function getChildSessions(mainSessionId: string, byId: Record<string, any>): any[] {
  const children: any[] = [];
  const parentIds = new Set<string>([mainSessionId]);

  let added = true;
  while (added) {
    added = false;
    for (const [id, summary] of Object.entries<any>(byId)) {
      if (!summary || parentIds.has(id)) continue;
      const pId = summary.parentSessionId || summary.parentId;
      if (pId && parentIds.has(pId)) {
        parentIds.add(id);
        children.push(summary);
        added = true;
      }
    }
  }
  return children;
}

/**
 * 读取某个会话的真实运行状态
 */
export function isSessionRunning(sessionId: string, summary: any, statusMap?: ReadonlyMap<string, any>): boolean {
  const statusEntry = statusMap?.get?.(sessionId);
  if (statusEntry && typeof statusEntry.running === 'boolean') {
    return statusEntry.running;
  }
  return Boolean(summary?.running);
}

/**
 * 判断某个主会话的整棵任务树是否处于运行中（主代理在跑，或者任意派生的子代理在跑）
 */
export function isTaskTreeRunning(
  mainSessionId: string,
  mainSummary: any,
  byId: Record<string, any>,
  statusMap?: ReadonlyMap<string, any>,
): boolean {
  if (isSessionRunning(mainSessionId, mainSummary, statusMap)) return true;
  const children = getChildSessions(mainSessionId, byId);
  return children.some((c) => isSessionRunning(c?.id, c, statusMap));
}

/**
 * 关闭当前可能打开的设置面板或模态覆盖层，并切换到目标会话（三重保障）
 */
export function navigateToSession(ctx: any, sessionId?: string, sessionTitle?: string): void {
  try {
    // 1. 先尝试通过 layout 服务关闭设置面板
    const layoutSvc = safeGetService(ctx, 'layout');
    if (layoutSvc && typeof layoutSvc.selectPanel === 'function') {
      layoutSvc.selectPanel(null);
    }

    // 2. 尝试通过 uiWorkspace.openSession 切换会话
    const uiWorkspaceSvc = safeGetService(ctx, 'uiWorkspace');
    const sessionsSvc = safeGetService(ctx, 'sessions');

    let targetId = sessionId;
    let targetTitle = sessionTitle;

    if (!targetId && sessionsSvc?.list?.getSnapshot) {
      const byId = sessionsSvc.list.getSnapshot()?.byId || {};
      for (const [id, s] of Object.entries<any>(byId)) {
        if ((s?.retainedBy?.mainView ?? 0) > 0) {
          targetId = id;
          targetTitle = s?.displayTitle || s?.title;
          break;
        }
      }
      if (!targetId) {
        try {
          const saved = JSON.parse(localStorage.getItem('dsh.sessions.current') || '{}');
          if (saved?.sessionId && byId[saved.sessionId]) {
            targetId = saved.sessionId;
            targetTitle = byId[saved.sessionId]?.displayTitle || byId[saved.sessionId]?.title;
          }
        } catch {}
      }
      if (!targetId) {
        for (const [id, s] of Object.entries<any>(byId)) {
          if (isTopLevelSession(s) && !s.blank) {
            targetId = id;
            targetTitle = s?.displayTitle || s?.title;
            break;
          }
        }
      }
    }

    if (targetId && uiWorkspaceSvc && typeof uiWorkspaceSvc.openSession === 'function') {
      uiWorkspaceSvc.openSession(targetId);
      return;
    }

    // 3. DOM 级确定性跳转兜底：
    // (a) 若当前正处于设置面板，派发 Escape 或点击关闭/返回按钮退出设置页
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));

    const closeBtn = document.querySelector<HTMLElement>(
      '[aria-label*="关闭"], [aria-label*="Close"], [title*="关闭"], button[class*="close"], [class*="settings"] button[aria-label]',
    );
    if (closeBtn) {
      triggerFullClick(closeBtn);
    }

    // (b) 在左侧边栏查找目标会话行并直接触发真实点击
    setTimeout(() => {
      const rows = Array.from(document.querySelectorAll<HTMLElement>('[class*="sessionRow"]')).filter(
        (r) => r.getAttribute('aria-disabled') !== 'true',
      );
      if (rows.length === 0) return;

      let matchedRow: HTMLElement | undefined;

      // 优先按 data 属性或 href 匹配 sessionId
      if (targetId) {
        matchedRow = rows.find(
          (r) =>
            r.dataset.sessionId === targetId ||
            r.getAttribute('data-id') === targetId ||
            r.innerHTML.includes(targetId),
        );
      }

      // 其次按会话标题文本精确或包含匹配
      if (!matchedRow && targetTitle) {
        const cleanTitle = targetTitle.trim();
        matchedRow =
          rows.find((r) => (r.textContent || '').trim() === cleanTitle) ||
          rows.find((r) => (r.textContent || '').includes(cleanTitle));
      }

      // 兜底：若是从设置页点击「查看会话」，点击当前选中的会话行或第一个有效会话行以切回主对话界面
      if (!matchedRow) {
        matchedRow =
          rows.find(
            (r) =>
              r.getAttribute('aria-selected') === 'true' ||
              r.getAttribute('aria-current') === 'page' ||
              r.className.includes('active') ||
              r.className.includes('selected'),
          ) || rows[0];
      }

      if (matchedRow) {
        triggerFullClick(matchedRow);
      }
    }, 20);
  } catch (err) {
    console.warn('[dsh-web-enhancements] navigateToSession fallback error:', err);
  }
}

export function initTaskNotifierSessionWatcher(ctx: any): () => void {
  const prevTreeRunningMap = new Map<string, boolean>();
  const prevPendingMap = new Map<string, boolean>();
  let unsubList: (() => void) | null = null;
  let unsubStatus: (() => void) | null = null;
  let pollTimer: number | null = null;

  const attachWatcher = () => {
    const sessionsSvc = safeGetService(ctx, 'sessions');
    const uiSessionSvc = safeGetService(ctx, 'uiSession');

    if (!sessionsSvc || !sessionsSvc.list || typeof sessionsSvc.list.subscribe !== 'function') {
      return false;
    }

    const checkSessions = () => {
      const prefs = useNotifierPrefsStore.getState();
      if (!prefs.enabled) return;

      const listSnapshot = sessionsSvc.list.getSnapshot();
      if (!listSnapshot || !listSnapshot.byId) return;

      const byId = listSnapshot.byId;
      const statusMap: ReadonlyMap<string, any> | undefined = uiSessionSvc?.sessionStatus?.getSnapshot?.();

      for (const [id, summary] of Object.entries<any>(byId)) {
        if (!isTopLevelSession(summary)) {
          continue;
        }

        const nowTreeRunning = isTaskTreeRunning(id, summary, byId, statusMap);
        const prevTreeRunning = prevTreeRunningMap.get(id) ?? false;
        prevTreeRunningMap.set(id, nowTreeRunning);

        const statusEntry = statusMap?.get?.(id);
        const prevPending = prevPendingMap.get(id) ?? false;
        const nowPending = Boolean(statusEntry?.pendingInteraction ?? summary?.pendingInteraction);
        prevPendingMap.set(id, nowPending);

        const title = summary?.displayTitle || summary?.title || `任务 ${id.slice(0, 6)}`;

        const curSessionId = sessionsSvc?.list?.getSnapshot?.()?.current;
        const isCurrentSession = Boolean(curSessionId && curSessionId === id);
        const shouldShowPopup = prefs.popupEnabled && (!prefs.popupOnlyInactive || !isCurrentSession);

        if (prevTreeRunning && !nowTreeRunning) {
          if (prefs.soundEnabled) {
            chime.playTaskComplete();
          }

          if (shouldShowPopup) {
            useToastStore.getState().addToast({
              type: 'success',
              title: '主任务已全部完成',
              message: `${title} 及其子任务已执行完毕。`,
              duration: prefs.durationMs,
              sessionId: id,
              actionText: '查看会话',
              onAction: () => {
                navigateToSession(ctx, id, title);
              },
            });
          }
        }

        if (!prevPending && nowPending) {
          if (prefs.soundEnabled) {
            chime.playAttentionRequired();
          }

          if (shouldShowPopup) {
            useToastStore.getState().addToast({
              type: 'warning',
              title: '等待确认操作',
              message: `${title} 正在等待您的确认或输入。`,
              duration: 0,
              sessionId: id,
              actionText: '立即前往',
              onAction: () => {
                navigateToSession(ctx, id, title);
              },
            });
          }
        }
      }
    };

    unsubList = sessionsSvc.list.subscribe(checkSessions);
    if (typeof uiSessionSvc?.sessionStatus?.subscribe === 'function') {
      unsubStatus = uiSessionSvc.sessionStatus.subscribe(checkSessions);
    }
    checkSessions();
    return true;
  };

  if (!attachWatcher() && typeof window !== 'undefined') {
    pollTimer = window.setInterval(() => {
      if (attachWatcher() && pollTimer !== null) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    }, 1000);
  }

  return () => {
    if (pollTimer !== null) clearInterval(pollTimer);
    if (unsubList) unsubList();
    if (unsubStatus) unsubStatus();
    prevTreeRunningMap.clear();
    prevPendingMap.clear();
  };
}
