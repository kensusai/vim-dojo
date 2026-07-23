/**
 * Weakness detection (R19, P5): a command is weak when, among its last 5
 * attempts, silver-or-better results number 2 or fewer. Commands with fewer
 * than 3 recorded attempts are not judged (too little signal) — a refinement
 * of P5 noted in domain.md. Runs over the attempt log in memory; never on the
 * boot path (docs/database.md パフォーマンス方針).
 */
import type { CommandId } from "../ids";
import { localDateOf, type LocalDate } from "../localDate";
import type { Attempt } from "../practice/attempt";

const WINDOW = 5;
const GOOD_THRESHOLD = 2;
const MIN_ATTEMPTS = 3;

const isGood = (attempt: Attempt) =>
  attempt.medal === "gold" || attempt.medal === "silver";

/** Weak commands, ordered from most to least attempted (stable for UI). */
export function weakCommands(attempts: Attempt[]): CommandId[] {
  const byCommand = new Map<CommandId, Attempt[]>();
  for (const attempt of attempts) {
    for (const command of attempt.practicedCommands) {
      const list = byCommand.get(command) ?? [];
      list.push(attempt);
      byCommand.set(command, list);
    }
  }
  const weak: CommandId[] = [];
  for (const [command, list] of byCommand) {
    if (list.length < MIN_ATTEMPTS) continue;
    const recent = list.slice(-WINDOW);
    const good = recent.filter(isGood).length;
    if (good <= GOOD_THRESHOLD) weak.push(command);
  }
  return weak;
}

/**
 * Daily medal score for the 腕前 trend: gold=3, silver=2, bronze=1,
 * abandoned=0, averaged per local day. (Attempts don't store par, so a
 * keystroke/par ratio isn't derivable from the log — medal quality is.)
 */
export interface TrendPoint {
  date: LocalDate;
  score: number; // 0..3, higher is better
}

const MEDAL_SCORE = { gold: 3, silver: 2, bronze: 1 } as const;

// Not wired into a screen yet: feeds the planned 腕前トレンド chart on the
// analytics screen (tests pin the aggregation).
export function medalTrendByDay(attempts: Attempt[]): TrendPoint[] {
  const byDay = new Map<LocalDate, number[]>();
  for (const attempt of attempts) {
    const day = localDateOf(attempt.playedAt);
    const scores = byDay.get(day) ?? [];
    scores.push(attempt.medal ? MEDAL_SCORE[attempt.medal] : 0);
    byDay.set(day, scores);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, scores]) => ({
      date,
      score: scores.reduce((s, v) => s + v, 0) / scores.length,
    }));
}
