/**
 * Stage-7 verification drive: replays every stage-7 exercise's 模範解答
 * through the real vim engine in a real browser. This is the browser-side
 * complement of src/vim/stageContent.test.ts — visual-mode j/k are
 * display-line motions jsdom cannot drive, so the browserOnly exercises are
 * only provable here. Asserts, per exercise: the solution reaches the
 * target buffer and its keystroke count equals `par` (domain.md P4).
 *
 * Run: npm run dev (another shell) then `node e2e/drive-stage7.mjs`.
 */
import { chromium } from "playwright";
import { BASE } from "./lib.mjs";

const browser = await chromium.launch();
const page = await browser.newPage();
const log = (...a) => console.log("[stage7]", ...a);

await page.goto(BASE);

const results = await page.evaluate(async () => {
  const { stages } = await import("/src/core/curriculum/stages.ts");
  const { createVimEngine } = await import("/src/vim/codeMirrorVimEngine.ts");
  const { replaySolution } = await import("/src/vim/replaySolution.ts");
  const host = document.createElement("div");
  document.body.appendChild(host);

  const stage7 = stages.find((s) => s.id === "stage-7");
  const failures = [];
  let count = 0;
  for (const lesson of stage7?.lessons ?? []) {
    for (const exercise of lesson.exercises) {
      count += 1;
      const engine = createVimEngine(host);
      try {
        engine.reset(exercise.initialBuffer);
        if (!exercise.solution) {
          failures.push(`${exercise.id}: no recorded solution`);
          continue;
        }
        replaySolution(engine, exercise.solution);
        const got = engine.currentBuffer();
        if (got !== exercise.targetBuffer) {
          failures.push(
            `${exercise.id}: solution missed target\n  got:    ${JSON.stringify(got)}\n  wanted: ${JSON.stringify(exercise.targetBuffer)}`,
          );
        }
        if (exercise.solution.length !== exercise.par) {
          failures.push(
            `${exercise.id}: par ${exercise.par} != solution length ${exercise.solution.length}`,
          );
        }
      } finally {
        engine.destroy();
      }
    }
  }
  return { count, failures };
});

log(`replayed ${results.count} exercises`);
for (const failure of results.failures) log("FAIL", failure);
await browser.close();
if (results.failures.length > 0) {
  throw new Error(`${results.failures.length} stage-7 exercises failed`);
}
log("all stage-7 solutions verified in the browser ✓");
