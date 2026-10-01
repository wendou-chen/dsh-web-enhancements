import { findMathContainer, extractLatex } from './extractor.js';
import { copyToClipboard } from '../../shared/clipboard.js';
import { showToast } from '../../shared/toast.js';

const STORAGE_KEY = 'dsh_formula_copy_enabled';

export interface FormulaCopyController {
  isEnabled: () => boolean;
  toggle: () => void;
  setEnabled: (val: boolean, notify?: boolean) => void;
  onChanged: (cb: (enabled: boolean) => void) => () => void;
  dispose: () => void;
}

export function initFormulaCopy(): FormulaCopyController {
  let isEnabled = localStorage.getItem(STORAGE_KEY) !== 'false';
  const listeners = new Set<(enabled: boolean) => void>();

  const syncClass = () => {
    if (isEnabled) {
      document.documentElement.classList.add('dsh-formula-active');
    } else {
      document.documentElement.classList.remove('dsh-formula-active');
    }
  };

  syncClass();

  const setEnabled = (val: boolean, notify = true) => {
    isEnabled = val;
    try {
      localStorage.setItem(STORAGE_KEY, val ? 'true' : 'false');
    } catch (_) {}
    syncClass();
    listeners.forEach((cb) => {
      try {
        cb(isEnabled);
      } catch (_) {}
    });
    if (notify) {
      showToast(
        val ? '公式点击复制已开启' : '公式点击复制已关闭',
        val ? '单击数学公式即可复制 LaTeX 源码' : '已停止拦截公式点击，释放给划词翻译',
      );
    }
  };

  let pointerStartX = 0;
  let pointerStartY = 0;

  const handlePointerDown = (e: MouseEvent) => {
    pointerStartX = e.clientX;
    pointerStartY = e.clientY;
  };

  const handleClick = async (event: MouseEvent) => {
    if (!isEnabled) return;
    if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey) return;

    // 1. 防冲突保护：发生过鼠标拖拽位移（>4px）判定为划词动作，绝不拦截 click
    const dragDistance = Math.hypot(event.clientX - pointerStartX, event.clientY - pointerStartY);
    if (dragDistance > 4) {
      return;
    }

    // 2. 防冲突保护：当前页面存在文本选区（如 Trancy 正在划词）时，绝不拦截
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) {
      return;
    }

    const mathContainer = findMathContainer(event.target);
    if (!mathContainer) return;

    const extracted = extractLatex(mathContainer);
    if (!extracted) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    mathContainer.classList.remove('dsh-formula-clicked');
    void mathContainer.offsetWidth; // 触发回流以重播动效
    mathContainer.classList.add('dsh-formula-clicked');

    const success = await copyToClipboard(extracted.wrappedText);
    if (success) {
      const preview = extracted.wrappedText.replace(/\s+/g, ' ');
      const displayPreview = preview.length > 42 ? `${preview.slice(0, 40)}...` : preview;
      showToast('LaTeX 公式已复制', displayPreview, false);
    } else {
      showToast('复制失败，请检查剪贴板权限', undefined, true);
    }
  };

  window.addEventListener('mousedown', handlePointerDown, true);
  window.addEventListener('click', handleClick, true);

  return {
    isEnabled: () => isEnabled,
    toggle: () => setEnabled(!isEnabled),
    setEnabled,
    onChanged: (cb: (enabled: boolean) => void) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    dispose: () => {
      document.documentElement.classList.remove('dsh-formula-active');
      window.removeEventListener('mousedown', handlePointerDown, true);
      window.removeEventListener('click', handleClick, true);
      listeners.clear();
    },
  };
}

