/**
 * Daily challenge composition (R13–R15): resolve today's record and fold a
 * cleared attempt into the profile. Persistence stays with the caller —
 * these functions are pure.
 */
import { unlockedCommands } from "./curriculum/curriculum";
import { stages } from "./curriculum/stages";
import { generateDailyChallenge } from "./generation/generate";
import type { LocalDate } from "./localDate";
import type { DailyChallengeRecord } from "./ports";
import type { Attempt } from "./practice/attempt";
import { improveBest } from "./practice/best";
import type { Profile } from "./profile";
import { recordActivity, type StreakOutcome } from "./progression/streak";
import { xpFor } from "./progression/xp";

/**
 * Today's challenge: reuse the stored record (R13: frozen once generated,
 * even if more commands unlock later the same day — R14), otherwise generate
 * from the current unlock state. Null when nothing is unlocked yet.
 */
export function resolveDailyChallenge(
  existing: DailyChallengeRecord | null,
  date: LocalDate,
  profile: Profile,
): DailyChallengeRecord | null {
  if (existing && existing.date === date) return existing;
  return generateDailyChallenge(date, unlockedCommands(profile, stages));
}

export interface DailyAttemptOutcome {
  profile: Profile;
  record: DailyChallengeRecord;
  /** R15: XP only on the day's first clear. */
  xpGained: number;
  /** Clearing the daily counts as the day's learning activity (R8). */
  streak: StreakOutcome | null;
}

export function applyDailyAttempt(
  profile: Profile,
  record: DailyChallengeRecord,
  attempt: Attempt,
): DailyAttemptOutcome {
  if (attempt.result !== "cleared" || attempt.medal === null) {
    return { profile, record, xpGained: 0, streak: null };
  }
  const xpGained = record.xpGranted
    ? 0
    : xpFor({ kind: "dailyFirstClear", medal: attempt.medal });
  const best = improveBest(profile.exerciseBests[attempt.exerciseId], attempt);
  const { state, outcome } = recordActivity(
    profile.streak,
    record.date, // the challenge belongs to its date
  );
  return {
    profile: {
      ...profile,
      xp: profile.xp + xpGained,
      streak: state,
      exerciseBests: best
        ? { ...profile.exerciseBests, [attempt.exerciseId]: best }
        : profile.exerciseBests,
    },
    record: { ...record, xpGranted: true },
    xpGained,
    streak: outcome,
  };
}
