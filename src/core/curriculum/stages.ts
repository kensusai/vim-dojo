/**
 * Curriculum content (code-managed static data, docs/database.md).
 * Stage 1 is fully authored; later stages are stubs filled in future
 * milestones. Every exercise must be solvable with only the commands unlocked
 * by this lesson or earlier ones (R6), and its par equals the author's
 * verified best solution (domain.md P4) — see stages.test.ts, which replays a
 * recorded solution for each exercise and asserts it clears in exactly `par`.
 */
import { commandId, exerciseId, lessonId } from "../ids";
import type { Exercise } from "../practice/exercise";
import type { Lesson, Stage } from "./curriculum";

const ex = (
  id: string,
  title: string,
  initialBuffer: string,
  targetBuffer: string,
  par: number,
  commands: string[],
): Exercise => ({
  id: exerciseId(id),
  title,
  initialBuffer,
  targetBuffer,
  par,
  practicedCommands: commands.map(commandId),
});

const stage1Lessons: Lesson[] = [
  {
    id: lessonId("s1-l1-x"),
    title: "x — 一文字を消す",
    brief:
      "ノーマルモードで x を押すと、カーソル上の一文字が消える。カーソルは行の先頭から始まる。",
    unlocks: [commandId("x")],
    exercises: [
      ex("s1-l1-e1", "先頭の余分な文字を消せ", "Xhello", "hello", 1, ["x"]),
      ex("s1-l1-e2", "先頭の記号を消せ", "#title", "title", 1, ["x"]),
    ],
  },
  {
    id: lessonId("s1-l2-hl"),
    title: "h l — 左右に動く",
    brief:
      "h は左、l は右。矢印キーに手を伸ばさず、ホームポジションのまま動いて x と組み合わせる。",
    unlocks: [commandId("h"), commandId("l")],
    note: "矢印キーは封印して h/l を指に覚えさせよう。LazyVim でも h/l はそのまま。",
    exercises: [
      ex("s1-l2-e1", "2文字目を消せ", "aXbc", "abc", 2, ["l", "x"]),
      ex("s1-l2-e2", "3文字目を消せ", "abXc", "abc", 3, ["l", "x"]),
    ],
  },
  {
    id: lessonId("s1-l3-jk"),
    title: "j k — 上下に動く",
    brief: "j は下、k は上。複数行のあいだをホームポジションのまま移動する。",
    unlocks: [commandId("j"), commandId("k")],
    exercises: [
      ex(
        "s1-l3-e1",
        "2行目の先頭を消せ",
        "keep\nXdrop\nkeep",
        "keep\ndrop\nkeep",
        2,
        ["j", "x"],
      ),
    ],
  },
  {
    id: lessonId("s1-l4-w"),
    title: "w — 単語の先頭へ飛ぶ",
    brief:
      "w は次の単語の先頭へ一気に飛ぶ。l を連打するより速い。vim らしさの入り口。",
    unlocks: [commandId("w")],
    exercises: [
      ex("s1-l4-e1", "2単語目の先頭を消せ", "foo bar", "foo ar", 2, ["w", "x"]),
      ex(
        "s1-l4-e2",
        "3単語目の先頭を消せ",
        "one two three",
        "one two hree",
        3,
        ["w", "x"],
      ),
    ],
  },
  {
    id: lessonId("s1-l5-b"),
    title: "b — 単語の先頭へ戻る",
    brief: "b は w の逆。前の単語の先頭へ戻る。行き過ぎたら b で戻ろう。",
    unlocks: [commandId("b")],
    exercises: [
      ex("s1-l5-e1", "戻って先頭を消せ", "one two", "ne two", 3, [
        "w",
        "b",
        "x",
      ]),
    ],
  },
  {
    id: lessonId("s1-l6-e"),
    title: "e — 単語の末尾へ",
    brief: "e は単語の末尾へ飛ぶ。末尾の文字を狙うのに便利。",
    unlocks: [commandId("e")],
    exercises: [
      ex("s1-l6-e1", "単語の末尾を消せ", "hello world", "hell world", 2, [
        "e",
        "x",
      ]),
    ],
  },
  {
    id: lessonId("s1-l7-0dollar"),
    title: "0 $ — 行頭・行末へ",
    brief:
      "0 は行頭、$ は行末へ一瞬で飛ぶ。長い行でも端まで一発。ゼロ と $ 記号。",
    unlocks: [commandId("0"), commandId("$")],
    exercises: [
      ex("s1-l7-e1", "行末の文字を消せ", "const x", "const ", 2, ["$", "x"]),
    ],
  },
  {
    id: lessonId("s1-l8-ft"),
    title: "f t — 行内の文字へジャンプ",
    brief: "f{文字} でその文字の上へ飛ぶ。目的の記号へ一直線。",
    unlocks: [commandId("f"), commandId("t")],
    exercises: [
      ex("s1-l8-e1", "X まで飛んで消せ", "abcXdef", "abcdef", 3, ["f", "x"]),
      ex("s1-l8-e2", "カッコ内の文字を消せ", "call(Y)", "call()", 3, [
        "f",
        "x",
      ]),
    ],
  },
  {
    id: lessonId("s1-l9-gg-G"),
    title: "gg G — ファイルの先頭・末尾へ",
    brief: "gg で先頭行、G で最終行へ。複数行を大きく移動する土台。",
    unlocks: [commandId("gg"), commandId("G")],
    exercises: [
      ex(
        "s1-l9-e1",
        "最終行の先頭を消せ",
        "line one\nline two\nXine three",
        "line one\nline two\nine three",
        2,
        ["G", "x"],
      ),
    ],
  },
  {
    id: lessonId("s1-l10-insert"),
    title: "i a — 挿入モードに入る",
    brief: "i でカーソルの前、a で後ろから入力できる。Esc でノーマルに戻る。",
    unlocks: [commandId("i"), commandId("a")],
    note: "挿入モードから戻るのは Esc(または Ctrl-[)。癖をつけよう。",
    exercises: [ex("s1-l10-e1", "先頭に文字を足せ", "ello", "hello", 3, ["i"])],
  },
  {
    id: lessonId("s1-l11-o"),
    title: "o — 行を開いて入力",
    brief: "o は下に空行を作って挿入モードに入る。新しい行を足すときの定番。",
    unlocks: [commandId("o"), commandId("O")],
    exercises: [
      ex("s1-l11-e1", "下に行を足せ", "first", "first\nsecond", 8, ["o"]),
    ],
  },
  {
    id: lessonId("s1-l12-dd-count"),
    title: "dd と 数 — 行を消す・回数をまとめる",
    brief:
      "dd で行を丸ごと削除。コマンドの前に数字を置くと回数分くり返す(3x で3文字、2dd で2行)。",
    unlocks: [commandId("dd")],
    exercises: [
      ex("s1-l12-e1", "先頭の行を消せ", "junk\nkeep", "keep", 2, ["dd"]),
      ex("s1-l12-e2", "3文字まとめて消せ", "XXXkeep", "keep", 2, ["x"]),
      ex("s1-l12-e3", "2行まとめて消せ", "junk1\njunk2\nkeep", "keep", 3, [
        "dd",
      ]),
    ],
  },
];

const stage1: Stage = {
  id: "stage-1",
  title: "STAGE 1",
  subtitle: "基本移動",
  lessons: stage1Lessons,
};

// Later stages: titles fixed (domain.md), content authored in future work.
const stage2: Stage = {
  id: "stage-2",
  title: "STAGE 2",
  subtitle: "編集の型",
  lessons: [],
};
const stage3: Stage = {
  id: "stage-3",
  title: "STAGE 3",
  subtitle: "検索と置換",
  lessons: [],
};
const stage4: Stage = {
  id: "stage-4",
  title: "STAGE 4",
  subtitle: "レジスタ・複数ファイル",
  lessons: [],
};

export const stages: Stage[] = [stage1, stage2, stage3, stage4];
