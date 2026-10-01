export interface ToastItem {
  id: number;
  message: string;
  preview?: string;
  isError?: boolean;
}

type ToastListener = (toasts: ToastItem[]) => void;

class ToastManager {
  private toasts: ToastItem[] = [];
  private listeners: Set<ToastListener> = new Set();
  private nextId = 1;

  public subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);
    listener(this.toasts);
    return () => this.listeners.delete(listener);
  }

  public show(message: string, preview?: string, isError = false, duration = 2200): void {
    const id = this.nextId++;
    const item: ToastItem = { id, message, preview, isError };
    this.toasts = [...this.toasts, item];
    this.notify();

    // DOM 兜底渲染保证高可用
    this.renderDOMToast(item, duration);

    setTimeout(() => {
      this.toasts = this.toasts.filter((t) => t.id !== id);
      this.notify();
    }, duration);
  }

  private renderDOMToast(item: ToastItem, duration: number): void {
    if (typeof document === 'undefined') return;

    let viewport = document.querySelector<HTMLElement>('.dsh-enhancement-toast-viewport');
    if (!viewport) {
      viewport = document.createElement('div');
      viewport.className = 'dsh-enhancement-toast-viewport';
      document.body.appendChild(viewport);
    }

    const card = document.createElement('div');
    card.className = `dsh-enhancement-toast-card ${item.isError ? 'is-error' : 'is-success'}`;
    
    const icon = document.createElement('div');
    icon.className = 'dsh-enhancement-toast-icon';
    icon.textContent = item.isError ? '⚠️' : '📋';

    const content = document.createElement('div');
    content.className = 'dsh-enhancement-toast-content';

    const title = document.createElement('span');
    title.className = 'dsh-enhancement-toast-title';
    title.textContent = item.message;
    content.appendChild(title);

    if (item.preview) {
      const preview = document.createElement('code');
      preview.className = 'dsh-enhancement-toast-preview';
      preview.textContent = item.preview;
      content.appendChild(preview);
    }

    card.appendChild(icon);
    card.appendChild(content);
    viewport.appendChild(card);

    setTimeout(() => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(-6px)';
      card.style.transition = 'all 0.2s ease';
      setTimeout(() => card.remove(), 200);
    }, duration - 200);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn(this.toasts));
  }
}

export const toastManager = new ToastManager();

export function showToast(message: string, preview?: string, isError = false, duration = 2200): void {
  toastManager.show(message, preview, isError, duration);
}
