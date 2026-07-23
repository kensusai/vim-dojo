/**
 * Streak and freeze rules (R8–R12, P3, P10).
 *
 * A day is "active" when at least one learning activity completes on it
 * (R8); the streak is the count of consecutive active days. Missed days
 * consume stocked freezes automatically (R9); with no freeze cover, the
 * streak resets (R10). Freezes replenish by +1 per 7 consecutive active
 * days, capped at 2 (R11, P3).
 */
import { daysBetween, type LocalDate } from "../localDate";

const MAX_FREEZES = 2;
/** P3: one freeze earned per this many consecutive active days. */
const FREEZE_REPLENISH_EVERY = 7;

export interface StreakState {
  current: number;
  longest: number;
  lastActiveDate: LocalDate | null;
  freezes: number;
}

export const initialStreakState: StreakState = {
  current: 0,
  longest: 0,
  lastActiveDate: null,
  freezes: 0,
};

/** What happened to the streak when an activity was recorded — for UI 演出. */
export type StreakOutcome =
  | { kind: "started" } // first ever active day, or restart after a reset
  | { kind: "extended" }
  | { kind: "alreadyActiveToday" }
  | { kind: "freezeConsumed"; consumed: number }
  | { kind: "reset"; previous: number };

/**
 * Fold one completed learning activity (on `activityDate`, per R12) into the
 * streak state. Pure: same inputs, same outputs.
 *
 * P10 (暫定): freezes are consumed only when the stock covers *all* missed
 * days; otherwise they are kept and the streak resets — no half-spent
 * freezes on an already-lost streak.
 */
export function recordActivity(
  state: StreakState,
  activityDate: LocalDate,
): { state: StreakState; outcome: StreakOutcome } {
  if (state.lastActiveDate === activityDate) {
    return { state, outcome: { kind: "alreadyActiveToday" } };
  }
  if (state.lastActiveDate !== null) {
    const gap = daysBetween(state.lastActiveDate, activityDate);
    if (gap < 1) {
      // Clock moved backwards (timezone travel, manual clock change). Keep
      // the streak untouched rather than corrupting it (例外ケース: 遡って補正しない).
      return { state, outcome: { kind: "alreadyActiveToday" } };
    }
  }

  const missedDays =
    state.lastActiveDate === null
      ? 0
      : daysBetween(state.lastActiveDate, activityDate) - 1;

  const continued =
    state.lastActiveDate !== null &&
    (missedDays === 0 || missedDays <= state.freezes);

  const current = continued ? state.current + 1 : 1;
  const freezesAfterCover =
    continued && missedDays > 0 ? state.freezes - missedDays : state.freezes;
  // P3: every 7th consecutive day earns a freeze (cap 2).
  const freezes =
    current > 0 && current % FREEZE_REPLENISH_EVERY === 0
      ? Math.min(MAX_FREEZES, freezesAfterCover + 1)
      : freezesAfterCover;

  const nextState: StreakState = {
    current,
    longest: Math.max(state.longest, current),
    lastActiveDate: activityDate,
    freezes,
  };

  const outcome: StreakOutcome = !continued
    ? state.lastActiveDate === null || state.current === 0
      ? { kind: "started" }
      : { kind: "reset", previous: state.current }
    : missedDays > 0
      ? { kind: "freezeConsumed", consumed: missedDays }
      : state.current === 0
        ? { kind: "started" }
        : { kind: "extended" };

  return { state: nextState, outcome };
}
