import { unescapeHtml } from '../../shared/dom-utils.js';

export function selectionToMarkdown(range: Range): string {
  if (!range || range.collapsed) return '';

  const fragment = range.cloneContents();
  const sandbox = document.createElement('div');
  sandbox.appendChild(fragment);

  // 1. 优先提取块级公式 ($$...$$)
  const displayMaths = Array.from(sandbox.querySelectorAll('.katex-display, [data-math-display="true"]'));
  for (const dm of displayMaths) {
    const tex = extractLatexFromNode(dm);
    if (tex) {
      const rep = document.createElement('div');
      rep.textContent = `\n\n$$${tex}$$\n\n`;
      dm.replaceWith(rep);
    }
  }

  // 2. 提取行内公式 ($...$)
  const inlineMaths = Array.from(sandbox.querySelectorAll('.katex, [data-math], span[class*="math"]'));
  for (const im of inlineMaths) {
    if (im.closest('.katex-display')) continue;
    const tex = extractLatexFromNode(im);
    if (tex) {
      const rep = document.createElement('span');
      rep.textContent = `$${tex}$`;
      im.replaceWith(rep);
    }
  }

  // 3. 代码块处理
  const codeBlocks = Array.from(sandbox.querySelectorAll('pre'));
  for (const pre of codeBlocks) {
    pre.querySelectorAll('.copy-btn, .line-numbers, button').forEach((el) => el.remove());
    const codeEl = pre.querySelector('code');
    const fullClass = `${pre.className} ${codeEl ? codeEl.className : ''}`;
    const match = fullClass.match(/(?:language|lang)-([a-zA-Z0-9_-]+)/);
    const lang = match ? match[1] : '';
    const content = (codeEl ? codeEl.textContent : pre.textContent) || '';
    const clean = content.replace(/\r\n/g, '\n').replace(/^\n+|\n+$/g, '');

    const rep = document.createElement('div');
    rep.textContent = `\n\n\`\`\`${lang}\n${clean}\n\`\`\`\n\n`;
    pre.replaceWith(rep);
  }

  let text = sandbox.innerText || sandbox.textContent || '';
  return text.replace(/\u00A0/g, ' ').replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function extractLatexFromNode(el: Element): string | null {
  const dataMath = el.getAttribute('data-math') || el.getAttribute('data-math-source') || el.getAttribute('data-latex');
  if (dataMath && dataMath.trim()) return unescapeHtml(dataMath.trim());

  const texAnnotation = el.querySelector('annotation[encoding="application/x-tex"]');
  if (texAnnotation && texAnnotation.textContent?.trim()) {
    return unescapeHtml(texAnnotation.textContent.trim());
  }

  const anyAnnotation = el.querySelector('annotation');
  if (anyAnnotation && anyAnnotation.textContent?.trim()) {
    return unescapeHtml(anyAnnotation.textContent.trim());
  }

  return null;
}
