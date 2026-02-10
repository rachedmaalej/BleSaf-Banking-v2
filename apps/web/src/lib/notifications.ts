/**
 * Browser notification utilities: vibration and synthesized sounds.
 * No external audio files needed — uses Web Audio API.
 */

// ── Vibration ──

export const VIBRATE_APPROACHING = [200, 100, 200];
export const VIBRATE_CALLED = [300, 100, 300, 100, 300];

export function canVibrate(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

export function vibrate(pattern: number[]): void {
  if (canVibrate()) {
    navigator.vibrate(pattern);
  }
}

export function stopVibration(): void {
  if (canVibrate()) {
    navigator.vibrate(0);
  }
}

// ── Sound (Web Audio API) ──

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

function playTone(frequency: number, duration: number, volume = 0.3): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Resume context if suspended (autoplay policy)
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

  // Smooth envelope to avoid clicking
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.05);
  gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration);
}

/** Pleasant two-note chime for approaching notifications */
export function playChime(): void {
  playTone(523.25, 0.3, 0.2); // C5
  setTimeout(() => playTone(659.25, 0.4, 0.2), 200); // E5
}

/** Urgent three-note ascending chime for called notifications */
export function playUrgentChime(): void {
  playTone(523.25, 0.2, 0.3); // C5
  setTimeout(() => playTone(659.25, 0.2, 0.3), 150); // E5
  setTimeout(() => playTone(783.99, 0.5, 0.35), 300); // G5
}
