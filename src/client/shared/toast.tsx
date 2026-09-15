import React, { useEffect, useState } from 'react';

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
    card.innerHTML = `
      <div class="dsh-enhancement-toast-icon">${item.isError ? '⚠️' : '📋'}</div>
      <div class="dsh-enhancement-toast-content">
        <span class="dsh-enhancement-toast-title">${item.message}</span>
        ${item.preview ? `<code class="dsh-enhancement-toast-preview">${item.preview}</code>` : ''}
      </div>
    `;
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

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    return toastManager.subscribe(setToasts);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="dsh-enhancement-toast-viewport">
      {toasts.map((t) => (
        <div key={t.id} className={`dsh-enhancement-toast-card ${t.isError ? 'is-error' : 'is-success'}`}>
          <div className="dsh-enhancement-toast-icon">{t.isError ? '⚠️' : '📋'}</div>
          <div className="dsh-enhancement-toast-content">
            <span className="dsh-enhancement-toast-title">{t.message}</span>
            {t.preview && <code className="dsh-enhancement-toast-preview">{t.preview}</code>}
          </div>
        </div>
      ))}
    </div>
  );
};
