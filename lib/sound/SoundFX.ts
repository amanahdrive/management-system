'use client';

/**
 * AMANAH DRIVE — PROCEDURAL WEB AUDIO ENGINE
 * Zero-Asset Audio Micro-interactions (< 0 KB downloads)
 * Tactile microswitches, mechanical ticks, and confirmation chimes.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.isMuted = localStorage.getItem('amanah_sound_muted') === 'true';
      } catch {
        this.isMuted = false;
      }
    }
  }

  private initContext() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('amanah_sound_muted', String(this.isMuted));
        window.dispatchEvent(new CustomEvent('amanah:sound:change', { detail: { muted: this.isMuted } }));
      } catch {}
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(val: boolean) {
    this.isMuted = val;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('amanah_sound_muted', String(this.isMuted));
        window.dispatchEvent(new CustomEvent('amanah:sound:change', { detail: { muted: this.isMuted } }));
      } catch {}
    }
  }

  /**
   * Tactile microswitch click (buttons, toggles, actions)
   * High-frequency pulse with slight pitch jitter for humanized physical feel
   */
  public playTactileClick() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      const jitter = (Math.random() - 0.5) * 40;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1350 + jitter, t);
      osc.frequency.exponentialRampToValueAtTime(160, t + 0.015);

      filter.type = 'highpass';
      filter.frequency.setValueAtTime(750, t);

      gain.gain.setValueAtTime(0.04, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.018);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.02);
    } catch {
      // Ignore audio failure
    }
  }

  /**
   * Soft mechanical tick (date changer, month stepper, tab navigation)
   */
  public playMechanicalTick() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, t);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.012);

      gain.gain.setValueAtTime(0.03, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.012);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.015);
    } catch {
      // Ignore
    }
  }

  /**
   * Confirmation chime (saving data, schedule updated, session check-in)
   */
  public playConfirmChime() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';

      // Harmonic interval (D6 -> A6)
      osc1.frequency.setValueAtTime(1174.66, t);
      osc2.frequency.setValueAtTime(1760.00, t);

      gain.gain.setValueAtTime(0.025, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.065);
      osc2.stop(t + 0.065);
    } catch {
      // Ignore
    }
  }
}

export const sound = new SoundEngine();