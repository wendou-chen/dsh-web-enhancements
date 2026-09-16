export const ENHANCEMENT_STYLES = `
/* ==========================================================================
   DSH Web Enhancements 全局样式与交互定义
   ========================================================================== */

/* 1. LaTeX 公式悬停与点击动效 */
.dsh-formula-active .katex,
.dsh-formula-active .katex-display,
.dsh-formula-active mjx-container,
.dsh-formula-active .MathJax {
  cursor: copy !important;
  border-radius: 4px;
  transition: background-color 0.15s ease, box-shadow 0.15s ease;
}

.dsh-formula-active .katex:hover,
.dsh-formula-active mjx-container:hover,
.dsh-formula-active .MathJax:hover {
  background: rgba(59, 130, 246, 0.12) !important;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.45) !important;
}

.dsh-formula-clicked {
  animation: dsh-formula-pop 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes dsh-formula-pop {
  0% { transform: scale(1); }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); }
}

/* 2. 全局 Toast 容器 */
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
  cursor: grab;
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
.dsh-mermaid-modal .modal-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
}
.dsh-mermaid-modal .modal-content {
  position: relative;
  margin: auto;
  width: 90vw;
  height: 85vh;
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.dsh-mermaid-modal .modal-header {
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #30363d;
}
.dsh-mermaid-modal .modal-close {
  background: transparent;
  border: none;
  color: #fff;
  font-size: 16px;
  cursor: pointer;
}
.dsh-mermaid-modal .modal-body {
  flex: 1;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

/* 4. 划词引用回复 Toolbar */
.dsh-quote-toolbar {
  position: fixed;
  z-index: 2147483646;
  display: none;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  background: #18181b;
  color: #fafafa;
  border-radius: 8px;
  box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.4), 0 2px 6px -1px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.15);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 13px;
  user-select: none;
  transform: scale(0.95);
  transition: opacity 0.15s ease, transform 0.15s ease;
  opacity: 0;
  pointer-events: none;
}

.dsh-quote-toolbar.active {
  display: inline-flex;
  opacity: 1;
  transform: scale(1);
  pointer-events: auto;
}

.dsh-quote-toolbar button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 28px;
  padding: 3px 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #ffffff;
  font: inherit;
  cursor: pointer;
  transition: background 0.12s ease;
}

.dsh-quote-toolbar button:hover {
  background-color: rgba(255, 255, 255, 0.12);
}

/* 5. 快捷按键药丸与折叠切换按钮 */
.dsh-action-pill {
  position: fixed;
  z-index: 2147483645;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(30, 31, 32, 0.92);
  color: #e8eaed;
  border: 1px solid #5e6268;
  border-radius: 18px;
  font: 12px/1 system-ui, sans-serif;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0,0,0,0.3);
  user-select: none;
  backdrop-filter: blur(8px);
}

.dsh-action-pill:hover {
  border-color: #a8c7fa;
}

.dsh-send-mode-pill {
  top: 110px;
  right: 16px;
}

.dsh-collapse-pill {
  top: 70px;
  right: 16px;
}

/* 6. Render Guardian: LaTeX 渲染容错与优雅降级折叠 */
.dsh-math-error-container {
  display: inline-block;
  margin: 4px 0;
  vertical-align: middle;
}

.dsh-math-error-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.28);
  border-radius: 12px;
  color: #fca5a5;
  font-size: 12px;
  font-family: inherit;
  line-height: 1.4;
  user-select: none;
}

.dsh-math-error-icon {
  font-size: 13px;
}

.dsh-math-error-label {
  font-weight: 500;
}

.dsh-math-error-toggle {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: #f1f5f9;
  font-size: 11px;
  padding: 1px 6px;
  cursor: pointer;
  margin-left: 4px;
  transition: all 0.15s ease;
}

.dsh-math-error-toggle:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.35);
}

.dsh-math-error-details {
  margin-top: 6px;
  padding: 8px 12px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  color: #e2e8f0;
  max-width: 100%;
  overflow-x: auto;
  position: relative;
}

.dsh-math-error-code {
  display: block;
  white-space: pre-wrap;
  word-break: break-all;
  margin-bottom: 6px;
}

.dsh-math-error-copy-btn {
  background: #334155;
  border: 1px solid #475569;
  border-radius: 4px;
  color: #94a3b8;
  font-size: 11px;
  padding: 2px 8px;
  cursor: pointer;
  float: right;
  transition: all 0.15s;
}

.dsh-math-error-copy-btn:hover {
  background: #475569;
  color: #f8fafc;
}

.dsh-math-escaped-block {
  margin: 8px 0;
  padding: 10px 14px;
  background: rgba(30, 41, 59, 0.5);
  border-left: 3px solid #3b82f6;
  border-radius: 0 6px 6px 0;
  color: inherit;
  font-size: 14px;
  line-height: 1.6;
}

/* 7. Render Guardian: 自愈公式高清重渲染容器 */
.dsh-math-healed-wrapper {
  display: block;
  margin: 0.8em 0;
  text-align: center;
  position: relative;
  transition: all 0.2s ease;
  animation: dsh-math-fade-in 0.25s ease-out;
}

.dsh-math-healed-wrapper:hover {
  filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.25));
}

@keyframes dsh-math-fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
`;

