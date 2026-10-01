import { showToast } from '../../shared/toast.js';

export type SessionMode = 'standard' | 'plan' | 'goal';

export interface ModeCycleController {
  getCurrentMode: () => SessionMode;
  cycle: () => Promise<void>;
  dispose: () => void;
}

/**
 * 安全非阻塞读取 Cordis Context 服务
 */
function safeGetService<T = any>(ctx: any, key: string): T | undefined {
  if (!ctx) return undefined;
  try {
    if (typeof ctx.get === 'function') {
      const val = ctx.get(key);
      if (val !== undefined) return val as T;
    }
  } catch {}
  try {
    const raw = (ctx as any)[Symbol.for('cordis.context')] || ctx;
    return Reflect.get(raw, key);
  } catch {
    return undefined;
  }
}

/**
 * 提取当前活跃会话 ID
 */
export function getActiveSessionId(ctx?: any): string {
  if (typeof window !== 'undefined' && window.location.hash) {
    const match = window.location.hash.match(/#\/session\/([a-zA-Z0-9_\-]+)/);
    if (match && match[1]) {
      return match[1];
    }
  }
  try {
    const sessions = safeGetService(ctx, 'sessions') || ctx?.sessions;
    const current = sessions?.list?.getSnapshot?.()?.current;
    if (current) return current;
  } catch {}
  return '';
}

/**
 * 检测当前会话的活跃模式
 */
export function detectCurrentMode(ctx?: any, sessionId?: string): SessionMode {
  const sid = sessionId || getActiveSessionId(ctx);

  // 1. 通过 Context 投影精准探测
  if (sid) {
    try {
      const sessions = safeGetService(ctx, 'sessions') || ctx?.sessions;
      const binding = sessions?.binding?.(sid);
      const session = binding?.session || binding;
      const planSnapshot = session?.projections?.faceOf?.('plan')?.getSnapshot?.();
      if (planSnapshot && (planSnapshot.active || planSnapshot.pending)) {
        return 'plan';
      }
      const goalSnapshot = session?.projections?.faceOf?.('goal')?.getSnapshot?.();
      if (goalSnapshot && (goalSnapshot.goal?.phase === 'active' || goalSnapshot.goal?.phase === 'paused')) {
        return 'goal';
      }
    } catch {}
  }

  // 2. DOM 投影探测
  if (typeof document !== 'undefined') {
    const planChipOn = document.querySelector(
      '.rS3zOq_chip, [class*="PlanModeControl_chip"], button[title*="/plan off"], button[aria-label*="Plan mode on"], button[aria-label*="plan mode 已开启"], [data-plan-artifacts]'
    );
    if (planChipOn) return 'plan';

    const goalBar = document.querySelector(
      '.nLMEza_dock, .nLMEza_bar, [data-goal-dock], [class*="GoalBar_dock"], [aria-label*="目标内容"], [aria-label*="Goal objective"]'
    );
    if (goalBar && (goalBar as HTMLElement).clientHeight > 0) return 'goal';
  }

  return 'standard';
}

/**
 * 探测当前会话是否为自定义 Agent 预设（无 Goal 模式能力）
 */
export function isCustomAgentPreset(ctx?: any, sessionId?: string): boolean {
  const sid = sessionId || getActiveSessionId(ctx);

  if (sid) {
    try {
      const sessions = safeGetService(ctx, 'sessions') || ctx?.sessions;
      const binding = sessions?.binding?.(sid);
      const session = binding?.session || binding;
      const preset = session?.preset || binding?.preset || session?.options?.preset;
      if (preset && typeof preset === 'string') {
        const p = preset.toLowerCase();
        if (p !== 'default' && p !== 'standard' && p !== 'code' && p !== 'minimal') {
          return true;
        }
      }
    } catch {}
  }

  if (typeof document !== 'undefined') {
    const headerText = document.body.innerText || '';
    if (
      headerText.includes('Desmos') ||
      headerText.includes('考研') ||
      headerText.includes('画板') ||
      headerText.includes('Gemini') ||
      headerText.includes('Claude')
    ) {
      const isDefault = document.querySelector('[data-preset="default"], [data-mode="standard"]');
      if (!isDefault) return true;
    }
  }

  return false;
}

/**
 * 派发命令（优先 session.command / remote.commands，DOM 点击兜底）
 */
async function executeCommand(ctx: any, sessionId: string, command: string): Promise<boolean> {
  let executed = false;

  // 1. 尝试通过 session.command(command) 执行
  if (sessionId) {
    try {
      const sessions = safeGetService(ctx, 'sessions') || ctx?.sessions;
      const binding = sessions?.binding?.(sessionId);
      const session = binding?.session;
      if (session && typeof session.command === 'function') {
        const res = await session.command(command);
        if (res?.ok) executed = true;
      }
    } catch (_) {}
  }

  // 2. 尝试通过 DSH remote.commands 执行
  if (!executed && sessionId) {
    try {
      const remote = safeGetService(ctx, 'remote') || ctx?.remote;
      if (remote?.commands?.execute) {
        const res = await remote.commands.execute(sessionId, command, []);
        if (res?.ok) executed = true;
      }
    } catch (_) {}
  }

  // 3. DOM 模拟点击兜底
  if (typeof document !== 'undefined') {
    if (command === '/plan off') {
      const chipOff = document.querySelector<HTMLButtonElement>(
        '.rS3zOq_chip, [class*="PlanModeControl_chip"], button[title*="/plan off"], button[aria-label*="Plan mode on"], button[aria-label*="plan mode 已开启"]'
      );
      if (chipOff) {
        chipOff.click();
        executed = true;
      }
    } else if (command === '/goal clear') {
      const goalClearBtn = document.querySelector<HTMLButtonElement>(
        '.nLMEza_bar button[aria-label*="Clear"], .nLMEza_bar button[aria-label*="清除"], .nLMEza_bar button[aria-label*="取消"], [data-goal-dock] button[aria-label*="Clear"], [data-goal-dock] button[aria-label*="清除"]'
      );
      if (goalClearBtn) {
        goalClearBtn.click();
        executed = true;
      }
    }
  }

  return executed;
}

/**
 * 初始化 Shift+Tab 模式快速轮转控制器
 */
export function initModeCycle(ctx?: any): ModeCycleController {
  let isCycling = false;

  const cycle = async () => {
    if (isCycling) return;
    isCycling = true;

    try {
      const sessionId = getActiveSessionId(ctx);
      const currentMode = detectCurrentMode(ctx, sessionId);
      const isCustom = isCustomAgentPreset(ctx, sessionId);

      // 记录原焦点元素
      const activeEl = document.activeElement as HTMLElement | null;

      if (currentMode === 'standard') {
        // 状态 1: 标准模式 -> 切换至 Plan 模式
        await executeCommand(ctx, sessionId, '/plan');
        showToast('🎯 已切换至「Plan 计划模式」', '可组织多步骤推导与实施方案规划', false, 2000);
      } else if (currentMode === 'plan') {
        // 状态 2: Plan 模式
        if (isCustom) {
          // 自定义 Agent 预设：无 Goal 模式，直接切回标准模式
          await executeCommand(ctx, sessionId, '/plan off');
          showToast('⚡ 已切换至「标准模式」', '已恢复常规对话交互', false, 2000);
        } else {
          // 默认 Agent：退出 Plan，进入 Goal 模式
          await executeCommand(ctx, sessionId, '/plan off');
          await executeCommand(ctx, sessionId, '/goal');
          showToast('🏁 已切换至「Goal 目标模式」', '可设定多轮闭环目标与边界约束', false, 2000);
        }
      } else if (currentMode === 'goal') {
        // 状态 3: Goal 模式 -> 切回标准模式
        await executeCommand(ctx, sessionId, '/goal clear');
        showToast('⚡ 已切换至「标准模式」', '已恢复常规对话交互', false, 2000);
      }

      // 恢复焦点到原输入框
      if (activeEl && typeof activeEl.focus === 'function') {
        setTimeout(() => activeEl.focus(), 60);
      }
    } catch (err) {
      console.warn('[dsh-web-enhancements] mode cycle error:', err);
    } finally {
      setTimeout(() => {
        isCycling = false;
      }, 150);
    }
  };

  const handleKeydown = (e: KeyboardEvent) => {
    const isShift = e.shiftKey;
    const isTab = e.key === 'Tab' || e.code === 'Tab' || e.keyCode === 9 || e.which === 9;

    if (isShift && isTab) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      cycle();
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeydown, { capture: true, passive: false });
    document.addEventListener('keydown', handleKeydown, { capture: true, passive: false });
  }

  return {
    getCurrentMode: () => detectCurrentMode(ctx),
    cycle,
    dispose: () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', handleKeydown, { capture: true });
        document.removeEventListener('keydown', handleKeydown, { capture: true });
      }
    },
  };
}
