import { MoveData, MovePhysicsProfile } from '../../types/game';

export type MusicTrack = 'none' | 'intro' | 'title' | 'town' | 'route' | 'forest' | 'gym' | 'battle' | 'boss';

interface NoteStep {
  melody?: number;   // Hz
  harmony?: number;  // Hz
  bass?: number;     // Hz
  durBeats?: number; // note sustain multiplier
}

interface SongSpec {
  stepMs: number;
  loopPauseSteps: number; // natural breathing rest after full phrase (0 = continuous battle, >0 = peaceful ambient rest)
  maxAutoPlays: number;   // 1 = plays full fanfare once & rests peacefully; 0 = loops with rests
  steps: NoteStep[];
}

// Clean musical frequencies (C4..C6)
const N = {
  C3: 130.81, D3: 146.83, Eb3: 155.56, E3: 164.81, F3: 174.61, G3: 196.00, Ab3: 207.65, A3: 220.00, Bb3: 233.08, B3: 246.94,
  C4: 261.63, Cs4: 277.18, D4: 293.66, Eb4: 311.13, E4: 329.63, F4: 349.23, Fs4: 369.99, G4: 392.00, Ab4: 415.30, A4: 440.00, Bb4: 466.16, B4: 493.88,
  C5: 523.25, Cs5: 554.37, D5: 587.33, Eb5: 622.25, E5: 659.25, F5: 698.46, Fs5: 739.99, G5: 783.99, A5: 880.00, Bb5: 932.33, B5: 987.77, C6: 1046.5,
};

const SONGS: Record<Exclude<MusicTrack, 'none'>, SongSpec> = {
  intro: {
    stepMs: 210,
    loopPauseSteps: 0,
    maxAutoPlays: 1,
    steps: [
      { melody: N.G4, harmony: N.D4, bass: N.G3, durBeats: 1.8 },
      {},
      { melody: N.C5, harmony: N.G4, bass: N.C3, durBeats: 1.8 },
      {},
      { melody: N.D5, harmony: N.A4, bass: N.D3, durBeats: 1.8 },
      {},
      { melody: N.E5, harmony: N.B4, bass: N.E3, durBeats: 2.5 },
      {},
      { melody: N.F5, harmony: N.C5, bass: N.F3, durBeats: 1.6 },
      { melody: N.E5, harmony: N.C5, bass: N.F3 },
      { melody: N.D5, harmony: N.A4, bass: N.G3, durBeats: 1.8 },
      {},
      { melody: N.G5, harmony: N.C5, bass: N.C3, durBeats: 3.5 },
      {},
      {},
      {},
    ],
  },
  title: {
    stepMs: 240,
    loopPauseSteps: 20,
    maxAutoPlays: 2,
    steps: [
      // Heroic A-section
      { melody: N.C5, harmony: N.E4, bass: N.C3, durBeats: 1.6 },
      { melody: N.G4, harmony: N.E4 },
      { melody: N.E5, harmony: N.G4, bass: N.C3, durBeats: 1.5 },
      { melody: N.D5, harmony: N.G4 },
      { melody: N.C5, harmony: N.F4, bass: N.F3, durBeats: 1.8 },
      { melody: N.A4, harmony: N.F4 },
      { melody: N.G4, harmony: N.D4, bass: N.G3, durBeats: 2.2 },
      {},
      // B-section lift
      { melody: N.A4, harmony: N.E4, bass: N.A3, durBeats: 1.5 },
      { melody: N.C5, harmony: N.E4 },
      { melody: N.D5, harmony: N.F4, bass: N.D3, durBeats: 1.5 },
      { melody: N.E5, harmony: N.G4 },
      { melody: N.F5, harmony: N.A4, bass: N.F3, durBeats: 1.8 },
      { melody: N.D5, harmony: N.G4, bass: N.G3, durBeats: 1.6 },
      { melody: N.C5, harmony: N.E4, bass: N.C3, durBeats: 3.0 },
      {},
    ],
  },
  town: {
    stepMs: 310,
    loopPauseSteps: 28, // Peaceful Pallet Town cadence with gentle breathing silence!
    maxAutoPlays: 0,
    steps: [
      // Warm nostalgic A phrase (inspired by pastoral GBA hometowns)
      { melody: N.G5, harmony: N.B4, bass: N.G3, durBeats: 1.6 },
      { melody: N.Fs5, harmony: N.A4 },
      { melody: N.E5, harmony: N.G4, bass: N.E3, durBeats: 1.6 },
      { melody: N.D5, harmony: N.G4 },
      { melody: N.C5, harmony: N.E4, bass: N.C3, durBeats: 1.8 },
      { melody: N.D5, harmony: N.F4 },
      { melody: N.E5, harmony: N.G4, bass: N.G3, durBeats: 2.0 },
      {},
      { melody: N.A4, harmony: N.C4, bass: N.A3, durBeats: 1.6 },
      { melody: N.B4, harmony: N.D4 },
      { melody: N.C5, harmony: N.E4, bass: N.C3, durBeats: 1.6 },
      { melody: N.E5, harmony: N.G4 },
      { melody: N.D5, harmony: N.Fs4, bass: N.D3, durBeats: 2.4 },
      {},
      // Gentle B answer phrase
      { melody: N.B4, harmony: N.D4, bass: N.G3, durBeats: 1.5 },
      { melody: N.D5, harmony: N.G4 },
      { melody: N.G5, harmony: N.B4, bass: N.E3, durBeats: 1.7 },
      { melody: N.E5, harmony: N.G4 },
      { melody: N.C5, harmony: N.E4, bass: N.C3, durBeats: 1.6 },
      { melody: N.A4, harmony: N.E4 },
      { melody: N.B4, harmony: N.D4, bass: N.D3, durBeats: 1.8 },
      { melody: N.A4, harmony: N.Fs4 },
      { melody: N.G4, harmony: N.B3, bass: N.G3, durBeats: 3.2 },
      {},
    ],
  },
  route: {
    stepMs: 215,
    loopPauseSteps: 18,
    maxAutoPlays: 0,
    steps: [
      { melody: N.D5, harmony: N.Fs4, bass: N.D3, durBeats: 1.2 },
      { melody: N.E5 },
      { melody: N.Fs5, harmony: N.A4, bass: N.D3, durBeats: 1.5 },
      { melody: N.A5, harmony: N.D5, bass: N.A3 },
      { melody: N.G5, harmony: N.B4, bass: N.G3, durBeats: 1.4 },
      { melody: N.Fs5, harmony: N.A4 },
      { melody: N.E5, harmony: N.G4, bass: N.A3, durBeats: 1.8 },
      {},
      { melody: N.E5, harmony: N.G4, bass: N.A3, durBeats: 1.2 },
      { melody: N.Fs5 },
      { melody: N.G5, harmony: N.B4, bass: N.G3, durBeats: 1.5 },
      { melody: N.Fs5, harmony: N.A4, bass: N.D3 },
      { melody: N.E5, harmony: N.G4, bass: N.A3, durBeats: 1.4 },
      { melody: N.Cs5 ?? N.D5 },
      { melody: N.D5, harmony: N.Fs4, bass: N.D3, durBeats: 2.4 },
      {},
      // B phrase
      { melody: N.B4, harmony: N.D4, bass: N.G3, durBeats: 1.4 },
      { melody: N.D5, harmony: N.G4 },
      { melody: N.G5, harmony: N.B4, bass: N.G3, durBeats: 1.6 },
      { melody: N.Fs5, harmony: N.A4, bass: N.D3 },
      { melody: N.E5, harmony: N.G4, bass: N.E3, durBeats: 1.5 },
      { melody: N.Fs5, harmony: N.A4, bass: N.A3 },
      { melody: N.D5, harmony: N.Fs4, bass: N.D3, durBeats: 2.6 },
      {},
    ],
  },
  forest: {
    stepMs: 280,
    loopPauseSteps: 22,
    maxAutoPlays: 0,
    steps: [
      { melody: N.A4, harmony: N.C4, bass: N.A3, durBeats: 1.8 },
      { melody: N.C5 },
      { melody: N.E5, harmony: N.A4, bass: N.E3, durBeats: 1.8 },
      { melody: N.D5, harmony: N.F4, bass: N.D3 },
      { melody: N.C5, harmony: N.E4, bass: N.C3, durBeats: 1.6 },
      { melody: N.B4, harmony: N.E4 },
      { melody: N.A4, harmony: N.C4, bass: N.A3, durBeats: 2.4 },
      {},
      { melody: N.F4, harmony: N.A3, bass: N.F3, durBeats: 1.6 },
      { melody: N.A4 },
      { melody: N.C5, harmony: N.E4, bass: N.G3, durBeats: 1.6 },
      { melody: N.B4, harmony: N.D4 },
      { melody: N.G4, harmony: N.B3, bass: N.E3, durBeats: 1.8 },
      { melody: N.E4 },
      { melody: N.A4, harmony: N.C4, bass: N.A3, durBeats: 2.6 },
      {},
    ],
  },
  gym: {
    stepMs: 205,
    loopPauseSteps: 14,
    maxAutoPlays: 0,
    steps: [
      { melody: N.C5, harmony: N.E4, bass: N.C3, durBeats: 1.4 },
      {},
      { melody: N.G4, harmony: N.C4, bass: N.G3 },
      { melody: N.C5, harmony: N.E4, bass: N.C3 },
      { melody: N.E5, harmony: N.G4, bass: N.A3, durBeats: 1.6 },
      { melody: N.D5, harmony: N.F4, bass: N.D3 },
      { melody: N.C5, harmony: N.E4, bass: N.G3, durBeats: 1.6 },
      { melody: N.B4, harmony: N.D4 },
      { melody: N.A4, harmony: N.C4, bass: N.F3, durBeats: 1.5 },
      { melody: N.C5, harmony: N.E4 },
      { melody: N.D5, harmony: N.G4, bass: N.G3, durBeats: 1.6 },
      { melody: N.E5, harmony: N.G4 },
      { melody: N.G5, harmony: N.C5, bass: N.C3, durBeats: 2.4 },
      {},
      { melody: N.E5, harmony: N.G4, bass: N.G3, durBeats: 1.5 },
      { melody: N.D5, harmony: N.F4 },
    ],
  },
  battle: {
    stepMs: 168,
    loopPauseSteps: 8,
    maxAutoPlays: 0,
    steps: [
      // Energetic yet warm low-passed battle groove (32 steps = ~5.4s phrase + rest)
      { melody: N.E5, harmony: N.B4, bass: N.E3 },
      { melody: N.G5, bass: N.E3 },
      { melody: N.A5, harmony: N.E5, bass: N.A3, durBeats: 1.4 },
      { melody: N.G5, bass: N.A3 },
      { melody: N.Fs5, harmony: N.D5, bass: N.D3 },
      { melody: N.E5, bass: N.D3 },
      { melody: N.D5, harmony: N.A4, bass: N.G3, durBeats: 1.5 },
      { melody: N.B4, bass: N.G3 },
      { melody: N.C5, harmony: N.G4, bass: N.C3 },
      { melody: N.D5, bass: N.C3 },
      { melody: N.E5, harmony: N.B4, bass: N.E3, durBeats: 1.4 },
      { melody: N.G5, bass: N.E3 },
      { melody: N.Fs5, harmony: N.B4, bass: N.B3, durBeats: 1.8 },
      {},
      { melody: N.D5, harmony: N.A4, bass: N.B3 },
      { melody: N.E5, bass: N.B3 },
      // B-section
      { melody: N.A4, harmony: N.E4, bass: N.A3 },
      { melody: N.C5, bass: N.A3 },
      { melody: N.E5, harmony: N.A4, bass: N.A3, durBeats: 1.5 },
      { melody: N.D5, bass: N.G3 },
      { melody: N.B4, harmony: N.G4, bass: N.G3 },
      { melody: N.D5, bass: N.G3 },
      { melody: N.G5, harmony: N.B4, bass: N.E3, durBeats: 1.6 },
      { melody: N.Fs5, bass: N.D3 },
      { melody: N.E5, harmony: N.G4, bass: N.C3, durBeats: 1.4 },
      { melody: N.D5, bass: N.D3 },
      { melody: N.E5, harmony: N.B4, bass: N.E3, durBeats: 2.2 },
      {},
    ],
  },
  boss: {
    stepMs: 155,
    loopPauseSteps: 6,
    maxAutoPlays: 0,
    steps: [
      { melody: N.D5, harmony: N.A4, bass: N.D3 },
      { melody: N.F5, bass: N.D3 },
      { melody: N.A5, harmony: N.D5, bass: N.D3, durBeats: 1.4 },
      { melody: N.G5, bass: N.C3 },
      { melody: N.F5, harmony: N.C5, bass: N.Bb3 },
      { melody: N.E5, bass: N.A3 },
      { melody: N.D5, harmony: N.A4, bass: N.D3, durBeats: 1.6 },
      { melody: N.C5, bass: N.C3 },
      { melody: N.Bb4, harmony: N.F4, bass: N.Bb3 },
      { melody: N.D5, bass: N.Bb3 },
      { melody: N.F5, harmony: N.A4, bass: N.G3, durBeats: 1.4 },
      { melody: N.G5, bass: N.G3 },
      { melody: N.A5, harmony: N.E5, bass: N.A3, durBeats: 2.0 },
      {},
      { melody: N.G5, harmony: N.C5, bass: N.A3 },
      { melody: N.E5, bass: N.A3 },
      // Climax answer
      { melody: N.F5, harmony: N.C5, bass: N.F3, durBeats: 1.4 },
      { melody: N.G5, bass: N.F3 },
      { melody: N.A5, harmony: N.C5, bass: N.C3, durBeats: 1.5 },
      { melody: N.Bb5, bass: N.Bb3 },
      { melody: N.A5, harmony: N.E5, bass: N.A3, durBeats: 1.4 },
      { melody: N.G5, bass: N.G3 },
      { melody: N.F5, harmony: N.A4, bass: N.D3, durBeats: 1.4 },
      { melody: N.E5, bass: N.A3 },
      { melody: N.D5, harmony: N.A4, bass: N.D3, durBeats: 2.4 },
      {},
    ],
  },
};

/**
 * Warm, low-pass-filtered Web Audio API synthesizer with gentle stereo reverb tail,
 * multi-voice structured music tracks (that breathe naturally instead of droning forever),
 * independent BGM & SFX toggles, and tactile elemental move SFX.
 */
export class SoundEngine {
  private ctx: AudioContext | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private musicEnabled = true;
  private sfxEnabled = true;
  private currentTrack: MusicTrack = 'none';
  private musicTimer: number | null = null;
  private stepIdx = 0;
  private pauseCountdown = 0;
  private playCount = 0;

  private ensureAudio(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();

      // Master compressor -> prevents clipping or harsh peaks
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.ratio.value = 4;
      comp.connect(this.ctx.destination);

      // Warm low-pass filter + subtle cozy echo on Music Bus so it NEVER sounds grating!
      const musicLP = this.ctx.createBiquadFilter();
      musicLP.type = 'lowpass';
      musicLP.frequency.value = 1950;
      musicLP.Q.value = 0.7;

      const delay = this.ctx.createDelay(0.4);
      delay.delayTime.value = 0.19;
      const delayFb = this.ctx.createGain();
      delayFb.gain.value = 0.16;
      const delayWet = this.ctx.createGain();
      delayWet.gain.value = 0.14;

      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = this.musicEnabled ? 0.32 : 0;
      this.musicBus.connect(musicLP);
      musicLP.connect(comp);
      musicLP.connect(delay);
      delay.connect(delayFb);
      delayFb.connect(delay);
      delay.connect(delayWet);
      delayWet.connect(comp);

      // Warm SFX bus
      const sfxLP = this.ctx.createBiquadFilter();
      sfxLP.type = 'lowpass';
      sfxLP.frequency.value = 3800;
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = this.sfxEnabled ? 0.55 : 0;
      this.sfxBus.connect(sfxLP);
      sfxLP.connect(comp);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    if (!this.noiseBuffer && this.ctx) {
      const len = this.ctx.sampleRate * 1.4;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      // Pink-ish warm noise (much smoother & more natural than raw white static!)
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.997 * b0 + white * 0.029;
        b1 = 0.985 * b1 + white * 0.032;
        b2 = 0.950 * b2 + white * 0.048;
        data[i] = Math.max(-1, Math.min(1, (b0 + b1 + b2 + white * 0.18) * 1.4));
      }
      this.noiseBuffer = buf;
    }

    return this.ctx;
  }

  public isMuted(): boolean {
    return !this.musicEnabled && !this.sfxEnabled;
  }

  public isMusicEnabled(): boolean {
    return this.musicEnabled;
  }

  public isSfxEnabled(): boolean {
    return this.sfxEnabled;
  }

  public toggleMute(): boolean {
    const turningOn = this.isMuted();
    this.musicEnabled = turningOn;
    this.sfxEnabled = turningOn;
    this.syncBusGains();
    return this.isMuted();
  }

  public toggleMusic(): boolean {
    this.musicEnabled = !this.musicEnabled;
    this.syncBusGains();
    if (this.musicEnabled && this.currentTrack !== 'none' && this.musicTimer === null) {
      const t = this.currentTrack;
      this.currentTrack = 'none';
      this.playMusic(t);
    }
    return this.musicEnabled;
  }

  public toggleSfx(): boolean {
    this.sfxEnabled = !this.sfxEnabled;
    this.syncBusGains();
    return this.sfxEnabled;
  }

  private syncBusGains(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.musicBus) {
      this.musicBus.gain.setTargetAtTime(this.musicEnabled ? 0.32 : 0, now, 0.04);
    }
    if (this.sfxBus) {
      this.sfxBus.gain.setTargetAtTime(this.sfxEnabled ? 0.55 : 0, now, 0.02);
    }
  }

  private playWarmVoice(
    bus: 'music' | 'sfx',
    freq: number,
    duration: number,
    type: OscillatorType,
    peakGain: number,
    delay = 0,
    endFreq?: number,
    attack = 0.02
  ): void {
    if (bus === 'music' && !this.musicEnabled) return;
    if (bus === 'sfx' && !this.sfxEnabled) return;
    const ctx = this.ensureAudio();
    if (!ctx) return;
    const dest = bus === 'music' ? this.musicBus : this.sfxBus;
    if (!dest) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(45, freq), now);
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(45, endFreq), now + duration);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peakGain, now + Math.min(attack, duration * 0.4));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + duration + 0.03);
  }

  private playWarmNoise(
    duration: number,
    filterType: BiquadFilterType,
    startFreq: number,
    endFreq: number,
    peakGain: number,
    delay = 0
  ): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureAudio();
    if (!ctx || !this.noiseBuffer || !this.sfxBus) return;
    const now = ctx.currentTime + delay;

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(Math.max(70, startFreq), now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(70, endFreq), now + duration);
    filter.Q.value = 1.1;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peakGain, now + Math.min(0.06, duration * 0.25));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxBus);
    src.start(now);
    src.stop(now + duration + 0.04);
  }

  // === TACTILE, PLEASANT GBA UI & RPG SFX ===

  public playBlip(): void {
    this.playWarmVoice('sfx', 540, 0.055, 'triangle', 0.14, 0, 680, 0.008);
  }

  public playConfirm(): void {
    this.playWarmVoice('sfx', 523.25, 0.065, 'triangle', 0.15, 0, undefined, 0.008);
    this.playWarmVoice('sfx', 783.99, 0.09, 'sine', 0.16, 0.055, undefined, 0.008);
  }

  public playFootstep(surface: 'normal' | 'water' | 'fire' | 'ice' = 'normal'): void {
    if (surface === 'water') {
      this.playWarmNoise(0.11, 'bandpass', 900, 450, 0.14);
    } else if (surface === 'ice') {
      this.playWarmVoice('sfx', 1120, 0.08, 'sine', 0.09, 0, 1480, 0.01);
    } else if (surface === 'fire') {
      this.playWarmNoise(0.14, 'bandpass', 1100, 380, 0.16);
    } else {
      this.playWarmVoice('sfx', 180, 0.05, 'triangle', 0.1, 0, 110, 0.005);
    }
  }

  public playEncounterStinger(): void {
    // Classic punchy ascending GBA encounter sweep (warm & exciting, never piercing!)
    const notes = [330, 392, 494, 587, 659, 784];
    notes.forEach((f, i) => {
      this.playWarmVoice('sfx', f, 0.12, 'triangle', 0.16, i * 0.065, f * 1.04, 0.01);
    });
    this.playWarmVoice('sfx', 165, 0.35, 'sine', 0.2, 0.35, 110, 0.02);
  }

  public playHealJingle(): void {
    const notes = [N.B4, N.B4, N.B4, N.G4, N.E5];
    const times = [0, 0.15, 0.3, 0.45, 0.6];
    notes.forEach((f, i) => {
      this.playWarmVoice('sfx', f, 0.18, 'sine', 0.22, times[i], undefined, 0.015);
      this.playWarmVoice('sfx', f * 0.5, 0.18, 'triangle', 0.09, times[i], undefined, 0.015);
    });
  }

  public playLevelUp(): void {
    const notes = [N.C5, N.E5, N.G5, N.C6];
    notes.forEach((f, i) => {
      this.playWarmVoice('sfx', f, i === 3 ? 0.38 : 0.12, 'triangle', 0.18, i * 0.095, undefined, 0.012);
    });
  }

  public playEvolutionFanfare(): void {
    const seq = [N.G4, N.A4, N.B4, N.C5, N.D5, N.E5, N.G5, N.C6];
    seq.forEach((f, i) => {
      this.playWarmVoice('sfx', f, i === seq.length - 1 ? 0.55 : 0.12, 'triangle', 0.18, i * 0.1, undefined, 0.012);
      this.playWarmVoice('sfx', f * 0.5, 0.16, 'sine', 0.1, i * 0.1, undefined, 0.015);
    });
  }

  public playPokeballThrow(): void {
    this.playWarmVoice('sfx', 290, 0.22, 'sine', 0.14, 0, 620, 0.015);
  }

  public playPokeballOpen(): void {
    this.playWarmVoice('sfx', 480, 0.12, 'triangle', 0.14, 0, 880, 0.01);
    this.playWarmNoise(0.14, 'bandpass', 1400, 600, 0.12, 0.03);
  }

  public playPokeballShake(): void {
    this.playWarmVoice('sfx', 240, 0.08, 'triangle', 0.14, 0, 170, 0.01);
    this.playWarmVoice('sfx', 320, 0.07, 'sine', 0.1, 0.09, 240, 0.01);
  }

  public playCatchSuccess(): void {
    const notes = [N.C5, N.E5, N.G5, N.E5, N.C6];
    const times = [0, 0.11, 0.22, 0.36, 0.48];
    notes.forEach((f, i) =>
      this.playWarmVoice('sfx', f, i === 4 ? 0.42 : 0.11, 'triangle', 0.18, times[i], undefined, 0.012)
    );
  }

  public playHit(effectiveness: number, scaleFactor = 0.5): void {
    const bass = 130 - scaleFactor * 48;
    if (effectiveness >= 2) {
      this.playWarmVoice('sfx', 240, 0.16, 'triangle', 0.22, 0, 82, 0.008);
      this.playWarmNoise(0.24, 'lowpass', 720, 160, 0.22 + scaleFactor * 0.12);
    } else if (effectiveness < 1) {
      this.playWarmVoice('sfx', 190, 0.09, 'sine', 0.14, 0, 130, 0.01);
    } else {
      this.playWarmVoice('sfx', bass + 95, 0.12, 'triangle', 0.18, 0, bass, 0.008);
      this.playWarmNoise(0.14, 'lowpass', 620, 180, 0.15 + scaleFactor * 0.08);
    }
  }

  /**
   * Warm, rich, dynamically scaled elemental SFX (ocean swells, roaring fire,
   * resonant thunder, shimmering ice, seismic rumbles).
   */
  public playMoveSfx(move: MoveData, profile: MovePhysicsProfile): void {
    const s = profile.scaleFactor;
    const w = profile.audioBassWeight;
    const arch = move.archetype;

    if (arch === 'surf_wave' || arch === 'water_jet') {
      this.playWarmNoise(0.62 + s * 0.42, 'bandpass', 360 + (1 - s) * 420, 920 + s * 750, 0.18 + w * 0.18);
      this.playWarmNoise(0.5 + s * 0.35, 'lowpass', 620, 130, 0.16 + w * 0.18, 0.32);
      if (s >= 0.4) {
        this.playWarmVoice('sfx', 115 - s * 38, 0.55, 'sine', 0.18 + s * 0.1, 0.24, 52, 0.05);
      }
    } else if (arch === 'flamethrower' || arch === 'fire_blast' || arch === 'ember') {
      this.playWarmNoise(0.52 + s * 0.45, 'bandpass', 950 - s * 380, 260, 0.18 + w * 0.18);
      this.playWarmVoice('sfx', 140 - s * 48, 0.48 + s * 0.35, 'triangle', 0.12 + s * 0.1, 0.03, 62, 0.04);
      if (s >= 0.6) {
        this.playWarmNoise(0.42, 'lowpass', 380, 95, 0.22, 0.28);
      }
    } else if (arch === 'electric_bolt' || arch === 'thunder_strike') {
      const arcs = Math.round(2 + s * 4);
      for (let i = 0; i < arcs; i++) {
        this.playWarmVoice('sfx', 880 + Math.random() * 440, 0.06, 'triangle', 0.13, i * 0.048, 280, 0.005);
      }
      this.playWarmNoise(0.36 + s * 0.38, 'lowpass', 760, 95, 0.22 + w * 0.18, 0.15);
    } else if (arch === 'ice_beam' || arch === 'blizzard') {
      const chimes = [N.E5, N.G5, N.B5, N.C6];
      chimes.forEach((f, i) => this.playWarmVoice('sfx', f, 0.18, 'sine', 0.12, i * 0.055, f * 1.06, 0.01));
      this.playWarmNoise(0.45 + s * 0.28, 'bandpass', 1800, 950, 0.11 + s * 0.08);
    } else if (arch === 'rock_throw' || arch === 'earthquake') {
      this.playWarmVoice('sfx', 115 - s * 35, 0.55 + s * 0.3, 'triangle', 0.22 + s * 0.1, 0, 46, 0.015);
      this.playWarmNoise(0.52 + s * 0.32, 'lowpass', 460, 85, 0.24 + s * 0.14, 0.06);
    } else if (arch === 'vine_whip' || arch === 'razor_leaf' || arch === 'solar_beam') {
      this.playWarmVoice('sfx', 440, 0.16, 'triangle', 0.14, 0, 720, 0.01);
      this.playWarmNoise(0.32 + s * 0.22, 'bandpass', 1350, 680, 0.12 + s * 0.08, 0.06);
    } else if (arch === 'wind_gust') {
      this.playWarmNoise(0.55 + s * 0.25, 'bandpass', 480, 1150, 0.18 + s * 0.12);
    } else if (arch === 'psychic_wave') {
      this.playWarmVoice('sfx', 420, 0.42, 'sine', 0.16, 0, 760, 0.03);
      this.playWarmVoice('sfx', 630, 0.42, 'sine', 0.12, 0.05, 360, 0.03);
    } else {
      this.playWarmVoice('sfx', 240 + s * 60, 0.14, 'triangle', 0.15, 0, 120, 0.01);
    }
  }

  public playMusic(track: MusicTrack): void {
    if (this.currentTrack === track && this.musicTimer !== null) return;
    this.currentTrack = track;
    this.stopMusicTimer();
    if (!this.musicEnabled || track === 'none' || typeof window === 'undefined') return;

    const spec = SONGS[track];
    this.stepIdx = 0;
    this.pauseCountdown = 0;
    this.playCount = 0;

    this.musicTimer = window.setInterval(() => {
      if (!this.musicEnabled || !this.ctx || this.ctx.state !== 'running') return;

      if (this.pauseCountdown > 0) {
        this.pauseCountdown--;
        return;
      }

      const step = spec.steps[this.stepIdx];
      const beatSec = spec.stepMs / 1000;
      const dur = beatSec * (step.durBeats ?? 0.92);

      if (step.melody) {
        // Warm soft-attack triangle lead + delicate sine undertone
        this.playWarmVoice('music', step.melody, dur, 'triangle', 0.15, 0, undefined, 0.025);
        this.playWarmVoice('music', step.melody * 0.5, dur * 0.9, 'sine', 0.055, 0, undefined, 0.03);
      }
      if (step.harmony) {
        this.playWarmVoice('music', step.harmony, dur * 1.15, 'sine', 0.08, 0, undefined, 0.04);
      }
      if (step.bass) {
        this.playWarmVoice('music', step.bass, dur * 1.1, 'sine', 0.16, 0, undefined, 0.02);
      }

      this.stepIdx++;
      if (this.stepIdx >= spec.steps.length) {
        this.stepIdx = 0;
        this.playCount++;
        if (spec.maxAutoPlays > 0 && this.playCount >= spec.maxAutoPlays) {
          this.stopMusicTimer();
          return;
        }
        if (spec.loopPauseSteps > 0) {
          this.pauseCountdown = spec.loopPauseSteps;
        }
      }
    }, spec.stepMs);
  }

  private stopMusicTimer(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

export const soundEngine = new SoundEngine();
