import { copyToClipboard } from "../../shared/clipboard.js";
import { showToast } from "../../shared/toast.js";

export const FOLDER_PATH_ICON_SVG = `
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
  <line x1="12" y1="11" x2="12" y2="17"></line>
  <line x1="9" y1="14" x2="15" y2="14"></line>
</svg>
`;

export const CHECK_ICON_SVG = `
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="20 6 9 17 4 12"></polyline>
</svg>
`;

export interface WorkspaceItem {
  workspaceId: string;
  title: string;
  path: string;
  sessionIds: string[];
}

/**
 * 辅助获取全局或传入的 Cordis Context
 */
function getDshContext(ctx?: any): any {
  if (ctx && typeof ctx === "object") return ctx;
  if (typeof window !== "undefined") {
    return (window as any).__DSH_ENHANCEMENT_CTX__ || (window as any).__DSH_CTX__ || null;
  }
  return null;
}

/**
 * 辅助获取 React Fiber 节点的 memoizedProps
 */
function getReactFiberProps(el: HTMLElement | null): any {
  if (!el) return null;
  const key = Object.keys(el).find(
    (k) =>
      k.startsWith("__reactFiber$") ||
      k.startsWith("__reactProps$") ||
      k.startsWith("__reactInternalInstance$")
  );
  if (!key) return null;
  const node = (el as any)[key];
  return node?.memoizedProps || node?.pendingProps || node?.return?.memoizedProps || node;
}

/**
 * 获取当前活跃会话 ID (例如 session-3a003b2b-a4e1-48f9-b09c-1087a204ffeb)
 */
export function getCurrentSessionId(ctx?: any): string | null {
  // 1. 从 window.location.hash 解析（DSH Web 标准路由）
  if (typeof window !== "undefined" && window.location?.hash) {
    const hash = window.location.hash;
    const match = hash.match(/session[/-]([a-f0-9-]+)/i) || hash.match(/session-([a-f0-9-]+)/i);
    if (match) {
      return match[0].startsWith("session-") ? match[0] : `session-${match[1]}`;
    }
  }

  const dshCtx = getDshContext(ctx);

  // 2. 从 ctx.sessions 服务快照获取
  try {
    const sessionsService = dshCtx?.sessions || dshCtx?.get?.("sessions");
    const snap = sessionsService?.list?.getSnapshot?.();
    if (snap?.current) return snap.current;
  } catch {}

  // 3. 从 DOM 活跃项获取
  if (typeof document !== "undefined") {
    const activeItem = document.querySelector<HTMLElement>(
      "[class*=\"sessionItem\"][class*=\"active\"], [class*=\"sessionRow\"][class*=\"active\"], [data-active=\"true\"][class*=\"session\"]"
    );
    if (activeItem) {
      const id = activeItem.getAttribute("data-session-id") || activeItem.getAttribute("data-id");
      if (id) return id;
    }
  }

  return null;
}

/**
 * 收集当前 DSH 中的全量工作区列表
 */
export function getWorkspacesList(ctx?: any): WorkspaceItem[] {
  const result: WorkspaceItem[] = [];
  const seenIds = new Set<string>();
  const dshCtx = getDshContext(ctx);

  // 1. 从 ctx.workspaces 服务快照读取
  try {
    const workspacesService = dshCtx?.workspaces || dshCtx?.get?.("workspaces");
    if (workspacesService) {
      const snap = workspacesService.list?.getSnapshot?.() || workspacesService.model?.getSnapshot?.();
      const items = snap?.items || workspacesService.items || workspacesService.model?.items;
      if (Array.isArray(items)) {
        for (const item of items) {
          if (!item) continue;
          const wsId = String(item.workspaceId || item.id || "");
          const wsPath = String(item.path || item.cwd || "");
          const wsTitle = String(item.title || item.label || "");
          const sessionIds = Array.isArray(item.sessionIds) ? item.sessionIds.map(String) : [];

          if (wsPath && (!wsId || !seenIds.has(wsId))) {
            if (wsId) seenIds.add(wsId);
            result.push({
              workspaceId: wsId,
              title: wsTitle,
              path: wsPath,
              sessionIds,
            });
          }
        }
      }
    }
  } catch {}

  // 2. 从 DOM 遍历左侧工作区行（projectRow）作为双重保障
  if (typeof document !== "undefined") {
    const rows = Array.from(document.querySelectorAll<HTMLElement>("[class*=\"projectRow\"]"));
    for (const row of rows) {
      const titleEl = row.querySelector<HTMLElement>("[class*=\"title\"]");
      const title = (titleEl?.textContent || "").trim();

      const props = getReactFiberProps(row);
      const cwd = props?.row?.cwd || props?.cwd || props?.workspace?.path || "";
      const wsId = props?.row?.workspaceId || props?.workspaceId || "";
      const sessionIds = props?.row?.sessionIds || props?.sessionIds || [];

      if (cwd && (!wsId || !seenIds.has(wsId))) {
        if (wsId) seenIds.add(wsId);
        result.push({
          workspaceId: wsId,
          title: title || props?.row?.label || "",
          path: cwd,
          sessionIds: Array.isArray(sessionIds) ? sessionIds.map(String) : [],
        });
      }
    }
  }

  return result;
}

/**
 * 智能多级提取当前活跃会话或指定工作区的真实绝对物理路径
 * @param target 可为工作区标题、工作区 ID、工作区 DOM 节点，或为空（自动提取当前活跃会话所属工作区）
 * @param ctx Cordis Context
 */
export function resolveWorkspacePath(target?: string | HTMLElement, ctx?: any): string | null {
  const dshCtx = getDshContext(ctx);

  // 1. 如果传入的是 DOM 元素（例如被悬停/点击的工作区行或按钮）
  if (typeof HTMLElement !== "undefined" && target instanceof HTMLElement) {
    const row = target.closest<HTMLElement>("[class*=\"projectRow\"]");
    if (row) {
      // A. 通过 React Fiber 读取
      const props = getReactFiberProps(row);
      const directCwd = props?.row?.cwd || props?.cwd || props?.workspace?.path;
      if (directCwd && typeof directCwd === "string") {
        return directCwd;
      }

      // B. 通过行内标题匹配
      const titleEl = row.querySelector<HTMLElement>("[class*=\"title\"]");
      const label = (titleEl?.textContent || "").trim();
      if (label) {
        return resolveWorkspacePath(label, dshCtx);
      }
    }
  }

  const labelOrId = typeof target === "string" ? target.trim() : undefined;
  const workspaces = getWorkspacesList(dshCtx);

  // 2. 如果指定了 labelOrId（针对侧边栏特定工作区行点击）
  if (labelOrId) {
    const lower = labelOrId.toLowerCase();

    // A. 按 workspaceId 精确匹配
    const byId = workspaces.find((w) => w.workspaceId === labelOrId);
    if (byId?.path) return byId.path;

    // B. 按 title 精确匹配
    const byTitle = workspaces.find((w) => w.title && w.title.toLowerCase() === lower);
    if (byTitle?.path) return byTitle.path;

    // C. 按路径末尾目录名 (basename) 匹配
    const byBasename = workspaces.find((w) => {
      if (!w.path) return false;
      const base = w.path.split(/[\\/]/).filter(Boolean).pop();
      return base && base.toLowerCase() === lower;
    });
    if (byBasename?.path) return byBasename.path;

    // D. 按路径包含关系匹配
    const byInclude = workspaces.find((w) => w.path && w.path.toLowerCase().includes(lower));
    if (byInclude?.path) return byInclude.path;
  }

  // 3. 未指定 labelOrId：自动解析当前活跃会话所属的工作区（针对 FAB 悬浮球复制）
  const currentSessionId = getCurrentSessionId(dshCtx);

  if (currentSessionId && workspaces.length > 0) {
    // A. 从工作区的 sessionIds 列表中逆查归属工作区
    const owningWorkspace = workspaces.find(
      (w) => Array.isArray(w.sessionIds) && w.sessionIds.includes(currentSessionId)
    );
    if (owningWorkspace?.path) {
      return owningWorkspace.path;
    }
  }

  // 4. 尝试从当前会话对象本身提取 (curSession)
  try {
    const sessionsService = dshCtx?.sessions || dshCtx?.get?.("sessions");
    if (sessionsService && currentSessionId) {
      const snap = sessionsService.list?.getSnapshot?.();
      const curSession = snap?.byId?.[currentSessionId];
      if (curSession) {
        if (curSession.cwd && typeof curSession.cwd === "string") return curSession.cwd;
        if (curSession.workspacePath && typeof curSession.workspacePath === "string") return curSession.workspacePath;
        if (curSession.workspaceId) {
          const w = workspaces.find((item) => item.workspaceId === curSession.workspaceId);
          if (w?.path) return w.path;
        }
      }
    }
  } catch {}

  // 5. 尝试从 DOM 中的已打开文件树 data-files-root 提取
  if (typeof document !== "undefined") {
    const filesRootEl = document.querySelector<HTMLElement>("[data-files-root]");
    if (filesRootEl) {
      const rootPath = filesRootEl.getAttribute("data-files-root");
      if (rootPath) return rootPath;
    }

    // 6. 尝试从当前侧边栏高亮选中的活跃会话找到其所属父级工作区标题
    const activeSessionEl = document.querySelector<HTMLElement>(
      "[class*=\"sessionItem\"][class*=\"active\"], [class*=\"sessionRow\"][class*=\"active\"]"
    );
    if (activeSessionEl) {
      const parentGroup = activeSessionEl.closest<HTMLElement>(
        "[class*=\"projectGroup\"], [class*=\"projectSection\"], [class*=\"groupItem\"]"
      );
      if (parentGroup) {
        const titleEl = parentGroup.querySelector<HTMLElement>("[class*=\"projectRow\"] [class*=\"title\"]");
        const parentTitle = (titleEl?.textContent || "").trim();
        if (parentTitle) {
          const w = workspaces.find((item) => item.title.toLowerCase() === parentTitle.toLowerCase());
          if (w?.path) return w.path;
        }
      }
    }

    // 7. 尝试从工作区 HoverCard 中的 hoverPath 提取
    const hoverPathEls = Array.from(document.querySelectorAll<HTMLElement>("[class*=\"hoverPath\"]"));
    for (const el of hoverPathEls) {
      const p = (el.textContent || "").trim();
      if (p) return p;
    }
  }

  // 8. 强力安全兜底：如果列表中只有一个工作区，当前会话必然归属该工作区！
  if (workspaces.length === 1 && workspaces[0]?.path) {
    return workspaces[0].path;
  }

  return null;
}

/**
 * 复制指定或当前工作区物理路径
 */
export async function copyWorkspacePath(target?: string | HTMLElement, ctx?: any): Promise<boolean> {
  const path = resolveWorkspacePath(target, ctx);

  if (!path) {
    showToast("未检测到工作区路径", "当前会话可能未关联固定工作区", true);
    return false;
  }

  // 规范化 Windows 路径格式并去除多余反斜杠
  let normalized = path.replace(/[\\/]+/g, "\\");
  if (normalized.length > 3 && normalized.endsWith("\\")) {
    normalized = normalized.slice(0, -1);
  }

  const ok = await copyToClipboard(normalized);

  if (ok) {
    showToast("已复制工作区路径", normalized, false);
  } else {
    showToast("复制失败", "请检查剪贴板写入权限", true);
  }

  return ok;
}

export interface WorkspacePathController {
  dispose: () => void;
}

/**
 * 初始化工作区路径复制特性（左侧工作区行 Hover 快捷按钮）
 */
export function initWorkspacePath(ctx?: any): WorkspacePathController {
  let rafId: number | null = null;
  let lastTarget: HTMLElement | null = null;

  const handleMouseOver = (event: MouseEvent) => {
    try {
      const target = event.target as HTMLElement | null;
      if (!target || target === lastTarget) return;
      lastTarget = target;

      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        // 寻找工作区行 (projectRow)
        const row = target.closest<HTMLElement>("[class*=\"projectRow\"]");
        if (!row || !row.isConnected) return;

        // 寻找操作按钮栏
        const actionsContainer = row.querySelector<HTMLElement>("[class*=\"rowActions\"]");
        if (!actionsContainer || !actionsContainer.isConnected) return;

        // 如果已经注入过复制按钮，跳过
        if (actionsContainer.querySelector(".dsh-hover-copyworkspace-btn")) return;

        // 提取该工作区的 label 标题
        const titleEl = row.querySelector<HTMLElement>("[class*=\"title\"]");
        const label = (titleEl?.textContent || "").trim();

        const copyBtn = document.createElement("button");
        copyBtn.type = "button";
        copyBtn.className = "dsh-hover-copyworkspace-btn";
        copyBtn.title = `复制「${label || "工作区"}」绝对路径`;
        copyBtn.setAttribute("aria-label", `复制 ${label} 绝对路径`);
        copyBtn.innerHTML = FOLDER_PATH_ICON_SVG;

        copyBtn.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

          // 直接将 row 元素传给 copyWorkspacePath，精准提取
          const ok = await copyWorkspacePath(row, ctx);

          if (ok) {
            copyBtn.innerHTML = CHECK_ICON_SVG;
            setTimeout(() => {
              if (copyBtn.isConnected) {
                copyBtn.innerHTML = FOLDER_PATH_ICON_SVG;
              }
            }, 1200);
          }
        });

        // 插入在 actionsContainer 最前面
        if (actionsContainer.isConnected && !actionsContainer.querySelector(".dsh-hover-copyworkspace-btn")) {
          actionsContainer.insertBefore(copyBtn, actionsContainer.firstChild);
        }
      });
    } catch {}
  };

  window.addEventListener("mouseover", handleMouseOver, true);

  return {
    dispose: () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener("mouseover", handleMouseOver, true);
      document.querySelectorAll(".dsh-hover-copyworkspace-btn").forEach((el) => el.remove());
    },
  };
}
