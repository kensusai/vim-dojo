/**
 * Command quiz (owner request): a keyboard-free recognition drill for phones,
 * reachable from the daily reminder. The player taps which command performs a
 * shown change. Completing a quiz counts as the day's learning activity
 * (streak, R8) so the habit can be kept from a phone; it grants no XP or
 * medals (recognition, not execution).
 *
 * Questions come from a HAND-AUTHORED bank, not from exercise diffs. An earlier
 * version derived before→after from a lesson's exercise and labelled the answer
 * with the lesson's headline command — but many lessons teach MOTIONS (w, b, e,
 * 0 $, …) which change nothing in the buffer, while the exercise's visible diff
 * is the accompanying delete. That produced questions whose "correct" answer
 * was a motion for a shown deletion, i.e. wrong (playtest: 答えが間違ってる).
 * Every bank item is verified so its change maps to exactly one command:
 *   - edit items show a before→after text change unique to that command;
 *   - motion items change nothing but the cursor, shown with the ▮ marker,
 *     so a motion is never presented as an edit.
 */
import type { Stage } from "./curriculum/curriculum";
import { isLessonCleared } from "./curriculum/curriculum";
import type { RandomSource } from "./ports";
import type { Profile } from "./profile";
import { nextInt } from "./generation/rng";

/** The marker used in prompts to show where the cursor sits (on the char to its right). */
export const CURSOR = "▮";

export interface QuizChoice {
  label: string;
  correct: boolean;
}

export interface QuizQuestion {
  /** What the player is asked, e.g. "この編集をするコマンドは?". */
  prompt: string;
  before: string;
  after: string;
  choices: QuizChoice[];
  /** Short reasoning shown after answering. */
  explanation: string;
}

type QuizCategory = "edit" | "motion";

/**
 * One authored question. `command` is the correct answer and MUST equal a
 * lesson's command label (the part of its title before " — ") so that
 * cleared-lesson gating and the map's labels line up. `before`/`after` embed
 * the {@link CURSOR} marker to make the starting cursor (and, for motions, the
 * destination) unambiguous — the change then maps to exactly one command.
 */
interface QuizItem {
  category: QuizCategory;
  command: string;
  before: string;
  after: string;
  explanation: string;
}

const PROMPT: Record<QuizCategory, string> = {
  edit: "この編集をするコマンドは?",
  motion: "カーソルをこう動かすコマンドは?",
};

/**
 * The bank, in teaching order (used as the top-up order for new players).
 * Each `command` matches a lesson label in src/core/curriculum/stages.ts —
 * exported so quiz.test.ts can enforce that invariant (a renamed lesson
 * would otherwise silently break cleared-lesson gating).
 */
export const BANK: QuizItem[] = [
  {
    category: "edit",
    command: "x",
    before: "▮Xhello",
    after: "hello",
    explanation: "x はカーソル上の一文字を消す。",
  },
  {
    category: "motion",
    command: "h l",
    before: "ab▮cd",
    after: "abc▮d",
    explanation: "h は左、l は右へ一文字。ホームポジションのまま動く。",
  },
  {
    category: "motion",
    command: "j k",
    before: "aaa\n▮bbb\nccc",
    after: "aaa\nbbb\n▮ccc",
    explanation: "j は下、k は上の行へ。",
  },
  {
    category: "motion",
    command: "w",
    before: "▮const count",
    after: "const ▮count",
    explanation: "w は次の単語の先頭へ一気に飛ぶ。",
  },
  {
    category: "motion",
    command: "b",
    before: "const ▮count",
    after: "▮const count",
    explanation: "b は前の単語の先頭へ戻る(w の逆)。",
  },
  {
    category: "motion",
    command: "e",
    before: "▮const count",
    after: "cons▮t count",
    explanation: "e は今いる単語の末尾へ飛ぶ。",
  },
  {
    category: "motion",
    command: "0 $",
    before: "▮return value here",
    after: "return value her▮e",
    explanation: "$ は行末、0 は行頭へ。",
  },
  {
    category: "motion",
    command: "f t",
    before: "▮foo.bar",
    after: "foo▮.bar",
    explanation: "f. で次の . へジャンプ。f は指定した文字まで一撃。",
  },
  {
    category: "motion",
    command: "gg G",
    before: "one\ntwo\n▮three",
    after: "▮one\ntwo\nthree",
    explanation: "gg で先頭行、G で最終行へ。",
  },
  {
    category: "edit",
    command: "dd と 数",
    before: "▮alpha\nbeta\ngamma",
    after: "beta\ngamma",
    explanation: "dd で一行まるごと削除。数を付ければ複数行(例 3dd)。",
  },
  {
    category: "edit",
    command: "dw de",
    before: "▮foo bar baz",
    after: "bar baz",
    explanation: "dw は次の単語まで(後ろの空白ごと)削除。d + 移動。",
  },
  {
    category: "edit",
    command: "d$ d0",
    before: "keep ▮delete rest",
    after: "keep ",
    explanation: "d$ は行末まで、d0 は行頭まで削除。",
  },
  {
    category: "edit",
    command: "diw daw",
    before: "sum = ▮old + 1",
    after: "sum =  + 1",
    explanation: "diw は単語だけを消す(前後の空白は残る)。daw は空白ごと。",
  },
  {
    category: "edit",
    command: "ciw",
    before: "return ▮old;",
    after: "return new;",
    explanation: "ciw は単語を消して、そのまま入力に入る。",
  },
  {
    category: "edit",
    command: "di( ci(",
    before: "sum(▮a, b)",
    after: "sum()",
    explanation: "di( はカッコの中身を消す。ci( は消してそのまま入力。",
  },
  {
    category: "edit",
    command: "yy p",
    before: "▮line",
    after: "line\nline",
    explanation: "yy で一行コピー、p で下に貼り付け。",
  },
];

/** The command shown on the map/quiz: the part before " — " in the title. */
export function commandLabel(title: string): string {
  return title.split(" — ")[0] ?? title;
}

/** Command labels whose lesson the player has cleared (test what they know). */
function clearedLabels(profile: Profile, stages: Stage[]): Set<string> {
  const labels = new Set<string>();
  for (const lesson of stages.flatMap((s) => s.lessons)) {
    if (lesson.exercises.length > 0 && isLessonCleared(profile, lesson.id)) {
      labels.add(commandLabel(lesson.title));
    }
  }
  return labels;
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
 * Build `count` quiz questions from the authored bank. Draws from items whose
 * lesson the player has cleared first (so it tests what they know); tops up in
 * teaching order so a new player still gets a quiz. Returns fewer questions
 * only if the bank itself is smaller than `count`.
 *
 * Distractors are three other commands of the SAME category, so a motion
 * question never offers an edit command as a decoy (and vice versa) and the
 * options stay uniformly plausible.
 */
export function generateQuiz(
  profile: Profile,
  stages: Stage[],
  rng: RandomSource,
  count = 3,
): QuizQuestion[] {
  const cleared = clearedLabels(profile, stages);
  const eligible = BANK.filter((item) => cleared.has(item.command));
  const rest = BANK.filter((item) => !cleared.has(item.command));
  const pool = [...shuffle(rng, eligible), ...rest];
  const chosen = pool.slice(0, Math.min(count, pool.length));

  return chosen.map((item) => {
    const distractors = shuffle(
      rng,
      BANK.filter(
        (o) => o.category === item.category && o.command !== item.command,
      ).map((o) => o.command),
    ).slice(0, 3);
    const choices = shuffle(rng, [
      { label: item.command, correct: true },
      ...distractors.map((label) => ({ label, correct: false })),
    ]);
    return {
      prompt: PROMPT[item.category],
      before: item.before,
      after: item.after,
      choices,
      explanation: item.explanation,
    };
  });
}
