/**
 * Persisted shapes — the single source of truth for what IndexedDB and the
 * export JSON contain (docs/database.md). Types are z.infer-derived; loaded
 * data is parsed here once ("parse, don't validate") and converted to core
 * types, so corrupt or legacy data fails loudly at this boundary.
 */
import { z } from "zod";
import { achievementId, commandId, exerciseId, lessonId } from "../core/ids";
import { localDate } from "../core/localDate";
import type { DailyChallengeRecord } from "../core/ports";
import type { Attempt } from "../core/practice/attempt";
import type { Exercise } from "../core/practice/exercise";
import type { Profile } from "../core/profile";

export const SCHEMA_VERSION = 1;

const IsoDateTime = z.iso.datetime({ offset: true, local: true });
const LocalDateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const MedalSchema = z.enum(["gold", "silver", "bronze"]);

export const ProfileSchema = z.object({
  key: z.literal("me"),
  xp: z.number().int().nonnegative(),
  streak: z.object({
    current: z.number().int().nonnegative(),
    longest: z.number().int().nonnegative(),
    lastActiveDate: LocalDateString.nullable(),
    freezes: z.number().int().min(0).max(2), // R11
  }),
  lessonClears: z.record(z.string(), z.object({ clearedAt: IsoDateTime })),
  exerciseBests: z.record(
    z.string(),
    z.object({
      medal: MedalSchema,
      keystrokes: z.number().int().positive(),
    }),
  ),
  achievements: z.record(z.string(), z.object({ unlockedAt: IsoDateTime })),
  lastExportAt: IsoDateTime.nullable(),
});

const ExerciseSnapshotSchema = z.object({
  id: z.string(),
  title: z.string(),
  initialBuffer: z.string(),
  targetBuffer: z.string(),
  par: z.number().int().positive(),
  practicedCommands: z.array(z.string()),
});

export const AttemptSchema = z.object({
  id: z.number().int().optional(), // autoIncrement key
  exerciseId: z.string(),
  source: z.enum(["lesson", "drill", "daily"]),
  playedAt: IsoDateTime,
  result: z.enum(["cleared", "abandoned"]),
  keystrokes: z.number().int().nonnegative(),
  medal: MedalSchema.nullable(),
  usedCommands: z.array(z.string()),
  durationMs: z.number().int().nonnegative(),
});

export const DailyChallengeSchema = z.object({
  date: LocalDateString, // keyPath: one per day (R13)
  seed: z.string(),
  exercise: ExerciseSnapshotSchema,
  xpGranted: z.boolean(),
});

export const ExportSchema = z.object({
  app: z.literal("vim-dojo"),
  schemaVersion: z.number().int().positive(),
  exportedAt: IsoDateTime,
  profile: ProfileSchema,
  attempts: z.array(AttemptSchema),
  dailyChallenges: z.array(DailyChallengeSchema),
});

export type StoredProfile = z.infer<typeof ProfileSchema>;
export type StoredAttempt = z.infer<typeof AttemptSchema>;
export type StoredDailyChallenge = z.infer<typeof DailyChallengeSchema>;

/* == stored ⇔ core conversions ========================================= */

export function toCoreProfile(stored: StoredProfile): Profile {
  return {
    xp: stored.xp,
    streak: {
      ...stored.streak,
      lastActiveDate: stored.streak.lastActiveDate
        ? localDate(stored.streak.lastActiveDate)
        : null,
    },
    lessonClears: Object.fromEntries(
      Object.entries(stored.lessonClears).map(([id, v]) => [
        lessonId(id),
        { clearedAt: new Date(v.clearedAt) },
      ]),
    ),
    exerciseBests: Object.fromEntries(
      Object.entries(stored.exerciseBests).map(([id, v]) => [
        exerciseId(id),
        v,
      ]),
    ),
    achievements: Object.fromEntries(
      Object.entries(stored.achievements).map(([id, v]) => [
        achievementId(id),
        { unlockedAt: new Date(v.unlockedAt) },
      ]),
    ),
    lastExportAt: stored.lastExportAt ? new Date(stored.lastExportAt) : null,
  };
}

export function fromCoreProfile(profile: Profile): StoredProfile {
  return {
    key: "me",
    xp: profile.xp,
    streak: profile.streak,
    lessonClears: Object.fromEntries(
      Object.entries(profile.lessonClears).map(([id, v]) => [
        id,
        { clearedAt: v.clearedAt.toISOString() },
      ]),
    ),
    exerciseBests: profile.exerciseBests,
    achievements: Object.fromEntries(
      Object.entries(profile.achievements).map(([id, v]) => [
        id,
        { unlockedAt: v.unlockedAt.toISOString() },
      ]),
    ),
    lastExportAt: profile.lastExportAt?.toISOString() ?? null,
  };
}

export function toCoreAttempt(stored: StoredAttempt): Attempt {
  return {
    exerciseId: exerciseId(stored.exerciseId),
    source: stored.source,
    playedAt: new Date(stored.playedAt),
    result: stored.result,
    keystrokes: stored.keystrokes,
    medal: stored.medal,
    practicedCommands: stored.usedCommands.map(commandId),
    durationMs: stored.durationMs,
  };
}

export function fromCoreAttempt(attempt: Attempt): StoredAttempt {
  return {
    exerciseId: attempt.exerciseId,
    source: attempt.source,
    playedAt: attempt.playedAt.toISOString(),
    result: attempt.result,
    keystrokes: attempt.keystrokes,
    medal: attempt.medal,
    usedCommands: attempt.practicedCommands,
    durationMs: attempt.durationMs,
  };
}

export function toCoreDailyChallenge(
  stored: StoredDailyChallenge,
): DailyChallengeRecord {
  const exercise: Exercise = {
    id: exerciseId(stored.exercise.id),
    title: stored.exercise.title,
    initialBuffer: stored.exercise.initialBuffer,
    targetBuffer: stored.exercise.targetBuffer,
    par: stored.exercise.par,
    practicedCommands: stored.exercise.practicedCommands.map(commandId),
  };
  return {
    date: localDate(stored.date),
    seed: stored.seed,
    exercise,
    xpGranted: stored.xpGranted,
  };
}

export function fromCoreDailyChallenge(
  record: DailyChallengeRecord,
): StoredDailyChallenge {
  return {
    date: record.date,
    seed: record.seed,
    exercise: record.exercise,
    xpGranted: record.xpGranted,
  };
}
