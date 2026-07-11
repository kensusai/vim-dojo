/**
 * Fold a lesson clear into the profile (R5 unlock, R16 XP-once).
 * A lesson pays XP only the first time it is cleared; the clear record
 * itself is the "already cleared" marker, so no extra bookkeeping exists.
 * Completing a lesson is also a learning activity (streak, R8) — but that is
 * composed by the caller via completeDrillSession-style helpers to keep this
 * function about the curriculum concern only.
 */
import type { LessonId } from "../ids";
import type { Profile } from "../profile";
import { xpFor } from "../progression/xp";

export interface LessonClearOutcome {
  profile: Profile;
  xpGained: number;
  firstClear: boolean;
}

export function markLessonCleared(
  profile: Profile,
  lessonId: LessonId,
  clearedAt: Date,
): LessonClearOutcome {
  const firstClear = profile.lessonClears[lessonId] === undefined;
  if (!firstClear) return { profile, xpGained: 0, firstClear: false };
  const xpGained = xpFor({ kind: "lessonClear" });
  return {
    profile: {
      ...profile,
      xp: profile.xp + xpGained,
      lessonClears: {
        ...profile.lessonClears,
        [lessonId]: { clearedAt },
      },
    },
    xpGained,
    firstClear: true,
  };
}
