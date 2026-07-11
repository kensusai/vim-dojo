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
}

export interface ExerciseTemplate {
  id: string;
  /** All of these must be unlocked for the template to be usable (R6). */
  requires: CommandId[];
  /** Commands the exercise trains — weakness weighting keys on these (R19). */
  practices: CommandId[];
  generate(rng: RandomSource, id: string): GeneratedExercise;
}

const WORDS = [
  "vim",
  "dojo",
  "editor",
  "buffer",
  "cursor",
  "motion",
  "window",
  "keyboard",
  "normal",
  "insert",
  "visual",
  "line",
  "word",
  "delete",
];
const JUNK_CHARS = ["X", "Z", "Q", "#", "@"];

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
    const lines = Array.from(
      { length: 3 + nextInt(rng, 2) },
      () => `${pick(rng, WORDS)} ${pick(rng, WORDS)}`,
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
    const lines = Array.from(
      { length: 2 + nextInt(rng, 3) },
      () => `${pick(rng, WORDS)} ${pick(rng, WORDS)}`,
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

export const templates: ExerciseTemplate[] = [
  extraChar,
  duplicateLine,
  trailingChar,
  fJump,
];
