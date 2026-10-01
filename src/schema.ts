import Schema from '@deepseek-ai/schemastery';

export interface WebEnhancementsConfig {
  enableFormulaCopy: boolean;
  enableMermaid: boolean;
  enableQuoteReply: boolean;
  enableSendMode: boolean;
  defaultSendMode: 'enter' | 'ctrl-enter';
  enableInputCollapse: boolean;
  enableTaskNotifier: boolean;
  notifierThresholdMs: number;
  notifierSoundType: 'default' | 'im' | 'reminder' | 'sms' | 'alarm' | 'silent';
  notifierSystemToast: boolean;
  notifierWebBaseUrl: string;
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
  enableTaskNotifier: Schema.boolean().default(true).description('启用任务完成提示音与通知弹窗'),
  notifierThresholdMs: Schema.natural()
    .default(3000)
    .step(500)
    .description('触发系统通知的任务执行耗时阈值（毫秒）。耗时低于此值时不触发，防止微小命令干扰'),
  notifierSoundType: Schema.union([
    Schema.const('default' as const).description('标准系统提示音'),
    Schema.const('im' as const).description('即时消息音'),
    Schema.const('reminder' as const).description('提醒音'),
    Schema.const('sms' as const).description('短信音'),
    Schema.const('alarm' as const).description('强警报音'),
    Schema.const('silent' as const).description('静音'),
  ]).default('default').description('Windows 桌面通知系统提示音'),
  notifierSystemToast: Schema.boolean().default(true).description('启用 Windows 动作中心原生 Toast 弹窗'),
  notifierWebBaseUrl: Schema.string().default('http://localhost:3080').description('DSH Web 控制台 Base URL，用于点击系统通知直接跳转会话'),
});
