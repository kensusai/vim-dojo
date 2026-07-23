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

/** Exercises whose solution needs j/k, which jsdom can't drive (no layout).
 * Verified in the browser instead (e2e/drive-m6.mjs for stage 1,
 * e2e/drive-stage7.mjs for stage 7 — visual-mode j is display-based too). */
const browserOnly = new Set([
  "s1-l3-e1",
  "s1-l3-e2",
  "s1-l3-e3",
  "s1-l3-e4",
  "s1-l3-e5",
  "s7-l2-e2",
  "s7-l2-e3",
  "s7-l3-e3",
  "s7-l3-e4",
  "s7-l4-e1",
  "s7-l4-e2",
  "s7-l4-e4",
  "s7-l5-e1",
  "s7-l5-e3",
  "s7-l5-e4",
]);

describe("authored content is solvable with correct pars", () => {
  for (const lesson of stages.flatMap((s) => s.lessons)) {
    for (const exercise of lesson.exercises) {
      const run = browserOnly.has(exercise.id) ? it.skip : it;
      run(`${exercise.id}: ${exercise.title}`, () => {
        const engine = createVimEngine(document.body);
        try {
          engine.reset(exercise.initialBuffer);
          const solution = exercise.solution;
          expect(
            solution,
            `no recorded solution for ${exercise.id}`,
          ).toBeDefined();
          replaySolution(engine, solution!);
          expect(engine.currentBuffer()).toBe(exercise.targetBuffer);
          // Par is the author's best keystroke count: an Ex-command token
          // like ":%s/a/b/g" is typed as its characters plus Enter.
          const parKeys = solution!.reduce(
            (n, token) => n + (token.startsWith(":") ? token.length + 1 : 1),
            0,
          );
          expect(parKeys).toBe(exercise.par);
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
