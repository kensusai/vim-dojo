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
      ex("s1-l1-e3", "先頭の2文字を消せ", "XXvim", "vim", 2, ["x"]),
      ex("s1-l1-e4", "コメント記号を全部消せ", "###go", "go", 3, ["x"]),
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
      ex("s1-l2-e3", "4文字目を消せ", "abcXde", "abcde", 4, ["l", "x"]),
      ex("s1-l2-e4", "2つの X を消せ", "aXbX", "ab", 4, ["l", "x"]),
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
      ex(
        "s1-l3-e2",
        "3行目の先頭を消せ",
        "one\ntwo\nXthree",
        "one\ntwo\nthree",
        3,
        ["j", "x"],
      ),
      ex("s1-l3-e3", "2行目の2文字目を消せ", "ab\ncXd\nef", "ab\ncd\nef", 3, [
        "j",
        "l",
        "x",
      ]),
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
      ex("s1-l4-e3", "4単語目の頭を消せ", "a b c Xd", "a b c d", 4, ["w", "x"]),
      ex("s1-l4-e4", "2単語目の2文字目を消せ", "foo bXar", "foo bar", 3, [
        "w",
        "l",
        "x",
      ]),
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
      ex("s1-l5-e2", "順に2つ消せ", "Xaa Xbb", "aa bb", 3, ["w", "x"]),
      ex("s1-l5-e3", "3単語目の頭を消せ", "aa bb Xcc dd", "aa bb cc dd", 3, [
        "w",
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
      ex("s1-l6-e2", "2単語目の末尾を消せ", "foo barX baz", "foo bar baz", 3, [
        "e",
        "x",
      ]),
      ex("s1-l6-e3", "末尾の2文字を消せ", "vimXX rocks", "vim rocks", 4, [
        "e",
        "h",
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
      ex("s1-l7-e2", "行末の2文字を消せ", "let n = 10;;;", "let n = 10;", 3, [
        "$",
        "x",
      ]),
      ex("s1-l7-e3", "末尾と先頭を消せ", "Xabc defX", "abc def", 4, [
        "$",
        "x",
        "0",
        "x",
      ]),
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
      ex("s1-l8-e3", "セミコロンの手前を消せ", "wait;go", "wai;go", 3, [
        "t",
        "x",
      ]),
      ex("s1-l8-e4", "後半の X まで飛べ", "abc def gXhi", "abc def ghi", 3, [
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
      ex(
        "s1-l9-e2",
        "最終行の行末を消せ",
        "one\ntwo\nthreeX",
        "one\ntwo\nthree",
        3,
        ["G", "$", "x"],
      ),
      ex("s1-l9-e3", "末尾へ行って先頭へ戻れ", "Xone\ntwo", "one\ntwo", 4, [
        "G",
        "gg",
        "x",
      ]),
    ],
  },
  {
    id: lessonId("s1-l10-insert"),
    title: "i a — 挿入モードに入る",
    brief: "i でカーソルの前、a で後ろから入力できる。Esc でノーマルに戻る。",
    unlocks: [commandId("i"), commandId("a")],
    note: "挿入モードから戻るのは Esc(または Ctrl-[)。癖をつけよう。",
    exercises: [
      ex("s1-l10-e1", "先頭に文字を足せ", "ello", "hello", 3, ["i"]),
      ex("s1-l10-e2", "末尾に ! を足せ", "vim", "vim!", 4, ["$", "a"]),
      ex("s1-l10-e3", "抜けた i を足せ", "vm", "vim", 4, ["l", "i"]),
    ],
  },
  {
    id: lessonId("s1-l11-o"),
    title: "o — 行を開いて入力",
    brief: "o は下に空行を作って挿入モードに入る。新しい行を足すときの定番。",
    unlocks: [commandId("o"), commandId("O")],
    exercises: [
      ex("s1-l11-e1", "下に行を足せ", "first", "first\nsecond", 8, ["o"]),
      ex("s1-l11-e2", "上に行を足せ", "second", "first\nsecond", 7, ["O"]),
      ex("s1-l11-e3", "下に end を足せ", "start", "start\nend", 5, ["o"]),
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
      ex("s1-l12-e4", "4文字まとめて消せ", "XXXXok", "ok", 2, ["x"]),
      ex("s1-l12-e5", "3行まとめて消せ", "j1\nj2\nj3\nkeep", "keep", 3, ["dd"]),
    ],
  },
];

const stage1: Stage = {
  id: "stage-1",
  title: "STAGE 1",
  subtitle: "基本移動",
  lessons: stage1Lessons,
};

const stage2Lessons: Lesson[] = [
  {
    id: lessonId("s2-l1-dw"),
    title: "dw de — d + 移動 = 消す",
    brief:
      "d は「消す」オペレータ。移動と組み合わせて dw(次の単語の頭まで)、de(単語の末尾まで)。vim の文法「動詞+移動」の第一歩。",
    unlocks: [commandId("dw"), commandId("de")],
    exercises: [
      ex("s2-l1-e1", "先頭の単語を消せ", "delete this word", "this word", 2, [
        "dw",
      ]),
      ex("s2-l1-e2", "2単語目を消せ", "keep remove this", "keep this", 3, [
        "w",
        "dw",
      ]),
      ex("s2-l1-e3", "末尾の単語だけ消せ", "cut here", "cut ", 3, ["w", "de"]),
    ],
  },
  {
    id: lessonId("s2-l2-dline"),
    title: "d$ d0 — 行の端まで消す",
    brief:
      "d$ でカーソルから行末まで、d0 で行頭まで一掃。行の後半を書き直す前フリに便利。",
    unlocks: [commandId("d$"), commandId("d0")],
    exercises: [
      ex(
        "s2-l2-e1",
        "2単語目から行末まで消せ",
        "hello junk junk",
        "hello ",
        3,
        ["w", "d$"],
      ),
      ex("s2-l2-e2", "最後の文字以外を消せ", "abcZ", "Z", 3, ["$", "d0"]),
    ],
  },
  {
    id: lessonId("s2-l3-diw"),
    title: "diw daw — 単語をまるごと",
    brief:
      "diw は「inner word」= カーソルが単語のどこにあっても単語全体を消す。daw は周りの空白ごと。テキストオブジェクトの入り口。",
    unlocks: [commandId("diw"), commandId("daw")],
    exercises: [
      ex(
        "s2-l3-e1",
        "真ん中の単語を消せ",
        "keep BADWORD keep",
        "keep  keep",
        4,
        ["w", "diw"],
      ),
      ex("s2-l3-e2", "空白ごと消せ", "one junk two", "one two", 4, [
        "w",
        "daw",
      ]),
    ],
  },
  {
    id: lessonId("s2-l4-ciw"),
    title: "ciw — 消してそのまま書く",
    brief:
      "c は「消して挿入モードへ」。ciw で単語を置き換え、書いたら Esc。リネームの基本形。",
    unlocks: [commandId("ciw")],
    exercises: [
      ex("s2-l4-e1", "foo を bar に置き換えろ", "foo", "bar", 7, ["ciw"]),
      ex("s2-l4-e2", "wrong を right に", "name = wrong", "name = right", 11, [
        "w",
        "ciw",
      ]),
    ],
  },
  {
    id: lessonId("s2-l5-quotes"),
    title: 'di" ci" — クォートの中身',
    brief:
      'di" は "…" の中身だけを消す。ci" なら消してそのまま書ける。文字列リテラルの修正が一撃。',
    unlocks: [commandId('di"'), commandId('ci"')],
    exercises: [
      ex("s2-l5-e1", "文字列を空にせよ", 'msg = "old text"', 'msg = ""', 5, [
        "f",
        'di"',
      ]),
      ex("s2-l5-e2", "hi を yo に", 'say "hi"', 'say "yo"', 8, ["f", 'ci"']),
    ],
  },
  {
    id: lessonId("s2-l6-paren"),
    title: "di( ci( — カッコの中身",
    brief: "di( で (…) の中身を消す。ci( で書き換え。引数の差し替えに。",
    unlocks: [commandId("di("), commandId("ci(")],
    exercises: [
      ex("s2-l6-e1", "引数を消せ", "call(remove me)", "call()", 5, [
        "f",
        "di(",
      ]),
      ex("s2-l6-e2", "x を y に", "f(x)", "f(y)", 7, ["f", "ci("]),
    ],
  },
  {
    id: lessonId("s2-l7-yyp"),
    title: "yy p — 行のコピー&ペースト",
    brief:
      "yy で行をヤンク(コピー)、p でカーソルの下に貼り付け。行の複製はこの2つ。",
    unlocks: [commandId("yy"), commandId("p")],
    exercises: [
      ex("s2-l7-e1", "行を複製せよ", "alpha", "alpha\nalpha", 3, ["yy", "p"]),
      ex("s2-l7-e2", "1行目を複製せよ", "one\ntwo", "one\none\ntwo", 3, [
        "yy",
        "p",
      ]),
      ex(
        "s2-l7-e3",
        "1行目を末尾にコピーせよ",
        "top\nbottom",
        "top\nbottom\ntop",
        4,
        ["yy", "G", "p"],
      ),
    ],
  },
  {
    id: lessonId("s2-l8-yiw"),
    title: "yiw — 単語のコピー",
    brief: "yiw で単語をヤンク。p は文字単位ならカーソルの直後に貼る。",
    unlocks: [commandId("yiw")],
    exercises: [
      ex("s2-l8-e1", "単語を行末に複製せよ", "dup ", "dup dup", 5, [
        "yiw",
        "$",
        "p",
      ]),
    ],
  },
  {
    id: lessonId("s2-l9-dot"),
    title: ". — 直前の変更をリピート",
    brief:
      ". は最後の変更コマンドをもう一度実行する。同じ編集の繰り返しが一打に。vim 最強のキーのひとつ。",
    unlocks: [commandId(".")],
    exercises: [
      ex("s2-l9-e1", "前の2単語を消せ", "aa bb cc dd", "cc dd", 3, ["dw", "."]),
      ex("s2-l9-e2", "3単語まとめて", "x1 x2 x3 keep", "keep", 4, ["dw", "."]),
    ],
  },
  {
    id: lessonId("s2-l10-boss"),
    title: "総仕上げ — 編集の型 皆伝試験",
    brief:
      '習った型の組み合わせだ。動詞(d/c/y)+対象(w/iw/i"/i()を意識して、最短の一手を選べ。',
    unlocks: [],
    exercises: [
      ex(
        "s2-l10-e1",
        "変数名と文字列を new に",
        'let old = "old"',
        'let new = "new"',
        17,
        ["ciw", 'ci"'],
      ),
      ex("s2-l10-e2", "行を複製して番号を変えろ", "row 1", "row 1\nrow 2", 9, [
        "yy",
        "p",
        "f",
        "x",
        "a",
      ]),
    ],
  },
];

const stage2: Stage = {
  id: "stage-2",
  title: "STAGE 2",
  subtitle: "編集の型",
  lessons: stage2Lessons,
};

// Later stages: titles fixed (domain.md), content authored in future work.
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
