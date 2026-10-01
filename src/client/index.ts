import React, { useState } from 'react';
import type { SlotsService } from '@deepseek-ai/dsh-client-ui-slots';
import { ENHANCEMENT_STYLES } from './styles.js';
import { initFormulaCopy } from './features/formula-copy/index.js';
import { initMermaid } from './features/mermaid/index.js';
import { initQuoteReply } from './features/quote-reply/index.js';
import { initSendMode } from './features/send-mode/index.js';
import { initInputCollapse } from './features/collapse/index.js';
import { initHoverArchive } from './features/hover-archive/index.js';
import { initFloatingBall } from './features/floating-ball/index.js';
import { initSessionLink } from './features/session-link/index.js';
import { initFileSearch } from './features/file-search/index.js';
import { initWorkspacePath, copyWorkspacePath } from './features/workspace-path/index.js';
import { initModeCycle } from './features/mode-cycle/index.js';
import {
  ToastContainer,
  chime,
  useToastStore,
  useNotifierPrefsStore,
  PRESET_DIMENSIONS,
  initTaskNotifierSessionWatcher,
  navigateToSession,
  NotifierSizePreset,
} from './features/task-notifier/index.js';

type ClientContext = {
  slots: SlotsService;
  sessions?: any;
  workspaces?: any;
  uiWorkspace?: any;
  uiSession?: any;
  layout?: any;
  remote?: any;
  effect: (fn: () => (() => void) | void, label?: string) => void;
  get?: (name: string) => any;
};

export const name = 'dsh-web-enhancements';
export const inject = ['slots', 'sessions', 'workspaces', 'remote', 'remote.commands', 'uiConversation'];

function SettingsPanel({ ctx }: { ctx: ClientContext }): React.ReactElement {
  const prefs = useNotifierPrefsStore();
  const [justTested, setJustTested] = useState(false);

  const handleTestNotification = () => {
    chime.playTaskComplete(true);
    if (prefs.popupEnabled) {
      useToastStore.getState().addToast({
        type: 'success',
        title: '通知测试成功',
        message: `当前窗口尺寸：宽 ${prefs.cardWidth}px · 缩放 ${Math.round(prefs.cardScale * 100)}%。点击下方「查看会话」可立即跳回会话！`,
        duration: prefs.durationMs,
        actionText: '查看会话',
        onAction: () => {
          navigateToSession(ctx);
        },
      });
    } else {
      useToastStore.getState().addToast({
        type: 'success',
        title: '提示音测试成功',
        message: '提示音已播放。当前已开启「纯提示音模式」，右下角通知窗口已隐藏。',
        duration: 3500,
      });
    }
    setJustTested(true);
    setTimeout(() => setJustTested(false), 2000);
  };

  const presetOptions: Array<{ key: Exclude<NotifierSizePreset, 'custom'>; title: string; desc: string }> = [
    { key: 'mini', title: '迷你 (Mini)', desc: '210px · 82%' },
    { key: 'compact', title: '紧凑 (Compact)', desc: '250px · 90% (推荐)' },
    { key: 'standard', title: '标准 (Standard)', desc: '320px · 100%' },
  ];

  const cardBoxStyle: React.CSSProperties = {
    marginTop: 18,
    padding: '16px 18px',
    borderRadius: 12,
    border: '1px solid rgba(148, 163, 184, 0.22)',
    background: 'rgba(15, 23, 42, 0.45)',
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  };

  return React.createElement(
    'div',
    {
      style: {
        padding: '16px 0',
        maxWidth: 680,
        fontFamily: 'inherit',
      },
    },
    React.createElement(
      'h3',
      {
        style: {
          margin: '0 0 8px',
          fontSize: 16,
          fontWeight: 600,
          color: 'var(--dsw-alias-label-primary, inherit)',
        },
      },
      '🚀 DSH 全能增强套件 (含任务提示音与可缩放通知窗口)',
    ),
    React.createElement(
      'p',
      {
        style: {
          color: 'var(--dsw-alias-label-secondary, #888)',
          fontSize: 13,
          lineHeight: 1.6,
          margin: '0 0 12px',
        },
      },
      '已为当前 DSH 注入 8 大生产级增强能力，并将「任务完成提示音与右下角通知卡片」统一收口至此：',
    ),
    React.createElement(
      'ul',
      {
        style: {
          margin: 0,
          paddingLeft: 20,
          fontSize: 12.5,
          lineHeight: 1.75,
          color: 'var(--dsw-alias-label-secondary, #aaa)',
        },
      },
      React.createElement('li', null, '🔔 任务完成双音调合成音效 + 右下角可自由缩放通知窗口 + Windows 动作中心原生通知'),
      React.createElement('li', null, '🔮 可拖拽悬浮控制小球 (FAB)：一键切换输入折叠、发送快捷键、划词引用与通知窗口尺寸'),
      React.createElement('li', null, '🔗 会话直达链接与 Markdown 双链复制（侧边栏 Hover 快捷图标 + 悬浮球快捷键）'),
      React.createElement('li', null, '📐 LaTeX 公式点击一键复制源码'),
      React.createElement('li', null, '📊 Mermaid 交互式图表渲染、缩放与导出'),
      React.createElement('li', null, '💬 Voyager 风格选中文本一键引用回复 (Alt+Q)'),
      React.createElement('li', null, '⌨️ Enter / Ctrl+Enter 快捷发送模式切换'),
      React.createElement('li', null, '📦 Codex 风格会话列表 Hover 快捷一键归档'),
    ),

    // 任务通知与右下角窗口大小调节面板
    React.createElement(
      'div',
      { style: cardBoxStyle },
      React.createElement(
        'div',
        { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 } },
        React.createElement(
          'div',
          null,
          React.createElement(
            'div',
            { style: { fontSize: 14, fontWeight: 600, color: 'var(--dsw-alias-label-primary, #F8FAFC)' } },
            '🔔 右下角任务通知窗口尺寸与提示音设置',
          ),
          React.createElement(
            'div',
            { style: { fontSize: 12, color: '#94A3B8', marginTop: 2 } },
            '支持弹窗独立开关、当前对话免打扰（仅播提示音）、一键预设档位与无级滑块微调',
          ),
        ),
        React.createElement(
          'label',
          { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, cursor: 'pointer', userSelect: 'none' } },
          React.createElement('input', {
            type: 'checkbox',
            checked: prefs.enabled,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => prefs.updatePrefs({ enabled: e.target.checked }),
          }),
          '启用通知',
        ),
      ),

      // 弹窗卡片独立开关与当前对话免打扰模式
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            padding: '10px 12px',
            marginBottom: 14,
            borderRadius: 8,
            background: 'rgba(30, 41, 59, 0.4)',
            border: '1px solid rgba(148, 163, 184, 0.15)',
          },
        },
        React.createElement(
          'div',
          { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
          React.createElement(
            'label',
            { style: { display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 500, color: '#E2E8F0', cursor: 'pointer', userSelect: 'none' } },
            React.createElement('input', {
              type: 'checkbox',
              checked: prefs.popupEnabled,
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => prefs.updatePrefs({ popupEnabled: e.target.checked }),
            }),
            '弹出右下角任务通知窗口 (Popup Window)',
          ),
          React.createElement(
            'span',
            { style: { fontSize: 11.5, color: prefs.popupEnabled ? '#6EE7B7' : '#94A3B8' } },
            prefs.popupEnabled ? '卡片已启用' : '纯提示音模式 (不弹窗)',
          ),
        ),
        React.createElement(
          'label',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              fontSize: 12,
              color: prefs.popupEnabled ? '#CBD5E1' : '#64748B',
              cursor: prefs.popupEnabled ? 'pointer' : 'not-allowed',
              userSelect: 'none',
              marginLeft: 20,
            },
          },
          React.createElement('input', {
            type: 'checkbox',
            disabled: !prefs.popupEnabled,
            checked: prefs.popupOnlyInactive,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => prefs.updatePrefs({ popupOnlyInactive: e.target.checked }),
          }),
          '当前对话免弹窗 (在当前会话中仅播提示音，离开对话或切至后台时才弹窗)',
        ),
      ),

      // 窗口尺寸调节容器（当关闭弹窗时半透明弱化显示并提示纯提示音模式）
      React.createElement(
        'div',
        {
          style: {
            opacity: prefs.popupEnabled ? 1 : 0.45,
            pointerEvents: prefs.popupEnabled ? 'auto' : 'none',
            transition: 'opacity 0.2s ease',
          },
        },
        // 预设尺寸胶囊按钮组
        React.createElement(
          'div',
          { style: { marginBottom: 14 } },
          React.createElement(
            'div',
            { style: { fontSize: 12, color: '#CBD5E1', marginBottom: 6, fontWeight: 500 } },
            `窗口尺寸档位（当前：${prefs.sizePreset === 'custom' ? `自定义 ${prefs.cardWidth}px · ${Math.round(prefs.cardScale * 100)}%` : PRESET_DIMENSIONS[prefs.sizePreset].label}）${!prefs.popupEnabled ? ' [已开启纯提示音，窗口收起]' : ''}`,
          ),
          React.createElement(
            'div',
            { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
            ...presetOptions.map((opt) => {
              const active = prefs.sizePreset === opt.key;
              return React.createElement(
                'button',
                {
                  key: opt.key,
                  type: 'button',
                  onClick: () => prefs.setPreset(opt.key),
                  style: {
                    flex: '1 1 140px',
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: active ? '1px solid #3B82F6' : '1px solid rgba(148, 163, 184, 0.25)',
                    background: active ? 'rgba(37, 99, 235, 0.22)' : 'rgba(30, 41, 59, 0.5)',
                    color: active ? '#93C5FD' : '#E2E8F0',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  },
                },
                React.createElement('div', { style: { fontSize: 12.5, fontWeight: 600 } }, opt.title),
                React.createElement('div', { style: { fontSize: 11, opacity: 0.78, marginTop: 2 } }, opt.desc),
              );
            }),
          ),
        ),

        // 宽度无级滑块
        React.createElement(
          'div',
          { style: rowStyle },
          React.createElement(
            'span',
            { style: { fontSize: 12.5, color: '#CBD5E1', minWidth: 130 } },
            `卡片基础宽度: ${prefs.cardWidth}px`,
          ),
          React.createElement('input', {
            type: 'range',
            min: 180,
            max: 400,
            step: 5,
            value: prefs.cardWidth,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
              prefs.updatePrefs({ sizePreset: 'custom', cardWidth: Number(e.target.value) }),
            style: { flex: 1, cursor: 'pointer' },
          }),
        ),

        // 整体缩放比例滑块
        React.createElement(
          'div',
          { style: rowStyle },
          React.createElement(
            'span',
            { style: { fontSize: 12.5, color: '#CBD5E1', minWidth: 130 } },
            `整体缩放比例: ${Math.round(prefs.cardScale * 100)}%`,
          ),
          React.createElement('input', {
            type: 'range',
            min: 65,
            max: 125,
            step: 2,
            value: Math.round(prefs.cardScale * 100),
            onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
              prefs.updatePrefs({ sizePreset: 'custom', cardScale: Number(e.target.value) / 100 }),
            style: { flex: 1, cursor: 'pointer' },
          }),
        ),
      ),

      // 提示音开关与音量滑块
      React.createElement(
        'div',
        { style: rowStyle },
        React.createElement(
          'label',
          { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#CBD5E1', minWidth: 130, cursor: 'pointer' } },
          React.createElement('input', {
            type: 'checkbox',
            checked: prefs.soundEnabled,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => prefs.updatePrefs({ soundEnabled: e.target.checked }),
          }),
          `合成音音量: ${prefs.soundEnabled ? `${prefs.volume}%` : '已静音'}`,
        ),
        React.createElement('input', {
          type: 'range',
          min: 0,
          max: 100,
          step: 5,
          disabled: !prefs.soundEnabled,
          value: prefs.volume,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => prefs.updatePrefs({ volume: Number(e.target.value) }),
          style: { flex: 1, cursor: prefs.soundEnabled ? 'pointer' : 'not-allowed' },
        }),
      ),

      // 底部按钮操作栏
      React.createElement(
        'div',
        { style: { display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14, alignItems: 'center' } },
        React.createElement(
          'button',
          {
            type: 'button',
            onClick: handleTestNotification,
            style: {
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 500,
              borderRadius: 6,
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              cursor: 'pointer',
            },
          },
          justTested ? '✓ 已触发右下角弹窗与音效' : '🔔 弹出测试卡片并试听音效',
        ),
        React.createElement(
          'button',
          {
            type: 'button',
            onClick: () => prefs.updatePrefs({ previewPinned: !prefs.previewPinned }),
            style: {
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 500,
              borderRadius: 6,
              backgroundColor: prefs.previewPinned ? 'rgba(16, 185, 129, 0.25)' : 'rgba(51, 65, 85, 0.7)',
              color: prefs.previewPinned ? '#6EE7B7' : '#E2E8F0',
              border: prefs.previewPinned ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(148, 163, 184, 0.25)',
              cursor: 'pointer',
            },
          },
          prefs.previewPinned ? '📌 关闭右下角常驻预览窗' : '📌 在右下角常驻显示预览窗 (边调边看)',
        ),
        React.createElement(
          'button',
          {
            type: 'button',
            onClick: () => prefs.resetPrefs(),
            style: {
              padding: '6px 10px',
              fontSize: 12,
              borderRadius: 6,
              backgroundColor: 'transparent',
              color: '#94A3B8',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              cursor: 'pointer',
            },
          },
          '↺ 恢复默认紧凑尺寸',
        ),
      ),
    ),
  );
}

export function apply(ctx: ClientContext): void {
  if (typeof window !== "undefined") {
    (window as any).__DSH_ENHANCEMENT_CTX__ = ctx;
  }

  // 1. 注册设置中心面板插槽
  ctx.effect(() => {
    return ctx.slots.inject('settings.section', () =>
      ctx.slots.register(
        {
          name: 'settings.section',
          id: 'dsh-web-enhancements',
          key: 'dsh-web-enhancements',
          order: 40,
          label: () => '全能增强套件',
        },
        () => React.createElement(SettingsPanel, { ctx }),
      ),
    );
  }, 'dsh-web-enhancements: settings panel');

  // 2. 注册右下角可缩放通知浮动层 (shell.overlay)
  ctx.effect(() => {
    return ctx.slots.inject('shell.overlay', () =>
      ctx.slots.register(
        {
          name: 'shell.overlay',
          id: 'dsh-web-enhancements-notifier-overlay',
          key: 'dsh-web-enhancements-notifier-overlay',
          order: 999,
        },
        (slotProps: any) =>
          React.createElement(ToastContainer, {
            slotProps,
            onNavigateSession: (id?: string, title?: string) => navigateToSession(ctx, id, title),
          }),
      ),
    );
  }, 'dsh-web-enhancements: notifier overlay');

  // 3. 启动主会话整棵任务树完成状态与提示音监听
  ctx.effect(() => {
    return initTaskNotifierSessionWatcher(ctx);
  }, 'dsh-web-enhancements: task notifier session watcher');

  // 4. 全局样式注入与生命周期清理
  ctx.effect(() => {
    const style = document.createElement('style');
    style.id = 'dsh-web-enhancements-style';
    style.textContent = ENHANCEMENT_STYLES;
    document.head.appendChild(style);

    return () => {
      style.remove();
    };
  }, 'dsh-web-enhancements: styles');

  // 5. 特性 2：Mermaid 图表渲染
  ctx.effect(() => {
    const dispose = initMermaid();
    return () => dispose();
  }, 'dsh-web-enhancements: mermaid');

  // 6. 特性 3：右侧边栏文件快捷搜索与一秒直达预览
  ctx.effect(() => {
    const dispose = initFileSearch();
    return () => dispose();
  }, 'dsh-web-enhancements: file search');

  // 7. 特性 4：Codex 风格会话列表 Hover 快捷一键归档
  ctx.effect(() => {
    const dispose = initHoverArchive();
    return () => dispose();
  }, 'dsh-web-enhancements: hover-archive');

  // 7. 特性 4、5、6、7、8 与 可拖拽悬浮控制小球 (FAB) 统一装配
  ctx.effect(() => {
    const collapseCtrl = initInputCollapse();
    const sendModeCtrl = initSendMode('ctrl-enter');
    const quoteCtrl = initQuoteReply();
    const formulaCtrl = initFormulaCopy();
    const sessionLinkCtrl = initSessionLink(ctx);
    const workspacePathCtrl = initWorkspacePath(ctx);
    const modeCycleCtrl = initModeCycle(ctx);

    const disposeFab = initFloatingBall({
      getCollapseState: () => collapseCtrl.isCollapsed(),
      toggleCollapse: () => collapseCtrl.toggle(),
      onCollapseChange: (cb) => collapseCtrl.onChanged(cb),

      getSendMode: () => sendModeCtrl.getMode(),
      toggleSendMode: () => sendModeCtrl.toggleMode(),
      onSendModeChange: (cb) => sendModeCtrl.onChanged(cb),

      getQuoteEnabled: () => quoteCtrl.isEnabled(),
      toggleQuoteEnabled: () => quoteCtrl.toggle(),
      onQuoteChange: (cb) => quoteCtrl.onChanged(cb),

      getFormulaEnabled: () => formulaCtrl.isEnabled(),
      getModeState: () => modeCycleCtrl.getCurrentMode(),
      cycleMode: () => modeCycleCtrl.cycle(),
      toggleFormulaEnabled: () => formulaCtrl.toggle(),
      onFormulaChange: (cb) => formulaCtrl.onChanged(cb),

      copyCurrentSessionLink: (markdown?: boolean) => sessionLinkCtrl.copyCurrent(markdown),
      copyCurrentWorkspacePath: () => copyWorkspacePath(undefined, ctx),

      getNotifierStatusLabel: () => {
        const st = useNotifierPrefsStore.getState();
        if (!st.enabled) return { label: '关', active: false };
        if (!st.popupEnabled && st.soundEnabled) return { label: '仅提示音', active: true };
        if (st.sizePreset === 'mini') return { label: '迷你(S)', active: true };
        if (st.sizePreset === 'compact') return { label: '紧凑(M)', active: true };
        if (st.sizePreset === 'standard') return { label: '标准(L)', active: true };
        return { label: `${st.cardWidth}px`, active: true };
      },
      cycleNotifierPreset: () => {
        useNotifierPrefsStore.getState().cyclePresetOrToggle();
      },
      onNotifierChange: (cb) => {
        return useNotifierPrefsStore.subscribe(cb);
      },
    });

    return () => {
      disposeFab();
      sessionLinkCtrl.dispose();
      workspacePathCtrl.dispose();
      modeCycleCtrl.dispose();
      formulaCtrl.dispose();
      collapseCtrl.dispose();
      sendModeCtrl.dispose();
      quoteCtrl.dispose();
    };
  }, 'dsh-web-enhancements: fab and controls');
}



