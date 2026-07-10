/**
 * Ports: the only doorway between core and the outside world (ADR-0005).
 * Implementations live in src/vim/ and src/storage/; main.tsx wires them up.
 * core must never reach for browser APIs, ambient time, or randomness —
 * everything comes in through these interfaces so rules R1–R19 stay testable.
 */

/** Editor modes the UI needs to display. */
export type VimMode = "normal" | "insert" | "visual";

/**
 * Vim emulation engine (ADR-0003, ADR-0006).
 * Kept minimal on purpose: clear judgment (R1) and keystroke counting (R2)
 * are core's job, so the engine only exposes buffer state and key events.
 */
export interface VimEngine {
  /** Replace the buffer with the exercise's initial text and reset state. */
  reset(initialBuffer: string): void;
  /** Current buffer content, used by core for the clear judgment (R1). */
  currentBuffer(): string;
  /** Current mode, for UI display only. */
  currentMode(): VimMode;
  /**
   * Subscribe to keystrokes. Fires once per pressed key (R2: Esc and mode
   * switches count too). Returns an unsubscribe function.
   */
  onKeystroke(listener: (key: string) => void): () => void;
}

// ProgressStore (persistence for Progress, docs/database.md) is defined here
// once the storage schema work starts — declaring it before its methods exist
// would just invent shapes twice.

/** Source of "now" (R8/R12 date rules). Local timezone decisions live in core. */
export interface Clock {
  now(): Date;
}

/** Seedable randomness (R13: daily challenges must be deterministic per seed). */
export interface RandomSource {
  /** Uniform float in [0, 1). Same seed → same sequence. */
  next(): number;
}
