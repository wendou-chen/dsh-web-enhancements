import {
  DshComposer,
  findDshComposer,
  findSendButton,
  getComposerValue,
  insertComposerLineBreak,
} from '../../shared/dom-utils.js';

export type SendMode = 'enter' | 'ctrl-enter';

const STORAGE_KEY = 'dshSendMode';

export class SendModePolicy {
  private mode: SendMode = 'ctrl-enter';
  private isSynthetic = false;
  private isComposing = false;
  private compositionLockUntil = 0;

  constructor(defaultMode: SendMode = 'ctrl-enter') {
    try {
      const persisted = localStorage.getItem(STORAGE_KEY);
      this.mode = persisted === 'enter' ? 'enter' : defaultMode;
    } catch (_) {
      this.mode = defaultMode;
    }
  }

  public getMode(): SendMode {
    return this.mode;
  }

  public toggleMode(): SendMode {
    this.mode = this.mode === 'ctrl-enter' ? 'enter' : 'ctrl-enter';
    try {
      localStorage.setItem(STORAGE_KEY, this.mode);
    } catch (_) {}
    return this.mode;
  }

  public onCompositionStart(): void {
    this.isComposing = true;
  }

  public onCompositionEnd(): void {
    this.isComposing = false;
    this.compositionLockUntil = Date.now() + 50;
  }

  public handleKeydown(event: KeyboardEvent): void {
    if (this.isSynthetic) return;
    if (this.isComposing || event.keyCode === 229 || Date.now() < this.compositionLockUntil) return;
    if (event.key !== 'Enter') return;

    const composer = findDshComposer();
    if (!composer) return;

    const target = event.target as Node | null;
    const active = document.activeElement;
    const inComposer =
      target === composer ||
      active === composer ||
      (target instanceof Node && composer.contains(target)) ||
      (active instanceof Node && composer.contains(active));
    if (!inComposer) return;

    const withCtrl = event.ctrlKey || event.metaKey;
    const withShift = event.shiftKey;
    const hasContent = getComposerValue(composer).trim().length > 0;

    if (this.mode === 'ctrl-enter') {
      // ctrl-enter 模式：普通 Enter 换行，Ctrl/Cmd+Enter 发送/插话
      if (!withCtrl && !withShift) {
        event.preventDefault();
        event.stopPropagation();
        this.insertNewline(composer);
        return;
      }

      if (withCtrl) {
        // 核心防护 1：输入框为空时按下 Ctrl+Enter，防御性阻止原生批量操作或意外打断
        if (!hasContent) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        // 核心逻辑 2：输入框有内容时，完全放行浏览器原生的 Ctrl/Cmd+Enter 组合键事件流！
        // 避免在捕获阶段阻止冒泡，让原生 Lexical 编辑器接收到真实的 accelerated 键盘手势。
        // 在 settings.yaml (busyEnter: queue) 基准下，官方状态机会将 accelerated 原生映射为即时 Steer 插话；
        // 空闲态下则直接走 Transcript 毫秒级直发，彻底根除修饰键丢失与误进排队栏缺陷。
        return;
      }
    } else {
      // enter 模式：普通 Enter 发送，Shift+Enter 换行
      if (!withCtrl && !withShift) {
        if (!hasContent) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        // 普通 Enter 直接放行给原生编辑器提交
        return;
      }
    }
  }

  private canTakeOverSend(): boolean {
    const btn = findSendButton();
    return Boolean(btn && !btn.disabled);
  }

  private insertNewline(composer: DshComposer): void {
    insertComposerLineBreak(composer);
  }

  public send(composer: DshComposer, accelerated = false): void {
    if (!getComposerValue(composer).trim()) return;
    const btn = findSendButton();
    if (btn && !btn.disabled && !accelerated) {
      btn.click();
      return;
    }

    // 编程式或兜底派发：完整携带修饰键，确保即便处于兜底链路也能被识别为 accelerated
    this.isSynthetic = true;
    try {
      composer.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        ctrlKey: accelerated,
        metaKey: accelerated,
        bubbles: true,
        cancelable: true,
        composed: true,
      }));
    } finally {
      this.isSynthetic = false;
    }
  }
}