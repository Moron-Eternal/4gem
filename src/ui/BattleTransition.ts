import { soundEngine } from '../engine/audio/soundEngine';

/**
 * Authentic GBA Pokémon FireRed Battle Start Transition!
 * Runs crisp double flash + alternating Venetian-blinds shutter wipe (Wild)
 * or spinning Poké Ball iris shutter (Trainer / Gym Leader / Rival) right over the overworld!
 */
export function playBattleStartTransition(
  hostElement: HTMLElement,
  style: 'wild' | 'trainer' | 'boss'
): Promise<void> {
  return new Promise((resolve) => {
    soundEngine.playEncounterStinger();

    const canvas = document.createElement('canvas');
    canvas.className = 'battle-transition-canvas';
    canvas.width = 480;
    canvas.height = 320;
    hostElement.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      canvas.remove();
      resolve();
      return;
    }

    const totalMs = 880;
    const startTs = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTs;
      const t = Math.min(1, elapsed / totalMs);
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (t < 0.34) {
        // Phase 1: Classic GBA double white encounter strobe flash!
        const strobe = Math.floor(t * 24) % 2 === 0;
        if (strobe) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.fillRect(0, 0, w, h);
        }
      } else {
        // Phase 2: Shutter / Poké Ball Iris wipe to black!
        const u = Math.min(1, (t - 0.34) / 0.62);
        const ease = u * u * (3 - 2 * u);

        if (style === 'wild') {
          // Alternating horizontal GBA shutter bars sliding from left & right
          const bands = 10;
          const bh = Math.ceil(h / bands);
          ctx.fillStyle = '#090c12';
          for (let i = 0; i < bands; i++) {
            const bw = Math.ceil(w * ease);
            const x = i % 2 === 0 ? 0 : w - bw;
            ctx.fillRect(x, i * bh, bw, bh + 1);
          }
        } else {
          // Trainer / Gym Leader dramatic radial Poké Ball shutter + crimson center flash!
          ctx.fillStyle = '#090c12';
          ctx.fillRect(0, 0, w, h);

          // Punch open shrinking iris hole showing overworld closing down
          const maxR = Math.hypot(w, h) * 0.55;
          const curR = Math.max(0, maxR * (1 - ease));
          if (curR > 4) {
            ctx.save();
            ctx.globalCompositeOperation = 'destination-out';
            ctx.beginPath();
            ctx.arc(w / 2, h / 2, curR, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Crisp crimson-gold ring rim around closing iris
            ctx.strokeStyle = style === 'boss' ? '#f5b938' : '#ef4444';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(w / 2, h / 2, curR, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      }

      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        ctx.fillStyle = '#090c12';
        ctx.fillRect(0, 0, w, h);
        window.setTimeout(() => {
          canvas.remove();
          resolve();
        }, 70);
      }
    };

    requestAnimationFrame(tick);
  });
}
