/**
 * DSH DOM 级 LaTeX 渲染错误拦截、启发式自愈与无损重渲染控制器
 */
import { copyToClipboard } from '../../shared/clipboard.js';
import { healMarkdownMath, healLatexFormula } from './healer.js';

/**
 * 确保页面中具备 KaTeX 渲染引擎（优先复用页面已有环境，缺失时安全异步补充）
 */
let katexPromise: Promise<any> | null = null;
function ensureKatex(): Promise<any> {
  if ((window as any).katex) {
    return Promise.resolve((window as any).katex);
  }
  if (katexPromise) return katexPromise;

  katexPromise = new Promise((resolve) => {
    // 检查是否已有对应 script 标签
    const existingScript = document.querySelector('script[src*="katex"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve((window as any).katex));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js';
    script.async = true;
    script.onload = () => {
      resolve((window as any).katex);
    };
    script.onerror = () => {
      console.warn('[dsh-web-enhancements] 未能加载外部 KaTeX 渲染垫片');
      resolve(null);
    };
    document.head.appendChild(script);

    // 补充 KaTeX 核心 CSS（若页面缺失）
    if (!document.querySelector('link[href*="katex"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
      document.head.appendChild(link);
    }
  });

  return katexPromise;
}

export class RenderGuardian {
  private observer: MutationObserver | null = null;
  private isProcessing = false;

  public start(): void {
    // 启动时预热 KaTeX 引擎
    void ensureKatex();

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
    if (el.getAttribute('data-dsh-handled') === 'true' || el.closest('.dsh-math-error-container') || el.closest('.dsh-math-healed-wrapper')) {
      return;
    }

    el.setAttribute('data-dsh-handled', 'true');

    // 关键修正：在 KaTeX 错误节点中，el.textContent 存储的是真实的 LaTeX 源码，而 title 属性是错误堆栈
    let rawContent = el.textContent || '';
    if (!rawContent.trim() && el.getAttribute('title')) {
      rawContent = el.getAttribute('title') || '';
    }
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
      const p = document.createElement('div');
      p.className = 'dsh-math-healed-text';
      p.textContent = healedText;
      container.appendChild(p);

      el.replaceWith(container);
      return;
    }

    // 判定 2：纯粹的 LaTeX 语法畸变（如缺少 \begin{aligned}、括号不闭合、非标准宏、未包裹中文等）
    // 启动 7 阶启发式语法自愈流水线
    const healedLatex = healLatexFormula(rawContent);

    // 尝试二次编译重渲染
    void this.tryRenderHealedFormula(el, rawContent, healedLatex);
  }

  /**
   * 尝试调用 KaTeX 将自愈后的 LaTeX 源码重渲染为高清数学公式
   */
  private async tryRenderHealedFormula(
    targetEl: HTMLElement,
    originalRaw: string,
    healedLatex: string
  ): Promise<void> {
    const katex = await ensureKatex();

    if (katex) {
      try {
        const renderedHtml = katex.renderToString(healedLatex, {
          displayMode: true,
          throwOnError: false,
          strict: false,
        });

        // 若重渲染结果中不再包含错误类，说明自愈成功，原位替换为高清公式节点
        if (renderedHtml && !renderedHtml.includes('class="katex-error"')) {
          const wrapper = document.createElement('span');
          wrapper.className = 'katex-display dsh-math-healed-wrapper';
          wrapper.setAttribute('data-dsh-handled', 'true');
          wrapper.setAttribute('title', '✨ 已由增强插件自动纠正公式语法并恢复高清渲染 (点击可复制 LaTeX)');
          wrapper.innerHTML = renderedHtml;

          // 保持与 formula-copy 特性的无缝互通
          wrapper.setAttribute('data-dsh-latex', healedLatex);

          targetEl.replaceWith(wrapper);
          return;
        }
      } catch (renderError) {
        console.warn('[dsh-web-enhancements] 二次重渲染捕获异常，降级显示错误胶囊:', renderError);
      }
    }

    // 若自愈重渲染未成功，降级包装为低对比度优雅折叠错误胶囊（兜底保护）
    this.fallbackToErrorPill(targetEl, originalRaw, healedLatex);
  }

  /**
   * 兜底降级呈现错误胶囊
   */
  private fallbackToErrorPill(targetEl: HTMLElement, originalRaw: string, healedLatex: string): void {
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
    code.textContent = healedLatex || originalRaw;

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'dsh-math-error-copy-btn';
    copyBtn.textContent = '📋 复制 LaTeX';
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      copyToClipboard(healedLatex || originalRaw).then(() => {
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

    targetEl.replaceWith(container);
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
