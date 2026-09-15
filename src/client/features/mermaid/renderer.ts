import { unescapeHtml } from '../../shared/dom-utils.js';
import { copyToClipboard } from '../../shared/clipboard.js';
import { showToast } from '../../shared/toast.js';

declare global {
  interface Window {
    mermaid?: any;
  }
}

const DIAGRAM_KEYWORD_SOURCE =
  'graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|stateDiagram-v2|erDiagram|gantt|pie|gitGraph|journey|mindmap|timeline|zenuml|quadrantChart|requirementDiagram|requirement|sankey-beta|sankey|C4Context|C4Container|C4Component|C4Dynamic|C4Deployment|xychart-beta|xychart|block-beta|block|packet-beta|packet|architecture-beta|architecture|kanban|radar-beta|treemap';

function isMermaidCode(code: string): boolean {
  const text = code.trim();
  if (text.length < 20) return false;
  const firstLine = text.split('\n').find((l) => l.trim().length > 0) || '';
  const isDirective = text.startsWith('%%') || text.startsWith('---');
  return isDirective || new RegExp(`^\\s*(${DIAGRAM_KEYWORD_SOURCE})\\b`, 'i').test(firstLine);
}

function splitMermaidSegments(code: string): string[] {
  const repaired = code.replace(
    new RegExp(`([\\]};])\\s*(${DIAGRAM_KEYWORD_SOURCE})\\b`, 'gi'),
    '$1\n$2',
  );
  const lines = repaired.split('\n');
  const keywordRegex = new RegExp(`^\\s*(${DIAGRAM_KEYWORD_SOURCE})\\b`, 'i');
  const starts: number[] = [];
  lines.forEach((line, index) => {
    if (keywordRegex.test(line)) starts.push(index);
  });
  if (starts.length <= 1) return [repaired.trim()];
  return starts.map((start, i) =>
    lines.slice(start, starts[i + 1] || lines.length).join('\n').trim(),
  );
}

function repairMermaidLabels(code: string): string {
  return code
    .replace(/\[([^\]]*)\]/g, (match, inner) => {
      const text = inner.trim();
      if (text.startsWith('"') && text.endsWith('"')) return match;
      if (!text.includes('(')) return match;
      return `["${text.replace(/"/g, '\\"')}"]`;
    })
    .replace(/\|([^|]*)\|/g, (match, inner) => {
      const text = inner.trim();
      if (text.startsWith('"') && text.endsWith('"')) return match;
      if (!text.includes('(')) return match;
      return `|"${text.replace(/"/g, '\\"')}"|`;
    });
}

export class MermaidManager {
  private observer: MutationObserver | null = null;
  private themeObserver: MutationObserver | null = null;
  private renderedNodes: WeakSet<Element> = new WeakSet();
  private debounceTimers: Map<Element, number> = new Map();
  private isLoaded = false;
  private currentTheme: 'dark' | 'default' = 'default';

  public async start(): Promise<void> {
    await this.ensureMermaid();
    this.initTheme();
    this.observeMessages();
    this.scanAndRender(document.body);
  }

  private async ensureMermaid(): Promise<void> {
    if (window.mermaid) {
      this.isLoaded = true;
      this.configure();
      return;
    }

    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.id = 'dsh-mermaid-runtime';
      script.src = 'https://cdn.jsdelivr.net/npm/mermaid@11.12.2/dist/mermaid.min.js';
      script.onload = () => {
        this.isLoaded = true;
        this.configure();
        resolve();
      };
      script.onerror = () => {
        console.warn('[Mermaid] CDN 加载失败，保留原始代码块');
        resolve();
      };
      document.head.appendChild(script);
    });
  }

  private configure(): void {
    if (!window.mermaid) return;
    const isDark =
      document.documentElement.classList.contains('dark') ||
      document.body.getAttribute('data-theme') === 'dark' ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;

    this.currentTheme = isDark ? 'dark' : 'default';

    window.mermaid.initialize({
      startOnLoad: false,
      theme: this.currentTheme,
      securityLevel: 'strict',
      suppressErrorRendering: true,
      fontFamily: 'inherit',
      flowchart: { htmlLabels: true, curve: 'linear' },
    });
  }

  private initTheme(): void {
    this.themeObserver = new MutationObserver(() => {
      const isDark =
        document.documentElement.classList.contains('dark') ||
        document.body.getAttribute('data-theme') === 'dark';
      const nextTheme = isDark ? 'dark' : 'default';
      if (nextTheme !== this.currentTheme) {
        this.configure();
        this.scanAndRender(document.body);
      }
    });

    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });
  }

  private observeMessages(): void {
    this.observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of Array.from(m.addedNodes)) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.scanAndRender(node as Element);
          }
        }
      }
    });

    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  public scanAndRender(root: Element): void {
    if (!this.isLoaded || !root) return;

    const pres = root.querySelectorAll<HTMLElement>('pre');
    pres.forEach((preEl) => {
      if (this.renderedNodes.has(preEl) || preEl.closest('.dsh-mermaid-wrapper')) return;

      const codeEl = preEl.querySelector('code') || preEl;
      const raw = unescapeHtml(codeEl.textContent || '');
      if (!raw.trim()) return;

      const langClass = Array.from(codeEl.classList).find((c) => /^language-mermaid$/i.test(c));
      const isExplicitMermaid = Boolean(langClass);
      if (!isExplicitMermaid && !isMermaidCode(raw)) return;

      if (this.debounceTimers.has(preEl)) {
        window.clearTimeout(this.debounceTimers.get(preEl));
      }

      const timer = window.setTimeout(() => {
        this.debounceTimers.delete(preEl);
        void this.renderBlock(preEl, raw);
      }, 300);

      this.debounceTimers.set(preEl, timer);
    });
  }

  private async renderBlock(preEl: HTMLElement, rawCode: string): Promise<void> {
    const chartId = `dsh-mermaid-${Math.random().toString(36).slice(2, 9)}`;

    try {
      if (!window.mermaid) return;

      let svg = '';
      const repaired = repairMermaidLabels(rawCode);
      try {
        await window.mermaid.parse(repaired);
        const result = await window.mermaid.render(chartId, repaired);
        svg = typeof result === 'string' ? result : result.svg;
      } catch (err: any) {
        const segments = splitMermaidSegments(rawCode);
        if (segments.length > 1) {
          const svgs: string[] = [];
          for (let i = 0; i < segments.length; i++) {
            const segId = `${chartId}-seg${i}`;
            try {
              const res = await window.mermaid.render(segId, repairMermaidLabels(segments[i]));
              svgs.push(typeof res === 'string' ? res : res.svg);
            } catch (_) {
              document.getElementById(segId)?.remove();
            }
          }
          svg = svgs.join('');
        }
        if (!svg) {
          svg = `<div class="dsh-mermaid-error-banner"><strong>⚠️ Mermaid 解析错误:</strong> <span>${String(err?.message || err || '语法异常')}</span></div>`;
        }
      }

      const wrapper = document.createElement('div');
      wrapper.className = 'dsh-mermaid-wrapper';
      wrapper.id = `wrapper-${chartId}`;
      wrapper.innerHTML = `
        <div class="dsh-mermaid-toolbar">
          <span class="toolbar-title">Mermaid 图表</span>
          <div class="toolbar-actions">
            <button class="btn-action" data-action="diagram" title="图表视图">📊</button>
            <button class="btn-action" data-action="code" title="代码视图">&lt;/&gt;</button>
            <button class="btn-action" data-action="zoom-in" title="放大">🔍+</button>
            <button class="btn-action" data-action="zoom-out" title="缩小">🔍-</button>
            <button class="btn-action" data-action="zoom-reset" title="复位">↺</button>
            <button class="btn-action" data-action="copy" title="复制代码">📋</button>
            <button class="btn-action" data-action="download-svg" title="下载 SVG">SVG</button>
            <button class="btn-action" data-action="fullscreen" title="全屏">⛶</button>
          </div>
        </div>
        <div class="dsh-mermaid-viewport">
          <div class="dsh-mermaid-canvas">${svg}</div>
        </div>
      `;

      preEl.style.display = 'none';
      preEl.parentNode?.insertBefore(wrapper, preEl);
      this.renderedNodes.add(preEl);

      this.bindToolbar(wrapper, chartId, rawCode, preEl);
    } catch (err: any) {
      preEl.style.display = '';
      let banner = preEl.previousElementSibling;
      if (!banner || !banner.classList.contains('dsh-mermaid-error-banner')) {
        banner = document.createElement('div');
        banner.className = 'dsh-mermaid-error-banner';
        preEl.parentNode?.insertBefore(banner, preEl);
      }
      banner.innerHTML = `<strong>⚠️ Mermaid 解析错误:</strong> <span>${err?.message || '语法异常'}</span>`;
    }
  }

  private bindToolbar(wrapper: HTMLElement, chartId: string, rawCode: string, preEl: HTMLElement): void {
    const canvas = wrapper.querySelector<HTMLElement>('.dsh-mermaid-canvas');
    const viewport = wrapper.querySelector<HTMLElement>('.dsh-mermaid-viewport');
    if (!canvas) return;

    let scale = 1;
    let translateX = 0;
    let translateY = 0;
    let isDragging = false;
    let startX = 0;
    let startY = 0;

    const update = () => {
      canvas.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    };

    wrapper.addEventListener('mousedown', (e) => {
      if ((e.target as HTMLElement).closest('.dsh-mermaid-toolbar')) return;
      isDragging = true;
      startX = e.clientX - translateX;
      startY = e.clientY - translateY;
      canvas.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      translateX = e.clientX - startX;
      translateY = e.clientY - startY;
      update();
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
      canvas.style.cursor = 'grab';
    });

    wrapper.querySelector('.dsh-mermaid-toolbar')?.addEventListener('click', async (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.btn-action');
      if (!btn) return;
      const action = btn.dataset.action;

      if (action === 'diagram') {
        preEl.style.display = 'none';
        if (viewport) viewport.style.display = '';
      } else if (action === 'code') {
        preEl.style.display = '';
        if (viewport) viewport.style.display = 'none';
      } else if (action === 'zoom-in') {
        scale = Math.min(scale + 0.2, 4);
        update();
      } else if (action === 'zoom-out') {
        scale = Math.max(scale - 0.2, 0.3);
        update();
      } else if (action === 'zoom-reset') {
        scale = 1;
        translateX = 0;
        translateY = 0;
        update();
      } else if (action === 'copy') {
        await copyToClipboard(rawCode);
        showToast('Mermaid 源码已复制', rawCode.slice(0, 35) + '...');
      } else if (action === 'download-svg') {
        const svgEl = wrapper.querySelector('svg');
        if (!svgEl) return;
        const blob = new Blob([new XMLSerializer().serializeToString(svgEl)], { type: 'image/svg+xml' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${chartId}.svg`;
        a.click();
        URL.revokeObjectURL(a.href);
      } else if (action === 'fullscreen') {
        this.openFullscreen(wrapper);
      }
    });
  }

  private openFullscreen(wrapper: HTMLElement): void {
    let modal = document.querySelector<HTMLElement>('.dsh-mermaid-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'dsh-mermaid-modal';
      modal.innerHTML = `
        <div class="modal-backdrop"></div>
        <div class="modal-content">
          <div class="modal-header">
            <span>Mermaid 全屏查看</span>
            <button class="modal-close">✕</button>
          </div>
          <div class="modal-body"></div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector('.modal-close')?.addEventListener('click', () => modal?.classList.remove('active'));
      modal.querySelector('.modal-backdrop')?.addEventListener('click', () => modal?.classList.remove('active'));
    }

    const svg = wrapper.querySelector('.dsh-mermaid-canvas')?.innerHTML || '';
    const body = modal.querySelector('.modal-body');
    if (body) body.innerHTML = `<div class="dsh-mermaid-canvas">${svg}</div>`;
    modal.classList.add('active');
  }

  public dispose(): void {
    this.observer?.disconnect();
    this.themeObserver?.disconnect();
    this.debounceTimers.forEach((t) => window.clearTimeout(t));
    this.debounceTimers.clear();

    document.querySelectorAll('.dsh-mermaid-wrapper').forEach((w) => w.remove());
    document.querySelectorAll('.dsh-mermaid-modal').forEach((m) => m.remove());
  }
}
