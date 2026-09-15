import type { Context } from '@deepseek-ai/cordis';
import { WebEnhancementsConfig } from './schema.js';

export const name = 'dsh-web-enhancements';
export const Config = WebEnhancementsConfig;
export type { WebEnhancementsConfig };

export function apply(ctx: Context, config: WebEnhancementsConfig): void {
  const logger = ctx.logger ? ctx.logger('web-enhancements') : console;

  ctx.effect(() => {
    logger.info?.('DSH 全能增强套件已装载 (LaTeX / Mermaid / 引用回复 / 发送模式 / 输入折叠)');
    return () => {
      logger.info?.('DSH 全能增强套件已安全卸载');
    };
  }, 'dsh-web-enhancements: host lifecycle');
}