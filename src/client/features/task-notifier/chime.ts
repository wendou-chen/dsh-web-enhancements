import { useNotifierPrefsStore } from './prefs-store.js';

/**
 * 基于 Web Audio API 的低延迟无外部静态资源音效合成器（支持音量与静音开关控制）
 */
class SoundEngine {
  private ctx: AudioContext | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const unlock = () => {
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('keydown', unlock);
      };
      window.addEventListener('pointerdown', unlock, { passive: true });
      window.addEventListener('keydown', unlock, { passive: true });
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    return this.ctx;
  }

  private getEffectiveGain(basePeak: number): number {
    const { enabled, soundEnabled, volume } = useNotifierPrefsStore.getState();
    if (!enabled || !soundEnabled || volume <= 0) return 0;
    return Math.max(0.001, basePeak * (volume / 100));
  }

  /**
   * 播放双音调完成提示音 (柔和的正弦波双音 Chime: 587.33Hz D5 -> 880Hz A5)
   */
  public playTaskComplete(forcePlay = false): void {
    const { enabled, soundEnabled, volume } = useNotifierPrefsStore.getState();
    if (!forcePlay && (!enabled || !soundEnabled)) return;

    const peak = forcePlay ? Math.max(0.05, 0.22 * ((volume || 75) / 100)) : this.getEffectiveGain(0.22);
    if (peak <= 0) return;

    const ctx = this.getContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const tones = [
      { freq: 587.33, start: now, duration: 0.25 },
      { freq: 880.00, start: now + 0.08, duration: 0.35 },
    ];

    tones.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(peak, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + duration);
    });
  }

  /**
   * 播放提示音 (等待用户确认/审批)
   */
  public playAttentionRequired(forcePlay = false): void {
    const { enabled, soundEnabled, volume } = useNotifierPrefsStore.getState();
    if (!forcePlay && (!enabled || !soundEnabled)) return;

    const peak = forcePlay ? Math.max(0.05, 0.24 * ((volume || 75) / 100)) : this.getEffectiveGain(0.24);
    if (peak <= 0) return;

    const ctx = this.getContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(659.25, now); // E5
    osc.frequency.setValueAtTime(783.99, now + 0.1); // G5

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, startOrNow(now) + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.28);
  }
}

function startOrNow(t: number): number {
  return t;
}

export const chime = new SoundEngine();
