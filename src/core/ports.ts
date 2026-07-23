/**
 * Ports: the only doorway between core and the outside world (ADR-0005).
 * Implementations live in src/vim/ and src/storage/; main.tsx wires them up.
 * core must never reach for browser APIs, ambient time, or randomness —
 * everything comes in through these interfaces so rules R1–R19 stay testable.
 */
import type { LocalDate } from "./localDate";
import type { Attempt } from "./practice/attempt";
import type { Exercise } from "./practice/exercise";
import type { Profile } from "./profile";

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
  /**
   * Subscribe to buffer changes, for the clear judgment "the moment the
   * buffer matches the target" (R1). Returns an unsubscribe function.
   *
   * Ordering contract: for the key that causes a change, implementations
   * MUST emit onKeystroke before onBufferChange — the session counts the
   * clearing key first, then judges (a zero-count judgment is a RangeError).
   */
  onBufferChange(listener: (buffer: string) => void): () => void;
}

/**
 * Persistence for Progress (docs/database.md). Implementations parse loaded
 * data at the boundary (zod) and hand core only typed values. Load failures
 * throw — callers decide recovery (typically the import flow, UC6).
 */
export interface ProgressStore {
  /** Returns the initial profile on first boot (no record yet). */
  loadProfile(): Promise<Profile>;
  saveProfile(profile: Profile): Promise<void>;
  /** Append-only (docs/database.md 削除方針): no update/delete API exists. */
  appendAttempt(attempt: Attempt): Promise<void>;
  /** Full history for the analytics screen — never call on the boot path. */
  loadAttempts(): Promise<Attempt[]>;
  loadDailyChallenge(date: LocalDate): Promise<DailyChallengeRecord | null>;
  saveDailyChallenge(record: DailyChallengeRecord): Promise<void>;
  /** Serialize everything for backup (UC6). */
  exportJson(): Promise<string>;
  /** Replace ALL stored data with the imported snapshot (UC6). @throws on invalid/corrupt input. */
  importJson(json: string): Promise<void>;
}

/** One day's generated daily challenge and its reward state (R13–R15). */
export interface DailyChallengeRecord {
  date: LocalDate;
  seed: string;
  /** Frozen generation result so the day's exercise never changes (R13). */
  exercise: Exercise;
  /** R15: XP is granted once per day at most. */
  xpGranted: boolean;
}

/** Source of "now" (R8/R12 date rules). Local timezone decisions live in core. */
export interface Clock {
  now(): Date;
}

/** Seedable randomness (R13: daily challenges must be deterministic per seed). */
export interface RandomSource {
  /** Uniform float in [0, 1). Same seed → same sequence. */
  next(): number;
}
