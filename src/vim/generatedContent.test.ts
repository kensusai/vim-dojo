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
import { installCodeMirrorDomStubs } from "./cmDomStubs";
import { seededRandom } from "../core/generation/rng";
import { templates } from "../core/generation/templates";
import { createVimEngine } from "./codeMirrorVimEngine";
import { replaySolution } from "./replaySolution";

beforeAll(installCodeMirrorDomStubs);

const SEEDS_PER_TEMPLATE = 25;

/**
 * jsdom cannot drive j/k (display-line motions need layout), so replays swap
 * leading j-runs for a G jump. PREMISE: j preserves the column while nG lands
 * on the line's first NON-BLANK char — the swap is only equivalent because
 * generated lines never start with whitespace (both land on column 0, and
 * every solution's j-run starts at column 0). The invariant test below pins
 * that premise; if templates ever emit indented lines, switch these replays
 * to the "{col}|" anchoring debug-sweep already uses. Par still asserts
 * against the original j-based length; j itself is browser-verified
 * (e2e/drive-m6.mjs).
 */
function replayable(solution: string[]): string[] {
  let jRun = 0;
  while (solution[jRun] === "j") jRun++;
  if (jRun === 0) return solution;
  return [...String(jRun + 1), "G", ...solution.slice(jRun)];
}

// The premise behind replayable(): no generated line may start with blanks.
it("generated lines never start with whitespace (j ≡ nG premise)", () => {
  for (const template of templates) {
    for (let s = 0; s < SEEDS_PER_TEMPLATE; s++) {
      const rng = seededRandom(`indent-${template.id}-${s}`);
      const { exercise } = template.generate(rng, `i-${template.id}-${s}`);
      for (const line of exercise.initialBuffer.split("\n")) {
        expect(line, `${template.id} seed ${s}`).not.toMatch(/^\s/);
      }
    }
  }
});

describe("every template's generated exercise is solvable at par", () => {
  for (const template of templates) {
    it(`${template.id} (${SEEDS_PER_TEMPLATE} seeds)`, () => {
      const engine = createVimEngine(document.body);
      try {
        for (let s = 0; s < SEEDS_PER_TEMPLATE; s++) {
          const rng = seededRandom(`${template.id}-${s}`);
          const { exercise, solution, verifySolution } = template.generate(
            rng,
            `t-${template.id}-${s}`,
          );
          engine.reset(exercise.initialBuffer);
          replaySolution(engine, replayable(verifySolution ?? solution));
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
