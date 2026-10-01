export interface FabControllerOptions {
  getCollapseState: () => boolean;
  toggleCollapse: () => void;
  onCollapseChange: (cb: (collapsed: boolean) => void) => () => void;

  getSendMode: () => 'ctrl-enter' | 'enter';
  toggleSendMode: () => void;
  onSendModeChange: (cb: (mode: 'ctrl-enter' | 'enter') => void) => () => void;

  getQuoteEnabled: () => boolean;
  toggleQuoteEnabled: () => void;
  onQuoteChange: (cb: (enabled: boolean) => void) => () => void;

  getFormulaEnabled: () => boolean;
  toggleFormulaEnabled: () => void;
  onFormulaChange: (cb: (enabled: boolean) => void) => () => void;

  getModeState?: () => string;
  cycleMode?: () => void;

  getNotifierStatusLabel?: () => { label: string; active: boolean };
  cycleNotifierPreset?: () => void;
  onNotifierChange?: (cb: () => void) => () => void;

  copyCurrentSessionLink?: (markdown?: boolean) => Promise<boolean>;
  copyCurrentWorkspacePath?: () => Promise<boolean>;
}

const STORAGE_POS_KEY = 'dsh_enhancements_fab_position';

const BALL_ICON_SVG = `
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="3"></circle>
  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
</svg>
`;

export function initFloatingBall(options: FabControllerOptions): () => void {
  const container = document.createElement('div');
  container.className = 'dsh-fab-container';
  container.id = 'dsh-web-enhancements-fab';

  const triggerBtn = document.createElement('button');
  triggerBtn.type = 'button';
  triggerBtn.className = 'dsh-fab-trigger';
  triggerBtn.title = 'DSH 快捷增强控制球（按住可拖拽，点击展开菜单）';
  triggerBtn.setAttribute('aria-label', '快捷增强控制');
  triggerBtn.innerHTML = BALL_ICON_SVG;

  const menuPanel = document.createElement('div');
  menuPanel.className = 'dsh-fab-menu';
  menuPanel.innerHTML = `
    <div class="dsh-fab-menu-header">
      <span class="dsh-fab-menu-title">⚡ 增强功能快捷控制</span>
      <span class="dsh-fab-menu-badge">DSH</span>
    </div>
    <div class="dsh-fab-menu-items">
      <button type="button" class="dsh-fab-menu-item" data-action="mode" title="按 Shift+Tab 快速轮转：标准模式 ⇄ Plan 计划模式 ⇄ Goal 目标模式">
        <span class="item-icon">🎯</span>
        <span class="item-label">会话模式</span>
        <span class="item-status is-active">标准</span>
      </button>
      <button type="button" class="dsh-fab-menu-item" data-action="collapse">
        <span class="item-icon">📉</span>
        <span class="item-label">收起输入</span>
        <span class="item-status">自适应</span>
      </button>
      <button type="button" class="dsh-fab-menu-item" data-action="send-mode">
        <span class="item-icon">⌨️</span>
        <span class="item-label">发送模式</span>
        <span class="item-status">Ctrl+Enter</span>
      </button>
      <button type="button" class="dsh-fab-menu-item" data-action="quote">
        <span class="item-icon">💬</span>
        <span class="item-label">划词引用</span>
        <span class="item-status is-active">开</span>
      </button>
      <button type="button" class="dsh-fab-menu-item" data-action="formula" title="单击公式复制 LaTeX 源码（与英语翻译/Trancy划词冲突时可关闭此项彻底去框）">
        <span class="item-icon">📐</span>
        <span class="item-label">LaTeX/引用复制</span>
        <span class="item-status is-active">开</span>
      </button>
      <button type="button" class="dsh-fab-menu-item" data-action="copy-link" title="复制当前会话直达链接 (点击复制 URL，按住 Shift 点击复制 Markdown 链接)">
        <span class="item-icon">🔗</span>
        <span class="item-label">复制会话链接</span>
        <span class="item-status is-active">直达</span>
      </button>
      <button type="button" class="dsh-fab-menu-item" data-action="copy-workspace" title="复制当前会话绑定的工作区物理文件夹绝对路径">
        <span class="item-icon">📁</span>
        <span class="item-label">复制工作区路径</span>
        <span class="item-status is-active">路径</span>
      </button>
      <button type="button" class="dsh-fab-menu-item" data-action="notifier" title="点击循环切换通知窗口尺寸：迷你(S) → 紧凑(M) → 标准(L) → 关闭">
        <span class="item-icon">🔔</span>
        <span class="item-label">完成通知窗</span>
        <span class="item-status is-active">紧凑(M)</span>
      </button>
    </div>
  `;

  container.appendChild(triggerBtn);
  container.appendChild(menuPanel);
  document.body.appendChild(container);

  let isMenuOpen = false;

  const updateMenuState = () => {
    const isCollapsed = options.getCollapseState();
    const sendMode = options.getSendMode();
    const isQuoteEnabled = options.getQuoteEnabled();
    const isFormulaEnabled = options.getFormulaEnabled();

    if (options.getModeState) {
      const modeItem = menuPanel.querySelector('[data-action="mode"]');
      if (modeItem) {
        const status = modeItem.querySelector('.item-status');
        if (status) {
          const m = options.getModeState();
          status.textContent = m === 'plan' ? 'Plan' : (m === 'goal' ? 'Goal' : '标准');
          status.className = `item-status ${m !== 'standard' ? 'is-active' : ''}`;
        }
      }
    }

    const collapseItem = menuPanel.querySelector('[data-action="collapse"]');
    if (collapseItem) {
      const icon = collapseItem.querySelector('.item-icon');
      const label = collapseItem.querySelector('.item-label');
      const status = collapseItem.querySelector('.item-status');
      if (icon) icon.textContent = isCollapsed ? '📈' : '📉';
      if (label) label.textContent = isCollapsed ? '展开输入' : '收起输入';
      if (status) {
        status.textContent = isCollapsed ? '已收起' : '自适应';
        status.className = `item-status ${isCollapsed ? 'is-active' : ''}`;
      }
    }

    const sendItem = menuPanel.querySelector('[data-action="send-mode"]');
    if (sendItem) {
      const status = sendItem.querySelector('.item-status');
      if (status) {
        status.textContent = sendMode === 'ctrl-enter' ? 'Ctrl+Enter' : 'Enter';
        status.className = `item-status ${sendMode === 'ctrl-enter' ? 'is-active' : ''}`;
      }
    }

    const quoteItem = menuPanel.querySelector('[data-action="quote"]');
    if (quoteItem) {
      const status = quoteItem.querySelector('.item-status');
      if (status) {
        status.textContent = isQuoteEnabled ? '开' : '关';
        status.className = `item-status ${isQuoteEnabled ? 'is-active' : 'is-muted'}`;
      }
    }

    const formulaItem = menuPanel.querySelector('[data-action="formula"]');
    if (formulaItem) {
      const status = formulaItem.querySelector('.item-status');
      if (status) {
        status.textContent = isFormulaEnabled ? '开' : '关';
        status.className = `item-status ${isFormulaEnabled ? 'is-active' : 'is-muted'}`;
      }
    }

    const notifierItem = menuPanel.querySelector('[data-action="notifier"]');
    if (notifierItem && options.getNotifierStatusLabel) {
      const { label, active } = options.getNotifierStatusLabel();
      const status = notifierItem.querySelector('.item-status');
      if (status) {
        status.textContent = label;
        status.className = `item-status ${active ? 'is-active' : 'is-muted'}`;
      }
    }
  };

  updateMenuState();

  const unsubCollapse = options.onCollapseChange(() => updateMenuState());
  const unsubSendMode = options.onSendModeChange(() => updateMenuState());
  const unsubQuote = options.onQuoteChange(() => updateMenuState());
  const unsubFormula = options.onFormulaChange(() => updateMenuState());
  const unsubNotifier = options.onNotifierChange ? options.onNotifierChange(() => updateMenuState()) : () => {};

  const setMenuOpen = (open: boolean) => {
    isMenuOpen = open;
    if (isMenuOpen) {
      container.classList.add('is-open');
      menuPanel.classList.add('is-active');
      triggerBtn.classList.add('is-active');
      updateMenuState();
    } else {
      container.classList.remove('is-open');
      menuPanel.classList.remove('is-active');
      triggerBtn.classList.remove('is-active');
    }
  };

  menuPanel.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.dsh-fab-menu-item');
    if (!btn) return;
    e.stopPropagation();

    const action = btn.dataset.action;
    if (action === 'mode') {
      options.cycleMode?.();
    } else if (action === 'collapse') {
      options.toggleCollapse();
    } else if (action === 'send-mode') {
      options.toggleSendMode();
    } else if (action === 'quote') {
      options.toggleQuoteEnabled();
    } else if (action === 'formula') {
      options.toggleFormulaEnabled();
    } else if (action === 'copy-workspace') {
      options.copyCurrentWorkspacePath?.();
      setMenuOpen(false);
    } else if (action === 'copy-link') {
      options.copyCurrentSessionLink?.(e.shiftKey);
      setMenuOpen(false);
    } else if (action === 'notifier') {
      options.cycleNotifierPreset?.();
    }
    updateMenuState();
  });

  let isDragging = false;
  let hasMoved = false;
  let startPointerX = 0;
  let startPointerY = 0;
  let initialLeft = 0;
  let initialTop = 0;

  const applySavedPosition = () => {
    try {
      const saved = localStorage.getItem(STORAGE_POS_KEY);
      if (saved) {
        const { top, left } = JSON.parse(saved);
        const maxTop = window.innerHeight - 50;
        const maxLeft = window.innerWidth - 50;
        const clampedTop = Math.max(10, Math.min(top, maxTop));
        const clampedLeft = Math.max(10, Math.min(left, maxLeft));
        container.style.top = `${clampedTop}px`;
        container.style.left = `${clampedLeft}px`;
        container.style.right = 'auto';
        container.style.bottom = 'auto';
        return;
      }
    } catch (_) {}

    container.style.top = `${window.innerHeight - 140}px`;
    container.style.left = `${window.innerWidth - 56}px`;
    container.style.right = 'auto';
    container.style.bottom = 'auto';
  };

  applySavedPosition();

  const onResize = () => {
    const rect = container.getBoundingClientRect();
    const maxTop = window.innerHeight - 50;
    const maxLeft = window.innerWidth - 50;
    if (rect.top > maxTop || rect.left > maxLeft) {
      applySavedPosition();
    }
  };
  window.addEventListener('resize', onResize);

  triggerBtn.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    isDragging = true;
    hasMoved = false;
    startPointerX = e.clientX;
    startPointerY = e.clientY;
    const rect = container.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
    triggerBtn.setPointerCapture(e.pointerId);
  });

  triggerBtn.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startPointerX;
    const dy = e.clientY - startPointerY;
    if (!hasMoved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
      hasMoved = true;
      container.classList.add('is-dragging');
    }
    if (hasMoved) {
      const newLeft = initialLeft + dx;
      const newTop = initialTop + dy;
      const maxTop = window.innerHeight - 50;
      const maxLeft = window.innerWidth - 50;
      const clampedTop = Math.max(10, Math.min(newTop, maxTop));
      const clampedLeft = Math.max(10, Math.min(newLeft, maxLeft));
      container.style.top = `${clampedTop}px`;
      container.style.left = `${clampedLeft}px`;
      container.style.right = 'auto';
      container.style.bottom = 'auto';
    }
  });

  const onPointerUp = (e: PointerEvent) => {
    if (!isDragging) return;
    isDragging = false;
    container.classList.remove('is-dragging');
    try {
      triggerBtn.releasePointerCapture(e.pointerId);
    } catch (_) {}

    if (hasMoved) {
      const rect = container.getBoundingClientRect();
      localStorage.setItem(
        STORAGE_POS_KEY,
        JSON.stringify({ top: Math.round(rect.top), left: Math.round(rect.left) })
      );
    } else {
      setMenuOpen(!isMenuOpen);
    }
  };

  triggerBtn.addEventListener('pointerup', onPointerUp);
  triggerBtn.addEventListener('pointercancel', onPointerUp);

  const onDocClick = (e: MouseEvent) => {
    if (isMenuOpen && !container.contains(e.target as Node)) {
      setMenuOpen(false);
    }
  };
  document.addEventListener('click', onDocClick);

  return () => {
    unsubCollapse();
    unsubSendMode();
    unsubQuote();
    unsubFormula();
    unsubNotifier();
    window.removeEventListener('resize', onResize);
    document.removeEventListener('click', onDocClick);
    container.remove();
  };
}