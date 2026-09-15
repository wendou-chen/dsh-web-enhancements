import React from 'react';
import type { SlotsService } from '@deepseek-ai/dsh-client-ui-slots';
import { ENHANCEMENT_STYLES } from './styles.js';
import { ToastContainer } from './shared/toast.js';
import { initFormulaCopy } from './features/formula-copy/index.js';
import { initMermaid } from './features/mermaid/index.js';
import { initQuoteReply } from './features/quote-reply/index.js';
import { initSendMode } from './features/send-mode/index.js';
import { initInputCollapse } from './features/collapse/index.js';
import { initRenderGuardian } from './features/render-guardian/index.js';

type ClientContext = {
  slots: SlotsService;
  effect: (fn: () => (() => void) | void, label?: string) => void;
  inject: (deps: readonly string[], fn: (sctx: any) => void, label?: string) => void;
};

export const name = 'dsh-web-enhancements';
export const inject = ['slots'];

export function apply(ctx: ClientContext): void {
  // 1. 注册设置中心面板插槽 (必须作为首个 register 满足 DSH 插件规范)
  ctx.effect(() => {
    return ctx.slots.inject('settings.plugin.item', () =>
      ctx.slots.register({
        name: 'settings.plugin.item',
        id: '@dsh-external/dsh-web-enhancements-panel',
        key: '@dsh-external/dsh-web-enhancements-panel',
        label: () => '全能增强套件',
        component: () => ({
          render() {
            const el = document.createElement('div');
            el.className = 'dsh-enhancements-settings-panel';
            el.style.padding = '16px';
            el.innerHTML = `
              <h3 style="font-size:15px;margin-bottom:8px;">🚀 DSH 全能增强套件</h3>
              <p style="font-size:13px;opacity:0.8;line-height:1.5;">
                已启用 6 大原生增强：<br/>
                • LaTeX 公式点击一键复制源码<br/>
                • Mermaid 交互式图表渲染与工具栏<br/>
                • Voyager 式选中文本一键引用回复<br/>
                • Enter / Ctrl+Enter 快捷发送模式切换<br/>
                • 输入框原生一键收起/展开与防遮挡治理<br/>
                • Render Guardian 智能数学公式与 Markdown 渲染自愈守护
              </p>
            `;
            return el;
          },
        }),
      }),
    );
  }, 'dsh-web-enhancements: settings panel');

  // 2. 全局样式注入与生命周期清理
  ctx.effect(() => {
    const style = document.createElement('style');
    style.id = 'dsh-web-enhancements-style';
    style.textContent = ENHANCEMENT_STYLES;
    document.head.appendChild(style);

    return () => {
      style.remove();
    };
  }, 'dsh-web-enhancements: styles');

  // 3. 特性 1：LaTeX 公式点击复制
  ctx.effect(() => {
    const dispose = initFormulaCopy();
    return () => dispose();
  }, 'dsh-web-enhancements: formula-copy');

  // 4. 特性 2：Mermaid 图表渲染
  ctx.effect(() => {
    const dispose = initMermaid();
    return () => dispose();
  }, 'dsh-web-enhancements: mermaid');

  // 5. 特性 3：Voyager 风格划词引用回复
  ctx.effect(() => {
    const dispose = initQuoteReply();
    return () => dispose();
  }, 'dsh-web-enhancements: quote-reply');

  // 6. 特性 4：Enter / Ctrl+Enter 发送模式与插话兼容
  ctx.effect(() => {
    const dispose = initSendMode('ctrl-enter');
    return () => dispose();
  }, 'dsh-web-enhancements: send-mode');

  // 7. 特性 5：输入框一键收起/展开与防遮挡治理
  ctx.effect(() => {
    const dispose = initInputCollapse();
    return () => dispose();
  }, 'dsh-web-enhancements: input-collapse');

  // 8. 特性 6：Render Guardian 渲染容错与智能自愈守护
  ctx.effect(() => {
    const dispose = initRenderGuardian();
    return () => dispose();
  }, 'dsh-web-enhancements: render-guardian');
}
