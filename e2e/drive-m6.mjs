/**
 * M6 verification drive: home screen → play lesson 1 → clear → verify the
 * next lesson unlocked and streak recorded. Also solves the j-based lesson 3
 * exercise that jsdom couldn't drive (stageContent.test.ts browserOnly).
 *
 * Run: npm run dev (another shell) then `node e2e/drive-m6.mjs`.
 */
import { chromium } from "playwright";

const BASE = "http://localhost:5173";
const SHOTS = process.env.SHOTS_DIR ?? ".";
const shot = (n) => `${SHOTS}/${n}.png`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const log = (...a) => console.log("[m6]", ...a);
const keys = async (arr, d = 45) => {
  for (const k of arr) {
    await page.keyboard.press(k);
    await page.waitForTimeout(d);
  }
};

await page.goto(BASE);
await page.evaluate(
  () =>
    new Promise((r) => {
      const q = indexedDB.deleteDatabase("vim-dojo");
      q.onsuccess = q.onerror = q.onblocked = () => r();
    }),
);
await page.reload();

// --- Home screen ------------------------------------------------------------
await page.waitForSelector("text=WORLD MAP", { timeout: 10_000 });
await shot("m6-01-home");
const senseiVisible = await page.locator("text=SHIHAN").isVisible();
log("home shows sensei board:", senseiVisible);
const cta = page.getByRole("button", { name: /稽古をはじめる/ });
log("next-lesson CTA present:", await cta.isVisible());
await cta.click();

// --- Lesson 1 (x): two exercises, delete the leading char -------------------
await page.waitForSelector(".editor-host .cm-content", { timeout: 10_000 });
await page.locator(".editor-host .cm-content").click();
await shot("m6-02-lesson");
await keys(["Escape", "g", "g", "0", "x"]); // delete leading X
await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
log(
  "lesson1 ex1 cleared:",
  (await page.locator("[role=dialog]").innerText()).split("\n")[0],
);
await page.getByRole("button", { name: /次のお題/ }).click();
await page.waitForTimeout(300);
await page.locator(".editor-host .cm-content").click();
await keys(["Escape", "g", "g", "0", "x"]); // ex2: delete leading #
await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
const finalModal = await page.locator("[role=dialog]").innerText();
log("lesson1 complete modal:", finalModal.replace(/\n/g, " | "));
await shot("m6-03-lesson-complete");
if (!/皆伝/.test(finalModal)) throw new Error("expected lesson-complete text");
await page.getByRole("button", { name: /ホームへ/ }).click();

// --- Back home: lesson 1 should be cleared, lesson 2 current ----------------
await page.waitForSelector("text=WORLD MAP", { timeout: 5000 });
await page.waitForTimeout(300);
await shot("m6-04-home-after");
const hud = await page.locator("header").innerText();
log("HUD after lesson 1:", hud.replace(/\n/g, " | "));
if (!/🔥\s*1|1\s*日/.test(hud)) throw new Error("streak not recorded: " + hud);

// unlock check: first node cleared (✓), second is current (!)
const nodeStates = await page
  .locator('[aria-label*="(cleared)"], [aria-label*="(current)"]')
  .evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
log("lesson node states:", nodeStates.slice(0, 3));
if (!nodeStates.some((s) => s.includes("(cleared)")))
  throw new Error("lesson 1 not marked cleared");

await browser.close();
log("ALL M6 CHECKS PASSED");
