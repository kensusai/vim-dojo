/**
 * Retro sound effects, synthesized with WebAudio (no assets). Square waves =
 * 8-bit tone that matches the art direction. Sounds fire on rewarding moments
 * only (clear, lesson complete, achievement) — never per keystroke, so they
 * can't interfere with typing (非機能要件: 演出は入力をブロックしない).
 * Mute preference is a UI setting, not progress → localStorage, not Profile.
 */
const MUTE_KEY = "vim-dojo-muted";
let muted =
  typeof localStorage !== "undefined" && localStorage.getItem(MUTE_KEY) === "1";
let context: AudioContext | null = null;

export const isMuted = () => muted;

export function toggleMuted(): boolean {
  muted = !muted;
  localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  return muted;
}

function beep(
  frequency: number,
  startAt: number,
  duration = 0.09,
  volume = 0.045,
) {
  if (!context) return;
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = "square";
  osc.frequency.value = frequency;
  const t = context.currentTime + startAt;
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain).connect(context.destination);
  osc.start(t);
  osc.stop(t + duration);
}

function ensureContext(): boolean {
  if (muted) return false;
  // Created lazily on first play — by then a user gesture (keystroke/click)
  // has happened, so autoplay policy allows it.
  context ??= new AudioContext();
  if (context.state === "suspended") void context.resume();
  return true;
}

const NOTES = { C5: 523, E5: 659, G5: 784, C6: 1047, G4: 392, E4: 330 };

export function playClear(medal: "gold" | "silver" | "bronze"): void {
  if (!ensureContext()) return;
  if (medal === "gold") {
    // rising arpeggio — the 一本!! fanfare
    beep(NOTES.C5, 0);
    beep(NOTES.E5, 0.08);
    beep(NOTES.G5, 0.16);
    beep(NOTES.C6, 0.24, 0.18, 0.05);
  } else if (medal === "silver") {
    beep(NOTES.E5, 0);
    beep(NOTES.G5, 0.09, 0.14);
  } else {
    beep(NOTES.G4, 0, 0.12);
  }
}

export function playLessonComplete(): void {
  if (!ensureContext()) return;
  beep(NOTES.G4, 0);
  beep(NOTES.C5, 0.09);
  beep(NOTES.E5, 0.18);
  beep(NOTES.G5, 0.27);
  beep(NOTES.C6, 0.36, 0.25, 0.05);
}

export function playUnlock(): void {
  if (!ensureContext()) return;
  beep(NOTES.E5, 0, 0.06);
  beep(NOTES.C6, 0.07, 0.16, 0.05);
}
