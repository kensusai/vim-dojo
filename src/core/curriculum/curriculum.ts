/**
 * Curriculum types and unlock rules (docs/domain.md R5–R7).
 * Content is code-managed static data (docs/database.md); only clear records
 * are persisted. A lesson unlocks commands (R5); lessons within a stage are
 * ordered and gate the next (R7); a stage opens when the previous is cleared.
 */
import type { CommandId, LessonId } from "../ids";
import type { Exercise } from "../practice/exercise";
import type { Profile } from "../profile";

export interface Lesson {
  id: LessonId;
  title: string;
  /** Short teaching text shown before the exercises. */
  brief: string;
  /** Commands this lesson introduces and unlocks on clear (R5). */
  unlocks: CommandId[];
  /** Optional aside about modern editors, e.g. LazyVim (domain.md P9). */
  note?: string;
  exercises: Exercise[];
}

export interface Stage {
  id: string;
  title: string;
  subtitle: string;
  lessons: Lesson[];
}

/** Progress-derived status of a lesson on the world map. */
export type LessonStatus = "cleared" | "current" | "locked";

/** A lesson is cleared when the profile has a clear record for it (R5). */
export function isLessonCleared(profile: Profile, lessonId: LessonId): boolean {
  return profile.lessonClears[lessonId] !== undefined;
}

/**
 * Status of every lesson in a stage. The first not-yet-cleared lesson (after
 * all earlier ones are cleared) is "current"; later ones are "locked" (R7).
 * A stage whose earlier stages are not all cleared is entirely locked.
 */
export function stageLessonStatuses(
  profile: Profile,
  stages: Stage[],
  stageIndex: number,
): LessonStatus[] {
  const stage = stages[stageIndex];
  if (!stage) return [];
  const previousStagesCleared = stages
    .slice(0, stageIndex)
    .every((s) => s.lessons.every((l) => isLessonCleared(profile, l.id)));
  if (!previousStagesCleared) return stage.lessons.map(() => "locked");

  let foundCurrent = false;
  return stage.lessons.map((lesson) => {
    if (isLessonCleared(profile, lesson.id)) return "cleared";
    if (!foundCurrent) {
      foundCurrent = true;
      return "current";
    }
    return "locked";
  });
}

/** Whether the player may start this lesson now (R7). */
export function isLessonPlayable(
  profile: Profile,
  stages: Stage[],
  stageIndex: number,
  lessonIndex: number,
): boolean {
  return (
    stageLessonStatuses(profile, stages, stageIndex)[lessonIndex] !== "locked"
  );
}

/** Commands unlocked so far, derived from clear records (R5, no separate store). */
export function unlockedCommands(
  profile: Profile,
  stages: Stage[],
): Set<CommandId> {
  const unlocked = new Set<CommandId>();
  for (const stage of stages) {
    for (const lesson of stage.lessons) {
      if (isLessonCleared(profile, lesson.id)) {
        for (const command of lesson.unlocks) unlocked.add(command);
      }
    }
  }
  return unlocked;
}

/** All exercises of a lesson use only already-unlocked commands? (R6 guard) */
export function allExercises(stages: Stage[]): Exercise[] {
  return stages.flatMap((s) => s.lessons.flatMap((l) => l.exercises));
}
