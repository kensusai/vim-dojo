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
import { replaySolution } from "./replaySolution";

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
  "s1-l1-e3": ["x", "x"],
  "s1-l1-e4": ["x", "x", "x"],
  "s1-l2-e3": ["l", "l", "l", "x"],
  "s1-l2-e4": ["l", "x", "l", "x"],
  "s1-l3-e2": ["j", "j", "x"],
  "s1-l3-e3": ["j", "l", "x"],
  "s1-l4-e3": ["w", "w", "w", "x"],
  "s1-l4-e4": ["w", "l", "x"],
  "s1-l5-e2": ["x", "w", "x"],
  "s1-l5-e3": ["w", "w", "x"],
  "s1-l6-e2": ["e", "e", "x"],
  "s1-l6-e3": ["e", "x", "h", "x"],
  "s1-l7-e2": ["$", "x", "x"],
  "s1-l7-e3": ["$", "x", "0", "x"],
  "s1-l8-e3": ["t", ";", "x"],
  "s1-l8-e4": ["f", "X", "x"],
  "s1-l9-e2": ["G", "$", "x"],
  "s1-l9-e3": ["G", "g", "g", "x"],
  "s1-l10-e2": ["$", "a", "!", "<Esc>"],
  "s1-l10-e3": ["l", "i", "i", "<Esc>"],
  "s1-l11-e2": ["O", "f", "i", "r", "s", "t", "<Esc>"],
  "s1-l11-e3": ["o", "e", "n", "d", "<Esc>"],
  "s1-l12-e4": ["4", "x"],
  "s1-l12-e5": ["3", "d", "d"],
  "s2-l1-e1": ["d", "w"],
  "s2-l1-e2": ["w", "d", "w"],
  "s2-l1-e3": ["w", "d", "e"],
  "s2-l2-e1": ["w", "d", "$"],
  "s2-l2-e2": ["$", "d", "0"],
  "s2-l3-e1": ["w", "d", "i", "w"],
  "s2-l3-e2": ["w", "d", "a", "w"],
  "s2-l4-e1": ["c", "i", "w", "b", "a", "r", "<Esc>"],
  "s2-l4-e2": ["w", "w", "c", "i", "w", "r", "i", "g", "h", "t", "<Esc>"],
  "s2-l5-e1": ["f", '"', "d", "i", '"'],
  "s2-l5-e2": ["f", '"', "c", "i", '"', "y", "o", "<Esc>"],
  "s2-l6-e1": ["f", "(", "d", "i", "("],
  "s2-l6-e2": ["f", "(", "c", "i", "(", "y", "<Esc>"],
  "s2-l7-e1": ["y", "y", "p"],
  "s2-l7-e2": ["y", "y", "p"],
  "s2-l7-e3": ["y", "y", "G", "p"],
  "s2-l8-e1": ["y", "i", "w", "$", "p"],
  "s2-l9-e1": ["d", "w", "."],
  "s2-l9-e2": ["d", "w", ".", "."],
  "s2-l10-e1": [
    "w",
    "c",
    "i",
    "w",
    "n",
    "e",
    "w",
    "<Esc>",
    "f",
    '"',
    "c",
    "i",
    '"',
    "n",
    "e",
    "w",
    "<Esc>",
  ],
  "s2-l10-e2": ["y", "y", "p", "f", "1", "x", "a", "2", "<Esc>"],
};

/** Exercises whose solution needs j/k, which jsdom can't drive (no layout).
 * Verified in the browser instead (e2e/drive-m6.mjs). */
const browserOnly = new Set(["s1-l3-e1", "s1-l3-e2", "s1-l3-e3"]);

describe("authored content is solvable with correct pars", () => {
  for (const lesson of stages.flatMap((s) => s.lessons)) {
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
          replaySolution(engine, solution!);
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

describe("authored stages respect the unlock constraint (R6)", () => {
  it("each exercise only practices commands unlocked by its lesson or earlier", () => {
    // Walk lessons in order, growing the unlocked set as we clear each.
    const cleared = {
      ...initialProfile,
      lessonClears: {} as Record<string, { clearedAt: Date }>,
    };
    for (const lesson of stages.flatMap((s) => s.lessons)) {
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
