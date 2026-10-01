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

    const composer = findDshComposer(event);
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

    if (this.mode === 'enter') {
      if (!withCtrl && !withShift) {
        event.preventDefault();
        event.stopPropagation();
        this.send(composer);
      }
    } else {
      // ctrl-enter 模式：Ctrl/Cmd+Enter 发送，普通 Enter 换行
      if (withCtrl) {
        event.preventDefault();
        event.stopPropagation();
        this.send(composer);
      } else if (!withShift) {
        event.preventDefault();
        event.stopPropagation();
        this.insertNewline(composer);
      }
    }
  }

  private canTakeOverSend(composer?: DshComposer): boolean {
    const btn = findSendButton(composer);
    return Boolean(btn && !btn.disabled);
  }

  private insertNewline(composer: DshComposer): void {
    insertComposerLineBreak(composer);
  }

  private send(composer: DshComposer): void {
    if (!getComposerValue(composer).trim()) return;
    const btn = findSendButton(composer);
    if (btn && !btn.disabled) {
      btn.click();
      return;
    }

    requestAnimationFrame(() => {
      const retryBtn = findSendButton(composer);
      if (retryBtn && !retryBtn.disabled) {
        retryBtn.click();
      }
    });
  }
}