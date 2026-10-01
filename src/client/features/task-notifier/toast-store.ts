import { useSyncExternalStore } from 'react';
import { useNotifierPrefsStore } from './prefs-store.js';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  createdAt: number;
  sessionId?: string;
  actionText?: string;
  onAction?: () => void;
}

interface ToastStore {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id' | 'createdAt'>) => string;
  dismissToast: (id: string) => void;
  clearAll: () => void;
}

const listeners = new Set<() => void>();
let state: ToastStore;

function emit(patch: Partial<ToastStore>): void {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ToastStore {
  return state;
}

state = {
  toasts: [],
  addToast: (toast) => {
    const defaultDuration = useNotifierPrefsStore.getState().durationMs || 4500;
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newItem: ToastItem = {
      ...toast,
      id,
      createdAt: Date.now(),
      duration: toast.duration ?? defaultDuration,
    };
    emit({ toasts: [newItem, ...state.toasts].slice(0, 4) });
    return id;
  },
  dismissToast: (id) => {
    emit({ toasts: state.toasts.filter((item) => item.id !== id) });
  },
  clearAll: () => {
    emit({ toasts: [] });
  },
};

export const useToastStore = Object.assign(
  (): ToastStore => useSyncExternalStore(subscribe, getSnapshot, getSnapshot),
  {
    getState: (): ToastStore => state,
  },
);
