export const ENHANCEMENT_STYLES = `
/* ==========================================================================
   DSH Web Enhancements 全局样式与交互定义
   ========================================================================== */

/* 1. LaTeX 公式与引用块悬停与点击动效（防划词翻译冲突优化） */
.dsh-formula-active .katex,
.dsh-formula-active .katex-display,
.dsh-formula-active mjx-container,
.dsh-formula-active .MathJax {
  border-radius: 4px;
  transition: background-color 0.15s ease, box-shadow 0.15s ease;
  user-select: text !important;
}

/* 仅在纯悬停且未拖拽划选时显示轻量淡蓝色提示外框，绝不阻碍文本选中 */
.dsh-formula-active .katex:hover:not(:active),
.dsh-formula-active mjx-container:hover:not(:active),
.dsh-formula-active .MathJax:hover:not(:active) {
  background: rgba(59, 130, 246, 0.08) !important;
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.35) !important;
}

/* 保证所有 Markdown 引用块（英语翻译/原文段落）具有最高优先级的划词文本选择能力 */
blockquote, [class*="_quote"], [class*="_blockquote"] {
  user-select: text !important;
}

.dsh-formula-clicked {
  animation: dsh-formula-pop 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes dsh-formula-pop {
  0% { transform: scale(1); }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); }
}

/* 2. 全局 Toast 容器（主代理精美毛玻璃质感） */
.dsh-enhancement-toast-viewport {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2147483647;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.dsh-enhancement-toast-card {
  pointer-events: auto;
  min-width: 240px;
  max-width: 520px;
  padding: 8px 16px;
  border-radius: 10px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 13px;
  line-height: 1.4;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  animation: dsh-toast-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.dsh-enhancement-toast-card.is-success {
  background: rgba(30, 41, 59, 0.92);
  color: #F8FAFC;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.dsh-enhancement-toast-card.is-error {
  background: rgba(153, 27, 27, 0.92);
  color: #FEF2F2;
  border: 1px solid rgba(239, 68, 68, 0.4);
}

.dsh-enhancement-toast-icon {
  font-size: 15px;
  flex-shrink: 0;
}

.dsh-enhancement-toast-content {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dsh-enhancement-toast-title {
  font-weight: 500;
}

.dsh-enhancement-toast-preview {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  color: #93C5FD;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 420px;
  margin-top: 2px;
}

@keyframes dsh-toast-in {
  from { opacity: 0; transform: translateY(-8px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* 3. Mermaid 渲染卡片与工具栏 */
.dsh-mermaid-wrapper {
  margin: 12px 0;
  border: 1px solid var(--dsw-alias-border, #30363d);
  border-radius: 8px;
  background: var(--dsw-alias-bg-card, #0d1117);
  overflow: hidden;
  position: relative;
  font-family: inherit;
}

.dsh-mermaid-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid var(--dsw-alias-border, #30363d);
}

.dsh-mermaid-toolbar .toolbar-title {
  font-size: 12px;
  font-weight: 600;
  opacity: 0.8;
}

.dsh-mermaid-toolbar .toolbar-actions {
  display: flex;
  gap: 4px;
}

.dsh-mermaid-toolbar .btn-action {
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 3px 7px;
  border-radius: 4px;
  font-size: 12px;
  color: inherit;
  transition: background 0.15s;
}

.dsh-mermaid-toolbar .btn-action:hover {
  background: rgba(255, 255, 255, 0.12);
}

.dsh-mermaid-viewport {
  overflow: hidden;
  min-height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  user-select: none;
}

.dsh-mermaid-canvas {
  transform-origin: center center;
  transition: transform 0.05s ease-out;
  cursor: default;
}

.dsh-mermaid-canvas svg {
  max-width: 100%;
  height: auto;
}

.dsh-mermaid-error-banner {
  padding: 8px 12px;
  margin-bottom: 8px;
  border-left: 4px solid #f85149;
  background: rgba(248, 81, 73, 0.12);
  border-radius: 0 4px 4px 0;
  font-size: 12px;
}

/* Mermaid 全屏模态框 */
.dsh-mermaid-modal {
  display: none;
  position: fixed;
  inset: 0;
  z-index: 2147483640;
}
.dsh-mermaid-modal.active {
  display: flex;
}
.dsh-mermaid-modal-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
}
.dsh-mermaid-modal-content {
  position: relative;
  margin: auto;
  width: 90vw;
  height: 85vh;
  background: var(--dsw-alias-bg-layer-1, #161b22);
  border: 1px solid var(--dsw-alias-border, #30363d);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
}
.dsh-mermaid-modal-body {
  flex: 1;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

/* 4. 划词引用快捷浮动条（圆润胶囊形态 + 毛玻璃） */
.dsh-quote-toolbar {
  position: absolute;
  z-index: 2147483630;
  display: flex;
  align-items: center;
  border-radius: 20px;
  background: rgba(30, 31, 35, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35), 0 2px 6px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  overflow: hidden;
  padding: 0;
  transform: translateY(6px);
  transition: opacity 0.14s cubic-bezier(0, 0, 0.2, 1), transform 0.14s cubic-bezier(0, 0, 0.2, 1);
  opacity: 0;
  pointer-events: none;
}

.dsh-quote-toolbar.active,
.dsh-quote-toolbar.is-visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.dsh-quote-toolbar .dsh-quote-btn-reply {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border: none;
  background: transparent;
  color: #f3f4f6;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  outline: none;
  transition: all 0.12s ease;
  user-select: none;
}

.dsh-quote-toolbar .dsh-quote-btn-reply:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #93c5fd;
}

/* 5. 可拖拽悬浮控制球 (FAB) 样式 */
.dsh-fab-container {
  position: fixed;
  z-index: 2147483635;
  user-select: none;
  touch-action: none;
  pointer-events: none;
}

.dsh-fab-trigger {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(30, 31, 35, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4), 0 1px 3px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #e5e7eb;
  transition: transform 0.16s cubic-bezier(0, 0, 0.2, 1), box-shadow 0.16s cubic-bezier(0, 0, 0.2, 1), border-color 0.16s ease;
  pointer-events: auto;
}

.dsh-fab-trigger:hover {
  transform: scale(1.08);
  border-color: rgba(147, 197, 253, 0.5);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.48), 0 0 12px rgba(59, 130, 246, 0.25);
}

.dsh-fab-trigger:active {
  transform: scale(0.96);
}

.dsh-fab-trigger .fab-icon {
  font-size: 18px;
  line-height: 1;
  display: block;
}

.dsh-fab-menu {
  position: absolute;
  bottom: 48px;
  right: 0;
  min-width: 190px;
  background: rgba(26, 27, 30, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 12px;
  padding: 6px;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.55), 0 2px 6px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  display: none;
  opacity: 0;
  transform: scale(0.92) translateY(8px);
  transform-origin: bottom right;
  transition: opacity 0.16s cubic-bezier(0, 0, 0.2, 1), transform 0.16s cubic-bezier(0, 0, 0.2, 1);
  pointer-events: none;
}

.dsh-fab-menu.is-active {
  display: block;
  opacity: 1;
  transform: scale(1) translateY(0);
  pointer-events: auto;
}

.dsh-fab-menu-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px 6px 8px;
  margin-bottom: 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.dsh-fab-menu-title {
  font-size: 11px;
  font-weight: 600;
  color: #9aa0a6;
  letter-spacing: 0.3px;
}

.dsh-fab-menu-badge {
  font-size: 9px;
  font-weight: 700;
  padding: 1px 4px;
  border-radius: 4px;
  background: rgba(138, 180, 248, 0.18);
  color: #8ab4f8;
}

.dsh-fab-menu-items {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dsh-fab-menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 7px 8px;
  border-radius: 8px;
  background: transparent;
  border: 0;
  color: #e8eaed;
  font: 12px/1.2 system-ui, -apple-system, sans-serif;
  cursor: pointer;
  transition: background 0.12s ease, transform 0.08s ease;
  text-align: left;
  outline: none;
}

.dsh-fab-menu-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.dsh-fab-menu-item:active {
  transform: scale(0.98);
}

.dsh-fab-menu-item .item-icon {
  font-size: 14px;
  width: 18px;
  text-align: center;
}

.dsh-fab-menu-item .item-label {
  flex: 1;
  font-weight: 500;
  color: #d1d5db;
}

.dsh-fab-menu-item .item-status {
  font-size: 10.5px;
  padding: 2px 6px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  color: #9ca3af;
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 0.15s ease;
}

.dsh-fab-menu-item .item-status.is-active {
  background: rgba(52, 168, 83, 0.16);
  color: #6ee7b7;
  border-color: rgba(52, 168, 83, 0.35);
  font-weight: 600;
}

.dsh-fab-menu-item .item-status.is-muted {
  color: #6b7280;
  background: rgba(0, 0, 0, 0.2);
}

/* 6. Codex 风格会话列表 Hover 快捷一键归档与复制链接按钮 */
.dsh-hover-archive-btn,
.dsh-hover-copylink-btn,
.dsh-hover-copyworkspace-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-right: 3px;
  padding: 0;
  border: none;
  background: transparent;
  border-radius: 4px;
  color: var(--dsw-alias-label-tertiary, #9ca3af);
  cursor: pointer;
  outline: none;
  opacity: 0.85;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.dsh-hover-archive-btn:hover,
.dsh-hover-copylink-btn:hover,
.dsh-hover-copyworkspace-btn:hover {
  opacity: 1;
  color: var(--dsw-alias-label-primary, #ffffff);
  background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.12));
  transform: scale(1.08);
}

.dsh-hover-copylink-btn:hover {
  color: #38bdf8 !important;
}

.dsh-hover-copyworkspace-btn:hover {
  color: #fbbf24 !important;
}

.dsh-hover-archive-btn:active,
.dsh-hover-copylink-btn:active {
  transform: scale(0.94);
}

.dsh-hover-archive-btn svg,
.dsh-hover-copylink-btn svg {
  width: 14px;
  height: 14px;
  display: block;
}

/* 7. 会话顶部标题栏 🔗 复制按钮（隐藏避免突兀） */
.dsh-copy-session-link-btn {
  display: none !important;
}

/* 8. 子代理 (Subagent) 专属极限瘦身与 GPU Compositor 纹理隔离 */
[class*="_subagent_"],
[class*="_subAgent_"],
[data-subagent],
.dsh-subagent-card,
.dsh-subagent-list,
[class*="_subagentTree_"],
[class*="_subagentItem_"] {
  contain: layout paint;
  content-visibility: auto;
  contain-intrinsic-size: 0 80px;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  transform: translateZ(0);
}

[class*="_subagent_"] pre,
[class*="_subagent_"] code,
[class*="_subagent_"] [class*="_output_"],
[class*="_subagent_"] [class*="_toolResult_"] {
  contain: strict;
  content-visibility: auto;
  will-change: transform;
}

/* 9. 右侧边栏文件快捷搜索与一秒直达预览 (Sidebar File Quick Search) */
.dsh-file-search-bar {
  padding: 6px 12px 8px;
  position: relative;
  background: transparent;
  border-bottom: 0.5px solid var(--dsw-alias-border-l3, rgba(255, 255, 255, 0.08));
  box-sizing: border-box;
}

.dsh-file-search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 3px 8px;
  transition: all 0.15s ease;
}

.dsh-file-search-input-wrapper:focus-within {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(96, 165, 250, 0.6);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.18);
}

.dsh-file-search-icon {
  font-size: 12px;
  margin-right: 6px;
  opacity: 0.65;
  user-select: none;
}

.dsh-file-search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--dsw-alias-label-primary, #f3f4f6);
  font-size: 12px;
  line-height: 1.5;
  min-width: 0;
}

.dsh-file-search-input::placeholder {
  color: var(--dsw-alias-label-tertiary, #9ca3af);
  font-size: 11.5px;
}

.dsh-file-search-clear {
  border: none;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  padding: 0 2px;
  font-size: 11px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.12s;
}

.dsh-file-search-clear:hover {
  color: #ef4444;
}

.dsh-file-search-dropdown {
  position: absolute;
  top: 100%;
  left: 12px;
  right: 12px;
  margin-top: 4px;
  background: rgba(26, 27, 30, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 10px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  z-index: 2147483640;
  max-height: 280px;
  overflow-y: auto;
}

.dsh-file-search-list {
  list-style: none;
  margin: 0;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dsh-file-search-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.12s ease;
  user-select: none;
}

.dsh-file-search-item:hover,
.dsh-file-search-item.is-selected {
  background: rgba(59, 130, 246, 0.18);
}

.dsh-file-search-item .item-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.dsh-file-search-item .item-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.dsh-file-search-item .item-name {
  font-size: 12px;
  font-weight: 500;
  color: #f3f4f6;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dsh-file-search-item .item-path {
  font-size: 10.5px;
  color: #9ca3af;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 1px;
}

.dsh-search-match {
  background: rgba(234, 179, 8, 0.35);
  color: #fef08a;
  border-radius: 2px;
  padding: 0 1px;
}

.dsh-file-search-empty {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  color: #9ca3af;
  font-size: 11.5px;
  justify-content: center;
}
`;


