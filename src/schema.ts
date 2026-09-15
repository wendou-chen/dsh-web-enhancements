import Schema from '@deepseek-ai/schemastery';

export interface WebEnhancementsConfig {
  enableFormulaCopy: boolean;
  enableMermaid: boolean;
  enableQuoteReply: boolean;
  enableSendMode: boolean;
  defaultSendMode: 'enter' | 'ctrl-enter';
  enableInputCollapse: boolean;
}

export const WebEnhancementsConfig: Schema<WebEnhancementsConfig> = Schema.object({
  enableFormulaCopy: Schema.boolean().default(true).description('启用 LaTeX 数学公式点击复制与 Toast 预览'),
  enableMermaid: Schema.boolean().default(true).description('启用 Mermaid 图表自动渲染与交互式工具栏'),
  enableQuoteReply: Schema.boolean().default(true).description('启用 Voyager 风格划词引用回复（保留 LaTeX 与代码缩进）'),
  enableSendMode: Schema.boolean().default(true).description('启用发送模式切换（支持 Ctrl+Enter 发送与生成态插话）'),
  defaultSendMode: Schema.union([
    Schema.const('ctrl-enter' as const).description('Ctrl+Enter 发送，Enter 换行（推荐）'),
    Schema.const('enter' as const).description('Enter 发送，Shift+Enter 换行'),
  ]).default('ctrl-enter').description('默认发送快捷键模式'),
  enableInputCollapse: Schema.boolean().default(true).description('启用底部输入框原生一键收起/展开与防遮挡治理'),
});
