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
import { SOLUTIONS } from "./solutions";

const ex = (
  id: string,
  title: string,
  initialBuffer: string,
  targetBuffer: string,
  par: number,
  commands: string[],
  hint?: string,
): Exercise => ({
  id: exerciseId(id),
  title,
  initialBuffer,
  targetBuffer,
  par,
  practicedCommands: commands.map(commandId),
  ...(hint !== undefined ? { hint } : {}),
  ...(SOLUTIONS[id] !== undefined ? { solution: SOLUTIONS[id] } : {}),
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
      "直前の「変更」をまるごと再実行するのが . だ。例: dw で1単語消したあと . を押すと、もう1単語消える(dw がもう一度走る)。移動(w や j)は変更ではないので繰り返されない。",
    note: "名著 Practical Vim は「1回の編集を . で繰り返せる形に組め」をドット公式と呼ぶ。上級者ほど多用する。",
    unlocks: [commandId(".")],
    exercises: [
      ex(
        "s2-l9-e1",
        "前の2単語を消せ",
        "aa bb cc dd",
        "cc dd",
        3,
        ["dw", "."],
        "dw で aa が消える。続けて . を押すと dw がもう一度走って bb も消える。合計3キー。",
      ),
      ex(
        "s2-l9-e2",
        "3単語まとめて消せ",
        "x1 x2 x3 keep",
        "keep",
        4,
        ["dw", "."],
        "dw のあと . . と2連打。同じ変更を何度でも重ねられるのが . の強さだ。",
      ),
    ],
  },
  {
    id: lessonId("s2-l10-boss"),
    title: "総仕上げ — 編集の型 皆伝試験",
    boss: true,
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
        'w で old へ → ciw で new と書いて Esc → f" で文字列へ → ci" で new と書いて Esc。2つの技の連携だ。',
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

const stage3Lessons: Lesson[] = [
  {
    id: lessonId("s3-l1-s"),
    title: '":s \u2014 \u73fe\u5728\u884c\u3092\u7f6e\u63db',
    brief:
      ":s/\u53e4\u3044/\u65b0\u3057\u3044/ \u3067\u4eca\u3044\u308b\u884c\u306e\u6700\u521d\u306e\u4e00\u81f4\u3092\u7f6e\u304d\u63db\u3048\u308b\u3002: \u3092\u62bc\u3059\u3068\u4e0b\u306b\u30b3\u30de\u30f3\u30c9\u5165\u529b\u6b04\u304c\u51fa\u308b\u3002\u5b9f\u884c\u306f Enter\u3002",
    unlocks: [commandId(":s")],
    note: "vim \u306e\u9b54\u6cd5\u300c\u7f6e\u63db\u300d\u306e\u5165\u308a\u53e3\u3002\u7bc4\u56f2\u30fb\u30d5\u30e9\u30b0\u3092\u4ed8\u3051\u3066\u5f37\u529b\u306b\u306a\u308b(\u6b21\u306e\u30ec\u30c3\u30b9\u30f3)\u3002",
    exercises: [
      ex(
        "s3-l1-e1",
        "foo \u3092 bar \u306b(1\u884c)",
        "let foo = 1;",
        "let bar = 1;",
        12,
        [":s"],
        "\u300c:\u300d\u3092\u62bc\u3057\u3066 s/foo/bar/ \u3068\u6253\u3061 Enter\u3002",
      ),
      ex(
        "s3-l1-e2",
        "cat \u3092 dog \u306b",
        "my cat sleeps",
        "my dog sleeps",
        12,
        [":s"],
        ":s/cat/dog/ \u3068\u6253\u3063\u3066 Enter\u3002",
      ),
      ex(
        "s3-l1-e3",
        "int \u3092 let \u306b",
        "int x = 0;",
        "let x = 0;",
        12,
        [":s"],
        ":s/int/let/\u3002\u884c\u306e\u6700\u521d\u306e\u4e00\u81f4\u3060\u3051\u5909\u308f\u308b\u3002",
      ),
      ex(
        "s3-l1-e4",
        "foo \u3092 baz \u306b",
        "foo.bar()",
        "baz.bar()",
        12,
        [":s"],
        ":s/foo/baz/\u3002",
      ),
      ex(
        "s3-l1-e5",
        "TODO \u3092 DONE \u306b",
        "TODO: fix",
        "DONE: fix",
        14,
        [":s"],
        ":s/TODO/DONE/\u3002\u5927\u6587\u5b57\u3082\u305d\u306e\u307e\u307e\u7f6e\u3051\u308b\u3002",
      ),
    ],
  },
  {
    id: lessonId("s3-l2-sg"),
    title: '":s//g \u2014 \u884c\u5185\u3092\u3059\u3079\u3066\u7f6e\u63db',
    brief:
      "\u672b\u5c3e\u306b g \u30d5\u30e9\u30b0\u3092\u4ed8\u3051\u308b\u3068\u3001\u305d\u306e\u884c\u306e\u4e00\u81f4\u3092\u5168\u90e8\u7f6e\u304d\u63db\u3048\u308b\u3002g \u304c\u7121\u3044\u3068\u6700\u521d\u306e1\u500b\u3060\u3051\u3002",
    unlocks: [commandId(":s//g")],
    exercises: [
      ex(
        "s3-l2-e1",
        "\u884c\u5185\u306e x \u3092\u5168\u90e8 o \u306b",
        "xxx marks",
        "ooo marks",
        9,
        [":s//g"],
        ":s/x/o/g\u3002g \u3067\u884c\u5185\u5168\u90e8\u3002",
      ),
      ex(
        "s3-l2-e2",
        "a \u3092 b \u306b(\u5168\u90e8)",
        "a-a-a-a",
        "b-b-b-b",
        9,
        [":s//g"],
        ":s/a/b/g\u3002",
      ),
      ex(
        "s3-l2-e3",
        "no \u3092 ok \u306b(\u5168\u90e8)",
        "no no no",
        "ok ok ok",
        11,
        [":s//g"],
        ":s/no/ok/g\u3002",
      ),
      ex(
        "s3-l2-e4",
        "1 \u3092 9 \u306b(\u5168\u90e8)",
        "1,1,1",
        "9,9,9",
        9,
        [":s//g"],
        ":s/1/9/g\u3002",
      ),
      ex(
        "s3-l2-e5",
        "\u5c0f\u6587\u5b57 s \u3092\u5927\u6587\u5b57\u306b",
        "mississippi",
        "miSSiSSippi",
        9,
        [":s//g"],
        ":s/s/S/g\u3002g \u304c\u7121\u3044\u3068\u6700\u521d\u306e1\u500b\u3060\u3051\u3060\u3002",
      ),
    ],
  },
  {
    id: lessonId("s3-l3-percent"),
    title: '":%s \u2014 \u30d5\u30a1\u30a4\u30eb\u5168\u4f53\u3092\u7f6e\u63db',
    brief:
      ":%s/\u2026/\u2026/g \u3067 % = \u5168\u884c\u304c\u5bfe\u8c61\u3002\u30d5\u30a1\u30a4\u30eb\u4e2d\u306e\u4e00\u81f4\u3092\u307e\u3068\u3081\u3066\u7f6e\u63db\u3059\u308b\u3001\u30ea\u30d5\u30a1\u30af\u30bf\u306e\u4e3b\u5f79\u3002",
    unlocks: [commandId(":%s")],
    note: "\u5909\u6570\u540d\u306e\u4e00\u62ec\u30ea\u30cd\u30fc\u30e0\u306f\u3053\u308c\u4e00\u767a\u3002\u5b9f\u52d9\u3067\u3044\u3061\u3070\u3093\u300cvim\u3059\u3054\u3044\u300d\u3068\u306a\u308b\u77ac\u9593\u3002",
    exercises: [
      ex(
        "s3-l3-e1",
        "\u5168 tmp \u3092 out \u306b",
        "tmp = f(tmp);\nreturn tmp;",
        "out = f(out);\nreturn out;",
        14,
        [":%s"],
        ":%s/tmp/out/g\u3002% \u3067\u5168\u884c\u3001g \u3067\u884c\u5185\u5168\u90e8\u3002",
      ),
      ex(
        "s3-l3-e2",
        "\u5168 old \u3092 new \u306b",
        "old.a = old.b;\nold.c = 1;",
        "new.a = new.b;\nnew.c = 1;",
        14,
        [":%s"],
        ":%s/old/new/g\u3002",
      ),
      ex(
        "s3-l3-e3",
        "\u5168 i \u3092 n \u306b",
        "i++;\ni += i;\nreturn i;",
        "n++;\nn += n;\nreturn n;",
        10,
        [":%s"],
        ":%s/i/n/g\u3002\u5909\u6570\u306e\u4e00\u62ec\u30ea\u30cd\u30fc\u30e0\u306e\u5f62\u3060\u3002",
      ),
      ex(
        "s3-l3-e4",
        "\u5168 red \u3092 blue \u306b",
        "red\nred\nred",
        "blue\nblue\nblue",
        15,
        [":%s"],
        ":%s/red/blue/g\u3002",
      ),
      ex(
        "s3-l3-e5",
        "\u5168 a \u3092 x \u306b",
        "a = a;\nb = a;",
        "x = x;\nb = x;",
        10,
        [":%s"],
        ":%s/a/x/g\u3002",
      ),
    ],
  },
  {
    id: lessonId("s3-l4-g"),
    title: '":g/\u2026/d \u2014 \u8a72\u5f53\u884c\u3092\u4e00\u6383',
    brief:
      ":g/\u30d1\u30bf\u30fc\u30f3/d \u3067\u30d1\u30bf\u30fc\u30f3\u3092\u542b\u3080\u884c\u3092\u5168\u90e8\u524a\u9664\u3002\u30ed\u30b0\u3084\u30b3\u30e1\u30f3\u30c8\u306e\u4e00\u62ec\u9664\u53bb\u306b\u3002",
    unlocks: [commandId(":g")],
    exercises: [
      ex(
        "s3-l4-e1",
        "DEBUG \u884c\u3092\u6d88\u305b",
        "keep 1\nDEBUG x\nkeep 2\nDEBUG y",
        "keep 1\nkeep 2",
        11,
        [":g"],
        ":g/DEBUG/d\u3002\u542b\u3080\u884c\u3092\u5168\u90e8\u524a\u9664\u3002",
      ),
      ex(
        "s3-l4-e2",
        "note \u30b3\u30e1\u30f3\u30c8\u3092\u6d88\u305b",
        "code\n// note\nmore\n// hmm",
        "code\nmore\n// hmm",
        10,
        [":g"],
        ":g/note/d\u3002note \u3092\u542b\u3080\u884c\u3060\u3051\u6d88\u3048\u308b\u3002",
      ),
      ex(
        "s3-l4-e3",
        "log \u884c\u3092\u4e00\u6383",
        "a\nlog: 1\nb\nlog: 2\nc",
        "a\nb\nc",
        9,
        [":g"],
        ":g/log/d\u3002",
      ),
      ex(
        "s3-l4-e4",
        "skip \u884c\u3092\u6d88\u305b",
        "run()\n#skip\ngo()\n#skip",
        "run()\ngo()",
        10,
        [":g"],
        ":g/skip/d\u3002",
      ),
      ex(
        "s3-l4-e5",
        "TMP \u884c\u3092\u5168\u90e8\u6d88\u305b",
        "x=1\nTMP\ny=2\nTMP\nz=3",
        "x=1\ny=2\nz=3",
        9,
        [":g"],
        ":g/TMP/d\u3002\u6563\u3089\u3070\u3063\u3066\u3044\u3066\u3082\u307e\u3068\u3081\u3066\u3002",
      ),
    ],
  },
  {
    id: lessonId("s3-l5-boss"),
    boss: true,
    title:
      "\u7dcf\u4ed5\u4e0a\u3052 \u2014 \u691c\u7d22\u7f6e\u63db \u7686\u4f1d\u8a66\u9a13",
    brief:
      "\u7bc4\u56f2(%)\u30fb\u30d5\u30e9\u30b0(g)\u30fb\u30b0\u30ed\u30fc\u30d0\u30eb(:g)\u3092\u4f7f\u3044\u5206\u3051\u308d\u3002\u6700\u77ed\u306e\u4e00\u624b\u3067\u5168\u90e8\u7247\u4ed8\u3051\u308b\u3093\u3060\u3002",
    unlocks: [],
    exercises: [
      ex(
        "s3-l5-e1",
        "\u5168 foo \u3092 bar \u306b\u4e00\u62ec\u5909\u63db",
        "foo(foo, foo);",
        "bar(bar, bar);",
        14,
        [":%s"],
        ":%s/foo/bar/g \u3067\u5168\u90e8\u3044\u3063\u307a\u3093\u306b\u3002",
      ),
      ex(
        "s3-l5-e2",
        "DBG \u884c\u3092\u5168\u90e8\u6d88\u305b",
        "DBG a\nkeep\nDBG b",
        "keep",
        9,
        [":%s"],
        ":g/DBG/d\u3002\u8981\u308b\u884c\u3060\u3051\u6b8b\u3059\u3002",
      ),
      ex(
        "s3-l5-e3",
        "\u5168 n \u3092 k \u306b\u30ea\u30cd\u30fc\u30e0",
        "n = n + n;\nn = n * 2;",
        "k = k + k;\nk = k * 2;",
        10,
        [":%s"],
        ":%s/n/k/g\u3002",
      ),
      ex(
        "s3-l5-e4",
        "aaa \u3092 ccc \u306b(\u884c\u5185\u5168\u90e8)",
        "aaa bbb aaa",
        "ccc bbb ccc",
        13,
        [":%s"],
        ":s/aaa/ccc/g\u3002\u5358\u8a9e\u5358\u4f4d\u3067\u3082g\u3067\u5168\u90e8\u3002",
      ),
    ],
  },
];

const stage4Lessons: Lesson[] = [
  {
    id: lessonId("s4-l1-named"),
    title: '"a — 名前つきレジスタに保存',
    brief:
      '"ayy で「レジスタ a」に行をヤンク、"ap で貼り付け。普通の yank(無名レジスタ)を上書きせずに複数のコピーを持てる。',
    unlocks: [commandId('"ayy'), commandId('"ap')],
    note: "レジスタは a〜z の26個。使い分けると「あのコピー、消えた!」が無くなる。",
    exercises: [
      ex(
        "s4-l1-e1",
        "1行目をレジスタaに保存して末尾へ複製",
        "first\nsecond",
        "first\nsecond\nfirst",
        8,
        ['"ayy', "G", '"ap'],
        '"ayy で first を a に → G で最終行 → "ap で貼る。6キー。',
      ),
    ],
  },
  {
    id: lessonId("s4-l2-two"),
    title: "2つのレジスタを使い分ける",
    brief:
      "a と b、2つのレジスタに別々の行を持てば、順番を入れ替える貼り付けも自在。",
    unlocks: [commandId('"byy'), commandId('"bp')],
    exercises: [
      ex(
        "s4-l2-e1",
        "2行をコピーして末尾に順に足す",
        "alpha\nbeta",
        "alpha\nbeta\nalpha\nbeta",
        16,
        ['"ayy', "j", '"byy', "G", '"ap', '"bp'],
        '"ayy で alpha、j して "byy で beta、G で末尾、"ap "bp で順に貼る。',
      ),
    ],
  },
  {
    id: lessonId("s4-l3-boss"),
    title: "総仕上げ — 奥義 皆伝試験",
    boss: true,
    brief:
      "レジスタを操り、無名レジスタに頼らず狙った行を狙った場所へ。これができれば奥義皆伝だ。",
    unlocks: [],
    exercises: [
      ex(
        "s4-l3-e1",
        "見出し行を末尾に2つ複製せよ",
        "# Title\nbody\nmore",
        "# Title\nbody\nmore\n# Title\n# Title",
        12,
        ['"ayy', "j", '"ap', "G", '"ap'],
        '"ayy で見出しを a に控える。あとは "ap を2回。同じレジスタは何度でも貼れるのが強みだ。',
      ),
    ],
  },
];

const stage3: Stage = {
  id: "stage-3",
  title: "STAGE 3",
  subtitle: "検索と置換",
  lessons: stage3Lessons,
};
const stage4: Stage = {
  id: "stage-4",
  title: "STAGE 4",
  subtitle: "レジスタの奥義",
  lessons: stage4Lessons,
};

// Roadmap stubs (titles set; content authored in future turns). Shown on the
// map so the journey doesn't look like it ends at 4 (owner: 4は少ない).
const stage5: Stage = {
  id: "stage-5",
  title: "STAGE 5",
  subtitle: "効率化の型",
  lessons: [],
};
const stage6: Stage = {
  id: "stage-6",
  title: "STAGE 6",
  subtitle: "検索の達人",
  lessons: [],
};

export const stages: Stage[] = [stage1, stage2, stage3, stage4, stage5, stage6];
