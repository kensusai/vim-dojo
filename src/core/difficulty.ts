/**
 * Difficulty (owner request): a single global setting that adjusts how hard
 * gold is to earn and how many training wheels are shown. It only moves the
 * gold/silver thresholds and UI aids — it never changes whether an exercise
 * can be cleared, so the streak stays safe (no game over) at every level.
 * The par (optimal keystrokes) is fixed content, so "easy" *raises* the gold
 * bar above par; "hard" keeps gold at par and removes the aids.
 */
export type Difficulty = "easy" | "normal" | "hard";

export const DIFFICULTIES: Difficulty[] = ["easy", "normal", "hard"];

export interface DifficultyConfig {
  label: string;
  /** Gold when keystrokes <= par * goldFactor. */
  goldFactor: number;
  /** Silver when keystrokes <= par * silverFactor (else bronze). */
  silverFactor: number;
  /** Show the per-exercise hint / lesson brief hint upfront. */
  showHints: boolean;
  /** Show the model-solution 答え合わせ in the result modal. */
  showSolution: boolean;
  /** Show the live INPUT key log while playing. */
  showKeyLog: boolean;
}

const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy: {
    label: "やさしい",
    goldFactor: 1.4, // gold without perfect play
    silverFactor: 2,
    showHints: true,
    showSolution: true,
    showKeyLog: true,
  },
  normal: {
    label: "ふつう",
    goldFactor: 1, // gold = optimal (par)
    silverFactor: 1.5,
    showHints: true,
    showSolution: true,
    showKeyLog: true,
  },
  hard: {
    label: "むずい",
    goldFactor: 1, // gold still = optimal…
    silverFactor: 1.5,
    showHints: false, // …but you fly blind
    showSolution: false,
    showKeyLog: false,
  },
};

export const configFor = (d: Difficulty): DifficultyConfig =>
  DIFFICULTY_CONFIG[d];
