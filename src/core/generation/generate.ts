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
): Exercise {
  const template = usable[nextInt(rng, usable.length)]!;
  const generated = template.generate(rng, id);
  // carry the model solution so the result modal can do 答え合わせ
  const exercise = { ...generated.exercise, solution: generated.solution };
  assertValidExercise(exercise); // 例外ケース: 自明・解なしを構造的に排除
  return exercise;
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
  const exercise = generateOne(rng, usable, `daily-${date}`);
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
  const count = options.count ?? 5;

  // Deal templates like a deck: each round is a weighted shuffle of every
  // usable template, so a session covers as many DIFFERENT drill types as
  // possible (playtest: unlocked types should actually show up), with weak
  // commands still favored (R19) via weighted-random sampling (k = u^(1/w)).
  const shuffledRound = () =>
    usable
      .map((template) => ({
        template,
        key: Math.pow(
          rng.next(),
          1 / (template.practices.some((c) => weak.has(c)) ? 2 : 1),
        ),
      }))
      .sort((a, b) => b.key - a.key)
      .map((entry) => entry.template);

  // "Type" = the practiced-command signature, not the template id. Templates
  // that train the same commands (e.g. the treasure maze and the goal maze are
  // both hjkl movement) are interchangeable variants: a session picks at most
  // one per round so it stays varied, and which variant appears rotates between
  // sessions. Falls back to the full round once every type is already covered,
  // so a small unlock-set still fills `count` (with repeats if it must).
  const sigOf = (t: ExerciseTemplate) => t.practices.join(",");
  const order: ExerciseTemplate[] = [];
  while (order.length < count) {
    const round = shuffledRound();
    const covered = new Set(order.map(sigOf));
    const fresh: ExerciseTemplate[] = [];
    for (const t of round) {
      const sig = sigOf(t);
      if (covered.has(sig)) continue;
      covered.add(sig);
      fresh.push(t);
    }
    const pool = fresh.length > 0 ? fresh : round;
    // avoid the same template twice in a row across round boundaries
    if (
      order.length > 0 &&
      pool.length > 1 &&
      pool[0]!.id === order[order.length - 1]!.id
    ) {
      [pool[0], pool[1]] = [pool[1]!, pool[0]!];
    }
    order.push(...pool);
  }

  return order.slice(0, count).map((template, i) => {
    const generated = template.generate(rng, `drill-${options.seed}-${i}`);
    const exercise = { ...generated.exercise, solution: generated.solution };
    assertValidExercise(exercise);
    return exercise;
  });
}
