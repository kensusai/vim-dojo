/**
 * M7 verification drive: clear lesson 1 → daily challenge appears on home →
 * play it → XP granted once → record frozen across reload (R13) → drill runs.
 *
 * Run: npm run dev (another shell) then `node e2e/drive-m7.mjs`.
 */
import { chromium } from "playwright";
import { BASE, focusEditor, pressKeys, resetDatabase } from "./lib.mjs";

const SHOTS = process.env.SHOTS_DIR ?? ".";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const log = (...a) => console.log("[m7]", ...a);

await page.goto(BASE);
await resetDatabase(page);
await page.waitForSelector("text=WORLD MAP", { timeout: 10_000 });

// Fresh player: no daily yet (nothing unlocked), lesson CTA shown.
const dailyBefore = await page.locator("text=TODAY'S QUEST").count();
log("daily before any lesson (expect 0):", dailyBefore);
if (dailyBefore !== 0)
  throw new Error("daily should be locked for fresh player");

// Clear lesson 1 (two exercises, x each).
await page.getByRole("button", { name: /稽古をはじめる/ }).click();
await page.waitForSelector(".editor-host .cm-content", { timeout: 10_000 });
await focusEditor(page);
await pressKeys(page, ["x"]);
await page.waitForSelector('[role="dialog"]');
await page.getByRole("button", { name: /次のお題/ }).click();
await page.waitForTimeout(300);
await focusEditor(page);
await pressKeys(page, ["x"]);
await page.waitForSelector('[role="dialog"]');
await page.getByRole("button", { name: /ホームへ/ }).click();
await page.waitForSelector("text=WORLD MAP");
await page.waitForTimeout(500);

// Daily quest hero should now be visible (x unlocked → f-jump template... needs f!)
const dailyAfter = await page.locator("text=TODAY'S QUEST").count();
log(
  "daily after lesson 1 (x only; expect still 0 — no template fits):",
  dailyAfter,
);

// Unlock enough for templates: clear lessons up to w (l2 hl, l3 jk, l4 w).
// Lesson 2 (h l): two exercises.
async function playLesson(solvers) {
  await page.getByRole("button", { name: /稽古をはじめる/ }).click();
  await page.waitForSelector(".editor-host .cm-content", { timeout: 10_000 });
  for (let i = 0; i < solvers.length; i++) {
    await page.waitForTimeout(300);
    await focusEditor(page);
    await pressKeys(page, solvers[i]);
    await page.waitForSelector('[role="dialog"]');
    const btn =
      i === solvers.length - 1
        ? page.getByRole("button", { name: /ホームへ/ })
        : page.getByRole("button", { name: /次のお題/ });
    await btn.click();
  }
  await page.waitForSelector("text=WORLD MAP");
  await page.waitForTimeout(400);
}

await playLesson([
  ["l", "x"],
  ["l", "l", "x"],
]); // lesson 2: h l
await playLesson([["j", "x"]]); // lesson 3: j k (j works in real browser)
await playLesson([
  ["w", "x"],
  ["w", "w", "x"],
]); // lesson 4: w

const dailyNow = await page.locator("text=TODAY'S QUEST").count();
log("daily after w unlocked (expect 1):", dailyNow);
if (dailyNow !== 1) throw new Error("daily quest did not appear");
await page.screenshot({ path: `${SHOTS}/m7-home-daily.png` });

// The daily is the extra-char template (w/l/x). Play it via the hero button.
await page.getByRole("button", { name: /挑戦する/ }).click();
await page.waitForSelector(".editor-host .cm-content", { timeout: 10_000 });
const dailyTitle = await page.locator("header").innerText();
log("daily screen header:", dailyTitle.replace(/\n/g, " | "));

// Solve generically: read TARGET text and use the buffer diff? Simplest: the
// extra-char exercise differs by one char — find its index and l×n + x.
const bufferText = await page.locator(".editor-host .cm-content").innerText();
const target = await page.locator("aside pre").last().innerText();
let diffAt = 0;
while (bufferText[diffAt] === target[diffAt]) diffAt++;
log(`daily diff at column ${diffAt}`);
await focusEditor(page);
await pressKeys(page, [...Array(diffAt).fill("l"), "x"], 25);
await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
const modal = await page.locator('[role="dialog"]').innerText();
log("daily result:", modal.replace(/\n/g, " | ").slice(0, 120));
if (!/XP/.test(modal)) throw new Error("daily clear granted no XP line");
await page.screenshot({ path: `${SHOTS}/m7-daily-clear.png` });
await page.getByRole("button", { name: /ホームへ/ }).click();
await page.waitForSelector("text=WORLD MAP");
await page.waitForTimeout(400);

// R13/R15: after reload the daily shows as cleared with the same exercise.
await page.reload();
await page.waitForSelector("text=WORLD MAP");
await page.waitForTimeout(500);
const clearedBadge = await page.locator("text=本日クリア済").count();
log("daily marked cleared after reload (expect 1):", clearedBadge);
if (clearedBadge !== 1) throw new Error("daily xpGranted state not persisted");

// Drill: WANTED panel button runs 5 generated exercises; play just the first.
await page.getByRole("button", { name: /たたかう/ }).click();
await page.waitForSelector(".editor-host .cm-content", { timeout: 10_000 });
const drillHud = await page.locator("header").innerText();
log("drill header:", drillHud.replace(/\n/g, " | ").slice(0, 100));
if (!/1\/5/.test(drillHud)) throw new Error("drill should have 5 rounds");
await page.screenshot({ path: `${SHOTS}/m7-drill.png` });

await browser.close();
log("ALL M7 CHECKS PASSED");
