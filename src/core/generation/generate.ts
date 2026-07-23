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

/** Can anything be generated for this unlock state? Not wired into a screen
 * yet: intended for graying out the drill/daily entry before first unlocks
 * (tests pin the R6 behavior). */
export function canGenerate(unlocked: Set<CommandId>): boolean {
  return usableTemplates(unlocked).length > 0;
}

/**
 * Exercise-id prefix of daily challenges. Shared with achievements.ts, whose
 * daily-debut check recognizes daily clears by this prefix — a lone string
 * literal on either side would let the two drift apart silently.
 */
export const DAILY_ID_PREFIX = "daily-";

/** domain.md 例外ケース: generated pars never fall below this — a 1–2 key
 * exercise is instant gold and teaches nothing. */
const MIN_PAR = 3;

function generateFromTemplate(
  rng: RandomSource,
  template: ExerciseTemplate,
  id: string,
): Exercise {
  // Reroll below MIN_PAR — drawing from the same rng stream keeps the result
  // a pure function of the seed. The cap only guards against a template that
  // can never reach MIN_PAR (a template bug, not bad luck).
  for (let roll = 0; roll < 20; roll++) {
    const generated = template.generate(rng, id);
    if (generated.exercise.par < MIN_PAR) continue;
    // carry the model solution so the result modal can do 答え合わせ
    const exercise = { ...generated.exercise, solution: generated.solution };
    assertValidExercise(exercise); // 例外ケース: 自明・解なしを構造的に排除
    return exercise;
  }
  throw new Error(
    `template ${template.id} could not reach par >= ${MIN_PAR} in 20 rolls`,
  );
}

function generateOne(
  rng: RandomSource,
  usable: ExerciseTemplate[],
  id: string,
): Exercise {
  return generateFromTemplate(rng, usable[nextInt(rng, usable.length)]!, id);
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
  const seed = `${DAILY_ID_PREFIX}${date}`;
  const rng = seededRandom(seed);
  const exercise = generateOne(rng, usable, `${DAILY_ID_PREFIX}${date}`);
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

  const order: ExerciseTemplate[] = [];
  while (order.length < count) {
    const round = shuffledRound();
    // avoid the same template twice in a row across round boundaries
    if (
      order.length > 0 &&
      round.length > 1 &&
      round[0]!.id === order[order.length - 1]!.id
    ) {
      [round[0], round[1]] = [round[1]!, round[0]!];
    }
    order.push(...round);
  }

  return order
    .slice(0, count)
    .map((template, i) =>
      generateFromTemplate(rng, template, `drill-${options.seed}-${i}`),
    );
}
