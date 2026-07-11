// @vitest-environment jsdom
/**
 * Generated-content verification (PLAN M7): for many seeds, every template's
 * output is solvable by its own recorded solution in exactly `par` keys,
 * replayed through the real vim engine. This is the guarantee behind
 * "生成お題が理不尽にならない" — if a template drifts, this fails first.
 * (j-based solutions are replayed with sendKey, which drives vim directly and
 * does not depend on DOM layout the way real j keydowns do.)
 */
import { beforeAll, describe, expect, it } from "vitest";
import { seededRandom } from "../core/generation/rng";
import { templates } from "../core/generation/templates";
import { createVimEngine } from "./codeMirrorVimEngine";

beforeAll(() => {
  const zeroRect = {
    x: 0,
    y: 0,
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    width: 0,
    height: 0,
    toJSON: () => ({}),
  } as DOMRect;
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
  Range.prototype.getBoundingClientRect = () => zeroRect;
  if (!("ResizeObserver" in globalThis)) {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

const SEEDS_PER_TEMPLATE = 25;

/**
 * jsdom cannot drive j/k (display-line motions need layout). Landing on line
 * n+1 via j×n or via "{n+1}G" yields the same buffer, so replays swap leading
 * j-runs for a G jump. Par still asserts against the original j-based length;
 * j itself is browser-verified (e2e/drive-m6.mjs).
 */
function replayable(solution: string[]): string[] {
  let jRun = 0;
  while (solution[jRun] === "j") jRun++;
  if (jRun === 0) return solution;
  return [...String(jRun + 1), "G", ...solution.slice(jRun)];
}

describe("every template's generated exercise is solvable at par", () => {
  for (const template of templates) {
    it(`${template.id} (${SEEDS_PER_TEMPLATE} seeds)`, () => {
      const engine = createVimEngine(document.body);
      try {
        for (let s = 0; s < SEEDS_PER_TEMPLATE; s++) {
          const rng = seededRandom(`${template.id}-${s}`);
          const { exercise, solution } = template.generate(
            rng,
            `t-${template.id}-${s}`,
          );
          engine.reset(exercise.initialBuffer);
          for (const key of replayable(solution)) engine.sendKey(key);
          expect(
            engine.currentBuffer(),
            `${template.id} seed ${s}: solution did not reach the target\ninitial: ${JSON.stringify(exercise.initialBuffer)}\nsolution: ${solution.join(" ")}`,
          ).toBe(exercise.targetBuffer);
          expect(
            solution.length,
            `${template.id} seed ${s}: par mismatch`,
          ).toBe(exercise.par);
        }
      } finally {
        engine.destroy();
      }
    });
  }
});
