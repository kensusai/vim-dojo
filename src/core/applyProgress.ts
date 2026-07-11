/**
 * Cross-context composition (docs/architecture.md モジュール分割): folding a
 * finished attempt / session into the Profile. This is where practice,
 * progression and (later) curriculum meet — ui calls these and renders the
 * outcome, never computing rules itself.
 */
import type { Attempt } from "./practice/attempt";
import { improveBest } from "./practice/best";
import { localDateOf } from "./localDate";
import type { Profile } from "./profile";
import { recordActivity, type StreakOutcome } from "./progression/streak";
import { xpFor } from "./progression/xp";

export interface DrillAttemptOutcome {
  profile: Profile;
  /** 0 unless this was the exercise's first ever clear (R16). */
  xpGained: number;
  firstClear: boolean;
}

/**
 * Fold one drill attempt into the profile: best record (R4) and XP (R16 —
 * an exercise pays XP only on its first clear; the recorded best doubles as
 * the "already cleared once" marker so no extra bookkeeping exists).
 * Abandoned attempts change nothing here; the caller still persists them.
 */
export function applyDrillAttempt(
  profile: Profile,
  attempt: Attempt,
): DrillAttemptOutcome {
  if (attempt.result !== "cleared" || attempt.medal === null) {
    return { profile, xpGained: 0, firstClear: false };
  }
  const firstClear = profile.exerciseBests[attempt.exerciseId] === undefined;
  const xpGained = firstClear
    ? xpFor({ kind: "drillClear", medal: attempt.medal })
    : 0;
  const best = improveBest(profile.exerciseBests[attempt.exerciseId], attempt);
  return {
    profile: {
      ...profile,
      xp: profile.xp + xpGained,
      exerciseBests: best
        ? { ...profile.exerciseBests, [attempt.exerciseId]: best }
        : profile.exerciseBests,
    },
    xpGained,
    firstClear,
  };
}

export interface DrillSessionOutcome {
  profile: Profile;
  streak: StreakOutcome;
}

/**
 * A completed drill session is one learning activity (domain.md 用語集) —
 * this is what extends the streak (R8), dated by its completion instant (R12).
 */
export function completeDrillSession(
  profile: Profile,
  completedAt: Date,
): DrillSessionOutcome {
  const { state, outcome } = recordActivity(
    profile.streak,
    localDateOf(completedAt),
  );
  return { profile: { ...profile, streak: state }, streak: outcome };
}
