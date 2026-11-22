#!/usr/bin/env python3
"""
Studio-Quality Polyphonic DSP Soundtrack (OST) & Gentle Remastered SFX Synthesizer for:
    AURALIS: The Prism-Tide Firmament (Minecraft Bedrock Edition — v2 Overhaul)

Generates:
  - 4 full-length stereo original soundtrack pieces (.ogg, warm spacious mastering)
  - 31 gentle, ear-friendly bespoke SFX (.ogg, calibrated per-category headroom,
    warm mid-register acoustic/felt tones, zero harsh clipping or shrill spikes)
  - sound_definitions.json, music_definitions.json, sounds.json, and blocks.json
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


def save_ogg(samples_lr, out_path: Path, quality="5", target_peak=0.45, soft_limit=False):
    """
    Category-calibrated clean mastering + Ogg Vorbis encoding.
    Never applies harsh waveshaping to delicate SFX; keeps generous headroom
    so in-game audio feels silky, warm, and comfortable on the ears.
    """
    arr = np.asarray(samples_lr, dtype=np.float64)
    if arr.ndim == 1:
        arr = np.stack([arr, arr], axis=1)

    # Remove any DC offset & apply tiny edge anti-click fades (4ms)
    arr = arr - np.mean(arr, axis=0, keepdims=True)
    edge = min(int(0.004 * SR), arr.shape[0] // 4)
    if edge > 1:
        arr[:edge] *= np.linspace(0.0, 1.0, edge)[:, None]
        arr[-edge:] *= np.linspace(1.0, 0.0, edge)[:, None]

    peak = float(np.max(np.abs(arr)))
    if peak > 1e-6:
        arr = arr * (target_peak / peak)
        if soft_limit:
            # Transparent gentle peak cushion only for dense orchestral mixes
            arr = np.tanh(arr * 1.04) / math.tanh(1.04)
            p2 = float(np.max(np.abs(arr)))
            if p2 > target_peak:
                arr *= target_peak / p2

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
    """Smooth zero-phase FFT lowpass filter for warm acoustic tone shaping."""
    n = len(x)
    if n < 8:
        return x
    freqs = np.fft.rfftfreq(n, 1.0 / SR)
    resp = 1.0 / np.sqrt(1.0 + (freqs / max(20.0, cutoff_hz)) ** 4)
    return np.fft.irfft(np.fft.rfft(x) * resp, n=n)


def lowpass_stereo(stereo, cutoff_hz):
    return np.stack([lowpass_1pole(stereo[:, 0], cutoff_hz), lowpass_1pole(stereo[:, 1], cutoff_hz)], axis=1)


def bandpass_fft(x, lo_hz, hi_hz):
    n = len(x)
    freqs = np.fft.rfftfreq(n, 1.0 / SR)
    hp = 1.0 / np.sqrt(1.0 + (max(10.0, lo_hz) / (freqs + 1e-6)) ** 4)
    lp = 1.0 / np.sqrt(1.0 + (freqs / max(lo_hz + 20.0, hi_hz)) ** 4)
    return np.fft.irfft(np.fft.rfft(x) * hp * lp, n=n)


def apply_shimmer_reverb(stereo, wet=0.42, shimmer=0.14, decay=0.66, tone_hz=3200.0):
    """Lush stereo cathedral hall reverb with warm high-frequency damping."""
    n = stereo.shape[0]
    out_l = stereo[:, 0].copy()
    out_r = stereo[:, 1].copy()

    taps_l = [(29, 0.34), (67, 0.28), (113, 0.24), (179, 0.20), (263, 0.17), (373, 0.13), (521, 0.10), (719, 0.07)]
    taps_r = [(37, 0.34), (79, 0.28), (131, 0.24), (199, 0.20), (293, 0.17), (409, 0.13), (569, 0.10), (761, 0.07)]

    rev_l = np.zeros(n, dtype=np.float64)
    rev_r = np.zeros(n, dtype=np.float64)
    src_l = lowpass_1pole(stereo[:, 0], tone_hz)
    src_r = lowpass_1pole(stereo[:, 1], tone_hz)

    for ms, g in taps_l:
        d = int(ms * SR / 1000.0)
        if d < n:
            rev_l[d:] += (0.7 * src_l[:-d] + 0.3 * src_r[:-d]) * g * decay
    for ms, g in taps_r:
        d = int(ms * SR / 1000.0)
        if d < n:
            rev_r[d:] += (0.7 * src_r[:-d] + 0.3 * src_l[:-d]) * g * decay

    late_l = lowpass_1pole(rev_l, min(2100.0, tone_hz * 0.72))
    late_r = lowpass_1pole(rev_r, min(2100.0, tone_hz * 0.72))
    for ms, g in [(241, 0.36), (467, 0.26), (823, 0.16), (1217, 0.09)]:
        d = int(ms * SR / 1000.0)
        if d < n:
            rev_l[d:] += late_r[:-d] * g * decay
            rev_r[d:] += late_l[:-d] * g * decay

    if shimmer > 0.0:
        mono_hi = bandpass_fft((rev_l + rev_r) * 0.5, 220.0, 1750.0)
        half = mono_hi[::2]
        shim = np.zeros(n, dtype=np.float64)
        shift_d = int(0.32 * SR)
        seg_len = min(len(half), n - shift_d)
        if seg_len > 0:
            shim[shift_d : shift_d + seg_len] += half[:seg_len] * 0.55
        shift_d2 = int(0.68 * SR)
        seg_len2 = min(len(half), n - shift_d2)
        if seg_len2 > 0:
            shim[shift_d2 : shift_d2 + seg_len2] += half[:seg_len2] * 0.38
        shim = lowpass_1pole(shim, 3400.0)
        rev_l += shim * shimmer
        rev_r += np.roll(shim, int(0.017 * SR)) * shimmer

    return np.stack(
        [out_l * (1.0 - wet * 0.25) + rev_l * wet, out_r * (1.0 - wet * 0.25) + rev_r * wet],
        axis=1,
    )


# =============================================================================
# EXPRESSIVE WARM ACOUSTIC INSTRUMENT VOICES
# =============================================================================

def synth_harp(midi_note, dur=3.2, vel=0.7):
    """Warm celestial concert harp pluck with silky acoustic damping."""
    f0 = midi_to_hz(midi_note)
    n = int(dur * SR)
    t = np.arange(n) / SR
    sig = np.zeros(n, dtype=np.float64)
    partials = [(1.0, 1.0, 1.45), (2.0, 0.40, 2.6), (3.0, 0.16, 4.2), (4.0, 0.06, 6.4)]
    for mult, amp, dec in partials:
        if f0 * mult < 8500:
            sig += amp * np.sin(2.0 * math.pi * f0 * mult * t) * np.exp(-t * dec)
    atk = np.minimum(1.0, t / 0.014)
    atk = atk * atk * (3.0 - 2.0 * atk)
    rel = np.minimum(1.0, np.maximum(0.0, (dur - t) / 0.18))
    return lowpass_1pole(sig * atk * rel, 3600.0) * vel


def synth_celesta(midi_note, dur=3.6, vel=0.65):
    """Warm felt-hammered glass celesta (zero metallic clang, velvety upper bloom)."""
    f0 = midi_to_hz(midi_note)
    n = int(dur * SR)
    t = np.arange(n) / SR
    sig = (
        1.00 * np.sin(2 * math.pi * f0 * t) * np.exp(-t * 1.25)
        + 0.26 * np.sin(2 * math.pi * f0 * 2.0 * t) * np.exp(-t * 2.6)
        + 0.08 * np.sin(2 * math.pi * f0 * 3.0 * t) * np.exp(-t * 4.5)
    )
    atk = np.clip(t / 0.018, 0.0, 1.0)
    atk = atk * atk * (3.0 - 2.0 * atk)
    rel = np.clip((dur - t) / 0.25, 0.0, 1.0)
    return lowpass_1pole(sig * atk * rel, 3200.0) * vel


def synth_felt_bell(midi_note, dur=2.0, vel=0.55):
    """Ultra-soothing wooden marimba / felt glass chime specifically designed for gentle SFX."""
    f0 = midi_to_hz(midi_note)
    n = int(dur * SR)
    t = np.arange(n) / SR
    sig = (
        1.00 * np.sin(2 * math.pi * f0 * t) * np.exp(-t * 2.1)
        + 0.22 * np.sin(2 * math.pi * f0 * 2.0 * t) * np.exp(-t * 4.8)
        + 0.06 * np.sin(2 * math.pi * f0 * 3.0 * t) * np.exp(-t * 8.0)
    )
    atk = np.clip(t / 0.022, 0.0, 1.0)
    atk = atk * atk * (3.0 - 2.0 * atk)
    rel = np.clip((dur - t) / max(0.12, dur * 0.25), 0.0, 1.0)
    return lowpass_1pole(sig * atk * rel, 2400.0) * vel


def synth_marimba(midi_note, dur=0.55, vel=0.50):
    """Warm round hollow rosewood / porcelain marimba tap (gentle percussive resonance)."""
    f0 = midi_to_hz(midi_note)
    n = int(dur * SR)
    t = np.arange(n) / SR
    sig = (
        1.00 * np.sin(2 * math.pi * f0 * t) * np.exp(-t * 6.5)
        + 0.16 * np.sin(2 * math.pi * f0 * 3.98 * t) * np.exp(-t * 18.0)
    )
    atk = np.clip(t / 0.010, 0.0, 1.0)
    atk = atk * atk * (3.0 - 2.0 * atk)
    rel = np.clip((dur - t) / 0.08, 0.0, 1.0)
    return lowpass_1pole(sig * atk * rel, 2200.0) * vel


def synth_pad_chord(buf, midi_notes, start_sec, dur, gain=0.18, brightness=1500.0):
    """Lush stereophonic ethereal choir/string pad chord with slow swelling motion."""
    n = int((dur + 2.5) * SR)
    t = np.arange(n) / SR
    left = np.zeros(n, dtype=np.float64)
    right = np.zeros(n, dtype=np.float64)
    atk = np.clip(t / min(1.8, dur * 0.34), 0.0, 1.0)
    atk = atk * atk * (3.0 - 2.0 * atk)
    rel = np.clip((dur + 2.2 - t) / 2.4, 0.0, 1.0)
    rel = rel * rel * (3.0 - 2.0 * rel)
    env = atk * rel

    for idx_n, m in enumerate(midi_notes):
        f0 = midi_to_hz(m)
        detunes = [(-0.0030, -0.62), (-0.0010, 0.25), (0.0012, -0.25), (0.0032, 0.62)]
        vib = 1.0 + 0.0020 * np.sin(2 * math.pi * (0.24 + idx_n * 0.05) * t + idx_n)
        for dt, pan in detunes:
            f = f0 * (1.0 + dt) * vib
            phase = 2.0 * math.pi * np.cumsum(f) / SR
            voice = (
                1.00 * np.sin(phase)
                + 0.38 * np.sin(2.0 * phase)
                + 0.16 * np.sin(3.0 * phase)
                + 0.06 * np.sin(4.0 * phase)
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
    vib = 1.0 + 0.0035 * np.sin(2 * math.pi * 4.4 * t) * np.clip(t / 1.0, 0.0, 1.0)
    phase = 2.0 * math.pi * np.cumsum(f0 * vib) / SR
    sig = np.zeros(n, dtype=np.float64)
    for k in range(1, 8):
        sig += (1.0 / (k ** 1.45)) * np.sin(k * phase)
    atk = np.clip(t / min(0.65, dur * 0.25), 0.0, 1.0)
    rel = np.clip((dur - t) / min(0.85, dur * 0.3), 0.0, 1.0)
    return lowpass_1pole(sig * atk * rel, 1250.0) * vel


def synth_bowl(midi_note, dur=7.0, vel=0.32):
    """Deep soothing crystal singing-bowl / warm temple resonance."""
    f0 = midi_to_hz(midi_note)
    n = int(dur * SR)
    t = np.arange(n) / SR
    sig = (
        0.90 * np.sin(2 * math.pi * f0 * t) * np.exp(-t * 0.45)
        + 0.42 * np.sin(2 * math.pi * f0 * 1.0022 * t) * np.exp(-t * 0.48)
        + 0.14 * np.sin(2 * math.pi * f0 * 2.0 * t) * np.exp(-t * 1.1)
    )
    atk = np.clip(t / 0.16, 0.0, 1.0)
    atk = atk * atk * (3.0 - 2.0 * atk)
    rel = np.clip((dur - t) / max(0.35, dur * 0.2), 0.0, 1.0)
    return lowpass_1pole(sig * atk * rel, 2200.0) * vel


def synth_taiko(dur=0.75, pitch=64.0, vel=0.58):
    """Warm deep orchestral timpani / felt-mallet drum pulse (rounded attack, zero harsh crack)."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    freq = pitch * (1.0 + 0.85 * np.exp(-t * 24.0))
    phase = 2.0 * math.pi * np.cumsum(freq) / SR
    body = np.sin(phase) * np.exp(-t * 4.8) + 0.25 * np.sin(1.5 * phase) * np.exp(-t * 8.5)
    atk = np.clip(t / 0.014, 0.0, 1.0)
    rel = np.clip((dur - t) / 0.12, 0.0, 1.0)
    return lowpass_1pole(body * atk * rel, 520.0) * vel


def synth_brass(midi_note, dur=1.4, vel=0.34):
    """Warm golden French-horn / choir lead."""
    f0 = midi_to_hz(midi_note)
    n = int(dur * SR)
    t = np.arange(n) / SR
    vib = 1.0 + 0.0035 * np.sin(2 * math.pi * 4.8 * t) * np.clip(t / 0.35, 0.0, 1.0)
    sig = np.zeros(n, dtype=np.float64)
    for dt in (-0.0028, 0.0, 0.0030):
        phase = 2.0 * math.pi * np.cumsum(f0 * (1.0 + dt) * vib) / SR
        for k in range(1, 7):
            sig += (1.0 / (k ** 1.35)) * np.sin(k * phase)
    atk = np.clip(t / 0.11, 0.0, 1.0)
    rel = np.clip((dur - t) / 0.24, 0.0, 1.0)
    return lowpass_1pole(sig * atk * rel, 1850.0) * (vel / 3.0)


def synth_wood_flute(midi_note, dur=1.8, vel=0.40, bend=0.0):
    """Breathy celestial wooden pan-flute voice for Nimbus Stag & peaceful calls."""
    f0 = midi_to_hz(midi_note)
    n = int(dur * SR)
    t = np.arange(n) / SR
    glide = 1.0 + bend * np.sin(math.pi * np.clip(t / dur, 0, 1))
    vib = 1.0 + 0.004 * np.sin(2 * math.pi * 4.5 * t) * np.clip(t / 0.4, 0, 1)
    phase = 2.0 * math.pi * np.cumsum(f0 * glide * vib) / SR
    tone = np.sin(phase) + 0.22 * np.sin(2 * phase) + 0.06 * np.sin(3 * phase)
    atk = np.clip(t / 0.14, 0.0, 1.0)
    atk = atk * atk * (3.0 - 2.0 * atk)
    rel = np.clip((dur - t) / 0.35, 0.0, 1.0)
    return lowpass_1pole(tone * atk * rel, 1900.0) * vel


# =============================================================================
# 1. FOUR FULL-LENGTH ORIGINAL OST TRACKS (Spacious Warm Mastering)
# =============================================================================

def compose_glass_horizon():
    """OST 1: 'Glass Horizon' — Main Auralis Exploration Theme (68s, D Lydian, 66 BPM)."""
    total_sec = 68.0
    buf = np.zeros((int(total_sec * SR), 2), dtype=np.float64)
    beat = 60.0 / 66.0

    chords = [
        (0, 8, [50, 57, 61, 64, 66], 0.16, 1250),
        (8, 8, [52, 59, 64, 66, 68], 0.17, 1450),
        (16, 4, [50, 57, 62, 66, 69], 0.20, 1650),
        (20, 4, [52, 59, 64, 68, 71], 0.20, 1750),
        (24, 4, [54, 61, 64, 69, 73], 0.20, 1650),
        (28, 4, [45, 57, 61, 64, 71], 0.19, 1550),
        (32, 4, [47, 54, 59, 62, 66], 0.21, 1800),
        (36, 4, [43, 55, 59, 62, 66], 0.21, 1850),
        (40, 4, [50, 57, 62, 66, 68], 0.22, 1900),
        (44, 4, [45, 52, 57, 61, 64], 0.20, 1650),
        (48, 4, [50, 57, 61, 64, 66], 0.19, 1550),
        (52, 4, [52, 59, 64, 68, 71], 0.18, 1450),
        (56, 8, [50, 57, 62, 66, 73], 0.17, 1200),
    ]
    for b_start, b_len, notes, gain, bright in chords:
        synth_pad_chord(buf, notes, b_start * beat, b_len * beat, gain=gain, brightness=bright)
        if b_start in (0, 16, 32, 48, 56):
            add_stereo(buf, synth_bowl(notes[0] + 12, dur=7.5, vel=0.19), b_start * beat, pan=-0.15)

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
            vel = 0.25 * (0.88 + 0.12 * math.sin(s * 0.9))
            if b0 >= 56:
                vel *= max(0.2, 1.0 - s / max(1, steps))
            add_stereo(buf, synth_harp(note, dur=2.8, vel=vel), t_sec, pan=pan)

    melody = [
        (4.0, 78, 2.5, 0.20), (6.0, 80, 2.5, 0.22), (7.0, 81, 3.0, 0.24), (10.0, 76, 3.5, 0.20),
        (16.0, 78, 2.2, 0.30), (17.5, 81, 1.8, 0.28), (18.5, 80, 2.4, 0.30), (19.5, 78, 2.0, 0.28),
        (20.5, 76, 2.8, 0.30), (22.0, 73, 2.4, 0.26), (23.0, 76, 2.5, 0.28),
        (24.0, 78, 2.2, 0.30), (25.5, 81, 2.0, 0.30), (26.5, 85, 2.8, 0.34), (28.0, 83, 2.6, 0.30),
        (29.5, 81, 2.2, 0.28), (30.5, 76, 3.2, 0.26),
        (32.0, 83, 2.2, 0.34), (33.5, 85, 2.0, 0.34), (34.5, 86, 2.8, 0.36), (36.0, 83, 2.4, 0.32),
        (37.5, 81, 2.0, 0.30), (38.5, 78, 2.5, 0.30), (40.0, 80, 2.4, 0.34), (41.0, 81, 2.2, 0.34),
        (42.0, 85, 3.0, 0.38), (44.0, 81, 3.2, 0.32), (46.0, 76, 3.2, 0.28),
        (48.0, 78, 2.4, 0.28), (49.5, 81, 2.2, 0.26), (50.5, 80, 2.5, 0.28), (52.0, 76, 3.0, 0.25),
        (54.0, 73, 3.0, 0.22), (56.0, 74, 4.5, 0.26), (58.0, 78, 4.5, 0.22), (60.0, 81, 5.0, 0.18),
    ]
    for b_pos, note, d_sec, vel in melody:
        add_stereo(buf, synth_celesta(note, dur=d_sec, vel=vel), b_pos * beat, pan=0.18 * math.sin(b_pos))

    cello_line = [
        (16, 50, 4), (20, 52, 4), (24, 54, 4), (28, 45, 4),
        (32, 47, 4), (36, 43, 4), (40, 50, 4), (44, 45, 4), (48, 50, 8),
    ]
    for b_pos, note, b_len in cello_line:
        add_stereo(buf, synth_cello(note, dur=b_len * beat * 1.05, vel=0.24), b_pos * beat, pan=-0.12)

    buf = apply_shimmer_reverb(buf, wet=0.46, shimmer=0.16, decay=0.72, tone_hz=3200.0)
    fade_in = np.linspace(0.0, 1.0, int(1.5 * SR))[:, None]
    fade_out = np.linspace(1.0, 0.0, int(4.0 * SR))[:, None]
    buf[: len(fade_in)] *= fade_in
    buf[-len(fade_out) :] *= fade_out
    save_ogg(buf, MUSIC_DIR / "glass_horizon.ogg", quality="5", target_peak=0.66, soft_limit=True)


def compose_drifting_atolls():
    """OST 2: 'Drifting Atolls' — High-Altitude Spire Gardens Theme (64s, A Lydian, 58 BPM)."""
    total_sec = 64.0
    buf = np.zeros((int(total_sec * SR), 2), dtype=np.float64)
    beat = 60.0 / 58.0

    chords = [
        (0, 8, [45, 52, 57, 61, 63], 0.17, 1250),
        (8, 8, [47, 54, 59, 63, 66], 0.18, 1450),
        (16, 8, [42, 49, 54, 57, 61], 0.19, 1550),
        (24, 8, [52, 59, 64, 68, 71], 0.20, 1700),
        (32, 8, [50, 57, 62, 66, 69], 0.19, 1650),
        (40, 8, [49, 56, 61, 64, 68], 0.18, 1500),
        (48, 10, [45, 52, 57, 61, 68], 0.17, 1200),
    ]
    for b_start, b_len, notes, gain, bright in chords:
        synth_pad_chord(buf, notes, b_start * beat, b_len * beat, gain=gain, brightness=bright)
        add_stereo(buf, synth_bowl(notes[0] + 12, dur=8.5, vel=0.20), b_start * beat, pan=0.22 * math.cos(b_start))
        add_stereo(buf, synth_cello(notes[0], dur=b_len * beat, vel=0.20), b_start * beat, pan=-0.18)

    chime_events = [
        (2.0, 76), (3.5, 78), (5.0, 80), (6.5, 83),
        (9.5, 82), (11.0, 78), (13.0, 73), (14.5, 78),
        (17.0, 76), (18.5, 75), (20.0, 71), (22.0, 68), (23.0, 71),
        (25.0, 75), (26.5, 78), (28.0, 83), (29.5, 82), (31.0, 78),
        (33.0, 80), (34.5, 76), (36.5, 73), (38.0, 76),
        (41.0, 75), (42.5, 71), (44.0, 68), (46.0, 71), (47.0, 75),
        (49.0, 76), (51.0, 80), (53.5, 83),
    ]
    for idx_c, (b_pos, note) in enumerate(chime_events):
        pan = -0.50 + 1.0 * ((idx_c * 37 % 11) / 10.0)
        add_stereo(buf, synth_celesta(note, dur=4.5, vel=0.25), b_pos * beat, pan=pan)
        if idx_c % 3 == 0:
            add_stereo(buf, synth_harp(note - 12, dur=3.5, vel=0.19), (b_pos + 0.25) * beat, pan=-pan * 0.6)

    buf = apply_shimmer_reverb(buf, wet=0.50, shimmer=0.18, decay=0.74, tone_hz=3000.0)
    fade_in = np.linspace(0.0, 1.0, int(2.0 * SR))[:, None]
    fade_out = np.linspace(1.0, 0.0, int(4.5 * SR))[:, None]
    buf[: len(fade_in)] *= fade_in
    buf[-len(fade_out) :] *= fade_out
    save_ogg(buf, MUSIC_DIR / "drifting_atolls.ogg", quality="5", target_peak=0.65, soft_limit=True)


def compose_sunken_chimes():
    """OST 3: 'Sunken Chimes' — Bell-Reef Lagoon & Cloud Plains Theme (62s, E Dorian/Minor 9, 62 BPM)."""
    total_sec = 62.0
    buf = np.zeros((int(total_sec * SR), 2), dtype=np.float64)
    beat = 60.0 / 62.0

    chords = [
        (0, 8, [40, 47, 52, 55, 59, 62], 0.18, 1180),
        (8, 8, [48, 55, 59, 62, 64], 0.19, 1300),
        (16, 8, [45, 52, 57, 60, 64], 0.19, 1350),
        (24, 8, [47, 54, 59, 62, 66], 0.20, 1450),
        (32, 8, [43, 50, 55, 59, 62], 0.20, 1500),
        (40, 8, [48, 55, 59, 64, 66], 0.19, 1350),
        (48, 12, [40, 47, 52, 59, 66], 0.17, 1120),
    ]
    for b_start, b_len, notes, gain, bright in chords:
        synth_pad_chord(buf, notes, b_start * beat, b_len * beat, gain=gain, brightness=bright)
        add_stereo(buf, synth_bowl(notes[0] + 12, dur=8.0, vel=0.16), b_start * beat, pan=0.0)

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
            pan = 0.42 * math.sin(s * 0.65)
            vel = 0.23 * (1.0 if ci < 6 else max(0.18, 1.0 - s / 12.0))
            add_stereo(buf, synth_harp(seq[s % len(seq)], dur=3.0, vel=vel), t_sec, pan=pan)

    mel = [
        (4.0, 76), (5.5, 74), (6.5, 71), (8.0, 74), (10.0, 76), (12.0, 79), (14.0, 78),
        (16.0, 76), (18.0, 72), (19.5, 71), (21.0, 69), (24.0, 71), (26.0, 74), (28.0, 78), (30.0, 79),
        (32.0, 83), (34.0, 81), (35.5, 79), (37.0, 78), (40.0, 79), (42.0, 76), (44.0, 74), (46.0, 71),
        (48.0, 76), (51.0, 74), (54.0, 71),
    ]
    for b_pos, note in mel:
        add_stereo(buf, synth_celesta(note, dur=3.2, vel=0.23), b_pos * beat, pan=-0.22)

    buf = apply_shimmer_reverb(buf, wet=0.46, shimmer=0.15, decay=0.70, tone_hz=3000.0)
    fade_in = np.linspace(0.0, 1.0, int(1.8 * SR))[:, None]
    fade_out = np.linspace(1.0, 0.0, int(4.0 * SR))[:, None]
    buf[: len(fade_in)] *= fade_in
    buf[-len(fade_out) :] *= fade_out
    save_ogg(buf, MUSIC_DIR / "sunken_chimes.ogg", quality="5", target_peak=0.65, soft_limit=True)


def compose_seraph_crescendo():
    """OST 4: 'Crescendo of the Glass Tide' — Astral Seraph Boss Theme (56s, D minor, 124 BPM)."""
    total_sec = 56.0
    buf = np.zeros((int(total_sec * SR), 2), dtype=np.float64)
    beat = 60.0 / 124.0

    prog = [
        (0, 8, [38, 45, 50, 53, 57]),
        (8, 8, [34, 46, 50, 53, 57]),
        (16, 8, [36, 48, 52, 55, 60]),
        (24, 8, [33, 45, 49, 52, 57]),
        (32, 8, [38, 45, 50, 53, 57]),
        (40, 8, [39, 46, 51, 55, 58]),
        (48, 8, [34, 46, 50, 53, 57]),
        (56, 8, [33, 45, 49, 52, 55]),
        (64, 8, [38, 45, 50, 53, 57]),
        (72, 8, [34, 46, 50, 53, 60]),
        (80, 8, [36, 48, 52, 55, 62]),
        (88, 8, [38, 45, 50, 57, 62]),
        (96, 12, [38, 45, 50, 53, 57]),
    ]
    for b0, blen, notes in prog:
        synth_pad_chord(buf, notes, b0 * beat, blen * beat, gain=0.22, brightness=2100)
        add_stereo(buf, synth_cello(notes[0], dur=blen * beat, vel=0.32), b0 * beat, pan=0.0)
        if b0 % 16 == 0:
            add_stereo(buf, synth_bowl(notes[2] + 12, dur=5.0, vel=0.24), b0 * beat, pan=0.0)

    for bar in range(26):
        b_base = bar * 4
        intensity = 0.68 if bar < 8 else (0.90 if bar < 24 else 0.55)
        add_stereo(buf, synth_taiko(0.65, pitch=62.0, vel=0.52 * intensity), b_base * beat, pan=0.0)
        add_stereo(buf, synth_taiko(0.35, pitch=86.0, vel=0.28 * intensity), (b_base + 1.5) * beat, pan=-0.25)
        add_stereo(buf, synth_taiko(0.50, pitch=70.0, vel=0.42 * intensity), (b_base + 2.0) * beat, pan=0.15)
        add_stereo(buf, synth_taiko(0.30, pitch=98.0, vel=0.26 * intensity), (b_base + 3.0) * beat, pan=0.30)
        add_stereo(buf, synth_taiko(0.28, pitch=88.0, vel=0.22 * intensity), (b_base + 3.5) * beat, pan=-0.30)

    ost_sets = [
        [62, 65, 69, 74], [58, 62, 65, 69], [60, 64, 67, 72], [57, 61, 64, 69],
        [62, 65, 69, 74], [63, 67, 70, 75], [58, 62, 65, 70], [57, 61, 64, 69],
        [62, 65, 69, 74], [58, 62, 65, 72], [60, 64, 67, 74], [62, 69, 74, 77],
    ]
    for seg_i, notes in enumerate(ost_sets):
        b0 = seg_i * 8
        for s in range(16):
            n_m = notes[s % 4] + (12 if s >= 8 and seg_i >= 4 else 0)
            pan = -0.40 if s % 2 == 0 else 0.40
            add_stereo(buf, synth_harp(n_m, dur=1.1, vel=0.26), (b0 + s * 0.5) * beat, pan=pan)

    lead = [
        (8, 74, 1.5), (9.5, 76, 1.0), (10.5, 77, 1.5), (12, 81, 2.0), (14, 79, 2.0),
        (16, 77, 1.5), (17.5, 76, 1.0), (18.5, 74, 1.5), (20, 72, 2.0), (22, 76, 2.0),
        (24, 73, 3.0), (27, 76, 1.5), (28.5, 79, 2.0), (30.5, 76, 1.5),
        (32, 74, 2.0), (34, 81, 2.0), (36, 86, 2.5), (38.5, 84, 1.5),
        (40, 82, 2.0), (42, 79, 1.5), (43.5, 75, 2.5), (46, 79, 2.0),
        (48, 81, 2.0), (50, 77, 2.0), (52, 74, 2.0), (54, 77, 2.0),
        (56, 76, 3.0), (59, 73, 2.0), (61, 76, 3.0),
        (64, 86, 2.5), (66.5, 84, 1.5), (68, 81, 2.0), (70, 84, 2.0),
        (72, 82, 2.5), (74.5, 81, 1.5), (76, 77, 2.0), (78, 81, 2.0),
        (80, 79, 2.0), (82, 84, 2.0), (84, 86, 2.0), (86, 88, 2.0),
        (88, 86, 5.0), (93, 81, 3.0),
    ]
    for b_pos, note, b_len in lead:
        add_stereo(buf, synth_brass(note - 12, dur=b_len * beat * 1.05, vel=0.32), b_pos * beat, pan=0.0)
        add_stereo(buf, synth_celesta(note - 12 if note > 84 else note, dur=b_len * beat * 1.3, vel=0.22), b_pos * beat, pan=0.12)

    buf = apply_shimmer_reverb(buf, wet=0.36, shimmer=0.12, decay=0.60, tone_hz=3000.0)
    fade_in = np.linspace(0.0, 1.0, int(0.8 * SR))[:, None]
    fade_out = np.linspace(1.0, 0.0, int(3.0 * SR))[:, None]
    buf[: len(fade_in)] *= fade_in
    buf[-len(fade_out) :] *= fade_out
    save_ogg(buf, MUSIC_DIR / "seraph_crescendo.ogg", quality="5", target_peak=0.68, soft_limit=True)


# =============================================================================
# 2. THIRTY-ONE GENTLE, REMASTERED BESPOKE SOUND EFFECTS (.ogg)
# =============================================================================

def generate_sfx():
    rng = np.random.default_rng(2026)

    # 1. ritual_chime: Warm golden singing-bowl + soft felt-chime fifth (D5 + A5)
    buf = np.zeros((int(3.0 * SR), 2))
    add_stereo(buf, synth_bowl(62, dur=2.8, vel=0.52), 0.0, pan=0.0)
    add_stereo(buf, synth_felt_bell(74, dur=2.4, vel=0.40), 0.02, pan=-0.12)
    add_stereo(buf, synth_felt_bell(81, dur=2.1, vel=0.24), 0.06, pan=0.14)
    buf = lowpass_stereo(apply_shimmer_reverb(buf, wet=0.40, shimmer=0.12, decay=0.60, tone_hz=2600.0), 2800.0)
    save_ogg(buf, SFX_DIR / "ritual_chime.ogg", "4", target_peak=0.44)

    # 2. ritual_swell: Velvety 4.5s harmonic convergence swell (warm choir + gentle rising chime)
    dur = 4.6
    n = int(dur * SR)
    t = np.arange(n) / SR
    buf = np.zeros((n, 2))
    synth_pad_chord(buf, [50, 57, 62, 66, 69, 74], 0.0, 4.0, gain=0.28, brightness=1900)
    air = bandpass_fft(rng.standard_normal(n), 220, 1350) * ((t / dur) ** 1.4) * 0.14
    add_stereo(buf, air, 0.0, pan=0.0)
    for i, m in enumerate([62, 66, 69, 74, 78, 81]):
        add_stereo(buf, synth_felt_bell(m, dur=1.9, vel=0.22 + i * 0.03), 0.4 + i * 0.55, pan=-0.35 + i * 0.14)
    buf *= np.clip((dur - t) / 0.55, 0.0, 1.0)[:, None]
    buf = lowpass_stereo(apply_shimmer_reverb(buf, wet=0.44, shimmer=0.14, decay=0.68, tone_hz=2600.0), 2800.0)
    save_ogg(buf, SFX_DIR / "ritual_swell.ogg", "4", target_peak=0.48)

    # 3. portal_ascend: Dreamy upward Lydian concert harp glissando + soft breeze
    dur = 3.8
    n = int(dur * SR)
    t = np.arange(n) / SR
    buf = np.zeros((n, 2))
    gliss = [50, 57, 62, 66, 68, 69, 73, 74, 78, 81]
    for i, m in enumerate(gliss):
        add_stereo(buf, synth_harp(m, dur=2.5, vel=0.34), i * 0.10, pan=-0.45 + i / max(1, len(gliss)))
    whoosh = bandpass_fft(rng.standard_normal(n), 180, 1250) * (np.sin(math.pi * np.clip(t / 2.4, 0, 1)) ** 2) * 0.22
    add_stereo(buf, whoosh, 0.0, pan=0.0)
    add_stereo(buf, synth_bowl(62, dur=3.5, vel=0.32), 0.1, pan=0.0)
    buf = lowpass_stereo(apply_shimmer_reverb(buf, wet=0.48, shimmer=0.16, decay=0.68, tone_hz=2800.0), 3000.0)
    save_ogg(buf, SFX_DIR / "portal_ascend.ogg", "4", target_peak=0.48)

    # 4. portal_return: Warm descending acoustic resolution returning to Overworld
    dur = 3.2
    buf = np.zeros((int(dur * SR), 2))
    for i, m in enumerate([78, 74, 69, 66, 62, 57]):
        add_stereo(buf, synth_harp(m, dur=2.2, vel=0.32), i * 0.12, pan=0.35 - i * 0.12)
    add_stereo(buf, synth_bowl(50, dur=3.0, vel=0.30), 0.05, pan=0.0)
    buf = lowpass_stereo(apply_shimmer_reverb(buf, wet=0.42, shimmer=0.10, decay=0.62, tone_hz=2600.0), 2800.0)
    save_ogg(buf, SFX_DIR / "portal_return.ogg", "4", target_peak=0.44)

    # 5. portal_hum: Seamless 4.0s gentle singing-bowl hum loop
    dur = 4.0
    n = int(dur * SR)
    t = np.arange(n) / SR
    hum = np.zeros(n)
    for hz, amp in [(146.75, 0.40), (220.0, 0.25), (293.5, 0.14), (440.0, 0.05)]:
        lfo = 0.88 + 0.12 * np.sin(2 * math.pi * 0.5 * t)
        hum += amp * lfo * np.sin(2 * math.pi * hz * t)
    save_ogg(np.stack([hum, np.roll(hum, int(0.015 * SR))], axis=1), SFX_DIR / "portal_hum.ogg", "4", target_peak=0.28)

    # 6. ambient_wind: Seamless 10.0s gentle low-mid twilight breeze
    dur = 10.0
    n = int(dur * SR)
    t = np.arange(n) / SR
    raw = rng.standard_normal(n)
    wind_l = bandpass_fft(raw, 120, 620) * (0.68 + 0.32 * np.sin(2 * math.pi * 0.1 * t)) * 0.30
    wind_r = bandpass_fft(np.roll(raw, 17321), 135, 660) * (0.68 + 0.32 * np.cos(2 * math.pi * 0.1 * t)) * 0.30
    sh = (0.03 * np.sin(2 * math.pi * 293.6 * t) + 0.02 * np.sin(2 * math.pi * 440.0 * t)) * (0.5 + 0.5 * np.sin(2 * math.pi * 0.2 * t))
    save_ogg(np.stack([wind_l + sh, wind_r + sh], axis=1), SFX_DIR / "ambient_wind.ogg", "4", target_peak=0.24)

    # 7 & 8. ambient_chime_1 & ambient_chime_2: Soft distant twilight wind-chime flourishes
    for idx_a, notes in enumerate([[69, 74, 78, 81], [76, 73, 69, 66]]):
        buf = np.zeros((int(3.6 * SR), 2))
        for i, m in enumerate(notes):
            add_stereo(buf, synth_felt_bell(m, dur=2.5, vel=0.28), i * 0.25, pan=-0.30 + i * 0.20)
        buf = lowpass_stereo(apply_shimmer_reverb(buf, wet=0.50, shimmer=0.12, decay=0.68, tone_hz=2400.0), 2500.0)
        save_ogg(buf, SFX_DIR / f"ambient_chime_{idx_a+1}.ogg", "4", target_peak=0.30)

    # 9. ambient_mood: Deep peaceful singing-bowl twilight sigh
    buf = np.zeros((int(5.5 * SR), 2))
    add_stereo(buf, synth_bowl(50, dur=5.2, vel=0.36), 0.0, pan=-0.1)
    add_stereo(buf, synth_bowl(62, dur=4.8, vel=0.20), 0.35, pan=0.18)
    buf = lowpass_stereo(apply_shimmer_reverb(buf, wet=0.46, shimmer=0.10, decay=0.70, tone_hz=2000.0), 2200.0)
    save_ogg(buf, SFX_DIR / "ambient_mood.ogg", "4", target_peak=0.30)

    # 10. crystal_step: Soft, warm wooden-glass marimba droplet (NEVER shrill!)
    buf = np.zeros((int(0.65 * SR), 2))
    add_stereo(buf, synth_marimba(69, dur=0.52, vel=0.50), 0.0, pan=0.0)
    add_stereo(buf, synth_felt_bell(76, dur=0.45, vel=0.22), 0.025, pan=0.08)
    buf = lowpass_stereo(apply_shimmer_reverb(buf, wet=0.24, shimmer=0.0, decay=0.38, tone_hz=2100.0), 2200.0)
    save_ogg(buf, SFX_DIR / "crystal_step.ogg", "4", target_peak=0.30)

    # 11. crystal_break: Pleasant soft sea-glass wind-chime cascade (ZERO harsh white-noise shriek!)
    dur = 1.05
    n = int(dur * SR)
    t = np.arange(n) / SR
    buf = np.zeros((n, 2))
    for i, m in enumerate([74, 78, 81, 76, 83]):
        add_stereo(buf, synth_marimba(m, dur=0.48, vel=0.32), i * 0.038, pan=-0.35 + i * 0.18)
    soft_sand = bandpass_fft(rng.standard_normal(n), 450, 2100) * np.exp(-t * 16.0) * 0.14
    add_stereo(buf, soft_sand, 0.0, pan=0.0)
    buf = lowpass_stereo(apply_shimmer_reverb(buf, wet=0.28, shimmer=0.0, decay=0.40, tone_hz=2300.0), 2400.0)
    save_ogg(buf, SFX_DIR / "crystal_break.ogg", "4", target_peak=0.36)

    # 12. gale_prism: Velvety warm rose-gold upward wind breeze + harp fifth
    dur = 1.8
    n = int(dur * SR)
    t = np.arange(n) / SR
    buf = np.zeros((n, 2))
    whoosh = bandpass_fft(rng.standard_normal(n), 220, 1450) * np.exp(-((t - 0.30) ** 2) / 0.10) * 0.42
    add_stereo(buf, whoosh, 0.0, pan=0.0)
    for i, m in enumerate([62, 66, 69, 74]):
        add_stereo(buf, synth_harp(m, dur=1.4, vel=0.34), 0.05 + i * 0.06, pan=-0.25 + i * 0.18)
    buf = lowpass_stereo(apply_shimmer_reverb(buf, wet=0.36, shimmer=0.10, decay=0.52, tone_hz=2600.0), 2800.0)
    save_ogg(buf, SFX_DIR / "gale_prism.ogg", "4", target_peak=0.44)

    # 13. starblade_slash: Smooth resonant sweeping starlight arc (warm, crisp, zero ear-piercing sweep)
    dur = 1.0
    n = int(dur * SR)
    t = np.arange(n) / SR
    buf = np.zeros((n, 2))
    sw_f = 680.0 * np.exp(-t * 5.2) + 210.0
    blade = np.sin(2 * math.pi * np.cumsum(sw_f) / SR) * np.clip(t / 0.015, 0, 1) * np.exp(-t * 5.0) * 0.42
    air = bandpass_fft(rng.standard_normal(n), 320, 1900) * np.clip(t / 0.015, 0, 1) * np.exp(-t * 8.5) * 0.28
    add_stereo(buf, blade + air, 0.0, pan=0.0)
    add_stereo(buf, synth_felt_bell(78, dur=0.75, vel=0.28), 0.02, pan=0.12)
    buf = lowpass_stereo(apply_shimmer_reverb(buf, wet=0.30, shimmer=0.08, decay=0.45, tone_hz=2400.0), 2600.0)
    save_ogg(buf, SFX_DIR / "starblade_slash.ogg", "4", target_peak=0.46)

    # 14-16. lyre_chord_1..3: Three lush rolled celestial harp chords (Dmaj9, Bm11, Gmaj7#11)
    lyre_chords = [
        [62, 66, 69, 73, 76, 81],
        [59, 62, 66, 69, 74, 78],
        [55, 59, 62, 66, 73, 78],
    ]
    for ci, notes in enumerate(lyre_chords):
        buf = np.zeros((int(3.4 * SR), 2))
        for i, m in enumerate(notes):
            add_stereo(buf, synth_harp(m, dur=3.0, vel=0.36), i * 0.06, pan=-0.35 + i * 0.14)
        buf = lowpass_stereo(apply_shimmer_reverb(buf, wet=0.44, shimmer=0.14, decay=0.66, tone_hz=3000.0), 3200.0)
        save_ogg(buf, SFX_DIR / f"lyre_chord_{ci+1}.ogg", "4", target_peak=0.45)

    # 17. manta_call: Deep haunting velvety celestial whale-song of the Lumina Ray
    dur = 3.4
    n = int(dur * SR)
    t = np.arange(n) / SR
    buf = np.zeros((n, 2))
    f_curve = 246.94 * (1.0 + 0.44 * (np.sin(math.pi * np.clip(t / 2.6, 0, 1)) ** 1.4) - 0.12 * (t / dur))
    ph = 2 * math.pi * np.cumsum(f_curve) / SR
    env = np.sin(math.pi * np.clip(t / 3.0, 0, 1)) ** 1.7
    song = (np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.10 * np.sin(3 * ph)) * env * 0.42
    add_stereo(buf, lowpass_1pole(song, 1300.0), 0.0, pan=0.0)
    buf = lowpass_stereo(apply_shimmer_reverb(buf, wet=0.48, shimmer=0.12, decay=0.68, tone_hz=2000.0), 2100.0)
    save_ogg(buf, SFX_DIR / "manta_call.ogg", "4", target_peak=0.40)

    # 18. wisp_sing: Sweet mid-register musical greeting of the Choir Wisp
    buf = np.zeros((int(2.2 * SR), 2))
    for i, m in enumerate([74, 78, 81, 86]):
        add_stereo(buf, synth_felt_bell(m, dur=1.35, vel=0.32), i * 0.16, pan=-0.22 + i * 0.15)
    buf = lowpass_stereo(apply_shimmer_reverb(buf, wet=0.40, shimmer=0.10, decay=0.58, tone_hz=2500.0), 2600.0)
    save_ogg(buf, SFX_DIR / "wisp_sing.ogg", "4", target_peak=0.35)

    # 19. crab_click: Gentle hollow porcelain marimba click
    buf = np.zeros((int(0.50 * SR), 2))
    for i, m in enumerate([67, 71, 74]):
        add_stereo(buf, synth_marimba(m, dur=0.18, vel=0.42), i * 0.075, pan=-0.12 + i * 0.12)
    buf = lowpass_stereo(apply_shimmer_reverb(buf, wet=0.20, shimmer=0.0, decay=0.30, tone_hz=2000.0), 2100.0)
    save_ogg(buf, SFX_DIR / "crab_click.ogg", "4", target_peak=0.34)

    # 20-22. Gilded Sentinel SFX (warm hum, resonant bolt pulse, muffled brass hurt)
    buf = np.zeros((int(1.8 * SR), 2))
    add_stereo(buf, synth_bowl(50, dur=1.7, vel=0.42), 0.0, pan=0.0)
    buf = lowpass_stereo(apply_shimmer_reverb(buf, wet=0.34, shimmer=0.06, decay=0.50, tone_hz=1800.0), 1900.0)
    save_ogg(buf, SFX_DIR / "sentinel_hum.ogg", "4", target_peak=0.34)

    dur = 0.85
    n = int(dur * SR)
    t = np.arange(n) / SR
    buf = np.zeros((n, 2))
    f_b = 480.0 * np.exp(-t * 6.0) + 155.0
    bolt = np.sin(2 * math.pi * np.cumsum(f_b) / SR) * np.clip(t / 0.015, 0, 1) * np.exp(-t * 5.2) * 0.45
    add_stereo(buf, lowpass_1pole(bolt, 1600.0), 0.0, pan=0.0)
    add_stereo(buf, synth_felt_bell(74, dur=0.55, vel=0.28), 0.01, pan=0.0)
    buf = lowpass_stereo(apply_shimmer_reverb(buf, wet=0.28, shimmer=0.08, decay=0.42, tone_hz=2200.0), 2300.0)
    save_ogg(buf, SFX_DIR / "sentinel_blast.ogg", "4", target_peak=0.44)

    buf = np.zeros((int(0.65 * SR), 2))
    add_stereo(buf, synth_bowl(57, dur=0.60, vel=0.45), 0.0, pan=0.0)
    add_stereo(buf, synth_taiko(0.35, pitch=95.0, vel=0.30), 0.0, pan=0.0)
    buf = lowpass_stereo(apply_shimmer_reverb(buf, wet=0.22, shimmer=0.0, decay=0.38, tone_hz=1800.0), 2000.0)
    save_ogg(buf, SFX_DIR / "sentinel_hurt.ogg", "4", target_peak=0.42)

    # 23-25. Astral Seraph Boss SFX (majestic deep resonance, warm brass & choir — ZERO harsh clipping!)
    buf = np.zeros((int(4.5 * SR), 2))
    synth_pad_chord(buf, [38, 45, 50, 57, 62, 66, 74], 0.0, 3.6, gain=0.26, brightness=1900)
    add_stereo(buf, synth_bowl(50, dur=4.3, vel=0.46), 0.0, pan=0.0)
    add_stereo(buf, synth_taiko(0.95, pitch=52.0, vel=0.58), 0.0, pan=0.0)
    for i, m in enumerate([57, 62, 69, 74]):
        add_stereo(buf, synth_brass(m, dur=2.2, vel=0.28), 0.18 + i * 0.22, pan=-0.25 + i * 0.16)
    buf = lowpass_stereo(apply_shimmer_reverb(buf, wet=0.44, shimmer=0.14, decay=0.68, tone_hz=2400.0), 2600.0)
    save_ogg(buf, SFX_DIR / "seraph_awaken.ogg", "4", target_peak=0.56)

    buf = np.zeros((int(1.7 * SR), 2))
    add_stereo(buf, synth_taiko(0.95, pitch=48.0, vel=0.62), 0.0, pan=0.0)
    add_stereo(buf, synth_bowl(57, dur=1.55, vel=0.42), 0.02, pan=0.0)
    add_stereo(buf, synth_felt_bell(74, dur=1.25, vel=0.30), 0.05, pan=0.0)
    buf = lowpass_stereo(apply_shimmer_reverb(buf, wet=0.38, shimmer=0.12, decay=0.58, tone_hz=2200.0), 2400.0)
    save_ogg(buf, SFX_DIR / "seraph_pulse.ogg", "4", target_peak=0.54)

    buf = np.zeros((int(5.2 * SR), 2))
    synth_pad_chord(buf, [50, 57, 62, 66, 69, 73, 74], 0.0, 4.2, gain=0.25, brightness=1900)
    for i, m in enumerate([57, 62, 66, 69, 73, 74, 78, 81]):
        add_stereo(buf, synth_harp(m, dur=3.2, vel=0.32), i * 0.16, pan=-0.45 + i * 0.12)
    add_stereo(buf, synth_bowl(50, dur=4.8, vel=0.42), 0.2, pan=0.0)
    buf = lowpass_stereo(apply_shimmer_reverb(buf, wet=0.48, shimmer=0.18, decay=0.72, tone_hz=2600.0), 2800.0)
    save_ogg(buf, SFX_DIR / "seraph_defeat.ogg", "4", target_peak=0.54)

    # --- 6 NEW v2 GENTLE SFX ---

    # 26. cloud_step: Soft pillowy cloud-puff footstep
    dur = 0.42
    n = int(dur * SR)
    t = np.arange(n) / SR
    puff = bandpass_fft(rng.standard_normal(n), 150, 750) * np.sin(math.pi * np.clip(t / 0.32, 0, 1)) ** 2 * 0.35
    buf = np.zeros((n, 2))
    add_stereo(buf, puff, 0.0, pan=0.0)
    add_stereo(buf, synth_marimba(62, dur=0.22, vel=0.14), 0.01, pan=0.0)
    save_ogg(lowpass_stereo(buf, 1400.0), SFX_DIR / "cloud_step.ogg", "4", target_peak=0.26)

    # 27. cloud_updraft: Silky rising cloud-vent updraft breeze + warm major fifth
    dur = 1.9
    n = int(dur * SR)
    t = np.arange(n) / SR
    buf = np.zeros((n, 2))
    breeze = bandpass_fft(rng.standard_normal(n), 180, 1200) * np.sin(math.pi * np.clip(t / 1.7, 0, 1)) ** 1.6 * 0.35
    add_stereo(buf, breeze, 0.0, pan=0.0)
    add_stereo(buf, synth_wood_flute(62, dur=1.4, vel=0.26, bend=0.12), 0.08, pan=-0.15)
    add_stereo(buf, synth_felt_bell(69, dur=1.4, vel=0.24), 0.14, pan=0.15)
    buf = lowpass_stereo(apply_shimmer_reverb(buf, wet=0.42, shimmer=0.10, decay=0.58, tone_hz=2400.0), 2500.0)
    save_ogg(buf, SFX_DIR / "cloud_updraft.ogg", "4", target_peak=0.40)

    # 28. stag_call: Gentle celestial wood-flute hum of the Nimbus Stag
    buf = np.zeros((int(2.1 * SR), 2))
    add_stereo(buf, synth_wood_flute(57, dur=1.1, vel=0.36, bend=0.06), 0.0, pan=-0.1)
    add_stereo(buf, synth_wood_flute(64, dur=1.3, vel=0.30, bend=-0.04), 0.35, pan=0.12)
    buf = lowpass_stereo(apply_shimmer_reverb(buf, wet=0.40, shimmer=0.08, decay=0.58, tone_hz=2100.0), 2200.0)
    save_ogg(buf, SFX_DIR / "stag_call.ogg", "4", target_peak=0.36)

    # 29. jelly_pulse: Soft aquatic glowing bell ripple of the Aurelia Cloud-Jelly
    buf = np.zeros((int(1.6 * SR), 2))
    add_stereo(buf, synth_felt_bell(69, dur=1.1, vel=0.28), 0.0, pan=-0.15)
    add_stereo(buf, synth_felt_bell(76, dur=1.2, vel=0.22), 0.18, pan=0.15)
    buf = lowpass_stereo(apply_shimmer_reverb(buf, wet=0.45, shimmer=0.10, decay=0.62, tone_hz=2200.0), 2300.0)
    save_ogg(buf, SFX_DIR / "jelly_pulse.ogg", "4", target_peak=0.30)

    # 30. stalker_growl: Low crystalline feline purr-snarl of the Shard Stalker (warm, non-harsh)
    dur = 0.95
    n = int(dur * SR)
    t = np.arange(n) / SR
    buf = np.zeros((n, 2))
    f_g = 118.0 - 24.0 * (t / dur) + 12.0 * np.sin(2 * math.pi * 22.0 * t)
    ph = 2 * math.pi * np.cumsum(f_g) / SR
    growl = (np.sin(ph) + 0.45 * np.sin(2 * ph) + 0.18 * np.sin(3 * ph)) * np.sin(math.pi * np.clip(t / dur, 0, 1)) ** 1.2 * 0.42
    add_stereo(buf, lowpass_1pole(growl, 780.0), 0.0, pan=0.0)
    add_stereo(buf, synth_marimba(55, dur=0.35, vel=0.20), 0.06, pan=0.0)
    buf = lowpass_stereo(apply_shimmer_reverb(buf, wet=0.24, shimmer=0.0, decay=0.38, tone_hz=1500.0), 1600.0)
    save_ogg(buf, SFX_DIR / "stalker_growl.ogg", "4", target_peak=0.42)

    # 31. weaver_cast: Mysterious twilight chime-swirl spell cast of the Astral Weaver
    dur = 1.4
    n = int(dur * SR)
    t = np.arange(n) / SR
    buf = np.zeros((n, 2))
    for i, m in enumerate([64, 67, 71, 76]):
        add_stereo(buf, synth_felt_bell(m, dur=0.95, vel=0.28), i * 0.09, pan=-0.28 + i * 0.18)
    whisper = bandpass_fft(rng.standard_normal(n), 280, 1400) * np.sin(math.pi * np.clip(t / 1.1, 0, 1)) ** 2 * 0.18
    add_stereo(buf, whisper, 0.0, pan=0.0)
    buf = lowpass_stereo(apply_shimmer_reverb(buf, wet=0.42, shimmer=0.14, decay=0.60, tone_hz=2300.0), 2400.0)
    save_ogg(buf, SFX_DIR / "weaver_cast.ogg", "4", target_peak=0.42)


# =============================================================================
# 3. SOUND & MUSIC REGISTRY JSONS (Balanced Minecraft-Native Volumes!)
# =============================================================================

def write_audio_registries():
    sound_defs = {
        "format_version": "1.20.20",
        "sound_definitions": {
            # --- 4 Original Soundtrack (OST) Tracks ---
            "music.auralis.firmament": {
                "category": "music",
                "sounds": [
                    {"name": "sounds/music/auralis/glass_horizon", "stream": True, "volume": 0.68, "load_on_low_memory": True},
                    {"name": "sounds/music/auralis/drifting_atolls", "stream": True, "volume": 0.68, "load_on_low_memory": True},
                    {"name": "sounds/music/auralis/sunken_chimes", "stream": True, "volume": 0.68, "load_on_low_memory": True},
                ],
            },
            "music.auralis.glass_horizon": {
                "category": "music",
                "sounds": [{"name": "sounds/music/auralis/glass_horizon", "stream": True, "volume": 0.72, "load_on_low_memory": True}],
            },
            "music.auralis.drifting_atolls": {
                "category": "music",
                "sounds": [{"name": "sounds/music/auralis/drifting_atolls", "stream": True, "volume": 0.72, "load_on_low_memory": True}],
            },
            "music.auralis.sunken_chimes": {
                "category": "music",
                "sounds": [{"name": "sounds/music/auralis/sunken_chimes", "stream": True, "volume": 0.72, "load_on_low_memory": True}],
            },
            "music.auralis.seraph_boss": {
                "category": "music",
                "sounds": [{"name": "sounds/music/auralis/seraph_crescendo", "stream": True, "volume": 0.78, "load_on_low_memory": True}],
            },

            # --- Ambient & Dimensional SFX ---
            "ambient.auralis.wind": {
                "category": "ambient",
                "sounds": [{"name": "sounds/auralis/ambient_wind", "stream": True, "volume": 0.30}],
            },
            "ambient.auralis.chimes": {
                "category": "ambient",
                "sounds": [
                    {"name": "sounds/auralis/ambient_chime_1", "volume": 0.34},
                    {"name": "sounds/auralis/ambient_chime_2", "volume": 0.34},
                ],
            },
            "ambient.auralis.mood": {
                "category": "ambient",
                "sounds": [{"name": "sounds/auralis/ambient_mood", "volume": 0.32}],
            },
            "auralis.ritual.chime": {
                "category": "block",
                "sounds": [{"name": "sounds/auralis/ritual_chime", "volume": 0.62}],
            },
            "auralis.ritual.swell": {
                "category": "block",
                "sounds": [{"name": "sounds/auralis/ritual_swell", "volume": 0.66}],
            },
            "auralis.portal.ascend": {
                "category": "player",
                "sounds": [{"name": "sounds/auralis/portal_ascend", "volume": 0.68}],
            },
            "auralis.portal.return": {
                "category": "player",
                "sounds": [{"name": "sounds/auralis/portal_return", "volume": 0.64}],
            },
            "auralis.portal.hum": {
                "category": "block",
                "sounds": [{"name": "sounds/auralis/portal_hum", "volume": 0.32}],
            },

            # --- Block & Item Relic SFX ---
            "auralis.crystal.step": {
                "category": "block",
                "sounds": [{"name": "sounds/auralis/crystal_step", "volume": 0.42}],
            },
            "auralis.crystal.break": {
                "category": "block",
                "sounds": [{"name": "sounds/auralis/crystal_break", "volume": 0.50}],
            },
            "auralis.cloud.step": {
                "category": "block",
                "sounds": [{"name": "sounds/auralis/cloud_step", "volume": 0.42}],
            },
            "auralis.cloud.updraft": {
                "category": "player",
                "sounds": [{"name": "sounds/auralis/cloud_updraft", "volume": 0.58}],
            },
            "auralis.item.gale_prism": {
                "category": "player",
                "sounds": [{"name": "sounds/auralis/gale_prism", "volume": 0.58}],
            },
            "auralis.item.starblade": {
                "category": "player",
                "sounds": [{"name": "sounds/auralis/starblade_slash", "volume": 0.58}],
            },
            "auralis.item.lyre": {
                "category": "player",
                "sounds": [
                    {"name": "sounds/auralis/lyre_chord_1", "volume": 0.58},
                    {"name": "sounds/auralis/lyre_chord_2", "volume": 0.58},
                    {"name": "sounds/auralis/lyre_chord_3", "volume": 0.58},
                ],
            },

            # --- Custom Mob & Boss Voices ---
            "auralis.mob.manta_call": {
                "category": "neutral",
                "sounds": [{"name": "sounds/auralis/manta_call", "volume": 0.48}],
            },
            "auralis.mob.wisp_sing": {
                "category": "neutral",
                "sounds": [{"name": "sounds/auralis/wisp_sing", "volume": 0.42}],
            },
            "auralis.mob.crab_click": {
                "category": "neutral",
                "sounds": [{"name": "sounds/auralis/crab_click", "volume": 0.42}],
            },
            "auralis.mob.stag_call": {
                "category": "neutral",
                "sounds": [{"name": "sounds/auralis/stag_call", "volume": 0.46}],
            },
            "auralis.mob.jelly_pulse": {
                "category": "neutral",
                "sounds": [{"name": "sounds/auralis/jelly_pulse", "volume": 0.36}],
            },
            "auralis.mob.stalker_growl": {
                "category": "hostile",
                "sounds": [{"name": "sounds/auralis/stalker_growl", "volume": 0.52}],
            },
            "auralis.mob.weaver_cast": {
                "category": "hostile",
                "sounds": [{"name": "sounds/auralis/weaver_cast", "volume": 0.52}],
            },
            "auralis.mob.sentinel_hum": {
                "category": "hostile",
                "sounds": [{"name": "sounds/auralis/sentinel_hum", "volume": 0.44}],
            },
            "auralis.mob.sentinel_blast": {
                "category": "hostile",
                "sounds": [{"name": "sounds/auralis/sentinel_blast", "volume": 0.54}],
            },
            "auralis.mob.sentinel_hurt": {
                "category": "hostile",
                "sounds": [{"name": "sounds/auralis/sentinel_hurt", "volume": 0.52}],
            },
            "auralis.boss.seraph_awaken": {
                "category": "hostile",
                "sounds": [{"name": "sounds/auralis/seraph_awaken", "volume": 0.72}],
            },
            "auralis.boss.seraph_pulse": {
                "category": "hostile",
                "sounds": [{"name": "sounds/auralis/seraph_pulse", "volume": 0.66}],
            },
            "auralis.boss.seraph_defeat": {
                "category": "hostile",
                "sounds": [{"name": "sounds/auralis/seraph_defeat", "volume": 0.72}],
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
                "ambient.auralis.wind": {"sound": "ambient.auralis.wind", "volume": 0.40, "pitch": [0.96, 1.04]},
                "ambient.auralis.chimes": {"sound": "ambient.auralis.chimes", "volume": 0.40, "pitch": [0.92, 1.06]},
                "ambient.auralis.mood": {"sound": "ambient.auralis.mood", "volume": 0.35, "pitch": [0.95, 1.05]},
            }
        },
        "entity_sounds": {
            "entities": {
                "auralis:lumina_ray": {
                    "volume": 0.55,
                    "pitch": [0.94, 1.06],
                    "events": {
                        "ambient": "auralis.mob.manta_call",
                        "hurt": "auralis.crystal.step",
                        "death": "auralis.mob.manta_call",
                    },
                },
                "auralis:choir_wisp": {
                    "volume": 0.48,
                    "pitch": [0.95, 1.08],
                    "events": {
                        "ambient": "auralis.mob.wisp_sing",
                        "hurt": "auralis.crystal.step",
                        "death": "auralis.crystal.break",
                    },
                },
                "auralis:glass_crab": {
                    "volume": 0.48,
                    "pitch": [0.92, 1.08],
                    "events": {
                        "ambient": "auralis.mob.crab_click",
                        "hurt": "auralis.crystal.break",
                        "death": "auralis.crystal.break",
                        "step": "auralis.crystal.step",
                    },
                },
                "auralis:nimbus_stag": {
                    "volume": 0.52,
                    "pitch": [0.94, 1.08],
                    "events": {
                        "ambient": "auralis.mob.stag_call",
                        "hurt": "auralis.mob.stag_call",
                        "death": "auralis.mob.stag_call",
                        "step": "auralis.cloud.step",
                    },
                },
                "auralis:tide_jelly": {
                    "volume": 0.42,
                    "pitch": [0.92, 1.08],
                    "events": {
                        "ambient": "auralis.mob.jelly_pulse",
                        "hurt": "auralis.crystal.step",
                        "death": "auralis.mob.jelly_pulse",
                    },
                },
                "auralis:shard_stalker": {
                    "volume": 0.58,
                    "pitch": [0.92, 1.08],
                    "events": {
                        "ambient": "auralis.mob.stalker_growl",
                        "hurt": "auralis.crystal.break",
                        "death": "auralis.mob.stalker_growl",
                        "step": "auralis.crystal.step",
                    },
                },
                "auralis:astral_weaver": {
                    "volume": 0.55,
                    "pitch": [0.94, 1.06],
                    "events": {
                        "ambient": "auralis.mob.weaver_cast",
                        "hurt": "auralis.mob.sentinel_hurt",
                        "death": "auralis.crystal.break",
                    },
                },
                "auralis:gilded_sentinel": {
                    "volume": 0.58,
                    "pitch": [0.94, 1.05],
                    "events": {
                        "ambient": "auralis.mob.sentinel_hum",
                        "hurt": "auralis.mob.sentinel_hurt",
                        "death": "auralis.crystal.break",
                    },
                },
                "auralis:astral_seraph": {
                    "volume": 0.72,
                    "pitch": [0.96, 1.04],
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
        "auralis:chime_reed": {"sound": "cherry_leaves"},
        "auralis:gilded_brass": {"sound": "copper"},
        "auralis:astrolabe_pedestal": {"sound": "amethyst_block"},
        "auralis:starlight_veil": {"sound": "amethyst_block"},
        "auralis:vespera_altar": {"sound": "amethyst_block"},
        "auralis:cloudstone": {"sound": "snow"},
        "auralis:rose_cloud": {"sound": "snow"},
        "auralis:cloud_vent": {"sound": "calcite"},
    }
    with open(RP_ROOT / "blocks.json", "w", encoding="utf-8") as f:
        json.dump(blocks_json, f, indent=2)


def main():
    print("Composing 4 remastered OST tracks (stereo 44.1kHz Ogg Vorbis)...")
    compose_glass_horizon()
    print("  [1/4] glass_horizon.ogg complete")
    compose_drifting_atolls()
    print("  [2/4] drifting_atolls.ogg complete")
    compose_sunken_chimes()
    print("  [3/4] sunken_chimes.ogg complete")
    compose_seraph_crescendo()
    print("  [4/4] seraph_crescendo.ogg complete")
    print("Synthesizing 31 gentle remastered SFX...")
    generate_sfx()
    write_audio_registries()
    print("All v2 audio assets and sound registries written successfully!")


if __name__ == "__main__":
    main()
