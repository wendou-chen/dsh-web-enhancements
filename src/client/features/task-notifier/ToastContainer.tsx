import React, { useEffect, useState, useRef } from 'react';
import { useToastStore, ToastItem } from './toast-store.js';
import { useNotifierPrefsStore, NotifierSizePreset } from './prefs-store.js';
import { chime } from './chime.js';

const ToastCard: React.FC<{
  item: ToastItem;
  isPreview?: boolean;
  onDismiss: (id: string) => void;
}> = ({ item, isPreview = false, onDismiss }) => {
  const prefs = useNotifierPrefsStore();
  const [isHovered, setIsHovered] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [progress, setProgress] = useState(100);
  const remainingTimeRef = useRef(item.duration ?? 4500);

  useEffect(() => {
    if (isPreview || !item.duration || item.duration <= 0) return;
    if (isHovered || isResizing) return;

    const duration = remainingTimeRef.current;
    const start = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(pct);

      if (elapsed >= duration) {
        clearInterval(interval);
        onDismiss(item.id);
      }
    }, 25);

    return () => clearInterval(interval);
  }, [isHovered, isResizing, isPreview, item.duration, item.id, onDismiss]);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (item.duration) {
      remainingTimeRef.current = (item.duration * progress) / 100;
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  // 左上角直接拖拽调整窗口大小
  const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = prefs.cardWidth;
    const startScale = prefs.cardScale;

    setIsResizing(true);

    const onMove = (moveEv: PointerEvent) => {
      // 向左拖动 (moveEv.clientX < startX) -> 宽度变大；向右拖动 -> 宽度变小
      const dx = startX - moveEv.clientX;
      // 向上拖动 (moveEv.clientY < startY) -> 比例变大；向下拖动 -> 比例变小
      const dy = startY - moveEv.clientY;

      const nextWidth = Math.round(Math.max(180, Math.min(400, startWidth + dx)));
      const nextScale = Number(Math.max(0.65, Math.min(1.25, startScale + dy / 220)).toFixed(2));

      useNotifierPrefsStore.getState().updatePrefs({
        sizePreset: 'custom',
        cardWidth: nextWidth,
        cardScale: nextScale,
      });
    };

    const onUp = () => {
      setIsResizing(false);
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerup', onUp, true);
    };

    window.addEventListener('pointermove', onMove, true);
    window.addEventListener('pointerup', onUp, true);
  };

  const borderColors: Record<string, string> = {
    success: '1px solid rgba(16, 185, 129, 0.45)',
    warning: '1px solid rgba(245, 158, 11, 0.45)',
    error: '1px solid rgba(239, 68, 68, 0.45)',
    info: '1px solid rgba(59, 130, 246, 0.45)',
  };

  const badgeColors: Record<string, string> = {
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  };

  const isCompactOrMini = prefs.cardWidth <= 260 || prefs.cardScale <= 0.9;
  const padY = isCompactOrMini ? 9 : 12;
  const padX = isCompactOrMini ? 11 : 14;
  const titleFontSize = isCompactOrMini ? 12 : 13;
  const msgFontSize = isCompactOrMini ? 11 : 12;

  const presetQuickBtns: Array<{ key: Exclude<NotifierSizePreset, 'custom'>; label: string; tip: string }> = [
    { key: 'mini', label: 'S', tip: '迷你尺寸 (210px)' },
    { key: 'compact', label: 'M', tip: '紧凑尺寸 (250px)' },
    { key: 'standard', label: 'L', tip: '标准尺寸 (320px)' },
  ];

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        width: `${prefs.cardWidth}px`,
        maxWidth: 'calc(100vw - 24px)',
        transform: `scale(${prefs.cardScale})`,
        transformOrigin: 'bottom right',
        borderRadius: isCompactOrMini ? '10px' : '12px',
        padding: `${padY}px ${padX}px`,
        marginBottom: '10px',
        background: 'rgba(24, 27, 38, 0.94)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: isResizing
          ? '0 0 0 2px #3B82F6, 0 12px 32px rgba(0, 0, 0, 0.6)'
          : '0 10px 28px rgba(0, 0, 0, 0.48), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        border: borderColors[item.type] || borderColors.info,
        color: '#F1F5F9',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        position: 'relative',
        overflow: 'hidden',
        pointerEvents: 'auto',
        transition: isResizing ? 'none' : 'width 0.15s ease, transform 0.15s ease, box-shadow 0.2s ease',
        userSelect: isResizing ? 'none' : 'auto',
      }}
    >
      {/* 左上角拖拽调整大小手柄 (↖) */}
      <div
        onPointerDown={handleResizePointerDown}
        title="按住左上角拖动可自由调整通知窗口大小"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '16px',
          height: '16px',
          cursor: 'nwse-resize',
          zIndex: 10,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          padding: '2px 3px',
          opacity: isHovered || isResizing ? 0.85 : 0.2,
          transition: 'opacity 0.15s ease',
          color: isResizing ? '#60A5FA' : '#94A3B8',
          fontSize: '10px',
          lineHeight: 1,
        }}
      >
        ↖
      </div>

      {/* 拖拽时显示的实时尺寸指示条 */}
      {isResizing && (
        <div
          style={{
            position: 'absolute',
            top: '3px',
            left: '20px',
            fontSize: '10px',
            color: '#60A5FA',
            fontWeight: 600,
            background: 'rgba(15, 23, 42, 0.85)',
            padding: '1px 5px',
            borderRadius: '4px',
            zIndex: 11,
          }}
        >
          {prefs.cardWidth}px · {Math.round(prefs.cardScale * 100)}%
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            marginTop: '4px',
            backgroundColor: badgeColors[item.type] || badgeColors.info,
            boxShadow: `0 0 8px ${badgeColors[item.type] || badgeColors.info}`,
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
            <div
              style={{
                fontSize: `${titleFontSize}px`,
                fontWeight: 600,
                color: '#F8FAFC',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {item.title}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
              {/* 鼠标悬停时显示 S / M / L 一键切换尺寸微按钮 */}
              {(isHovered || isPreview) &&
                presetQuickBtns.map((b) => {
                  const active = prefs.sizePreset === b.key;
                  return (
                    <button
                      key={b.key}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        useNotifierPrefsStore.getState().setPreset(b.key);
                      }}
                      title={b.tip}
                      style={{
                        background: active ? 'rgba(59, 130, 246, 0.32)' : 'rgba(255, 255, 255, 0.06)',
                        border: active ? '1px solid rgba(96, 165, 250, 0.6)' : '1px solid transparent',
                        color: active ? '#93C5FD' : '#94A3B8',
                        cursor: 'pointer',
                        fontSize: '9px',
                        fontWeight: 600,
                        padding: '1px 4px',
                        borderRadius: '4px',
                        lineHeight: 1.2,
                      }}
                    >
                      {b.label}
                    </button>
                  );
                })}
              <button
                type="button"
                onClick={() => {
                  if (isPreview) {
                    useNotifierPrefsStore.getState().updatePrefs({ previewPinned: false });
                  } else {
                    onDismiss(item.id);
                  }
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  fontSize: '14px',
                  padding: '0 3px',
                  lineHeight: 1,
                }}
                title="关闭"
              >
                ×
              </button>
            </div>
          </div>

          {item.message && (
            <div
              style={{
                marginTop: '3px',
                fontSize: `${msgFontSize}px`,
                color: '#CBD5E1',
                lineHeight: 1.38,
                wordBreak: 'break-word',
                maxHeight: isCompactOrMini ? '34px' : '46px',
                overflow: 'hidden',
              }}
            >
              {item.message}
            </div>
          )}

          {item.onAction && item.actionText && (
            <div style={{ marginTop: '7px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  item.onAction?.();
                  if (!isPreview) onDismiss(item.id);
                }}
                style={{
                  padding: '3px 9px',
                  fontSize: '10.5px',
                  fontWeight: 500,
                  borderRadius: '5px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {item.actionText}
              </button>
            </div>
          )}
        </div>
      </div>

      {!isPreview && item.duration && item.duration > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: 'rgba(255, 255, 255, 0.08)',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: badgeColors[item.type] || badgeColors.info,
              transition: 'width 25ms linear',
            }}
          />
        </div>
      )}
    </div>
  );
};

export const ToastContainer: React.FC<{
  slotProps?: any;
  onNavigateSession?: (sessionId?: string, sessionTitle?: string) => void;
}> = ({ slotProps, onNavigateSession }) => {
  const { toasts, dismissToast } = useToastStore();
  const prefs = useNotifierPrefsStore();

  // 利用 shell.overlay 原生注入的 useSessions / useSessionStatus Hook 实时感知主会话任务完成（双保险）
  const prevRunningRef = useRef<Map<string, boolean>>(new Map());
  const prevPendingRef = useRef<Map<string, boolean>>(new Map());

  const sessionListState =
    typeof slotProps?.useSessions === 'function' ? slotProps.useSessions((s: any) => s) : undefined;
  const sessionStatusMap =
    typeof slotProps?.useSessionStatus === 'function' ? slotProps.useSessionStatus((s: any) => s) : undefined;

  useEffect(() => {
    if (!prefs.enabled || !sessionListState?.byId) return;
    const byId = sessionListState.byId;

    for (const [id, summary] of Object.entries<any>(byId)) {
      if (!summary || summary.origin === 'subagent' || summary.parentSessionId || summary.parentId || (summary.depth ?? 0) > 0) {
        continue;
      }

      const statusEntry = sessionStatusMap?.get?.(id);
      let treeRunning = Boolean(statusEntry?.running ?? summary.running);
      if (!treeRunning) {
        for (const [cid, csum] of Object.entries<any>(byId)) {
          if (csum && (csum.parentSessionId === id || csum.parentId === id)) {
            const cstat = sessionStatusMap?.get?.(cid);
            if (Boolean(cstat?.running ?? csum.running)) {
              treeRunning = true;
              break;
            }
          }
        }
      }

      const wasRunning = prevRunningRef.current.get(id) ?? false;
      prevRunningRef.current.set(id, treeRunning);

      const nowPending = Boolean(statusEntry?.pendingInteraction ?? summary.pendingInteraction);
      const wasPending = prevPendingRef.current.get(id) ?? false;
      const curSessionId = sessionListState?.current;
      const isCurrentSession = Boolean(curSessionId && curSessionId === id);
      const shouldShowPopup = prefs.popupEnabled && (!prefs.popupOnlyInactive || !isCurrentSession);

      if (wasRunning && !treeRunning) {
        const recent = useToastStore.getState().toasts.some((t) => t.sessionId === id && Date.now() - t.createdAt < 1500);
        if (!recent) {
          if (prefs.soundEnabled) {
            chime.playTaskComplete();
          }
          if (shouldShowPopup) {
            useToastStore.getState().addToast({
              type: 'success',
              title: '主任务已全部完成',
              message: `${title} 及其子任务已执行完毕。`,
              duration: prefs.durationMs,
              sessionId: id,
              actionText: '查看会话',
              onAction: () => onNavigateSession?.(id, title),
            });
          }
        }
      }

      if (!wasPending && nowPending) {
        const recent = useToastStore.getState().toasts.some((t) => t.sessionId === id && Date.now() - t.createdAt < 1500);
        if (!recent) {
          if (prefs.soundEnabled) {
            chime.playAttentionRequired();
          }
          if (shouldShowPopup) {
            useToastStore.getState().addToast({
              type: 'warning',
              title: '等待确认操作',
              message: `${title} 正在等待您的确认或输入。`,
              duration: 0,
              sessionId: id,
              actionText: '立即前往',
              onAction: () => onNavigateSession?.(id, title),
            });
          }
        }
      }
    }
  }, [sessionListState, sessionStatusMap, prefs.enabled, prefs.soundEnabled, prefs.popupEnabled, prefs.popupOnlyInactive, prefs.durationMs, onNavigateSession]);

  if ((!prefs.enabled || !prefs.popupEnabled) && !prefs.previewPinned) return null;

  const previewItem: ToastItem | null = prefs.previewPinned
    ? {
        id: '__preview_pinned__',
        type: 'success',
        title: '通知窗口尺寸预览 (可拖左上角 ↖)',
        message: `当前尺寸：宽 ${prefs.cardWidth}px · 缩放 ${Math.round(prefs.cardScale * 100)}%。可直接按住左上角拖动或点 S/M/L 切换。`,
        duration: 0,
        createdAt: Date.now(),
        actionText: '查看会话',
        onAction: () => {
          prefs.updatePrefs({ previewPinned: false });
          onNavigateSession?.();
        },
      }
    : null;

  if (toasts.length === 0 && !previewItem) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 9999,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column-reverse',
        alignItems: 'flex-end',
      }}
    >
      <div>
        {previewItem && <ToastCard key={previewItem.id} item={previewItem} isPreview onDismiss={() => {}} />}
        {toasts.map((toast) => (
          <ToastCard key={toast.id} item={toast} onDismiss={dismissToast} />
        ))}
      </div>
    </div>
  );
};
