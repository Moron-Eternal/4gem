import { MoveData, MovePhysicsProfile } from '../../types/game';

export type MusicTrack = 'none' | 'title' | 'town' | 'route' | 'forest' | 'gym' | 'battle' | 'boss';

/**
 * 100% self-contained Web Audio API GBA chiptune & stat-scaled elemental SFX synthesizer.
 */
export class SoundEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted = false;
  private currentTrack: MusicTrack = 'none';
  private musicTimer: number | null = null;
  private stepIdx = 0;

  private ensureCtx(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (!this.noiseBuffer && this.ctx) {
      const len = this.ctx.sampleRate * 1.2;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buf;
    }
    return this.ctx;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.muted) {
      this.stopMusicTimer();
    } else if (this.currentTrack !== 'none') {
      const t = this.currentTrack;
      this.currentTrack = 'none';
      this.playMusic(t);
    }
    return this.muted;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'square',
    gainPeak = 0.08,
    delay = 0,
    endFreq?: number
  ): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(40, freq), now);
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private playFilteredNoise(
    duration: number,
    filterType: BiquadFilterType,
    startFreq: number,
    endFreq: number,
    gainPeak: number,
    delay = 0
  ): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(Math.max(60, startFreq), now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(60, endFreq), now + duration);
    filter.Q.value = 1.6;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + Math.min(0.08, duration * 0.25));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);
    src.stop(now + duration + 0.03);
  }

  public playBlip(): void {
    this.playTone(760, 0.055, 'square', 0.05, 0, 920);
  }

  public playConfirm(): void {
    this.playTone(620, 0.05, 'square', 0.055, 0);
    this.playTone(940, 0.08, 'square', 0.055, 0.05);
  }

  public playHealJingle(): void {
    const notes = [523, 523, 523, 392, 659];
    const delays = [0, 0.14, 0.28, 0.42, 0.56];
    notes.forEach((n, i) => {
      this.playTone(n, 0.13, 'triangle', 0.09, delays[i]);
    });
  }

  public playLevelUp(): void {
    const notes = [523, 659, 784, 1046];
    notes.forEach((n, i) => {
      this.playTone(n, i === 3 ? 0.28 : 0.1, 'square', 0.07, i * 0.095);
    });
  }

  public playEvolutionFanfare(): void {
    const seq = [392, 440, 494, 523, 587, 659, 784, 1046];
    seq.forEach((n, i) => {
      this.playTone(n, i === seq.length - 1 ? 0.45 : 0.11, 'square', 0.07, i * 0.1);
    });
  }

  public playPokeballThrow(): void {
    this.playTone(320, 0.22, 'triangle', 0.06, 0, 740);
  }

  public playPokeballShake(): void {
    this.playTone(280, 0.08, 'triangle', 0.06, 0, 190);
    this.playTone(360, 0.07, 'square', 0.04, 0.08, 260);
  }

  public playCatchSuccess(): void {
    const notes = [523, 659, 784, 659, 1046];
    const times = [0, 0.1, 0.2, 0.34, 0.44];
    notes.forEach((n, i) => this.playTone(n, i === 4 ? 0.36 : 0.09, 'square', 0.07, times[i]));
  }

  public playHit(effectiveness: number, scaleFactor = 0.5): void {
    const bass = 140 - scaleFactor * 65;
    if (effectiveness >= 2) {
      this.playTone(420, 0.09, 'sawtooth', 0.09, 0, 120);
      this.playFilteredNoise(0.22, 'lowpass', 900, 180, 0.11 + scaleFactor * 0.06, 0.02);
    } else if (effectiveness < 1) {
      this.playTone(220, 0.08, 'triangle', 0.06, 0, 140);
    } else {
      this.playTone(bass + 120, 0.1, 'square', 0.07, 0, bass);
      this.playFilteredNoise(0.14, 'bandpass', 650, 200, 0.08 + scaleFactor * 0.05);
    }
  }

  /**
   * Plays a realistic retro elemental sound effect whose bass resonance, duration,
   * and richness dynamically scale with MovePhysicsProfile.scaleFactor!
   */
  public playMoveSfx(move: MoveData, profile: MovePhysicsProfile): void {
    const s = profile.scaleFactor;
    const w = profile.audioBassWeight;
    const arch = move.archetype;

    if (arch === 'surf_wave' || arch === 'water_jet') {
      // Surging water swell + foamy crash! Deep low-end ocean rumble at high Sp. Atk!
      const startCut = 420 + (1 - s) * 700;
      const peakCut = 1200 + s * 1400;
      this.playFilteredNoise(0.55 + s * 0.45, 'bandpass', startCut, peakCut, 0.07 + w * 0.1);
      this.playFilteredNoise(0.45 + s * 0.35, 'lowpass', 720, 140 + (1 - s) * 180, 0.08 + w * 0.11, 0.35);
      if (s >= 0.45) {
        this.playTone(130 - s * 55, 0.5 + s * 0.25, 'triangle', 0.07 + s * 0.06, 0.25, 52);
      }
    } else if (arch === 'flamethrower' || arch === 'fire_blast' || arch === 'ember') {
      // Crackling thermal roar growing from small hiss (Charmander) to roaring inferno (Charizard)!
      this.playFilteredNoise(0.45 + s * 0.5, 'bandpass', 1400 - s * 600, 320, 0.08 + w * 0.1);
      this.playTone(170 - s * 80, 0.4 + s * 0.45, 'sawtooth', 0.045 + s * 0.06, 0.04, 65);
      if (s >= 0.6) {
        this.playFilteredNoise(0.38, 'lowpass', 420, 95, 0.11, 0.3);
      }
    } else if (arch === 'electric_bolt' || arch === 'thunder_strike') {
      // Arpeggiated electric crackle + thunder boom!
      const bolts = Math.round(3 + s * 5);
      for (let i = 0; i < bolts; i++) {
        this.playTone(1400 - i * 90 + Math.random() * 450, 0.055, 'sawtooth', 0.065, i * 0.045, 320);
      }
      this.playFilteredNoise(0.32 + s * 0.4, 'lowpass', 950, 110, 0.09 + w * 0.1, 0.16);
    } else if (arch === 'ice_beam' || arch === 'blizzard') {
      const chimes = [1180, 1480, 1760, 2093];
      chimes.forEach((f, i) => this.playTone(f, 0.12, 'triangle', 0.055, i * 0.06, f * 1.15));
      this.playFilteredNoise(0.45 + s * 0.3, 'highpass', 2400 - s * 900, 1100, 0.06 + s * 0.05);
    } else if (arch === 'rock_throw' || arch === 'earthquake') {
      this.playTone(135 - s * 55, 0.55 + s * 0.35, 'sawtooth', 0.08 + s * 0.06, 0, 42);
      this.playFilteredNoise(0.5 + s * 0.35, 'lowpass', 520, 90, 0.11 + s * 0.08, 0.08);
    } else if (arch === 'vine_whip' || arch === 'razor_leaf' || arch === 'solar_beam') {
      this.playTone(540, 0.16, 'square', 0.06, 0, 980);
      this.playFilteredNoise(0.28 + s * 0.25, 'bandpass', 1800, 900, 0.06 + s * 0.04, 0.08);
    } else if (arch === 'psychic_wave') {
      this.playTone(440, 0.38, 'sine', 0.075, 0, 880);
      this.playTone(660, 0.38, 'triangle', 0.06, 0.05, 330);
    } else {
      this.playTone(280 + s * 100, 0.14, 'square', 0.06, 0, 110);
    }
  }

  public playMusic(track: MusicTrack): void {
    if (this.currentTrack === track && this.musicTimer !== null) return;
    this.currentTrack = track;
    this.stopMusicTimer();
    if (this.muted || track === 'none' || typeof window === 'undefined') return;

    this.stepIdx = 0;
    const sequences: Record<Exclude<MusicTrack, 'none'>, { tempoMs: number; melody: number[]; bass: number[] }> = {
      title: {
        tempoMs: 185,
        melody: [523, 659, 784, 659, 880, 784, 659, 587, 523, 587, 659, 784, 1046, 0, 784, 659],
        bass: [131, 0, 196, 0, 175, 0, 196, 0, 131, 0, 165, 0, 196, 0, 196, 0],
      },
      town: {
        tempoMs: 260,
        melody: [523, 587, 659, 784, 659, 587, 523, 0, 440, 523, 587, 659, 587, 523, 440, 0],
        bass: [131, 0, 196, 0, 165, 0, 196, 0, 175, 0, 220, 0, 196, 0, 147, 0],
      },
      route: {
        tempoMs: 175,
        melody: [587, 659, 784, 784, 880, 784, 659, 587, 659, 784, 880, 988, 880, 784, 659, 0],
        bass: [147, 147, 220, 0, 196, 196, 147, 0, 165, 165, 220, 0, 196, 0, 147, 0],
      },
      forest: {
        tempoMs: 220,
        melody: [440, 523, 494, 440, 392, 440, 523, 0, 494, 587, 523, 494, 440, 392, 330, 0],
        bass: [110, 0, 165, 0, 131, 0, 165, 0, 147, 0, 196, 0, 110, 0, 165, 0],
      },
      gym: {
        tempoMs: 165,
        melody: [440, 0, 440, 523, 587, 523, 440, 392, 440, 0, 587, 659, 784, 659, 587, 523],
        bass: [110, 110, 131, 147, 110, 110, 165, 147, 110, 110, 147, 165, 196, 165, 147, 131],
      },
      battle: {
        tempoMs: 135,
        melody: [659, 784, 880, 784, 659, 587, 659, 784, 988, 880, 784, 659, 587, 659, 784, 0],
        bass: [165, 165, 220, 165, 196, 196, 147, 196, 165, 165, 220, 196, 147, 165, 196, 147],
      },
      boss: {
        tempoMs: 120,
        melody: [587, 622, 587, 523, 587, 698, 784, 698, 880, 784, 698, 622, 587, 523, 466, 523],
        bass: [147, 147, 175, 147, 156, 156, 196, 156, 175, 175, 220, 175, 147, 131, 117, 131],
      },
    };

    const data = sequences[track];
    this.musicTimer = window.setInterval(() => {
      if (this.muted) return;
      if (!this.ctx || this.ctx.state !== 'running') return;
      const idx = this.stepIdx % data.melody.length;
      const m = data.melody[idx];
      const b = data.bass[idx];
      if (m > 0) this.playTone(m, (data.tempoMs / 1000) * 0.78, 'square', 0.022);
      if (b > 0) this.playTone(b, (data.tempoMs / 1000) * 0.85, 'triangle', 0.032);
      this.stepIdx++;
    }, data.tempoMs);
  }

  private stopMusicTimer(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

export const soundEngine = new SoundEngine();
