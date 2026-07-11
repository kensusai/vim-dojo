// @vitest-environment jsdom
/**
 * Content verification (PLAN M6): every stage-1 exercise is solvable, and its
 * par equals the recorded solution length (domain.md P4). This replays the
 * author's solution through the real vim engine and asserts:
 *   - the buffer reaches the target (solvable),
 *   - the solution uses exactly `par` keystrokes (par is achievable and tight),
 *   - the exercise only practices commands unlocked by its lesson or earlier.
 * If a par is wrong, this test fails loudly before players ever see it.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { installCodeMirrorDomStubs } from "./cmDomStubs";
import { commandId } from "../core/ids";
import { unlockedCommands } from "../core/curriculum/curriculum";
import { stages } from "../core/curriculum/stages";
import { initialProfile } from "../core/profile";
import { createVimEngine } from "./codeMirrorVimEngine";

beforeAll(installCodeMirrorDomStubs);

/**
 * Recorded solutions, keyed by exercise id. Insert-mode text is written with
 * "i"/"a"/"o" then the literal characters then "<Esc>". Each token is one
 * keystroke for par accounting (matching R2: keys, not commands).
 */
const solutions: Record<string, string[]> = {
  "s1-l1-e1": ["x"],
  "s1-l1-e2": ["x"],
  "s1-l2-e1": ["l", "x"],
  "s1-l2-e2": ["l", "l", "x"],
  "s1-l3-e1": ["j", "x"],
  "s1-l4-e1": ["w", "x"],
  "s1-l4-e2": ["w", "w", "x"],
  "s1-l5-e1": ["w", "b", "x"],
  "s1-l6-e1": ["e", "x"],
  "s1-l7-e1": ["$", "x"],
  "s1-l8-e1": ["f", "X", "x"],
  "s1-l8-e2": ["f", "Y", "x"],
  "s1-l9-e1": ["G", "x"],
  "s1-l10-e1": ["i", "h", "<Esc>"],
  "s1-l11-e1": ["o", "s", "e", "c", "o", "n", "d", "<Esc>"],
  "s1-l12-e1": ["d", "d"],
  "s1-l12-e2": ["3", "x"],
  "s1-l12-e3": ["2", "d", "d"],
};

const stage1 = stages[0]!;

/** Exercises whose solution needs j/k, which jsdom can't drive (no layout).
 * Verified in the browser instead (e2e/drive-m6.mjs). */
const browserOnly = new Set(["s1-l3-e1"]);

const INSERT_ENTER = new Set(["i", "a", "A", "I", "o", "O"]);

/**
 * Replay a solution. Tokens are single keystrokes. After an insert-entering
 * command, literal characters are typed (engine.typeText) until "<Esc>",
 * because insert-mode text goes through typing, not Vim.handleKey.
 */
function play(engine: ReturnType<typeof createVimEngine>, solution: string[]) {
  let inserting = false;
  for (const key of solution) {
    if (key === "<Esc>") {
      engine.sendKey("<Esc>");
      inserting = false;
    } else if (inserting) {
      engine.typeText(key);
    } else {
      engine.sendKey(key);
      if (INSERT_ENTER.has(key)) inserting = true;
    }
  }
}

describe("stage 1 content is solvable with correct pars", () => {
  for (const lesson of stage1.lessons) {
    for (const exercise of lesson.exercises) {
      const run = browserOnly.has(exercise.id) ? it.skip : it;
      run(`${exercise.id}: ${exercise.title}`, () => {
        const engine = createVimEngine(document.body);
        try {
          engine.reset(exercise.initialBuffer);
          const solution = solutions[exercise.id];
          expect(
            solution,
            `no recorded solution for ${exercise.id}`,
          ).toBeDefined();
          play(engine, solution!);
          expect(engine.currentBuffer()).toBe(exercise.targetBuffer);
          // Par is the author's best: the recorded solution must match it.
          expect(solution!.length).toBe(exercise.par);
        } finally {
          engine.destroy();
        }
      });
    }
  }
});

describe("stage 1 respects the unlock constraint (R6)", () => {
  it("each exercise only practices commands unlocked by its lesson or earlier", () => {
    // Walk lessons in order, growing the unlocked set as we clear each.
    const cleared = {
      ...initialProfile,
      lessonClears: {} as Record<string, { clearedAt: Date }>,
    };
    for (const lesson of stage1.lessons) {
      // Commands this lesson introduces are available to its own exercises.
      cleared.lessonClears[lesson.id] = { clearedAt: new Date() };
      const available = unlockedCommands(cleared, stages);
      for (const exercise of lesson.exercises) {
        for (const cmd of exercise.practicedCommands) {
          // counts (e.g. "3") are keystrokes, not gated commands; skip pure digits.
          if (/^\d+$/.test(cmd)) continue;
          expect(
            available.has(cmd) || cmd === commandId("x"),
            `${exercise.id} practices ${cmd} before it is unlocked`,
          ).toBe(true);
        }
      }
    }
  });
});
