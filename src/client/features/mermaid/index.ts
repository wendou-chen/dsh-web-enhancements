import { MermaidManager } from './renderer.js';
import { showToast } from '../../shared/toast.js';

const STORAGE_KEY = 'dsh_mermaid_enabled';

export interface MermaidController {
  isEnabled: () => boolean;
  toggle: () => void;
  setEnabled: (val: boolean, notify?: boolean) => void;
  onChanged: (cb: (enabled: boolean) => void) => () => void;
  dispose: () => void;
}

export function initMermaid(): MermaidController {
  let isEnabled = localStorage.getItem(STORAGE_KEY) !== 'false';
  const listeners = new Set<(enabled: boolean) => void>();
  let manager: MermaidManager | null = null;

  const startOrStop = () => {
    if (isEnabled) {
      if (!manager) {
        manager = new MermaidManager();
        void manager.start();
      }
    } else {
      if (manager) {
        manager.dispose();
        manager = null;
      }
    }
  };

  startOrStop();

  const setEnabled = (val: boolean, notify = true) => {
    isEnabled = val;
    try {
      localStorage.setItem(STORAGE_KEY, val ? 'true' : 'false');
    } catch (_) {}
    startOrStop();
    listeners.forEach((cb) => {
      try {
        cb(isEnabled);
      } catch (_) {}
    });
    if (notify) {
      showToast(
        val ? 'Mermaid 图表渲染已开启' : 'Mermaid 图表渲染已关闭',
        val ? '将自动渲染代码块中的流程图与架构图' : '已暂停 Mermaid 自动渲染',
      );
    }
  };

  return {
    isEnabled: () => isEnabled,
    toggle: () => setEnabled(!isEnabled),
    setEnabled,
    onChanged: (cb: (enabled: boolean) => void) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    dispose: () => {
      if (manager) {
        manager.dispose();
        manager = null;
      }
      listeners.clear();
    },
  };
}

