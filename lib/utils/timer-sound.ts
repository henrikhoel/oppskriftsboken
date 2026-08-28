/**
 * Delt varsellyd for utløpte kjøkken-tidtakere – flyttet ut av
 * CookMode.tsx (25.08.2026, Fase 5-finale) slik at MultiCookMode.tsx
 * (ombygd til ekte flerrett-orkestrering, 5.17) kan spille NØYAKTIG samme
 * lyd for en meny-tidtaker som CookMode.tsx allerede gjør for én
 * oppskrift, uten å duplisere Web Audio-oppsettet to steder. Ren
 * flytting – logikken er uendret fra originalen i CookMode.tsx.
 */
export function playTimerDoneSound() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const startTime = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const beepStart = startTime + i * 0.35;
      gain.gain.setValueAtTime(0, beepStart);
      gain.gain.linearRampToValueAtTime(0.3, beepStart + 0.02);
      gain.gain.linearRampToValueAtTime(0, beepStart + 0.28);
      osc.start(beepStart);
      osc.stop(beepStart + 0.3);
    }
    setTimeout(() => ctx.close().catch(() => {}), 1200);
  } catch {
    // Best-effort – se filheader. En tidtaker som går ut vises fortsatt
    // tydelig visuelt selv om lyden av en eller annen grunn ikke spiller.
  }
}
