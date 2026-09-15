import { findMathContainer, extractLatex } from './extractor.js';
import { copyToClipboard } from '../../shared/clipboard.js';
import { showToast } from '../../shared/toast.js';

export function initFormulaCopy(): () => void {
  document.documentElement.classList.add('dsh-formula-active');

  const handleClick = async (event: MouseEvent) => {
    if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey) return;

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

  window.addEventListener('click', handleClick, true);

  return () => {
    document.documentElement.classList.remove('dsh-formula-active');
    window.removeEventListener('click', handleClick, true);
  };
}
