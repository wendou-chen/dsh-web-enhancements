import { unescapeHtml } from '../../shared/dom-utils.js';

export interface ExtractedMath {
  source: string;
  wrappedText: string;
  isDisplay: boolean;
  container: HTMLElement;
}

export function findMathContainer(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;

  // 排除纯代码块或普通文本
  const inCodeBlock = target.closest('pre:not(.katex-display), code:not(.katex *)');
  if (inCodeBlock && !target.closest('.katex, .katex-display, .MathJax, mjx-container')) {
    return null;
  }

  // 1. KaTeX 容器
  const katex = target.closest('.katex');
  if (katex instanceof HTMLElement) {
    const displayParent = katex.closest('.katex-display');
    return displayParent instanceof HTMLElement ? displayParent : katex;
  }
  const katexDisplay = target.closest('.katex-display');
  if (katexDisplay instanceof HTMLElement) return katexDisplay;

  // 2. MathJax 容器
  const mjx = target.closest('mjx-container');
  if (mjx instanceof HTMLElement) return mjx;

  const mathJax = target.closest('.MathJax_Display, .MathJax');
  if (mathJax instanceof HTMLElement) return mathJax;

  // 3. 显式属性
  const customMath = target.closest('[data-math-source], [data-latex], [data-math]');
  if (customMath instanceof HTMLElement) return customMath;

  return null;
}

export function extractLatex(element: HTMLElement): ExtractedMath | null {
  let rawSource: string | null = null;

  // 1. 显式属性
  rawSource =
    element.getAttribute('data-math-source') ||
    element.getAttribute('data-latex') ||
    element.getAttribute('data-math');

  // 2. KaTeX MathML annotation
  if (!rawSource) {
    const texAnnotation = element.querySelector('annotation[encoding="application/x-tex"]');
    if (texAnnotation && texAnnotation.textContent) {
      rawSource = texAnnotation.textContent;
    }
  }

  // 3. 通用 annotation
  if (!rawSource) {
    const anyAnnotation = element.querySelector('annotation');
    if (anyAnnotation && anyAnnotation.textContent) {
      rawSource = anyAnnotation.textContent;
    }
  }

  // 4. MathJax 3 assistive MML
  if (!rawSource && element.tagName.toLowerCase() === 'mjx-container') {
    const assistive = element.querySelector('mjx-assistive-mml annotation[encoding="application/x-tex"]');
    if (assistive && assistive.textContent) {
      rawSource = assistive.textContent;
    }
  }

  if (!rawSource || !rawSource.trim()) return null;

  const cleaned = unescapeHtml(rawSource.trim());
  const isDisplay = Boolean(
    element.classList.contains('katex-display') ||
      element.closest('.katex-display') ||
      element.getAttribute('display') === 'true' ||
      element.classList.contains('MathJax_Display') ||
      /^\s*\\begin\{(equation|align|gather|multline|bmatrix|matrix|pmatrix)\}/.test(cleaned),
  );

  // 块级公式复制为单行 $$...$$，避免 $$ 与公式之间出现换行
  const wrappedText = isDisplay ? `$$${cleaned}$$` : `$${cleaned}$`;

  return {
    source: cleaned,
    wrappedText,
    isDisplay,
    container: element,
  };
}
