import { CollapseGuard } from './guard.js';

export interface CollapseController {
  isCollapsed: () => boolean;
  toggle: () => void;
  onChanged: (cb: (collapsed: boolean) => void) => () => void;
  dispose: () => void;
}

export function initInputCollapse(): CollapseController {
  const guard = new CollapseGuard();
  guard.start();

  const listeners = new Set<(collapsed: boolean) => void>();

  const onMousedown = (e: MouseEvent) => guard.handlePointer(e);
  document.addEventListener('mousedown', onMousedown, true);

  return {
    isCollapsed: () => guard.isCollapsed(),
    toggle: () => {
      guard.toggle();
      const state = guard.isCollapsed();
      listeners.forEach((cb) => {
        try {
          cb(state);
        } catch (_) {}
      });
    },
    onChanged: (cb: (collapsed: boolean) => void) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    dispose: () => {
      document.removeEventListener('mousedown', onMousedown, true);
      guard.dispose();
      listeners.clear();
    },
  };
}
