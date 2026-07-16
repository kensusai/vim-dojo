/**
 * Command quiz (owner request): a keyboard-free recognition drill for phones,
 * reachable from the daily reminder. Instead of typing, the player taps which
 * command performs a shown before→after edit. Questions are built from the
 * existing lesson content — the correct answer is the lesson's headline
 * command, distractors are other lessons' commands. Completing a quiz counts
 * as the day's learning activity (streak, R8) so the habit can be kept from a
 * phone; it grants no XP or medals (recognition, not execution).
 */
import type { Stage } from "./curriculum/curriculum";
import { isLessonCleared } from "./curriculum/curriculum";
import type { RandomSource } from "./ports";
import type { Exercise } from "./practice/exercise";
import type { Profile } from "./profile";
import { nextInt } from "./generation/rng";

export interface QuizChoice {
  label: string;
  correct: boolean;
}

export interface QuizQuestion {
  before: string;
  after: string;
  choices: QuizChoice[];
  /** Short reasoning shown after answering (the lesson brief). */
  explanation: string;
}

/** A lesson reduced to what the quiz needs: its command label and content. */
interface QuizLesson {
  command: string; // e.g. "ciw", "dw de", ":%s"
  brief: string;
  exercises: Exercise[];
}

/** The command shown on the map/quiz: the part before " — " in the title. */
function commandLabel(title: string): string {
  return title.split(" — ")[0] ?? title;
}

function toQuizLessons(stages: Stage[]): QuizLesson[] {
  return stages
    .flatMap((s) => s.lessons)
    .filter((l) => l.exercises.length > 0)
    .map((l) => ({
      command: commandLabel(l.title),
      brief: l.brief,
      exercises: l.exercises,
    }));
}

function shuffle<T>(rng: RandomSource, items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = nextInt(rng, i + 1);
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

/**
 * Build `count` quiz questions from the player's learned lessons. Draws from
 * cleared lessons first (so it tests what they know); if too few are cleared,
 * tops up with the earliest lessons so a new player still gets a quiz. Returns
 * fewer questions only if the whole curriculum has fewer eligible lessons.
 */
export function generateQuiz(
  profile: Profile,
  stages: Stage[],
  rng: RandomSource,
  count = 3,
): QuizQuestion[] {
  const all = toQuizLessons(stages);
  const cleared: QuizLesson[] = [];
  const rest: QuizLesson[] = [];
  for (const [i, lesson] of all.entries()) {
    const source = stages.flatMap((s) => s.lessons)[i]!;
    (isLessonCleared(profile, source.id) ? cleared : rest).push(lesson);
  }
  // Prefer cleared lessons; top up from the earliest remaining ones.
  const pool = [...shuffle(rng, cleared), ...rest];
  const chosen = pool.slice(0, Math.min(count, pool.length));
  // At least 4 distinct commands are needed for choices; fall back to `all`.
  const commandPool = Array.from(new Set(all.map((l) => l.command)));

  return chosen.map((lesson) => {
    const exercise = lesson.exercises[nextInt(rng, lesson.exercises.length)]!;
    const distractors = shuffle(
      rng,
      commandPool.filter((c) => c !== lesson.command),
    ).slice(0, 3);
    const choices = shuffle(rng, [
      { label: lesson.command, correct: true },
      ...distractors.map((label) => ({ label, correct: false })),
    ]);
    return {
      before: exercise.initialBuffer,
      after: exercise.targetBuffer,
      choices,
      explanation: lesson.brief,
    };
  });
}
