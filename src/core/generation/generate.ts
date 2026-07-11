/**
 * Exercise generation (docs/domain.md 出題生成コンテキスト).
 * R6: only templates whose required commands are all unlocked are used.
 * R13: the daily challenge derives its seed from the date — deterministic.
 * R19: drill generation weights templates that practice weak commands.
 */
import type { CommandId } from "../ids";
import type { LocalDate } from "../localDate";
import type { DailyChallengeRecord, RandomSource } from "../ports";
import type { Exercise } from "../practice/exercise";
import { assertValidExercise } from "../practice/exercise";
import { nextInt, seededRandom } from "./rng";
import { templates, type ExerciseTemplate } from "./templates";

function usableTemplates(unlocked: Set<CommandId>): ExerciseTemplate[] {
  return templates.filter((t) => t.requires.every((c) => unlocked.has(c)));
}

/** Can anything be generated for this unlock state? (UI gating) */
export function canGenerate(unlocked: Set<CommandId>): boolean {
  return usableTemplates(unlocked).length > 0;
}

function generateOne(
  rng: RandomSource,
  usable: ExerciseTemplate[],
  id: string,
  weakCommands?: Set<CommandId>,
  avoidTemplateId?: string,
): { exercise: Exercise; templateId: string } {
  // Variety: avoid dealing the same template twice in a row when there is
  // a choice (5×同じ敵はドリルが単調になる — playtest feedback).
  const candidates =
    usable.length > 1 && avoidTemplateId
      ? usable.filter((t) => t.id !== avoidTemplateId)
      : usable;
  // Weakness weighting (R19): templates practicing a weak command appear
  // twice in the draw pool, doubling their chance.
  const pool =
    weakCommands && weakCommands.size > 0
      ? candidates.flatMap((t) =>
          t.practices.some((c) => weakCommands.has(c)) ? [t, t] : [t],
        )
      : candidates;
  const template = pool[nextInt(rng, pool.length)]!;
  const generated = template.generate(rng, id);
  // carry the model solution so the result modal can do 答え合わせ
  const exercise = { ...generated.exercise, solution: generated.solution };
  assertValidExercise(exercise); // 例外ケース: 自明・解なしを構造的に排除
  return { exercise, templateId: template.id };
}

/**
 * The day's challenge, generated deterministically from the date and frozen
 * into a record (R13, R14). Returns null when nothing is unlocked yet.
 */
export function generateDailyChallenge(
  date: LocalDate,
  unlocked: Set<CommandId>,
): DailyChallengeRecord | null {
  const usable = usableTemplates(unlocked);
  if (usable.length === 0) return null;
  const seed = `daily-${date}`;
  const rng = seededRandom(seed);
  const { exercise } = generateOne(rng, usable, `daily-${date}`);
  return { date, seed, exercise, xpGranted: false };
}

/**
 * A drill session's exercises (P6: 5問), weighted toward weak commands (R19).
 * The seed makes a session reproducible for debugging; pass e.g. a timestamp
 * string for variety. Returns [] when nothing is unlocked yet.
 */
export function generateDrill(options: {
  seed: string;
  unlocked: Set<CommandId>;
  weakCommands?: CommandId[] | undefined;
  count?: number | undefined;
}): Exercise[] {
  const usable = usableTemplates(options.unlocked);
  if (usable.length === 0) return [];
  const rng = seededRandom(`drill-${options.seed}`);
  const weak = new Set(options.weakCommands ?? []);
  let lastTemplateId: string | undefined;
  return Array.from({ length: options.count ?? 5 }, (_, i) => {
    const { exercise, templateId } = generateOne(
      rng,
      usable,
      `drill-${options.seed}-${i}`,
      weak,
      lastTemplateId,
    );
    lastTemplateId = templateId;
    return exercise;
  });
}
