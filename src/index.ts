import type { Context } from '@deepseek-ai/cordis';
import { WebEnhancementsConfig } from './schema.js';
import { WindowsToastService } from './win-toast.js';

export const name = 'dsh-web-enhancements';
export const Config = WebEnhancementsConfig;
export type { WebEnhancementsConfig };
export * from './win-toast.js';

interface SessionTracker {
  sessionId: string;
  startedAt: number;
  startSeq: number;
  promptSummary?: string;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = (ms / 1000).toFixed(1);
  if (ms < 60000) return `${seconds}秒`;
  const minutes = Math.floor(ms / 60000);
  const remSec = Math.floor((ms % 60000) / 1000);
  return `${minutes}分${remSec}秒`;
}

function isTopLevelSession(agent: any): boolean {
  if (!agent || !agent.session) return false;
  const header = agent.session.header ?? {};
  const runtimeDepth = agent.options?.subagentDepth ?? 0;
  const persistedDepth = header.delegationDepth ?? 0;
  const totalDepth = Math.max(persistedDepth, runtimeDepth);
  return totalDepth === 0 && !header.parentSession && header.origin !== 'subagent';
}

function hasActiveChildSubagents(ctx: Context, mainSessionId: string): boolean {
  try {
    const agents = (ctx as any).agents;
    if (!agents) return false;
    const agentIterable = typeof agents.values === 'function' ? agents.values() : (Array.isArray(agents) ? agents : []);
    for (const ag of agentIterable) {
      if (!ag || !ag.session) continue;
      const header = ag.session.header ?? {};
      const parentSession = header.parentSession;
      if (parentSession === mainSessionId && ag.status === 'running') {
        return true;
      }
    }
  } catch {
    // 容错降级
  }
  return false;
}

function extractPromptSummary(session: any): string {
  if (!session || !Array.isArray(session.events)) return '会话任务';
  for (const ev of session.events) {
    if (ev.type === 'user/message' && ev.data?.source?.kind === 'user') {
      const content = ev.data?.content;
      if (Array.isArray(content)) {
        const textBlock = content.find((b: any) => b.type === 'text');
        if (textBlock && typeof textBlock.text === 'string' && textBlock.text.trim()) {
          const clean = textBlock.text.trim().replace(/\s+/g, ' ');
          return clean.length > 40 ? `${clean.slice(0, 37)}...` : clean;
        }
      }
    }
  }
  return '会话任务';
}

function extractAssistantSummary(session: any, fromSeq = 0): string {
  if (!session || !Array.isArray(session.events)) return '执行完毕';
  const events = session.events;
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i];
    if (ev.seq < fromSeq) break;
    if (ev.type === 'assistant/message') {
      const msg = ev.data?.message;
      if (msg && Array.isArray(msg.content)) {
        const textBlocks = msg.content.filter((b: any) => b.type === 'text');
        const combined = textBlocks.map((b: any) => b.text).join('').trim();
        if (combined.length > 0) {
          const oneline = combined.replace(/\s+/g, ' ');
          return oneline.length > 100 ? `${oneline.slice(0, 97)}...` : oneline;
        }
      }
    }
  }
  return '任务已顺利完成';
}

function ensureClientModuleRegistered(ctx: any): void {
  try {
    const rootLoader = ctx?.loader;
    if (rootLoader && typeof rootLoader.entries === 'function') {
      for (const entry of rootLoader.entries()) {
        const opts = entry?.options;
        if (!opts || opts.group) continue;
        if (typeof opts.name === 'string' && opts.name.includes('dsh-web-enhancements')) {
          // 必须将 file:/// URL 规范化为标准包名 'dsh-web-enhancements'，否则 dsh-client-modules 的 exactPackageSpecifier 会因包含 ':' 和 '/' 而拒绝注册前端 client.js
          opts.name = 'dsh-web-enhancements';
          if (opts.disabled !== undefined) {
            delete opts.disabled;
          }
          if (entry.parent && Array.isArray(entry.parent.data)) {
            for (const d of entry.parent.data) {
              if (d && d.id === entry.id) {
                d.name = 'dsh-web-enhancements';
                if (d.disabled !== undefined) delete d.disabled;
              }
            }
          }
        }
      }
    }

    const cm = typeof ctx?.get === 'function' ? ctx.get('clientModules') : ctx?.clientModules;
    if (cm) {
      // 清除可能缓存的 negative pkgMeta
      if (cm.pkgMeta && typeof cm.pkgMeta.delete === 'function') {
        cm.pkgMeta.delete('dsh-web-enhancements');
      }
      if (typeof cm.processOne === 'function') {
        cm.processOne('dsh-web-enhancements', () => {});
      }
      if (typeof cm.rebuilt === 'function') {
        cm.rebuilt('dsh-web-enhancements');
      }
      if (typeof cm.compose === 'function' && typeof cm.notifyGraphChanged === 'function') {
        cm.composed = cm.compose();
        cm.notifyGraphChanged();
      }
    }
  } catch (err) {
    // 容错
  }
}

export function apply(ctx: Context, config: WebEnhancementsConfig): void {
  const logger = ctx.logger ? ctx.logger('web-enhancements') : console;

  ensureClientModuleRegistered(ctx);
  setTimeout(() => ensureClientModuleRegistered(ctx), 500);

  ctx.effect(() => {
    logger.info?.('DSH 全能增强套件已装载 (LaTeX / Mermaid / 引用回复 / 发送模式 / 输入折叠 / 任务提示音与可缩放通知)');
    return () => {
      logger.info?.('DSH 全能增强套件已安全卸载');
    };
  }, 'dsh-web-enhancements: host lifecycle');

  if (config?.enableTaskNotifier === false) return;

  const trackers = new Map<string, SessionTracker>();
  const baseUrl = (config?.notifierWebBaseUrl || 'http://localhost:3080').replace(/\/+$/, '');
  const thresholdMs = config?.notifierThresholdMs ?? 3000;
  const soundType = config?.notifierSoundType || 'default';
  const systemToast = config?.notifierSystemToast !== false;

  // 1. 监听 Agent 状态机切换
  const disposeStatus = (ctx as any).on?.('agent/status', ({ agent, status }: { agent: any; status: string }) => {
    if (!isTopLevelSession(agent)) return;
    const sessionId = agent.session.id;

    if (status === 'running') {
      if (!trackers.has(sessionId)) {
        trackers.set(sessionId, {
          sessionId,
          startedAt: Date.now(),
          startSeq: agent.session.seq ?? 0,
          promptSummary: extractPromptSummary(agent.session),
        });
      }
    } else if (status === 'idle') {
      const tracker = trackers.get(sessionId);
      if (!tracker) return;

      const currentGoal = (ctx as any).goals?.get?.(agent);
      if (currentGoal && currentGoal.phase === 'active' && currentGoal.activation === 'armed') {
        return;
      }

      if (hasActiveChildSubagents(ctx, sessionId)) {
        return;
      }

      trackers.delete(sessionId);
      const elapsed = Date.now() - tracker.startedAt;

      if (elapsed < thresholdMs) {
        return;
      }

      if (systemToast) {
        const summary = extractAssistantSummary(agent.session, tracker.startSeq);
        const title = tracker.promptSummary || extractPromptSummary(agent.session);
        const launchUrl = `${baseUrl}/#/session/${sessionId}`;

        WindowsToastService.showToast({
          title: `任务已完成 (${formatDuration(elapsed)})`,
          message: `${title}\n${summary}`,
          launchUrl,
          audio: soundType,
          scenario: 'default',
          actions: [{ title: '查看会话', launchUrl }],
        });
      }
    }
  });

  // 2. 监听 Goal 长任务达成
  const disposeGoal = (ctx as any).on?.('goal/changed', ({ agent, change }: { agent: any; change: any }) => {
    if (!isTopLevelSession(agent)) return;
    const sessionId = agent.session.id;
    const goal = change?.goal;
    if (!goal) return;

    const tracker = trackers.get(sessionId);
    const fromSeq = tracker?.startSeq ?? 0;
    trackers.delete(sessionId);

    const elapsed = goal.createdAt ? Date.now() - goal.createdAt : 0;
    const launchUrl = `${baseUrl}/#/session/${sessionId}`;

    if (change.operation === 'complete' && systemToast) {
      const summary = extractAssistantSummary(agent.session, fromSeq);
      WindowsToastService.showToast({
        title: `目标已达成: ${goal.objective || '长任务'}`,
        message: `${summary} (${formatDuration(elapsed)})`,
        launchUrl,
        audio: 'im',
        scenario: 'default',
        actions: [{ title: '查看会话', launchUrl }],
      });
    } else if (change.operation === 'block' && systemToast) {
      const blockReason = goal.blockedReason?.message ?? '遇到阻碍，需要用户介入';
      WindowsToastService.showToast({
        title: `目标遇到阻碍: ${goal.objective || '长任务'}`,
        message: blockReason,
        launchUrl,
        audio: 'reminder',
        scenario: 'reminder',
        actions: [{ title: '处理阻碍', launchUrl }],
      });
    }
  });

  // 3. 监听 Agent 错误
  const disposeError = (ctx as any).on?.('agent/error', ({ agent, error }: { agent: any; error: unknown }) => {
    if (!isTopLevelSession(agent)) return;
    const sessionId = agent.session.id;
    trackers.delete(sessionId);

    if (systemToast) {
      const errMsg = error instanceof Error ? error.message : String(error);
      const launchUrl = `${baseUrl}/#/session/${sessionId}`;

      WindowsToastService.showToast({
        title: 'DSH 任务执行异常',
        message: errMsg.length > 120 ? `${errMsg.slice(0, 117)}...` : errMsg,
        launchUrl,
        audio: 'alarm',
        scenario: 'reminder',
        actions: [{ title: '查看日志', launchUrl }],
      });
    }
  });

  // 4. 清理注销
  (ctx as any).on?.('dispose', () => {
    if (typeof disposeStatus === 'function') disposeStatus();
    if (typeof disposeGoal === 'function') disposeGoal();
    if (typeof disposeError === 'function') disposeError();
    trackers.clear();
  });
}
