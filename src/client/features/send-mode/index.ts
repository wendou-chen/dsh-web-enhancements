import { SendModePolicy, SendMode } from './policy.js';

export interface SendModeController {
  getMode: () => SendMode;
  toggleMode: () => void;
  onChanged: (cb: (mode: SendMode) => void) => () => void;
  dispose: () => void;
}

export function initSendMode(defaultMode: SendMode = 'ctrl-enter'): SendModeController {
  const policy = new SendModePolicy(defaultMode);
  const listeners = new Set<(mode: SendMode) => void>();

  const onKeydown = (e: KeyboardEvent) => policy.handleKeydown(e);
  const onCompStart = () => policy.onCompositionStart();
  const onCompEnd = () => policy.onCompositionEnd();

  window.addEventListener('keydown', onKeydown, true);
  document.addEventListener('compositionstart', onCompStart, true);
  document.addEventListener('compositionend', onCompEnd, true);

  return {
    getMode: () => policy.getMode(),
    toggleMode: () => {
      policy.toggleMode();
      const mode = policy.getMode();
      listeners.forEach((cb) => {
        try {
          cb(mode);
        } catch (_) {}
      });
    },
    onChanged: (cb: (mode: SendMode) => void) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    dispose: () => {
      window.removeEventListener('keydown', onKeydown, true);
      document.removeEventListener('compositionstart', onCompStart, true);
      document.removeEventListener('compositionend', onCompEnd, true);
      listeners.clear();
    },
  };
}
