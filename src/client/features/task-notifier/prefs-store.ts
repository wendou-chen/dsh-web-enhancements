import { useSyncExternalStore } from 'react';

export type NotifierSizePreset = 'mini' | 'compact' | 'standard' | 'custom';

export interface NotifierPrefs {
  enabled: boolean;
  soundEnabled: boolean;
  popupEnabled: boolean; // 是否显示右下角任务通知卡片（可彻底关闭只留提示音）
  popupOnlyInactive: boolean; // 仅离开当前对话或后台时弹窗（当前对话内仅播放声音）
  volume: number; // 0 ~ 100
  sizePreset: NotifierSizePreset;
  cardWidth: number; // 180 ~ 400 px
  cardScale: number; // 0.65 ~ 1.25
  durationMs: number; // 2000 ~ 10000 ms
  previewPinned: boolean; // 是否在右下角常驻显示预览卡片以便调尺寸
}

export const PRESET_DIMENSIONS: Record<Exclude<NotifierSizePreset, 'custom'>, { width: number; scale: number; label: string }> = {
  mini: { width: 210, scale: 0.82, label: '迷你 (S)' },
  compact: { width: 250, scale: 0.90, label: '紧凑 (M)' },
  standard: { width: 320, scale: 1.00, label: '标准 (L)' },
};

const STORAGE_KEY = 'dsh_enhancements_notifier_prefs_v1';

const DEFAULT_PREFS: NotifierPrefs = {
  enabled: true,
  soundEnabled: true,
  popupEnabled: true,
  popupOnlyInactive: false,
  volume: 75,
  sizePreset: 'compact',
  cardWidth: PRESET_DIMENSIONS.compact.width,
  cardScale: PRESET_DIMENSIONS.compact.scale,
  durationMs: 4500,
  previewPinned: false,
};

function loadInitialPrefs(): NotifierPrefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PREFS,
      ...parsed,
      popupEnabled: parsed.popupEnabled ?? true,
      popupOnlyInactive: parsed.popupOnlyInactive ?? false,
      previewPinned: false, // 每次刷新默认不常驻预览卡片
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(prefs: NotifierPrefs): void {
  if (typeof window === 'undefined') return;
  try {
    const { previewPinned: _, ...persisted } = prefs;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    // 忽略存储异常
  }
}

interface NotifierPrefsStore extends NotifierPrefs {
  updatePrefs: (patch: Partial<NotifierPrefs>) => void;
  setPreset: (preset: Exclude<NotifierSizePreset, 'custom'>) => void;
  cyclePresetOrToggle: () => void;
  resetPrefs: () => void;
}

const listeners = new Set<() => void>();
let state: NotifierPrefsStore;

function emit(nextPrefs: NotifierPrefs): void {
  savePrefs(nextPrefs);
  state = {
    ...state,
    ...nextPrefs,
  };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): NotifierPrefsStore {
  return state;
}

const initial = loadInitialPrefs();

state = {
  ...initial,
  updatePrefs: (patch) => {
    const merged: NotifierPrefs = {
      enabled: patch.enabled ?? state.enabled,
      soundEnabled: patch.soundEnabled ?? state.soundEnabled,
      popupEnabled: patch.popupEnabled ?? state.popupEnabled,
      popupOnlyInactive: patch.popupOnlyInactive ?? state.popupOnlyInactive,
      volume: Math.max(0, Math.min(100, patch.volume ?? state.volume)),
      sizePreset: patch.sizePreset ?? state.sizePreset,
      cardWidth: Math.round(Math.max(180, Math.min(400, patch.cardWidth ?? state.cardWidth))),
      cardScale: Number(Math.max(0.65, Math.min(1.25, patch.cardScale ?? state.cardScale)).toFixed(2)),
      durationMs: Math.max(2000, Math.min(12000, patch.durationMs ?? state.durationMs)),
      previewPinned: patch.previewPinned ?? state.previewPinned,
    };
    emit(merged);
  },
  setPreset: (preset) => {
    const dim = PRESET_DIMENSIONS[preset];
    emit({
      enabled: state.enabled,
      soundEnabled: state.soundEnabled,
      popupEnabled: true,
      popupOnlyInactive: state.popupOnlyInactive,
      volume: state.volume,
      sizePreset: preset,
      cardWidth: dim.width,
      cardScale: dim.scale,
      durationMs: state.durationMs,
      previewPinned: state.previewPinned,
    });
  },
  cyclePresetOrToggle: () => {
    if (!state.enabled) {
      // 关 -> 迷你 (S)
      const dim = PRESET_DIMENSIONS.mini;
      emit({
        ...state,
        enabled: true,
        popupEnabled: true,
        sizePreset: 'mini',
        cardWidth: dim.width,
        cardScale: dim.scale,
      });
    } else if (state.popupEnabled && state.sizePreset === 'mini') {
      // 迷你 -> 紧凑 (M)
      const dim = PRESET_DIMENSIONS.compact;
      emit({
        ...state,
        popupEnabled: true,
        sizePreset: 'compact',
        cardWidth: dim.width,
        cardScale: dim.scale,
      });
    } else if (state.popupEnabled && state.sizePreset === 'compact') {
      // 紧凑 -> 标准 (L)
      const dim = PRESET_DIMENSIONS.standard;
      emit({
        ...state,
        popupEnabled: true,
        sizePreset: 'standard',
        cardWidth: dim.width,
        cardScale: dim.scale,
      });
    } else if (state.popupEnabled) {
      // 标准 -> 仅提示音 (关闭弹窗，保留声音)
      emit({
        ...state,
        enabled: true,
        popupEnabled: false,
        soundEnabled: true,
      });
    } else {
      // 仅提示音 -> 彻底关闭
      emit({
        ...state,
        enabled: false,
      });
    }
  },
  resetPrefs: () => {
    emit({ ...DEFAULT_PREFS });
  },
};

export const useNotifierPrefsStore = Object.assign(
  (): NotifierPrefsStore => useSyncExternalStore(subscribe, getSnapshot, getSnapshot),
  {
    getState: (): NotifierPrefsStore => state,
    subscribe,
  },
);
