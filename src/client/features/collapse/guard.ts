import { findDshComposer, DshComposer, isTextArea, focusComposerEnd } from '../../shared/dom-utils.js';

const STORAGE_KEY = 'dshInputCollapsed';
/** 单行紧凑模式的高度（恰好容纳 1 行完整文字 + 上下内边距 + 原生光标） */
export const COMPACT_SCROLL_HEIGHT = 38;

export class CollapseGuard {
  private collapsed = false;
  private observer: MutationObserver | null = null;
  private boundComposer: DshComposer | null = null;
  private onKeyDownHandler: ((e: KeyboardEvent) => void) | null = null;
  private onBeforeInputHandler: ((e: Event) => void) | null = null;

  constructor() {
    try {
      this.collapsed = localStorage.getItem(STORAGE_KEY) === '1';
    } catch (_) {
      this.collapsed = false;
    }
  }

  public isCollapsed(): boolean {
    return this.collapsed;
  }

  public setCollapsed(value: boolean): void {
    this.collapsed = value;
    try {
      localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
    } catch (_) {}

    if (this.collapsed) {
      this.applyCollapsed();
    } else {
      this.applyExpanded();
    }
  }

  public toggle(): boolean {
    this.setCollapsed(!this.collapsed);
    return this.collapsed;
  }

  public start(): void {
    if (this.collapsed) {
      this.applyCollapsed();
    }

    // 观察 DOM 树节点挂载，确保会话切换后新挂载的输入框依然遵循状态
    this.observer = new MutationObserver(() => {
      if (this.collapsed) {
        this.applyCollapsed();
      }
      this.attachComposerListeners();
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    this.attachComposerListeners();
  }

  /**
   * 为当前活动的输入框绑定智能交互唤醒监听：
   * 1. 收起状态下，按键输入（keydown/beforeinput）自动平滑展开；
   * 2. 展开状态下，按 Escape 键快捷收起。
   */
  private attachComposerListeners(): void {
    const composer = findDshComposer();
    if (!composer || composer === this.boundComposer) return;

    this.detachComposerListeners();
    this.boundComposer = composer;

    this.onKeyDownHandler = (e: KeyboardEvent) => {
      // 1. 展开状态下：按 Esc 键快捷收起避让正文
      if (!this.collapsed && e.key === 'Escape') {
        e.preventDefault();
        this.setCollapsed(true);
        return;
      }

      // 2. 收起状态下：敲击有效输入键自动唤醒展开（排除独立按下的功能修饰键）
      if (this.collapsed) {
        if (['Control', 'Shift', 'Alt', 'Meta', 'CapsLock', 'Tab', 'Escape'].includes(e.key)) {
          return;
        }
        this.setCollapsed(false);
      }
    };

    this.onBeforeInputHandler = () => {
      if (this.collapsed) {
        this.setCollapsed(false);
      }
    };

    composer.addEventListener('keydown', this.onKeyDownHandler as EventListener, true);
    composer.addEventListener('beforeinput', this.onBeforeInputHandler as EventListener, true);
  }

  private detachComposerListeners(): void {
    if (this.boundComposer) {
      if (this.onKeyDownHandler) {
        this.boundComposer.removeEventListener('keydown', this.onKeyDownHandler as EventListener, true);
      }
      if (this.onBeforeInputHandler) {
        this.boundComposer.removeEventListener('beforeinput', this.onBeforeInputHandler as EventListener, true);
      }
      this.boundComposer = null;
    }
  }

  /**
   * 应用收起状态：
   * 绝不破坏 composer 自身的 height/maxHeight/overflow；
   * 仅约束外层滚动容器（_scroll）的最大高度，保持单行紧凑预览，彻底消除双滚动条错位。
   */
  public applyCollapsed(): void {
    const composer = findDshComposer();
    if (!composer) return;

    // 清理可能遗留的内联脏样式，恢复原生绝对定位与撑开机制
    composer.style.height = '';
    composer.style.maxHeight = '';
    composer.style.overflowY = '';

    const scroll = composer.closest('[class*="_scroll"]') as HTMLElement | null;
    if (scroll) {
      scroll.style.maxHeight = `${COMPACT_SCROLL_HEIGHT}px`;
      scroll.style.overflowY = 'auto';
      scroll.style.transition = 'max-height 0.22s cubic-bezier(0.4, 0, 0.2, 1)';
    }
  }

  /**
   * 应用展开状态：
   * 清除滚动容器高度限制，恢复多行自适应高度。
   */
  public applyExpanded(): void {
    const composer = findDshComposer();
    if (!composer) return;

    composer.style.height = '';
    composer.style.maxHeight = '';
    composer.style.overflowY = '';

    const scroll = composer.closest('[class*="_scroll"]') as HTMLElement | null;
    if (scroll) {
      scroll.style.maxHeight = '';
      scroll.style.overflowY = '';
      scroll.style.transition = 'max-height 0.22s cubic-bezier(0.4, 0, 0.2, 1)';
    }

    requestAnimationFrame(() => {
      if (!composer.isConnected) return;
      composer.dispatchEvent(new Event('input', { bubbles: true, cancelable: true, composed: true }));
    });
  }

  /**
   * 点击卡片/输入框时的唤醒恢复：
   * 彻底移除有害的 preventDefault / stopPropagation，让浏览器原生事件自然流转。
   * 用户在收起状态下点击卡片输入区时，自动平滑展开并对焦末尾。
   */
  public handlePointer(e: MouseEvent): void {
    if (!this.collapsed) return;
    const composer = findDshComposer();
    if (!composer) return;

    const target = e.target as HTMLElement | null;
    if (!target) return;

    // 若点击的是工具栏按钮、发送按钮、模型选择器等操作控件，放行原生行为，不强行展开
    if (target.closest('button, select, [role="button"], [role="menuitem"]')) {
      return;
    }

    const card = composer.closest('[class*="_card"]') as HTMLElement | null;
    if ((card && card.contains(target)) || composer.contains(target) || target === composer) {
      this.setCollapsed(false);
      requestAnimationFrame(() => {
        focusComposerEnd(composer);
      });
    }
  }

  public dispose(): void {
    this.observer?.disconnect();
    this.detachComposerListeners();
    this.applyExpanded();
  }
}
