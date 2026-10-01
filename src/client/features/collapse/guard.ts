import { findDshComposer, DshComposer, isTextArea } from '../../shared/dom-utils.js';

const STORAGE_KEY = 'dshInputCollapsed';
const COLLAPSED_HEIGHT = 52;

export class CollapseGuard {
  private collapsed = false;
  private observer: MutationObserver | null = null;
  private intervalId: number | null = null;

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

    // 严禁监听 attributes（尤其是 style），防止与 applyCollapsed 发生 MutationObserver 递归死循环导致页面崩溃
    this.observer = new MutationObserver(() => {
      if (this.collapsed) {
        this.applyCollapsed();
      }
    });
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    this.intervalId = window.setInterval(() => {
      if (this.collapsed) {
        this.applyCollapsed();
      }
    }, 1500);
  }

  public applyCollapsed(): void {
    const composer = findDshComposer();
    if (!composer) return;

    const targetHeight = `${COLLAPSED_HEIGHT}px`;
    // 幂等性检查：避免重复触发重排与重绘
    if (composer.style.height !== targetHeight || composer.style.maxHeight !== targetHeight) {
      composer.style.height = targetHeight;
      composer.style.maxHeight = targetHeight;
      composer.style.overflowY = 'auto';
    }

    const scroll = composer.closest('[class*="_scroll"]') as HTMLElement | null;
    if (scroll && (scroll.style.maxHeight !== targetHeight || scroll.style.overflowY !== 'auto')) {
      scroll.style.maxHeight = targetHeight;
      scroll.style.overflowY = 'auto';
    }
  }

  public applyExpanded(): void {
    const composer = findDshComposer();
    if (!composer) return;

    if (composer.style.height || composer.style.maxHeight) {
      composer.style.height = '';
      composer.style.maxHeight = '';
      composer.style.overflowY = '';
    }

    const scroll = composer.closest('[class*="_scroll"]') as HTMLElement | null;
    if (scroll && (scroll.style.maxHeight || scroll.style.overflowY)) {
      scroll.style.maxHeight = '';
      scroll.style.overflowY = '';
    }

    requestAnimationFrame(() => {
      if (!composer.isConnected) return;
      composer.dispatchEvent(new Event('input', { bubbles: true, cancelable: true, composed: true }));
    });
  }

  public handlePointer(e: MouseEvent): void {
    if (!this.collapsed) return;
    const composer = findDshComposer();
    if (!composer || !isTextArea(composer)) return;

    const r = composer.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;

    const topEl = document.elementFromPoint(e.clientX, e.clientY);
    if (topEl === composer) return;

    e.preventDefault();
    e.stopPropagation();
    composer.focus();
    composer.setSelectionRange(composer.value.length, composer.value.length);
  }

  public dispose(): void {
    this.observer?.disconnect();
    this.observer = null;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.applyExpanded();
  }
}
