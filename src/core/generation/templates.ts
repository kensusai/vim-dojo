/**
 * Exercise templates for the generator (R6/R13/R14). Each template builds an
 * exercise AND its solution together, so the par is correct by construction
 * (par = solution length; domain.md P4). A template is usable only when its
 * required commands are all unlocked (R6). Buffers stay short (docs/backend.md
 * パフォーマンス: コンテンツは数百文字まで).
 */
import { commandId, exerciseId, type CommandId } from "../ids";
import type { Exercise } from "../practice/exercise";
import type { RandomSource } from "../ports";
import { nextInt, pick } from "./rng";

export interface GeneratedExercise {
  exercise: Exercise;
  /** Author-solution keystrokes (see stageContent.test.ts token format). */
  solution: string[];
  /**
   * Optional layout-independent replay for headless verification, when the
   * play solution uses j/k (jsdom cannot drive display-line motions). Must
   * reach the same target buffer; par still asserts against `solution`.
   */
  verifySolution?: string[];
}

export interface ExerciseTemplate {
  id: string;
  /** All of these must be unlocked for the template to be usable (R6). */
  requires: CommandId[];
  /** Commands the exercise trains — weakness weighting keys on these (R19). */
  practices: CommandId[];
  generate(rng: RandomSource, id: string): GeneratedExercise;
}

// Drill material reads like real code, not word salad (playtest feedback:
// 実務で使う形の題材のほうが実践的). Identifiers are punctuation-free so
// w-hop counting in templates stays exact; code lines are for line-wise
// templates only (duplicate/trailing/stack), where punctuation is safe.
const WORDS = [
  "userId",
  "fetchData",
  "count",
  "index",
  "result",
  "isReady",
  "maxRetries",
  "onSave",
  "buffer",
  "cursor",
  "payload",
  "response",
  "config",
  "handler",
];
const CODE_LINES = [
  "const count = items.length;",
  "if (isReady) start();",
  "return response.data;",
  "await saveUser(payload);",
  "let retries = 0;",
  "console.log(result);",
  "export default handler;",
  "user.name = trimmed;",
];
const JUNK_CHARS = ["X", "Z", "Q", "#", "@"];
const codeLine = (rng: RandomSource) => pick(rng, CODE_LINES);

const cmd = (...names: string[]) => names.map(commandId);

/** Words with one junk char injected; navigate by w/l and delete it with x. */
const extraChar: ExerciseTemplate = {
  id: "extra-char",
  requires: cmd("w", "l", "x"),
  practices: cmd("w", "l", "x"),
  generate(rng, id) {
    const words = Array.from({ length: 3 + nextInt(rng, 2) }, () =>
      pick(rng, WORDS),
    );
    const target = words.join(" ");
    const wordIndex = nextInt(rng, words.length);
    const word = words[wordIndex]!;
    const offset = nextInt(rng, word.length);
    const junk = pick(rng, JUNK_CHARS);
    const mutated = word.slice(0, offset) + junk + word.slice(offset);
    const initial = words
      .map((w, i) => (i === wordIndex ? mutated : w))
      .join(" ");
    const solution = [
      ...Array<string>(wordIndex).fill("w"),
      ...Array<string>(offset).fill("l"),
      "x",
    ];
    return {
      exercise: {
        id: exerciseId(id),
        title: "紛れ込んだ一文字を消せ",
        hint: "w で単語へ飛び、l で寄って、x で消す。",
        initialBuffer: initial,
        targetBuffer: target,
        par: solution.length,
        practicedCommands: this.practices,
      },
      solution,
    };
  },
};

/** A duplicated line; move down with j and delete it with dd. */
const duplicateLine: ExerciseTemplate = {
  id: "duplicate-line",
  requires: cmd("j", "dd"),
  practices: cmd("j", "dd"),
  generate(rng, id) {
    const lines = Array.from({ length: 3 + nextInt(rng, 2) }, () =>
      codeLine(rng),
    );
    const dupIndex = nextInt(rng, lines.length);
    const initial = [
      ...lines.slice(0, dupIndex + 1),
      lines[dupIndex]!,
      ...lines.slice(dupIndex + 1),
    ].join("\n");
    const target = lines.join("\n");
    const solution = [...Array<string>(dupIndex).fill("j"), "d", "d"];
    return {
      exercise: {
        id: exerciseId(id),
        title: "重複した行を消せ",
        hint: "j で重複行へ降りて、dd で行ごと消す。",
        initialBuffer: initial,
        targetBuffer: target,
        par: solution.length,
        practicedCommands: this.practices,
      },
      solution,
    };
  },
};

/** Trailing junk at the end of one line; j + $ + x. */
const trailingChar: ExerciseTemplate = {
  id: "trailing-char",
  requires: cmd("j", "$", "x"),
  practices: cmd("j", "$", "x"),
  generate(rng, id) {
    const lines = Array.from({ length: 2 + nextInt(rng, 3) }, () =>
      codeLine(rng),
    );
    const lineIndex = nextInt(rng, lines.length);
    const target = lines.join("\n");
    const initial = lines
      .map((l, i) => (i === lineIndex ? l + pick(rng, JUNK_CHARS) : l))
      .join("\n");
    const solution = [...Array<string>(lineIndex).fill("j"), "$", "x"];
    return {
      exercise: {
        id: exerciseId(id),
        title: "行末のゴミを消せ",
        hint: "j で行へ降りて、$ で行末へ、x で消す。",
        initialBuffer: initial,
        targetBuffer: target,
        par: solution.length,
        practicedCommands: this.practices,
      },
      solution,
    };
  },
};

/** Jump to a marker char with f and delete it (single line). */
const fJump: ExerciseTemplate = {
  id: "f-jump",
  requires: cmd("f", "x"),
  practices: cmd("f", "x"),
  generate(rng, id) {
    const words = Array.from({ length: 4 }, () => pick(rng, WORDS));
    const target = words.join(" ");
    // inject a junk char whose letter does not appear earlier in the line
    const junk = pick(rng, ["#", "@", "%"]);
    const pos = 1 + nextInt(rng, target.length - 1);
    const initial = target.slice(0, pos) + junk + target.slice(pos);
    const solution = ["f", junk, "x"];
    return {
      exercise: {
        id: exerciseId(id),
        title: `${junk} まで飛んで消せ`,
        hint: `f${junk} で一撃ジャンプして x。`,
        initialBuffer: initial,
        targetBuffer: target,
        par: solution.length,
        practicedCommands: this.practices,
      },
      solution,
    };
  },
};

/**
 * Treasure maze: a grid of floor tiles and decorative walls with coins (*)
 * to collect — navigate with hjkl and press x on each coin (playtest
 * feedback: 文章修正以外のドリルが欲しい). Walls don't block motion (vim
 * doesn't work that way); the par is the straight hjkl tour, so cutting
 * across them is exactly the intended play.
 */
const treasureMaze: ExerciseTemplate = {
  id: "treasure-maze",
  requires: cmd("h", "j", "k", "l", "x"),
  practices: cmd("h", "j", "k", "l"),
  generate(rng, id) {
    const rows = 5;
    const cols = 18 + nextInt(rng, 5);
    // scatter decorative walls (~22%), keep the start tile clear
    const grid: string[][] = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) =>
        r === 0 && c === 0 ? "." : rng.next() < 0.22 ? "#" : ".",
      ),
    );
    // One coin per row (x removes its cell and shortens that row — a second
    // coin on the same row would shift coordinates mid-run), never in the
    // last column (deleting the line-end would pull the cursor column back).
    const coinRows = [0, 1, 2, 3, 4].filter(() => rng.next() < 0.8).slice(0, 3);
    while (coinRows.length < 3) {
      const r = nextInt(rng, rows);
      if (!coinRows.includes(r)) coinRows.push(r);
    }
    const coins: [number, number][] = coinRows.map((r) => {
      let c = nextInt(rng, cols - 1);
      if (r === 0 && c === 0) c = 1;
      grid[r]![c] = "*";
      return [r, c];
    });
    const initial = grid.map((row) => row.join("")).join("\n");
    const target = grid
      .map((row) => row.filter((cell) => cell !== "*").join(""))
      .join("\n");
    // hjkl tour top-to-bottom; par = its length. After x the cursor keeps its
    // column index, and other rows are untouched, so plain Manhattan counts.
    coins.sort(([ar], [br]) => ar - br);
    const solution: string[] = [];
    const verifySolution: string[] = [];
    let cr = 0;
    let cc = 0;
    for (const [r, c] of coins) {
      solution.push(
        ...Array<string>(Math.abs(r - cr)).fill(r > cr ? "j" : "k"),
        ...Array<string>(Math.abs(c - cc)).fill(c > cc ? "l" : "h"),
        "x",
      );
      verifySolution.push(...String(r + 1), "G", ...String(c + 1), "|", "x");
      cr = r;
      cc = c;
    }
    return {
      exercise: {
        id: exerciseId(id),
        title: "迷路の宝を全部あつめろ",
        hint: "h j k l で * まで歩き、踏んだら x で回収。壁(#)は飾りだ — 最短距離で行け。",
        initialBuffer: initial,
        targetBuffer: target,
        par: solution.length,
        practicedCommands: this.practices,
      },
      solution,
      verifySolution,
    };
  },
};

/** 蛇の道: hop word to word with w and delete the marked word's brand (X). */
const snakePath: ExerciseTemplate = {
  id: "snake-path",
  requires: cmd("w", "x"),
  practices: cmd("w"),
  generate(rng, id) {
    const rows = 3;
    const perRow = 4;
    const words = Array.from({ length: rows * perRow }, () => pick(rng, WORDS));
    // one branded word per row; w counts words, so deletions never shift hops
    const marks = Array.from(
      { length: rows },
      (_, r) => r * perRow + nextInt(rng, perRow),
    );
    const branded = words.map((w, i) => (marks.includes(i) ? "X" + w : w));
    const initial = Array.from({ length: rows }, (_, r) =>
      branded.slice(r * perRow, (r + 1) * perRow).join(" "),
    ).join("\n");
    const target = Array.from({ length: rows }, (_, r) =>
      words.slice(r * perRow, (r + 1) * perRow).join(" "),
    ).join("\n");
    const solution: string[] = [];
    let cursor = 0;
    for (const mark of marks) {
      solution.push(...Array<string>(mark - cursor).fill("w"), "x");
      cursor = mark;
    }
    return {
      exercise: {
        id: exerciseId(id),
        title: "蛇の道 — 単語を渡って X を消せ",
        hint: "w で単語から単語へ跳ぶ(行末でも次の行へ続く)。X の付いた単語で x。",
        initialBuffer: initial,
        targetBuffer: target,
        par: solution.length,
        practicedCommands: this.practices,
      },
      solution,
    };
  },
};

/** 狙撃: pick off scattered @ targets with f-jumps. */
const snipe: ExerciseTemplate = {
  id: "snipe",
  requires: cmd("f", "x"),
  practices: cmd("f"),
  generate(rng, id) {
    const words = Array.from({ length: 7 }, () => pick(rng, WORDS));
    // brand 3 distinct words (never the first — the cursor starts there and
    // f only looks ahead) by appending the target glyph
    const targets = new Set<number>();
    while (targets.size < 3) targets.add(1 + nextInt(rng, words.length - 1));
    const initial = words
      .map((w, i) => (targets.has(i) ? w + "@" : w))
      .join(" ");
    const target = words.join(" ");
    const solution = Array.from({ length: 3 }, () => ["f", "@", "x"]).flat();
    return {
      exercise: {
        id: exerciseId(id),
        title: "狙撃 — 的(@)を撃ち抜け",
        hint: "f@ で次の的へ一撃ジャンプ、x で撃つ。3連射だ。",
        initialBuffer: initial,
        targetBuffer: target,
        par: solution.length,
        practicedCommands: this.practices,
      },
      solution,
    };
  },
};

/** 積み木: one line is out of order — dd it and p it back into place. */
const lineStack: ExerciseTemplate = {
  id: "line-stack",
  requires: cmd("dd", "p", "G"),
  practices: cmd("dd", "p"),
  generate(rng, id) {
    const lines = Array.from(
      { length: 5 },
      (_, i) => `${i + 1}: ${codeLine(rng)}`,
    );
    // pull one line (never the first — pasting back above the top needs P,
    // which is not in the curriculum yet) and drop it somewhere else
    const from = 1 + nextInt(rng, lines.length - 1);
    // never displace to the last row: this emulator's dd on the final line
    // leaves an empty-line artifact (docs/vim-coverage.md)
    const spots = [0, 1, 2, 3].filter((i) => i !== from);
    const to = spots[nextInt(rng, spots.length)]!;
    const moved = lines[from]!;
    const rest = lines.filter((_, i) => i !== from);
    rest.splice(to, 0, moved);
    // `rest` is now the shuffled board; put it back in numeric order
    const initial = rest.join("\n");
    const target = lines.join("\n");
    const displacedRow = rest.indexOf(moved) + 1; // 1-based
    const predecessorRow = from; // after dd the correct predecessor sits here
    const solution = [
      ...String(displacedRow),
      "G",
      "d",
      "d",
      ...String(predecessorRow),
      "G",
      "p",
    ];
    return {
      exercise: {
        id: exerciseId(id),
        title: "積み木 — 番号順に積み直せ",
        hint: "はみ出した行を dd で抜いて、{行番号}G で移動し p で差し込む。",
        initialBuffer: initial,
        targetBuffer: target,
        par: solution.length,
        practicedCommands: this.practices,
      },
      solution,
    };
  },
};

/** 写経: make the line match the model by rewriting the odd words with ciw. */
const transcribe: ExerciseTemplate = {
  id: "transcribe",
  requires: cmd("ciw", "w"),
  practices: cmd("ciw"),
  generate(rng, id) {
    const correct = Array.from({ length: 4 }, () => pick(rng, WORDS));
    const diffs = new Set<number>();
    while (diffs.size < 2) diffs.add(nextInt(rng, correct.length));
    const mutated = correct.map((w, i) => {
      if (!diffs.has(i)) return w;
      let other = pick(rng, WORDS);
      while (other === w) other = pick(rng, WORDS);
      return other;
    });
    const initial = mutated.join(" ");
    const target = correct.join(" ");
    const solution: string[] = [];
    let cursor = 0;
    for (const i of [...diffs].sort((a, b) => a - b)) {
      solution.push(
        ...Array<string>(i - cursor).fill("w"),
        "c",
        "i",
        "w",
        ...correct[i]!,
        "<Esc>",
      );
      cursor = i;
    }
    return {
      exercise: {
        id: exerciseId(id),
        title: "写経 — 手本と一致させよ",
        hint: "違う単語まで w で跳び、ciw で書き換えて Esc。TARGET が手本だ。",
        initialBuffer: initial,
        targetBuffer: target,
        par: solution.length,
        practicedCommands: this.practices,
      },
      solution,
    };
  },
};

export const templates: ExerciseTemplate[] = [
  extraChar,
  duplicateLine,
  trailingChar,
  fJump,
  treasureMaze,
  snakePath,
  snipe,
  lineStack,
  transcribe,
];
