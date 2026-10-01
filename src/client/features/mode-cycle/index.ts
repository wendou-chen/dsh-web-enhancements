import { showToast } from '../../shared/toast.js';
import {
  findDshComposer,
  isTextArea,
  setReactInputValue,
  type DshComposer,
} from '../../shared/dom-utils.js';

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
 * 获取输入框内当前文本内容（同时兼容 Textarea 与 Lexical contenteditable）
 */
export function getComposerText(composer: DshComposer): string {
  if (isTextArea(composer)) {
    return composer.value || '';
  }

  const anyComposer = composer as any;
  const editor = anyComposer.__lexicalEditor;
  if (editor && typeof editor.getEditorState === 'function') {
    let t = '';
    try {
      editor.getEditorState().read(() => {
        const root = editor.getEditorState()._nodeMap.get('root');
        t = root?.getTextContent?.() || '';
      });
      if (t !== undefined && t !== null) return t;
    } catch (_) {}
  }

  return (composer.innerText || composer.textContent || '').replace(/\r\n/g, '\n').replace(/\n$/, '');
}

/**
 * 设置输入框文本并对齐 Lexical 内部状态与光标位置
 */
export function setComposerText(composer: DshComposer, text: string): void {
  if (isTextArea(composer)) {
    setReactInputValue(composer, text);
    composer.focus();
    const len = text.length;
    composer.setSelectionRange(len, len);
    return;
  }

  composer.focus();
  const anyComposer = composer as any;
  const editor = anyComposer.__lexicalEditor;

  if (editor && editor._commands) {
    try {
      // 1. 全选当前内容
      const selectAllCmd = Array.from(editor._commands.keys()).find((c: any) => c?.type === 'SELECT_ALL_COMMAND');
      if (selectAllCmd) editor.dispatchCommand(selectAllCmd, undefined);

      // 2. 插入新文本或清空
      if (text) {
        const insertCmd = Array.from(editor._commands.keys()).find((c: any) => c?.type === 'CONTROLLED_TEXT_INSERTION_COMMAND');
        if (insertCmd) editor.dispatchCommand(insertCmd, text);
      } else {
        const delCmd = Array.from(editor._commands.keys()).find(
          (c: any) =>
            c?.type === 'KEY_BACKSPACE_COMMAND' ||
            c?.type === 'KEY_DELETE_COMMAND' ||
            c?.type === 'DELETE_CHARACTER_COMMAND'
        );
        if (delCmd) editor.dispatchCommand(delCmd, undefined);
      }
    } catch (_) {}
  } else {
    // 非 Lexical contenteditable 兜底
    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(composer);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    if (text) {
      document.execCommand('insertText', false, text);
    } else {
      document.execCommand('delete', false, null);
    }
  }

  composer.dispatchEvent(new Event('input', { bubbles: true, cancelable: true, composed: true }));
  composer.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
}

/**
 * 检测当前会话的活跃模式（优先输入框顶格命令，其次投影状态）
 */
export function detectCurrentMode(composer?: DshComposer | null, ctx?: any, sessionId?: string): SessionMode {
  // 1. 优先通过输入框文本顶格指令识别
  if (composer) {
    const text = getComposerText(composer);
    if (/^\/plan(?:\s+|$)/i.test(text)) return 'plan';
    if (/^\/goal(?:\s+|$)/i.test(text)) return 'goal';
  }

  // 2. 通过 Context 投影精准探测
  const sid = sessionId || getActiveSessionId(ctx);
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

  // 3. DOM 投影探测
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
        if (p && p !== 'default' && p !== 'standard' && p !== 'code' && p !== 'minimal') {
          return true;
        }
      }
    } catch {}
  }

  if (typeof document !== 'undefined') {
    const agentPill = document.querySelector('[class*="agentPreset"], [class*="presetSelector"], [data-preset]');
    if (agentPill) {
      const p = (agentPill.getAttribute('data-preset') || agentPill.textContent || '').toLowerCase();
      if (p && !p.includes('default') && !p.includes('标准')) return true;
    }
  }

  return false;
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
      const composer = findDshComposer();
      if (!composer) {
        showToast('⚠️ 未定位到输入框', '请先进入或新建一个会话', true, 1800);
        return;
      }

      const sessionId = getActiveSessionId(ctx);
      const isCustom = isCustomAgentPreset(ctx, sessionId);

      const currentText = getComposerText(composer);
      const currentMode = detectCurrentMode(composer, ctx, sessionId);

      // 去除开头的 /plan 或 /goal 指令前缀
      const stripped = currentText.replace(/^\/(?:plan|goal)(?:\s+|$)/i, '').trimStart();

      let nextMode: SessionMode = 'standard';
      let nextText = '';

      if (currentMode === 'standard') {
        // 状态 1: 标准模式 -> 切换至 Plan 模式
        // 在输入框内顶格嵌入 "/plan "
        nextMode = 'plan';
        nextText = stripped ? `/plan ${stripped}` : '/plan ';
        setComposerText(composer, nextText);
        showToast('🎯 已切换至「Plan 计划模式」', '输入框已顶格嵌入 /plan', false, 1800);
      } else if (currentMode === 'plan') {
        // 状态 2: Plan 模式
        if (isCustom) {
          // 自定义 Agent 预设：无 Goal 模式，直接切回标准模式
          nextMode = 'standard';
          nextText = stripped;
          setComposerText(composer, nextText);
          showToast('⚡ 已切换至「标准模式」', '已清除 /plan 指令，恢复常规对话', false, 1800);
        } else {
          // 默认 Agent：切换至 Goal 模式
          // 在输入框内顶格嵌入 "/goal "
          nextMode = 'goal';
          nextText = stripped ? `/goal ${stripped}` : '/goal ';
          setComposerText(composer, nextText);
          showToast('🏁 已切换至「Goal 目标模式」', '输入框已顶格嵌入 /goal', false, 1800);
        }
      } else if (currentMode === 'goal') {
        // 状态 3: Goal 模式 -> 切回标准模式
        nextMode = 'standard';
        nextText = stripped;
        setComposerText(composer, nextText);
        showToast('⚡ 已切换至「标准模式」', '已清除指令，恢复常规对话', false, 1800);
      }

      // 如果页面上有旧的 Plan Chip 激活按钮，同步点击退出
      if (nextMode === 'standard') {
        const chipOff = document.querySelector<HTMLButtonElement>(
          '.rS3zOq_chip, [class*="PlanModeControl_chip"], button[title*="/plan off"], button[aria-label*="Plan mode on"], button[aria-label*="plan mode 已开启"]'
        );
        if (chipOff) chipOff.click();
      }

      // 保持输入框焦点
      composer.focus();
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
    getCurrentMode: () => {
      const comp = typeof document !== 'undefined' ? findDshComposer() : null;
      return detectCurrentMode(comp, ctx);
    },
    cycle,
    dispose: () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', handleKeydown, { capture: true });
        document.removeEventListener('keydown', handleKeydown, { capture: true });
      }
    },
  };
}