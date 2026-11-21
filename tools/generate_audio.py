#!/usr/bin/env python3
"""
Studio-Quality Polyphonic DSP Soundtrack (OST) & Sound Effects Synthesizer for:
    AURALIS: The Prism-Tide Firmament (Minecraft Bedrock Edition)

Generates 4 full-length stereo original soundtrack pieces and 25 bespoke SFX,
encoded cleanly to Ogg Vorbis (.ogg) via ffmpeg/libvorbis, plus writes
sound_definitions.json, music_definitions.json, sounds.json, and blocks.json.
"""

import json
import math
import subprocess
import tempfile
import wave
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
RP_ROOT = ROOT / "packs" / "RP"
MUSIC_DIR = RP_ROOT / "sounds" / "music" / "auralis"
SFX_DIR = RP_ROOT / "sounds" / "auralis"
MUSIC_DIR.mkdir(parents=True, exist_ok=True)
SFX_DIR.mkdir(parents=True, exist_ok=True)

SR = 44100


def midi_to_hz(m):
    return 440.0 * (2.0 ** ((m - 69.0) / 12.0))


def save_ogg(samples_lr, out_path: Path, quality="5"):
    """Master-normalize stereo or mono float32 array and encode via ffmpeg libvorbis."""
    arr = np.asarray(samples_lr, dtype=np.float64)
    if arr.ndim == 1:
        arr = np.stack([arr, arr], axis=1)
    # Gentle soft-clipping saturator + -1.5 dBFS normalization
    peak = np.max(np.abs(arr))
    if peak > 1e-6:
        arr = np.tanh(arr / max(peak, 0.95) * 1.15)
        arr = arr / (np.max(np.abs(arr)) + 1e-9) * 0.84
    pcm = np.clip(arr * 32767.0, -32767, 32767).astype(np.int16)

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tf:
        wav_path = Path(tf.name)
    try:
        with wave.open(str(wav_path), "wb") as wf:
            wf.setnchannels(2)
            wf.setsampwidth(2)
            wf.setframerate(SR)
            wf.writeframes(pcm.tobytes())
        subprocess.run(
            [
                "ffmpeg", "-y", "-loglevel", "error",
                "-i", str(wav_path),
                "-c:a", "libvorbis", "-q:a", str(quality),
                str(out_path),
            ],
            check=True,
        )
    finally:
        wav_path.unlink(missing_ok=True)


def add_stereo(buf, mono, start_sec, pan=0.0, gain=1.0):
    """Mix mono signal into stereo buffer buf[N, 2] with equal-power panning (-1..1)."""
    idx = int(start_sec * SR)
    if idx >= buf.shape[0] or len(mono) == 0:
        return
    end = min(buf.shape[0], idx + len(mono))
    seg = mono[: end - idx] * gain
    angle = (pan + 1.0) * (math.pi * 0.25)
    buf[idx:end, 0] += seg * math.cos(angle)
    buf[idx:end, 1] += seg * math.sin(angle)


def lowpass_1pole(x, cutoff_hz):
    """Fast vectorized FFT-based smooth lowpass filter (zero-phase, super lush!)."""
    n = len(x)
    if n < 8:
        return x
    freqs = np.fft.rfftfreq(n, 1.0 / SR)
    resp = 1.0 / np.sqrt(1.0 + (freqs / max(20.0, cutoff_hz)) ** 4)
    return np.fft.irfft(np.fft.rfft(x) * resp, n=n)


def bandpass_fft(x, lo_hz, hi_hz):
    n = len(x)
    freqs = np.fft.rfftfreq(n, 1.0 / SR)
    hp = 1.0 / np.sqrt(1.0 + (max(10.0, lo_hz) / (freqs + 1e-6)) ** 4)
    lp = 1.0 / np.sqrt(1.0 + (freqs / max(lo_hz + 20.0, hi_hz)) ** 4)
    return np.fft.irfft(np.fft.rfft(x) * hp * lp, n=n)


def apply_shimmer_reverb(stereo, wet=0.42, shimmer=0.16, decay=0.68):
    """Lush stereo cathedral hall reverb + subtle +1 octave ethereal shimmer tail."""
    n = stereo.shape[0]
    out_l = stereo[:, 0].copy()
    out_r = stereo[:, 1].copy()

    # Multi-tap golden-ratio diffused delay network (in ms)
    taps_l = [(29, 0.34), (67, 0.28), (113, 0.24), (179, 0.20), (263, 0.17), (373, 0.13), (521, 0.10), (719, 0.07)]
    taps_r = [(37, 0.34), (79, 0.28), (131, 0.24), (199, 0.20), (293, 0.17), (409, 0.13), (569, 0.10), (761, 0.07)]

    rev_l = np.zeros(n, dtype=np.float64)
    rev_r = np.zeros(n, dtype=np.float64)
    src_l = lowpass_1pole(stereo[:, 0], 4200.0)
    src_r = lowpass_1pole(stereo[:, 1], 4200.0)

    # First diffusion pass (cross-channel for rich stereo width)
    for ms, g in taps_l:
        d = int(ms * SR / 1000.0)
        if d < n:
            rev_l[d:] += (0.7 * src_l[:-d] + 0.3 * src_r[:-d]) * g * decay
    for ms, g in taps_r:
        d = int(ms * SR / 1000.0)
        if d < n:
            rev_r[d:] += (0.7 * src_r[:-d] + 0.3 * src_l[:-d]) * g * decay

    # Second late-tail pass (warmer, darker cathedral bloom)
    late_l = lowpass_1pole(rev_l, 2400.0)
    late_r = lowpass_1pole(rev_r, 2400.0)
    for ms, g in [(241, 0.38), (467, 0.28), (823, 0.18), (1217, 0.11)]:
        d = int(ms * SR / 1000.0)
        if d < n:
            rev_l[d:] += late_r[:-d] * g * decay
            rev_r[d:] += late_l[:-d] * g * decay

    # Ethereal +1 octave shimmer send (time-compressed overlapping harmonic lift)
    if shimmer > 0.0:
        mono_hi = bandpass_fft((rev_l + rev_r) * 0.5, 260.0, 2200.0)
        half = mono_hi[::2]
        # Tile/crossfade octave-up shimmer gently behind delayed reverb
        shim = np.zeros(n, dtype=np.float64)
        shift_d = int(0.32 * SR)
        seg_len = min(len(half), n - shift_d)
        if seg_len > 0:
            shim[shift_d : shift_d + seg_len] += half[:seg_len] * 0.65
        shift_d2 = int(0.68 * SR)
        seg_len2 = min(len(half), n - shift_d2)
        if seg_len2 > 0:
            shim[shift_d2 : shift_d2 + seg_len2] += half[:seg_len2] * 0.45
        shim = lowpass_1pole(shim, 5200.0)
        rev_l += shim * shimmer
        rev_r += np.roll(shim, int(0.017 * SR)) * shimmer

    res = np.stack([out_l * (1.0 - wet * 0.25) + rev_l * wet, out_r * (1.0 - wet * 0.25) + rev_r * wet], axis=1)
    return res


# =============================================================================
# EXPRESSIVE INSTRUMENT VOICES
# =============================================================================

def synth_harp(midi_note, dur=3.2, vel=0.7):
    """Warm celestial concert harp pluck with harmonic damping."""
    f0 = midi_to_hz(midi_note)
    n = int(dur * SR)
    t = np.arange(n) / SR
    sig = np.zeros(n, dtype=np.float64)
    partials = [(1.0, 1.0, 1.35), (2.0, 0.48, 2.3), (3.0, 0.24, 3.6), (4.0, 0.12, 5.2), (5.0, 0.055, 7.2)]
    for mult, amp, dec in partials:
        if f0 * mult < 14000:
            sig += amp * np.sin(2.0 * math.pi * f0 * mult * t) * np.exp(-t * dec)
    # Soft finger pluck attack
    atk = np.minimum(1.0, t / 0.008)
    rel = np.minimum(1.0, np.maximum(0.0, (dur - t) / 0.15))
    return sig * atk * rel * vel


def synth_celesta(midi_note, dur=3.6, vel=0.65):
    """Luminous sea-glass celesta / crystalline bell with shimmering glass overtones."""
    f0 = midi_to_hz(midi_note)
    n = int(dur * SR)
    t = np.arange(n) / SR
    sig = (
        1.00 * np.sin(2 * math.pi * f0 * t) * np.exp(-t * 1.15)
        + 0.34 * np.sin(2 * math.pi * f0 * 2.001 * t) * np.exp(-t * 2.1)
        + 0.14 * np.sin(2 * math.pi * f0 * 2.998 * t) * np.exp(-t * 3.4)
        + 0.09 * np.sin(2 * math.pi * f0 * 4.004 * t) * np.exp(-t * 4.8)
        + 0.04 * np.sin(2 * math.pi * f0 * 5.42 * t) * np.exp(-t * 8.5)
    )
    atk = np.minimum(1.0, t / 0.005)
    rel = np.minimum(1.0, np.maximum(0.0, (dur - t) / 0.2))
    return sig * atk * rel * vel


def synth_pad_chord(buf, midi_notes, start_sec, dur, gain=0.18, brightness=1600.0):
    """Lush stereophonic ethereal choir/string pad chord with slow swelling motion."""
    n = int((dur + 2.5) * SR)
    t = np.arange(n) / SR
    left = np.zeros(n, dtype=np.float64)
    right = np.zeros(n, dtype=np.float64)
    # Smooth bell-shaped swell envelope
    atk = np.clip(t / min(1.8, dur * 0.32), 0.0, 1.0)
    atk = atk * atk * (3.0 - 2.0 * atk)
    rel = np.clip((dur + 2.2 - t) / 2.4, 0.0, 1.0)
    rel = rel * rel * (3.0 - 2.0 * rel)
    env = atk * rel

    for idx_n, m in enumerate(midi_notes):
        f0 = midi_to_hz(m)
        # 4 gently detuned voices for lush choral chorus width
        detunes = [(-0.0032, -0.65), (-0.0011, 0.25), (0.0013, -0.25), (0.0035, 0.65)]
        vib = 1.0 + 0.0022 * np.sin(2 * math.pi * (0.24 + idx_n * 0.05) * t + idx_n)
        for dt, pan in detunes:
            f = f0 * (1.0 + dt) * vib
            phase = 2.0 * math.pi * np.cumsum(f) / SR
            voice = (
                1.00 * np.sin(phase)
                + 0.42 * np.sin(2.0 * phase)
                + 0.20 * np.sin(3.0 * phase)
                + 0.09 * np.sin(4.0 * phase)
                + 0.04 * np.sin(5.0 * phase)
            )
            ang = (pan + 1.0) * (math.pi * 0.25)
            left += voice * math.cos(ang)
            right += voice * math.sin(ang)

    scale = gain / max(1.0, len(midi_notes) * 2.2)
    left = lowpass_1pole(left * env * scale, brightness)
    right = lowpass_1pole(right * env * scale, brightness)

    idx = int(start_sec * SR)
    end = min(buf.shape[0], idx + n)
    if idx < buf.shape[0]:
        buf[idx:end, 0] += left[: end - idx]
        buf[idx:end, 1] += right[: end - idx]


def synth_cello(midi_note, dur=4.5, vel=0.35):
    """Warm expressive bowed cello / glass-bass voice."""
    f0 = midi_to_hz(midi_note)
    n = int(dur * SR)
    t = np.arange(n) / SR
    vib = 1.0 + 0.0038 * np.sin(2 * math.pi * 4.4 * t) * np.clip(t / 1.0, 0.0, 1.0)
    phase = 2.0 * math.pi * np.cumsum(f0 * vib) / SR
    sig = np.zeros(n, dtype=np.float64)
    for k in range(1, 9):
        sig += (1.0 / (k ** 1.35)) * np.sin(k * phase)
    atk = np.clip(t / min(0.65, dur * 0.25), 0.0, 1.0)
    rel = np.clip((dur - t) / min(0.85, dur * 0.3), 0.0, 1.0)
    return lowpass_1pole(sig * atk * rel, 1350.0) * vel


def synth_bowl(midi_note, dur=7.0, vel=0.32):
    """Deep luminous crystal singing-bowl / cathedral chime resonance."""
    f0 = midi_to_hz(midi_note)
    n = int(dur * SR)
    t = np.arange(n) / SR
    sig = (
        0.85 * np.sin(2 * math.pi * f0 * t) * np.exp(-t * 0.42)
        + 0.45 * np.sin(2 * math.pi * f0 * 1.0025 * t) * np.exp(-t * 0.46)
        + 0.22 * np.sin(2 * math.pi * f0 * 2.756 * t) * np.exp(-t * 0.85)
        + 0.08 * np.sin(2 * math.pi * f0 * 5.11 * t) * np.exp(-t * 1.65)
    )
    atk = np.clip(t / 0.14, 0.0, 1.0)
    rel = np.clip((dur - t) / 0.6, 0.0, 1.0)
    return sig * atk * rel * vel


def synth_taiko(dur=0.65, pitch=72.0, vel=0.65):
    """Deep cinematic orchestral taiko / timpani drum boom."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    freq = pitch * (1.0 + 1.45 * np.exp(-t * 36.0))
    phase = 2.0 * math.pi * np.cumsum(freq) / SR
    body = np.sin(phase) * np.exp(-t * 5.8) + 0.35 * np.sin(1.52 * phase) * np.exp(-t * 9.5)
    rng = np.random.default_rng(1337)
    click = lowpass_1pole(rng.standard_normal(n), 900.0) * np.exp(-t * 65.0) * 0.45
    return (body + click) * vel


def synth_brass(midi_note, dur=1.4, vel=0.38):
    """Soaring radiant golden brass-choir lead for boss theme."""
    f0 = midi_to_hz(midi_note)
    n = int(dur * SR)
    t = np.arange(n) / SR
    vib = 1.0 + 0.004 * np.sin(2 * math.pi * 5.2 * t) * np.clip(t / 0.35, 0.0, 1.0)
    sig = np.zeros(n, dtype=np.float64)
    for dt in (-0.003, 0.0, 0.0032):
        phase = 2.0 * math.pi * np.cumsum(f0 * (1.0 + dt) * vib) / SR
        for k in range(1, 8):
            sig += (1.0 / (k ** 1.1)) * np.sin(k * phase)
    atk = np.clip(t / 0.085, 0.0, 1.0)
    rel = np.clip((dur - t) / 0.22, 0.0, 1.0)
    return lowpass_1pole(sig * atk * rel, 2400.0) * (vel / 3.0)


# =============================================================================
# 1. FOUR FULL-LENGTH ORIGINAL OST TRACKS
# =============================================================================

def compose_glass_horizon():
    """OST 1: 'Glass Horizon' — Main Auralis Exploration Theme (68s, D Lydian, 66 BPM)."""
    total_sec = 68.0
    buf = np.zeros((int(total_sec * SR), 2), dtype=np.float64)
    beat = 60.0 / 66.0  # ~0.909s

    # Lush D Lydian progression (8 bars each section, 4 beats/bar)
    chords = [
        # Intro shimmer (bars 0-3)
        (0, 8, [50, 57, 61, 64, 66], 0.16, 1300),    # Dmaj9
        (8, 8, [52, 59, 64, 66, 68], 0.17, 1500),    # Eadd9/D-feel (Lydian G#!)
        # Section A (bars 4-11)
        (16, 4, [50, 57, 62, 66, 69], 0.20, 1750),   # Dmaj7
        (20, 4, [52, 59, 64, 68, 71], 0.20, 1850),   # E/D Lydian lift
        (24, 4, [54, 61, 64, 69, 73], 0.20, 1750),   # F#m11
        (28, 4, [45, 57, 61, 64, 71], 0.19, 1650),   # Aadd9
        # Section B — soaring emotional lift (bars 12-19)
        (32, 4, [47, 54, 59, 62, 66], 0.22, 1950),   # Bm9
        (36, 4, [43, 55, 59, 62, 66], 0.22, 2000),   # Gmaj7
        (40, 4, [50, 57, 62, 66, 68], 0.23, 2100),   # D Lydian #11 bloom!
        (44, 4, [45, 52, 57, 61, 64], 0.21, 1800),   # A9
        # Section C — tender return & sunset fade (bars 20-27)
        (48, 4, [50, 57, 61, 64, 66], 0.20, 1650),   # Dmaj9
        (52, 4, [52, 59, 64, 68, 71], 0.18, 1550),   # Eadd9
        (56, 8, [50, 57, 62, 66, 73], 0.17, 1250),   # Dmaj9 serene resolve
    ]
    for b_start, b_len, notes, gain, bright in chords:
        synth_pad_chord(buf, notes, b_start * beat, b_len * beat, gain=gain, brightness=bright)
        # Warm singing-bowl accent on key harmonic pillars
        if b_start in (0, 16, 32, 48, 56):
            add_stereo(buf, synth_bowl(notes[0] + 12, dur=7.5, vel=0.20), b_start * beat, pan=-0.15)

    # Flowing Concert Harp arpeggios from bar 2 through bar 25
    arp_map = {
        (8, 16): [62, 66, 68, 71, 73, 76, 73, 71],
        (16, 20): [62, 66, 69, 73, 74, 78, 73, 69],
        (20, 24): [64, 68, 71, 73, 76, 80, 76, 71],
        (24, 28): [61, 66, 69, 73, 76, 78, 73, 69],
        (28, 32): [57, 61, 64, 69, 71, 76, 73, 69],
        (32, 36): [59, 62, 66, 69, 73, 74, 73, 66],
        (36, 40): [55, 59, 62, 66, 71, 74, 71, 66],
        (40, 44): [62, 66, 68, 73, 74, 78, 80, 78],
        (44, 48): [57, 61, 64, 69, 73, 76, 73, 69],
        (48, 52): [62, 66, 69, 73, 76, 78, 73, 69],
        (52, 56): [64, 68, 71, 76, 78, 80, 76, 71],
        (56, 62): [62, 66, 69, 73, 74, 78, 81, 86],
    }
    for (b0, b1), seq in arp_map.items():
        steps = int((b1 - b0) * 2)
        for s in range(steps):
            note = seq[s % len(seq)]
            t_sec = (b0 + s * 0.5) * beat
            pan = -0.35 + 0.7 * ((s % 8) / 7.0)
            vel = 0.26 * (0.88 + 0.12 * math.sin(s * 0.9))
            if b0 >= 56:
                vel *= max(0.2, 1.0 - s / max(1, steps))
            add_stereo(buf, synth_harp(note, dur=2.8, vel=vel), t_sec, pan=pan)

    # Signature Glass-Celesta Melody (unforgettable lyrical Lydian motif!)
    melody = [
        # Intro gentle question
        (4.0, 78, 2.5, 0.22), (6.0, 80, 2.5, 0.24), (7.0, 81, 3.0, 0.26), (10.0, 76, 3.5, 0.22),
        # Section A main theme
        (16.0, 78, 2.2, 0.34), (17.5, 81, 1.8, 0.32), (18.5, 80, 2.4, 0.34), (19.5, 78, 2.0, 0.30),
        (20.5, 76, 2.8, 0.34), (22.0, 73, 2.4, 0.28), (23.0, 76, 2.5, 0.32),
        (24.0, 78, 2.2, 0.34), (25.5, 81, 2.0, 0.34), (26.5, 85, 2.8, 0.38), (28.0, 83, 2.6, 0.34),
        (29.5, 81, 2.2, 0.30), (30.5, 76, 3.2, 0.28),
        # Section B soaring ascent
        (32.0, 83, 2.2, 0.38), (33.5, 85, 2.0, 0.38), (34.5, 86, 2.8, 0.42), (36.0, 83, 2.4, 0.36),
        (37.5, 81, 2.0, 0.34), (38.5, 78, 2.5, 0.34), (40.0, 80, 2.4, 0.40), (41.0, 81, 2.2, 0.40),
        (42.0, 85, 3.0, 0.44), (44.0, 81, 3.2, 0.36), (46.0, 76, 3.2, 0.30),
        # Section C tender reprise
        (48.0, 78, 2.4, 0.32), (49.5, 81, 2.2, 0.30), (50.5, 80, 2.5, 0.32), (52.0, 76, 3.0, 0.28),
        (54.0, 73, 3.0, 0.25), (56.0, 74, 4.5, 0.30), (58.0, 78, 4.5, 0.24), (60.0, 81, 5.0, 0.20),
    ]
    for b_pos, note, d_sec, vel in melody:
        add_stereo(buf, synth_celesta(note, dur=d_sec, vel=vel), b_pos * beat, pan=0.18 * math.sin(b_pos))

    # Expressive Bowed Cello countermelody in Section B
    cello_line = [
        (16, 50, 4), (20, 52, 4), (24, 54, 4), (28, 45, 4),
        (32, 47, 4), (36, 43, 4), (40, 50, 4), (44, 45, 4), (48, 50, 8),
    ]
    for b_pos, note, b_len in cello_line:
        add_stereo(buf, synth_cello(note, dur=b_len * beat * 1.05, vel=0.24), b_pos * beat, pan=-0.12)

    buf = apply_shimmer_reverb(buf, wet=0.46, shimmer=0.20, decay=0.72)
    # Clean fade-in & fade-out
    fade_in = np.linspace(0.0, 1.0, int(1.5 * SR))[:, None]
    fade_out = np.linspace(1.0, 0.0, int(4.0 * SR))[:, None]
    buf[: len(fade_in)] *= fade_in
    buf[-len(fade_out) :] *= fade_out
    save_ogg(buf, MUSIC_DIR / "glass_horizon.ogg", quality="5")


def compose_drifting_atolls():
    """OST 2: 'Drifting Atolls' — High-Altitude Spire Gardens Theme (64s, A Lydian, 58 BPM)."""
    total_sec = 64.0
    buf = np.zeros((int(total_sec * SR), 2), dtype=np.float64)
    beat = 60.0 / 58.0

    # Floating wide-interval sky chords
    chords = [
        (0, 8, [45, 52, 57, 61, 63], 0.17, 1300),    # A Lydian (#11 D#)
        (8, 8, [47, 54, 59, 63, 66], 0.19, 1550),    # Badd9/A
        (16, 8, [42, 49, 54, 57, 61], 0.20, 1650),   # F#m9
        (24, 8, [52, 59, 64, 68, 71], 0.21, 1850),   # Emaj9
        (32, 8, [50, 57, 62, 66, 69], 0.20, 1750),   # Dmaj9
        (40, 8, [49, 56, 61, 64, 68], 0.19, 1600),   # C#m9
        (48, 10, [45, 52, 57, 61, 68], 0.17, 1250),  # Amaj9 vast sky
    ]
    for b_start, b_len, notes, gain, bright in chords:
        synth_pad_chord(buf, notes, b_start * beat, b_len * beat, gain=gain, brightness=bright)
        add_stereo(buf, synth_bowl(notes[0] + 12, dur=8.5, vel=0.22), b_start * beat, pan=0.22 * math.cos(b_start))
        add_stereo(buf, synth_cello(notes[0], dur=b_len * beat, vel=0.20), b_start * beat, pan=-0.18)

    # Sparse crystalline wind-chime drops suspended in open air
    chime_events = [
        (2.0, 81), (3.5, 83), (5.0, 85), (6.5, 88),
        (9.5, 87), (11.0, 83), (13.0, 78), (14.5, 83),
        (17.0, 81), (18.5, 80), (20.0, 76), (22.0, 73), (23.0, 76),
        (25.0, 80), (26.5, 83), (28.0, 88), (29.5, 87), (31.0, 83),
        (33.0, 85), (34.5, 81), (36.5, 78), (38.0, 81),
        (41.0, 80), (42.5, 76), (44.0, 73), (46.0, 76), (47.0, 80),
        (49.0, 81), (51.0, 85), (53.5, 88),
    ]
    for idx_c, (b_pos, note) in enumerate(chime_events):
        pan = -0.55 + 1.1 * ((idx_c * 37 % 11) / 10.0)
        add_stereo(buf, synth_celesta(note, dur=4.5, vel=0.28), b_pos * beat, pan=pan)
        if idx_c % 3 == 0:
            add_stereo(buf, synth_harp(note - 12, dur=3.5, vel=0.20), (b_pos + 0.25) * beat, pan=-pan * 0.6)

    buf = apply_shimmer_reverb(buf, wet=0.52, shimmer=0.24, decay=0.76)
    fade_in = np.linspace(0.0, 1.0, int(2.0 * SR))[:, None]
    fade_out = np.linspace(1.0, 0.0, int(4.5 * SR))[:, None]
    buf[: len(fade_in)] *= fade_in
    buf[-len(fade_out) :] *= fade_out
    save_ogg(buf, MUSIC_DIR / "drifting_atolls.ogg", quality="5")


def compose_sunken_chimes():
    """OST 3: 'Sunken Chimes' — Bell-Reef Lagoon & Quiet Twilight Theme (62s, E Dorian/Minor 9, 62 BPM)."""
    total_sec = 62.0
    buf = np.zeros((int(total_sec * SR), 2), dtype=np.float64)
    beat = 60.0 / 62.0

    chords = [
        (0, 8, [40, 47, 52, 55, 59, 62], 0.18, 1200),  # Em9
        (8, 8, [48, 55, 59, 62, 64], 0.19, 1350),      # Cmaj9
        (16, 8, [45, 52, 57, 60, 64], 0.19, 1400),     # Am9
        (24, 8, [47, 54, 59, 62, 66], 0.20, 1500),     # Bm9
        (32, 8, [43, 50, 55, 59, 62], 0.21, 1550),     # Gmaj9
        (40, 8, [48, 55, 59, 64, 66], 0.19, 1400),     # Cmaj7#11
        (48, 12, [40, 47, 52, 59, 66], 0.17, 1150),    # Em9 serene
    ]
    for b_start, b_len, notes, gain, bright in chords:
        synth_pad_chord(buf, notes, b_start * beat, b_len * beat, gain=gain, brightness=bright)
        add_stereo(buf, synth_bowl(notes[0] + 24, dur=8.0, vel=0.16), b_start * beat, pan=0.0)

    # Gentle watery rolling harp waves (6/8 lilt feel!)
    wave_notes = [
        [52, 59, 62, 64, 67, 71, 67, 64],
        [48, 55, 59, 62, 64, 67, 64, 62],
        [57, 60, 64, 67, 71, 72, 71, 67],
        [54, 59, 62, 66, 69, 71, 69, 66],
        [55, 59, 62, 66, 67, 71, 67, 66],
        [55, 59, 64, 66, 67, 71, 74, 71],
        [52, 59, 62, 64, 66, 71, 66, 64],
    ]
    for ci, seq in enumerate(wave_notes):
        b0 = ci * 8
        count = 16 if ci < 6 else 12
        for s in range(count):
            t_sec = (b0 + s * 0.5) * beat
            pan = 0.45 * math.sin(s * 0.65)
            vel = 0.24 * (1.0 if ci < 6 else max(0.18, 1.0 - s / 12.0))
            add_stereo(buf, synth_harp(seq[s % len(seq)], dur=3.0, vel=vel), t_sec, pan=pan)

    # Soft kalimba-like mid-high glass melody
    mel = [
        (4.0, 76), (5.5, 74), (6.5, 71), (8.0, 74), (10.0, 76), (12.0, 79), (14.0, 78),
        (16.0, 76), (18.0, 72), (19.5, 71), (21.0, 69), (24.0, 71), (26.0, 74), (28.0, 78), (30.0, 79),
        (32.0, 83), (34.0, 81), (35.5, 79), (37.0, 78), (40.0, 79), (42.0, 76), (44.0, 74), (46.0, 71),
        (48.0, 76), (51.0, 74), (54.0, 71),
    ]
    for b_pos, note in mel:
        add_stereo(buf, synth_celesta(note, dur=3.2, vel=0.25), b_pos * beat, pan=-0.22)

    buf = apply_shimmer_reverb(buf, wet=0.48, shimmer=0.18, decay=0.72)
    fade_in = np.linspace(0.0, 1.0, int(1.8 * SR))[:, None]
    fade_out = np.linspace(1.0, 0.0, int(4.0 * SR))[:, None]
    buf[: len(fade_in)] *= fade_in
    buf[-len(fade_out) :] *= fade_out
    save_ogg(buf, MUSIC_DIR / "sunken_chimes.ogg", quality="5")


def compose_seraph_crescendo():
    """OST 4: 'Crescendo of the Glass Tide' — Astral Seraph Boss Theme (56s, D minor, 124 BPM)."""
    total_sec = 56.0
    buf = np.zeros((int(total_sec * SR), 2), dtype=np.float64)
    beat = 60.0 / 124.0  # ~0.4839s

    # Heroic celestial minor progression (16-bar dramatic cycle x 2)
    prog = [
        (0, 8, [38, 45, 50, 53, 57]),   # Dm
        (8, 8, [34, 46, 50, 53, 57]),   # Bbmaj7
        (16, 8, [36, 48, 52, 55, 60]),  # C
        (24, 8, [33, 45, 49, 52, 57]),  # A (harmonic minor V!)
        (32, 8, [38, 45, 50, 53, 57]),  # Dm (intensified!)
        (40, 8, [39, 46, 51, 55, 58]),  # Eb (Phrygian lift!)
        (48, 8, [34, 46, 50, 53, 57]),  # Bb
        (56, 8, [33, 45, 49, 52, 55]),  # A7
        (64, 8, [38, 45, 50, 53, 57]),  # Dm climax
        (72, 8, [34, 46, 50, 53, 60]),  # Bbmaj9
        (80, 8, [36, 48, 52, 55, 62]),  # Cadd9
        (88, 8, [38, 45, 50, 57, 62]),  # D5 cathedral power
        (96, 12, [38, 45, 50, 53, 57]), # Resolve for smooth loop
    ]
    for b0, blen, notes in prog:
        synth_pad_chord(buf, notes, b0 * beat, blen * beat, gain=0.22, brightness=2400)
        add_stereo(buf, synth_cello(notes[0], dur=blen * beat, vel=0.34), b0 * beat, pan=0.0)
        # Cathedral bell on major phrasing hits
        if b0 % 16 == 0:
            add_stereo(buf, synth_bowl(notes[2] + 12, dur=5.0, vel=0.28), b0 * beat, pan=0.0)

    # Driving Taiko Percussion Pulse (urgent ceremonial rhythm!)
    for bar in range(26):
        b_base = bar * 4
        intensity = 0.72 if bar < 8 else (0.95 if bar < 24 else 0.6)
        add_stereo(buf, synth_taiko(0.65, pitch=66.0, vel=0.55 * intensity), b_base * beat, pan=0.0)
        add_stereo(buf, synth_taiko(0.35, pitch=92.0, vel=0.32 * intensity), (b_base + 1.5) * beat, pan=-0.25)
        add_stereo(buf, synth_taiko(0.50, pitch=74.0, vel=0.45 * intensity), (b_base + 2.0) * beat, pan=0.15)
        add_stereo(buf, synth_taiko(0.30, pitch=108.0, vel=0.30 * intensity), (b_base + 3.0) * beat, pan=0.30)
        add_stereo(buf, synth_taiko(0.28, pitch=96.0, vel=0.26 * intensity), (b_base + 3.5) * beat, pan=-0.30)

    # Urgent 8th-note crystalline harp ostinato!
    ost_sets = [
        [62, 65, 69, 74], [58, 62, 65, 69], [60, 64, 67, 72], [57, 61, 64, 69],
        [62, 65, 69, 74], [63, 67, 70, 75], [58, 62, 65, 70], [57, 61, 64, 69],
        [62, 65, 69, 74], [58, 62, 65, 72], [60, 64, 67, 74], [62, 69, 74, 77],
    ]
    for seg_i, notes in enumerate(ost_sets):
        b0 = seg_i * 8
        for s in range(16):
            n_m = notes[s % 4] + (12 if s >= 8 and seg_i >= 4 else 0)
            pan = -0.45 if s % 2 == 0 else 0.45
            add_stereo(buf, synth_harp(n_m, dur=1.1, vel=0.28), (b0 + s * 0.5) * beat, pan=pan)

    # Soaring Heroic Brass-Choir & High Celesta Lead Melody!
    lead = [
        # Theme 1 (bars 2-8)
        (8, 74, 1.5), (9.5, 76, 1.0), (10.5, 77, 1.5), (12, 81, 2.0), (14, 79, 2.0),
        (16, 77, 1.5), (17.5, 76, 1.0), (18.5, 74, 1.5), (20, 72, 2.0), (22, 76, 2.0),
        (24, 73, 3.0), (27, 76, 1.5), (28.5, 79, 2.0), (30.5, 76, 1.5),
        # Theme 2 — Phrygian Celestial Drama (bars 8-16)
        (32, 74, 2.0), (34, 81, 2.0), (36, 86, 2.5), (38.5, 84, 1.5),
        (40, 82, 2.0), (42, 79, 1.5), (43.5, 75, 2.5), (46, 79, 2.0),
        (48, 81, 2.0), (50, 77, 2.0), (52, 74, 2.0), (54, 77, 2.0),
        (56, 76, 3.0), (59, 73, 2.0), (61, 76, 3.0),
        # Climax Finale (bars 16-24)
        (64, 86, 2.5), (66.5, 84, 1.5), (68, 81, 2.0), (70, 84, 2.0),
        (72, 82, 2.5), (74.5, 81, 1.5), (76, 77, 2.0), (78, 81, 2.0),
        (80, 79, 2.0), (82, 84, 2.0), (84, 86, 2.0), (86, 88, 2.0),
        (88, 86, 5.0), (93, 81, 3.0),
    ]
    for b_pos, note, b_len in lead:
        add_stereo(buf, synth_brass(note - 12, dur=b_len * beat * 1.05, vel=0.34), b_pos * beat, pan=0.0)
        add_stereo(buf, synth_celesta(note, dur=b_len * beat * 1.4, vel=0.26), b_pos * beat, pan=0.12)

    buf = apply_shimmer_reverb(buf, wet=0.35, shimmer=0.14, decay=0.62)
    fade_in = np.linspace(0.0, 1.0, int(0.6 * SR))[:, None]
    fade_out = np.linspace(1.0, 0.0, int(3.0 * SR))[:, None]
    buf[: len(fade_in)] *= fade_in
    buf[-len(fade_out) :] *= fade_out
    save_ogg(buf, MUSIC_DIR / "seraph_crescendo.ogg", quality="5")


# =============================================================================
# 2. TWENTY-FIVE BESPOKE SOUND EFFECTS (.ogg)
# =============================================================================

def generate_sfx():
    rng = np.random.default_rng(2026)

    # 1. ritual_chime: Pure crystalline tuning fork strike + golden harmonic shimmer
    buf = np.zeros((int(3.2 * SR), 2))
    add_stereo(buf, synth_bowl(74, dur=3.0, vel=0.55), 0.0, pan=0.0)
    add_stereo(buf, synth_celesta(86, dur=2.6, vel=0.45), 0.01, pan=-0.15)
    add_stereo(buf, synth_celesta(93, dur=2.4, vel=0.30), 0.05, pan=0.20)
    save_ogg(apply_shimmer_reverb(buf, wet=0.42, shimmer=0.25, decay=0.65), SFX_DIR / "ritual_chime.ogg", "4")

    # 2. ritual_swell: 4.5s harmonic convergence buildup (rising choir fifths + vortex shimmer!)
    dur = 4.6
    n = int(dur * SR)
    t = np.arange(n) / SR
    buf = np.zeros((n, 2))
    synth_pad_chord(buf, [50, 57, 62, 66, 69, 74], 0.0, 4.0, gain=0.26, brightness=2800)
    # Rising crystalline vortex sweep
    sweep_f = 180.0 * (2.0 ** (t * 0.55))
    sweep = np.sin(2 * math.pi * np.cumsum(sweep_f) / SR) * np.clip(t / 3.5, 0.0, 1.0) * 0.25
    noise = bandpass_fft(rng.standard_normal(n), 400, 3200) * (t / dur) ** 1.5 * 0.22
    add_stereo(buf, sweep + noise, 0.0, pan=0.0)
    for i, m in enumerate([74, 78, 81, 86, 90, 93]):
        add_stereo(buf, synth_celesta(m, dur=2.0, vel=0.28 + i * 0.04), 0.4 + i * 0.55, pan=-0.4 + i * 0.16)
    buf *= np.clip((dur - t) / 0.45, 0.0, 1.0)[:, None]
    save_ogg(apply_shimmer_reverb(buf, wet=0.48, shimmer=0.28, decay=0.72), SFX_DIR / "ritual_swell.ogg", "4")

    # 3. portal_ascend: Ethereal upward Lydian harp glissando + airy whoosh
    dur = 3.8
    n = int(dur * SR)
    t = np.arange(n) / SR
    buf = np.zeros((n, 2))
    gliss = [62, 66, 68, 69, 73, 74, 78, 80, 81, 85, 86, 90, 93]
    for i, m in enumerate(gliss):
        add_stereo(buf, synth_harp(m, dur=2.4, vel=0.36), i * 0.085, pan=-0.5 + i / len(gliss))
    whoosh = bandpass_fft(rng.standard_normal(n), 220, 2600) * np.sin(math.pi * np.clip(t / 2.2, 0, 1)) ** 2 * 0.35
    add_stereo(buf, whoosh, 0.0, pan=0.0)
    add_stereo(buf, synth_bowl(74, dur=3.5, vel=0.35), 0.1, pan=0.0)
    save_ogg(apply_shimmer_reverb(buf, wet=0.50, shimmer=0.28, decay=0.70), SFX_DIR / "portal_ascend.ogg", "4")

    # 4. portal_return: Warm descending crystalline resolution returning to Overworld
    dur = 3.2
    buf = np.zeros((int(dur * SR), 2))
    for i, m in enumerate([86, 81, 78, 74, 69, 66, 62]):
        add_stereo(buf, synth_celesta(m, dur=2.2, vel=0.32), i * 0.11, pan=0.4 - i * 0.12)
    add_stereo(buf, synth_bowl(62, dur=3.0, vel=0.32), 0.05, pan=0.0)
    save_ogg(apply_shimmer_reverb(buf, wet=0.45, shimmer=0.18, decay=0.65), SFX_DIR / "portal_return.ogg", "4")

    # 5. portal_hum: Seamless 4.0s resonant singing-bowl hum loop
    dur = 4.0
    n = int(dur * SR)
    t = np.arange(n) / SR
    hum = np.zeros(n)
    # Exact integer cycles over 4.0s -> seamless loop!
    for hz, amp in [(146.75, 0.35), (220.0, 0.25), (293.5, 0.18), (440.0, 0.10), (587.0, 0.05)]:
        lfo = 0.85 + 0.15 * np.sin(2 * math.pi * 0.5 * t)
        hum += amp * lfo * np.sin(2 * math.pi * hz * t)
    save_ogg(np.stack([hum, np.roll(hum, int(0.015 * SR))], axis=1) * 0.55, SFX_DIR / "portal_hum.ogg", "4")

    # 6. ambient_wind: Seamless 10.0s gentle twilight breeze + faint celestial harmonics
    dur = 10.0
    n = int(dur * SR)
    t = np.arange(n) / SR
    raw = rng.standard_normal(n)
    wind_l = bandpass_fft(raw, 140, 820) * (0.65 + 0.35 * np.sin(2 * math.pi * 0.1 * t)) * 0.26
    wind_r = bandpass_fft(np.roll(raw, 17321), 160, 880) * (0.65 + 0.35 * np.cos(2 * math.pi * 0.1 * t)) * 0.26
    # Subtle glass-air harmonic whisper
    sh = (0.045 * np.sin(2 * math.pi * 293.6 * t) + 0.03 * np.sin(2 * math.pi * 440.0 * t)) * (0.5 + 0.5 * np.sin(2 * math.pi * 0.2 * t))
    save_ogg(np.stack([wind_l + sh, wind_r + sh], axis=1), SFX_DIR / "ambient_wind.ogg", "4")

    # 7 & 8. ambient_chime_1 & ambient_chime_2: Airy twilight wind-chime flourishes
    for idx_a, notes in enumerate([[81, 86, 90, 93], [88, 85, 81, 78]]):
        buf = np.zeros((int(3.6 * SR), 2))
        for i, m in enumerate(notes):
            add_stereo(buf, synth_celesta(m, dur=2.6, vel=0.22), i * 0.22, pan=-0.35 + i * 0.24)
        save_ogg(apply_shimmer_reverb(buf, wet=0.52, shimmer=0.22, decay=0.72), SFX_DIR / f"ambient_chime_{idx_a+1}.ogg", "4")

    # 9. ambient_mood: Deep mysterious twilight singing-bowl swell
    buf = np.zeros((int(5.5 * SR), 2))
    add_stereo(buf, synth_bowl(50, dur=5.2, vel=0.35), 0.0, pan=-0.1)
    add_stereo(buf, synth_bowl(69, dur=4.8, vel=0.18), 0.35, pan=0.2)
    save_ogg(apply_shimmer_reverb(buf, wet=0.50, shimmer=0.22, decay=0.74), SFX_DIR / "ambient_mood.ogg", "4")

    # 10. crystal_step: Delicate single crystalline bell chime
    buf = np.zeros((int(0.85 * SR), 2))
    add_stereo(buf, synth_celesta(86, dur=0.75, vel=0.45), 0.0, pan=0.0)
    add_stereo(buf, synth_celesta(93, dur=0.55, vel=0.25), 0.03, pan=0.1)
    save_ogg(apply_shimmer_reverb(buf, wet=0.30, shimmer=0.12, decay=0.45), SFX_DIR / "crystal_step.ogg", "4")

    # 11. crystal_break: Sparkling musical sea-glass shatter
    dur = 1.2
    n = int(dur * SR)
    t = np.arange(n) / SR
    buf = np.zeros((n, 2))
    for i, m in enumerate([90, 95, 86, 98, 93, 102]):
        add_stereo(buf, synth_celesta(m, dur=0.65, vel=0.30), i * 0.028, pan=-0.5 + i * 0.2)
    crisp = bandpass_fft(rng.standard_normal(n), 2800, 9500) * np.exp(-t * 14.0) * 0.35
    add_stereo(buf, crisp, 0.0, pan=0.0)
    save_ogg(apply_shimmer_reverb(buf, wet=0.32, shimmer=0.10, decay=0.45), SFX_DIR / "crystal_break.ogg", "4")

    # 12. gale_prism: Sweeping rose-gold upward wind burst + bright major-9 flourish
    dur = 1.8
    n = int(dur * SR)
    t = np.arange(n) / SR
    buf = np.zeros((n, 2))
    whoosh = bandpass_fft(rng.standard_normal(n), 320, 3800) * np.exp(-((t - 0.28) ** 2) / 0.08) * 0.55
    add_stereo(buf, whoosh, 0.0, pan=0.0)
    for i, m in enumerate([74, 78, 81, 88]):
        add_stereo(buf, synth_harp(m, dur=1.4, vel=0.35), 0.04 + i * 0.055, pan=-0.3 + i * 0.2)
    save_ogg(apply_shimmer_reverb(buf, wet=0.38, shimmer=0.22, decay=0.55), SFX_DIR / "gale_prism.ogg", "4")

    # 13. starblade_slash: Crisp crystalline energy crescent slash!
    dur = 1.1
    n = int(dur * SR)
    t = np.arange(n) / SR
    buf = np.zeros((n, 2))
    sw_f = 1600.0 * np.exp(-t * 6.5) + 280.0
    blade = np.sin(2 * math.pi * np.cumsum(sw_f) / SR) * np.exp(-t * 5.2) * 0.45
    air = bandpass_fft(rng.standard_normal(n), 900, 6200) * np.exp(-t * 9.5) * 0.42
    add_stereo(buf, blade + air, 0.0, pan=0.0)
    add_stereo(buf, synth_celesta(93, dur=0.9, vel=0.35), 0.02, pan=0.15)
    save_ogg(apply_shimmer_reverb(buf, wet=0.35, shimmer=0.18, decay=0.50), SFX_DIR / "starblade_slash.ogg", "4")

    # 14-16. lyre_chord_1..3: Three lush rolled celestial harp chords (Dmaj9, Bm11, Gmaj7#11)
    lyre_chords = [
        [62, 66, 69, 73, 76, 81],
        [59, 62, 66, 69, 74, 78],
        [55, 59, 62, 66, 73, 78],
    ]
    for ci, notes in enumerate(lyre_chords):
        buf = np.zeros((int(3.4 * SR), 2))
        for i, m in enumerate(notes):
            add_stereo(buf, synth_harp(m, dur=3.0, vel=0.38), i * 0.055, pan=-0.38 + i * 0.15)
        save_ogg(apply_shimmer_reverb(buf, wet=0.46, shimmer=0.22, decay=0.68), SFX_DIR / f"lyre_chord_{ci+1}.ogg", "4")

    # 17. manta_call: Deep haunting celestial whale-song of the Lumina Ray!
    dur = 3.4
    n = int(dur * SR)
    t = np.arange(n) / SR
    buf = np.zeros((n, 2))
    # Expressive pitch-curved harmonic whale glide (D4 -> A4 -> F#4)
    f_curve = 293.66 * (1.0 + 0.48 * np.sin(math.pi * np.clip(t / 2.6, 0, 1)) ** 1.4 - 0.14 * (t / dur))
    ph = 2 * math.pi * np.cumsum(f_curve) / SR
    env = np.sin(math.pi * np.clip(t / 3.0, 0, 1)) ** 1.6
    song = (np.sin(ph) + 0.42 * np.sin(2 * ph) + 0.16 * np.sin(3 * ph)) * env * 0.42
    add_stereo(buf, lowpass_1pole(song, 1600.0), 0.0, pan=0.0)
    save_ogg(apply_shimmer_reverb(buf, wet=0.52, shimmer=0.20, decay=0.72), SFX_DIR / "manta_call.ogg", "4")

    # 18. wisp_sing: Playful crystalline 4-note celesta greeting of the Choir Wisp
    buf = np.zeros((int(2.2 * SR), 2))
    for i, m in enumerate([86, 90, 93, 98]):
        add_stereo(buf, synth_celesta(m, dur=1.4, vel=0.35), i * 0.14, pan=-0.25 + i * 0.18)
    save_ogg(apply_shimmer_reverb(buf, wet=0.44, shimmer=0.22, decay=0.62), SFX_DIR / "wisp_sing.ogg", "4")

    # 19. crab_click: Glossy porcelain & sea-glass percussion click
    buf = np.zeros((int(0.55 * SR), 2))
    for i, m in enumerate([83, 88, 90]):
        add_stereo(buf, synth_celesta(m, dur=0.18, vel=0.45), i * 0.065, pan=-0.15 + i * 0.15)
    save_ogg(apply_shimmer_reverb(buf, wet=0.22, shimmer=0.0, decay=0.35), SFX_DIR / "crab_click.ogg", "4")

    # 20-22. Gilded Sentinel SFX (hum, blast, hurt)
    buf = np.zeros((int(1.8 * SR), 2))
    add_stereo(buf, synth_bowl(57, dur=1.7, vel=0.42), 0.0, pan=0.0)
    save_ogg(apply_shimmer_reverb(buf, wet=0.35, shimmer=0.12, decay=0.55), SFX_DIR / "sentinel_hum.ogg", "4")

    dur = 0.95
    n = int(dur * SR)
    t = np.arange(n) / SR
    buf = np.zeros((n, 2))
    f_b = 1150.0 * np.exp(-t * 7.5) + 190.0
    bolt = (np.sin(2 * math.pi * np.cumsum(f_b) / SR) + 0.4 * np.sin(4 * math.pi * np.cumsum(f_b) / SR)) * np.exp(-t * 5.0) * 0.48
    add_stereo(buf, bolt, 0.0, pan=0.0)
    add_stereo(buf, synth_celesta(90, dur=0.65, vel=0.32), 0.0, pan=0.0)
    save_ogg(apply_shimmer_reverb(buf, wet=0.30, shimmer=0.15, decay=0.45), SFX_DIR / "sentinel_blast.ogg", "4")

    buf = np.zeros((int(0.7 * SR), 2))
    add_stereo(buf, synth_bowl(67, dur=0.65, vel=0.50), 0.0, pan=0.0)
    add_stereo(buf, synth_taiko(0.35, pitch=125.0, vel=0.35), 0.0, pan=0.0)
    save_ogg(apply_shimmer_reverb(buf, wet=0.25, shimmer=0.0, decay=0.40), SFX_DIR / "sentinel_hurt.ogg", "4")

    # 23-25. Astral Seraph Boss SFX (awaken, pulse, defeat!)
    buf = np.zeros((int(4.5 * SR), 2))
    synth_pad_chord(buf, [38, 45, 50, 57, 62, 66, 74], 0.0, 3.6, gain=0.28, brightness=2800)
    add_stereo(buf, synth_bowl(50, dur=4.3, vel=0.52), 0.0, pan=0.0)
    add_stereo(buf, synth_taiko(0.85, pitch=56.0, vel=0.65), 0.0, pan=0.0)
    for i, m in enumerate([62, 69, 74, 81, 86]):
        add_stereo(buf, synth_brass(m, dur=2.2, vel=0.32), 0.15 + i * 0.18, pan=-0.3 + i * 0.15)
    save_ogg(apply_shimmer_reverb(buf, wet=0.46, shimmer=0.26, decay=0.72), SFX_DIR / "seraph_awaken.ogg", "4")

    buf = np.zeros((int(1.8 * SR), 2))
    add_stereo(buf, synth_taiko(0.95, pitch=52.0, vel=0.72), 0.0, pan=0.0)
    add_stereo(buf, synth_bowl(62, dur=1.6, vel=0.45), 0.02, pan=0.0)
    add_stereo(buf, synth_celesta(86, dur=1.4, vel=0.38), 0.05, pan=0.0)
    save_ogg(apply_shimmer_reverb(buf, wet=0.40, shimmer=0.20, decay=0.60), SFX_DIR / "seraph_pulse.ogg", "4")

    buf = np.zeros((int(5.2 * SR), 2))
    synth_pad_chord(buf, [50, 57, 62, 66, 69, 73, 74], 0.0, 4.2, gain=0.26, brightness=2400)
    for i, m in enumerate([62, 66, 69, 73, 74, 78, 81, 86, 90, 93]):
        add_stereo(buf, synth_harp(m, dur=3.2, vel=0.34), i * 0.14, pan=-0.5 + i * 0.1)
    add_stereo(buf, synth_bowl(62, dur=4.8, vel=0.45), 0.2, pan=0.0)
    save_ogg(apply_shimmer_reverb(buf, wet=0.52, shimmer=0.30, decay=0.75), SFX_DIR / "seraph_defeat.ogg", "4")


# =============================================================================
# 3. SOUND & MUSIC REGISTRY JSONS (sound_definitions, music_definitions, sounds.json, blocks.json)
# =============================================================================

def write_audio_registries():
    sound_defs = {
        "format_version": "1.20.20",
        "sound_definitions": {
            # --- 4 Original Soundtrack (OST) Tracks ---
            "music.auralis.firmament": {
                "category": "music",
                "sounds": [
                    {"name": "sounds/music/auralis/glass_horizon", "stream": True, "volume": 0.72, "load_on_low_memory": True},
                    {"name": "sounds/music/auralis/drifting_atolls", "stream": True, "volume": 0.72, "load_on_low_memory": True},
                    {"name": "sounds/music/auralis/sunken_chimes", "stream": True, "volume": 0.72, "load_on_low_memory": True},
                ],
            },
            "music.auralis.glass_horizon": {
                "category": "music",
                "sounds": [{"name": "sounds/music/auralis/glass_horizon", "stream": True, "volume": 0.78, "load_on_low_memory": True}],
            },
            "music.auralis.drifting_atolls": {
                "category": "music",
                "sounds": [{"name": "sounds/music/auralis/drifting_atolls", "stream": True, "volume": 0.78, "load_on_low_memory": True}],
            },
            "music.auralis.sunken_chimes": {
                "category": "music",
                "sounds": [{"name": "sounds/music/auralis/sunken_chimes", "stream": True, "volume": 0.78, "load_on_low_memory": True}],
            },
            "music.auralis.seraph_boss": {
                "category": "music",
                "sounds": [{"name": "sounds/music/auralis/seraph_crescendo", "stream": True, "volume": 0.85, "load_on_low_memory": True}],
            },

            # --- Ambient & Dimensional SFX ---
            "ambient.auralis.wind": {
                "category": "ambient",
                "sounds": [{"name": "sounds/auralis/ambient_wind", "stream": True, "volume": 0.38}],
            },
            "ambient.auralis.chimes": {
                "category": "ambient",
                "sounds": [
                    {"name": "sounds/auralis/ambient_chime_1", "volume": 0.45},
                    {"name": "sounds/auralis/ambient_chime_2", "volume": 0.45},
                ],
            },
            "ambient.auralis.mood": {
                "category": "ambient",
                "sounds": [{"name": "sounds/auralis/ambient_mood", "volume": 0.40}],
            },
            "auralis.ritual.chime": {
                "category": "block",
                "sounds": [{"name": "sounds/auralis/ritual_chime", "volume": 0.9}],
            },
            "auralis.ritual.swell": {
                "category": "block",
                "sounds": [{"name": "sounds/auralis/ritual_swell", "volume": 0.95}],
            },
            "auralis.portal.ascend": {
                "category": "player",
                "sounds": [{"name": "sounds/auralis/portal_ascend", "volume": 0.95}],
            },
            "auralis.portal.return": {
                "category": "player",
                "sounds": [{"name": "sounds/auralis/portal_return", "volume": 0.92}],
            },
            "auralis.portal.hum": {
                "category": "block",
                "sounds": [{"name": "sounds/auralis/portal_hum", "volume": 0.45}],
            },

            # --- Block & Item Relic SFX ---
            "auralis.crystal.step": {
                "category": "block",
                "sounds": [{"name": "sounds/auralis/crystal_step", "volume": 0.65}],
            },
            "auralis.crystal.break": {
                "category": "block",
                "sounds": [{"name": "sounds/auralis/crystal_break", "volume": 0.80}],
            },
            "auralis.item.gale_prism": {
                "category": "player",
                "sounds": [{"name": "sounds/auralis/gale_prism", "volume": 0.88}],
            },
            "auralis.item.starblade": {
                "category": "player",
                "sounds": [{"name": "sounds/auralis/starblade_slash", "volume": 0.90}],
            },
            "auralis.item.lyre": {
                "category": "player",
                "sounds": [
                    {"name": "sounds/auralis/lyre_chord_1", "volume": 0.85},
                    {"name": "sounds/auralis/lyre_chord_2", "volume": 0.85},
                    {"name": "sounds/auralis/lyre_chord_3", "volume": 0.85},
                ],
            },

            # --- Custom Mob & Boss Voices ---
            "auralis.mob.manta_call": {
                "category": "neutral",
                "sounds": [{"name": "sounds/auralis/manta_call", "volume": 0.72}],
            },
            "auralis.mob.wisp_sing": {
                "category": "neutral",
                "sounds": [{"name": "sounds/auralis/wisp_sing", "volume": 0.68}],
            },
            "auralis.mob.crab_click": {
                "category": "neutral",
                "sounds": [{"name": "sounds/auralis/crab_click", "volume": 0.65}],
            },
            "auralis.mob.sentinel_hum": {
                "category": "hostile",
                "sounds": [{"name": "sounds/auralis/sentinel_hum", "volume": 0.70}],
            },
            "auralis.mob.sentinel_blast": {
                "category": "hostile",
                "sounds": [{"name": "sounds/auralis/sentinel_blast", "volume": 0.85}],
            },
            "auralis.mob.sentinel_hurt": {
                "category": "hostile",
                "sounds": [{"name": "sounds/auralis/sentinel_hurt", "volume": 0.82}],
            },
            "auralis.boss.seraph_awaken": {
                "category": "hostile",
                "sounds": [{"name": "sounds/auralis/seraph_awaken", "volume": 1.0}],
            },
            "auralis.boss.seraph_pulse": {
                "category": "hostile",
                "sounds": [{"name": "sounds/auralis/seraph_pulse", "volume": 0.95}],
            },
            "auralis.boss.seraph_defeat": {
                "category": "hostile",
                "sounds": [{"name": "sounds/auralis/seraph_defeat", "volume": 1.0}],
            },
        },
    }
    with open(RP_ROOT / "sounds" / "sound_definitions.json", "w", encoding="utf-8") as f:
        json.dump(sound_defs, f, indent=2)

    music_defs = {
        "auralis_firmament": {
            "event_name": "music.auralis.firmament",
            "max_delay": 45,
            "min_delay": 10,
        }
    }
    with open(RP_ROOT / "sounds" / "music_definitions.json", "w", encoding="utf-8") as f:
        json.dump(music_defs, f, indent=2)

    sounds_json = {
        "individual_named_sounds": {
            "sounds": {
                "ambient.auralis.wind": {"sound": "ambient.auralis.wind", "volume": 0.55, "pitch": [0.96, 1.04]},
                "ambient.auralis.chimes": {"sound": "ambient.auralis.chimes", "volume": 0.55, "pitch": [0.92, 1.08]},
                "ambient.auralis.mood": {"sound": "ambient.auralis.mood", "volume": 0.45, "pitch": [0.95, 1.05]},
            }
        },
        "entity_sounds": {
            "entities": {
                "auralis:lumina_ray": {
                    "volume": 0.85,
                    "pitch": [0.92, 1.08],
                    "events": {
                        "ambient": "auralis.mob.manta_call",
                        "hurt": "auralis.crystal.step",
                        "death": "auralis.mob.manta_call",
                    },
                },
                "auralis:choir_wisp": {
                    "volume": 0.75,
                    "pitch": [0.95, 1.12],
                    "events": {
                        "ambient": "auralis.mob.wisp_sing",
                        "hurt": "auralis.crystal.step",
                        "death": "auralis.crystal.break",
                    },
                },
                "auralis:glass_crab": {
                    "volume": 0.72,
                    "pitch": [0.90, 1.12],
                    "events": {
                        "ambient": "auralis.mob.crab_click",
                        "hurt": "auralis.crystal.break",
                        "death": "auralis.crystal.break",
                        "step": "auralis.crystal.step",
                    },
                },
                "auralis:gilded_sentinel": {
                    "volume": 0.90,
                    "pitch": [0.92, 1.06],
                    "events": {
                        "ambient": "auralis.mob.sentinel_hum",
                        "hurt": "auralis.mob.sentinel_hurt",
                        "death": "auralis.crystal.break",
                    },
                },
                "auralis:astral_seraph": {
                    "volume": 1.0,
                    "pitch": [0.95, 1.05],
                    "events": {
                        "ambient": "auralis.mob.sentinel_hum",
                        "hurt": "auralis.mob.sentinel_hurt",
                        "death": "auralis.boss.seraph_defeat",
                    },
                },
            }
        },
    }
    with open(RP_ROOT / "sounds.json", "w", encoding="utf-8") as f:
        json.dump(sounds_json, f, indent=2)

    blocks_json = {
        "format_version": [1, 1, 0],
        "auralis:auralite_stone": {"sound": "calcite"},
        "auralis:starstone": {"sound": "deepslate"},
        "auralis:tide_moss": {"sound": "moss_block"},
        "auralis:gilded_travertine": {"sound": "calcite"},
        "auralis:solarium_ore": {"sound": "amethyst_block"},
        "auralis:solarium_block": {"sound": "copper"},
        "auralis:prism_log": {"sound": "cherry_wood"},
        "auralis:prism_planks": {"sound": "cherry_wood"},
        "auralis:prism_leaves": {"sound": "cherry_leaves"},
        "auralis:starlight_glass": {"sound": "glass"},
        "auralis:sea_crystal": {"sound": "amethyst_cluster"},
        "auralis:lantern_bloom": {"sound": "amethyst_block"},
        "auralis:chime_reed": {"sound": "amethyst_cluster"},
        "auralis:gilded_brass": {"sound": "copper"},
        "auralis:astrolabe_pedestal": {"sound": "amethyst_block"},
        "auralis:starlight_veil": {"sound": "amethyst_cluster"},
        "auralis:vespera_altar": {"sound": "amethyst_block"},
    }
    with open(RP_ROOT / "blocks.json", "w", encoding="utf-8") as f:
        json.dump(blocks_json, f, indent=2)


def main():
    print("Composing 4 original OST tracks (stereo 44.1kHz Ogg Vorbis)...")
    compose_glass_horizon()
    print("  [1/4] glass_horizon.ogg complete")
    compose_drifting_atolls()
    print("  [2/4] drifting_atolls.ogg complete")
    compose_sunken_chimes()
    print("  [3/4] sunken_chimes.ogg complete")
    compose_seraph_crescendo()
    print("  [4/4] seraph_crescendo.ogg complete")
    print("Synthesizing 25 custom SFX...")
    generate_sfx()
    write_audio_registries()
    print("All audio assets and sound registries written successfully!")


if __name__ == "__main__":
    main()
