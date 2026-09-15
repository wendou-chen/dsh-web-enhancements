/**
 * DSH DOM 级 LaTeX 渲染错误拦截与优雅降级控制器
 */
import { copyToClipboard } from '../../shared/clipboard.js';
import { healMarkdownMath } from './healer.js';

export class RenderGuardian {
  private observer: MutationObserver | null = null;
  private isProcessing = false;

  public start(): void {
    this.scanAndHealErrors();

    this.observer = new MutationObserver((mutations) => {
      let shouldScan = false;
      for (const m of mutations) {
        if (m.addedNodes.length > 0) {
          shouldScan = true;
          break;
        }
      }
      if (shouldScan && !this.isProcessing) {
        this.scanAndHealErrors();
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  public scanAndHealErrors(): void {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // 匹配 KaTeX 渲染失败后生成的错误节点
      const errorElements = document.querySelectorAll<HTMLElement>(
        '.katex-error:not([data-dsh-handled="true"]), [style*="color: #cc0000"]:not([data-dsh-handled="true"]), [style*="color: rgb(204, 0, 0)"]:not([data-dsh-handled="true"])'
      );

      for (const el of Array.from(errorElements)) {
        this.handleErrorElement(el);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private handleErrorElement(el: HTMLElement): void {
    // 避免重复处理
    if (el.getAttribute('data-dsh-handled') === 'true' || el.closest('.dsh-math-error-container')) {
      return;
    }

    el.setAttribute('data-dsh-handled', 'true');

    // 提取原始内容
    const rawContent = el.getAttribute('title') || el.textContent || '';
    if (!rawContent.trim()) return;

    // 清理 KaTeX 默认的刺眼大红色
    el.style.color = 'inherit';
    el.style.background = 'transparent';
    el.style.border = 'none';

    // 判定 1：若错误内容中包含明显的 Markdown 标题（### 等）或大段非数学说明文字
    // 说明是公式围栏泄漏导致的排版坍塌，进行文本级二次逃生渲染
    const hasMarkdownHeadings = /(?:^|\n)\s*#{1,6}\s+/.test(rawContent);
    const hasChineseParagraphs = /[\u4e00-\u9fa5]{10,}/.test(rawContent);

    if (hasMarkdownHeadings || hasChineseParagraphs) {
      const container = document.createElement('div');
      container.className = 'dsh-math-escaped-block';
      container.setAttribute('data-dsh-handled', 'true');
      
      const healedText = healMarkdownMath(rawContent);
      // 以预格式化或结构化段落呈现，消除红字影响
      const p = document.createElement('div');
      p.className = 'dsh-math-healed-text';
      p.textContent = healedText;
      container.appendChild(p);

      el.replaceWith(container);
      return;
    }

    // 判定 2：纯粹的 LaTeX 语法畸变（如 \frac{1}{ 缺失等），包装为低对比度优雅错误胶囊
    const container = document.createElement('span');
    container.className = 'dsh-math-error-container';
    container.setAttribute('data-dsh-handled', 'true');

    // 错误胶囊药丸
    const pill = document.createElement('span');
    pill.className = 'dsh-math-error-pill';
    pill.innerHTML = `<span class="dsh-math-error-icon">⚠️</span> <span class="dsh-math-error-label">公式异常</span>`;

    // 查看源码按钮
    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'dsh-math-error-toggle';
    toggleBtn.textContent = '查看源码';

    // 源码折叠详情盒
    const details = document.createElement('div');
    details.className = 'dsh-math-error-details';
    details.style.display = 'none';

    const code = document.createElement('code');
    code.className = 'dsh-math-error-code';
    code.textContent = rawContent;

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'dsh-math-error-copy-btn';
    copyBtn.textContent = '📋 复制 LaTeX';
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      copyToClipboard(rawContent).then(() => {
        copyBtn.textContent = '✅ 已复制';
        setTimeout(() => {
          copyBtn.textContent = '📋 复制 LaTeX';
        }, 1500);
      });
    });

    details.appendChild(code);
    details.appendChild(copyBtn);

    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = details.style.display === 'none';
      details.style.display = isHidden ? 'block' : 'none';
      toggleBtn.textContent = isHidden ? '收起源码' : '查看源码';
    });

    pill.appendChild(toggleBtn);
    container.appendChild(pill);
    container.appendChild(details);

    el.replaceWith(container);
  }

  public dispose(): void {
    this.observer?.disconnect();
    this.observer = null;
  }
}

export function initRenderGuardian(): () => void {
  const guardian = new RenderGuardian();
  guardian.start();

  return () => {
    guardian.dispose();
  };
}
