/**
 * M5 verification drive: plays the sample drill in a real (headless) Chromium
 * via Playwright, exercising the commands that could not be tested headlessly
 * in jsdom — l (charwise), / search, j (linewise) — and capturing screenshots.
 *
 * Run: npm run dev (in another shell) then `node e2e/drive-m5.mjs`.
 * SHOTS_DIR sets where screenshots go (default: cwd).
 */
import { chromium } from "playwright";

const BASE = "http://localhost:5173";
const SHOTS = process.env.SHOTS_DIR ?? ".";
const shot = (name) => `${SHOTS}/${name}.png`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const log = (...a) => console.log("[drive]", ...a);

async function typeKeys(keys, delayMs = 40) {
  for (const key of keys) {
    await page.keyboard.press(key);
    await page.waitForTimeout(delayMs);
  }
}

/** Click into the editor, then normalize: normal mode, first line, column 0. */
async function focusEditor() {
  await page.locator(".editor-host .cm-content").click();
  await typeKeys(["Escape", "g", "g", "0"]);
}

async function waitClearModal(label) {
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
  const text = await page.locator('[role="dialog"]').innerText();
  const buffer = await page.locator(".editor-host .cm-content").innerText();
  log(
    `${label} @clear: buffer=${JSON.stringify(buffer)} modal="${text.split("\n")[0]} / ${text.split("\n")[2] ?? ""}"`,
  );
  if (!/一本|技あり|有効/.test(text)) {
    throw new Error(`${label}: expected a clear, got: ${text.split("\n")[0]}`);
  }
  return text;
}

async function nextExercise() {
  await page.keyboard.press("Enter"); // advance button is focused in the modal
  await page.waitForTimeout(300);
  await focusEditor();
}

await page.goto(BASE);
// Start from a clean profile so XP/streak assertions are deterministic.
await page.evaluate(
  () =>
    new Promise((resolve) => {
      const req = indexedDB.deleteDatabase("vim-dojo");
      req.onsuccess = req.onerror = req.onblocked = () => resolve();
    }),
);
await page.reload();
await page.waitForSelector(".editor-host .cm-content", { timeout: 10_000 });
await focusEditor();
await page.screenshot({ path: shot("01-practice-initial") });
log("loaded; exercise 1 visible");

// --- Exercise 1: verify `l` (charwise motion) + dw --------------------------
await typeKeys(["l", "l", "l", "l", "l", "l"]); // "hello " → cursor on 'd'
await typeKeys(["d", "w"]);
let modal = await waitClearModal("ex1 (l-navigation + dw)");
log("ex1 cleared → l WORKS:", modal.split("\n")[0]);
await page.screenshot({ path: shot("02-ex1-result") });
await nextExercise();

// --- Exercise 2: verify `/` search ------------------------------------------
await page.keyboard.type("/rold");
await page.waitForTimeout(200);
await page.screenshot({ path: shot("03-search-dialog") });
await page.keyboard.press("Enter"); // jump to 'r' of wrold
await typeKeys(["x", "p"]); // transpose ro → or
modal = await waitClearModal("ex2 (/ search + xp)");
log("ex2 cleared → / search WORKS:", modal.split("\n")[0]);
await page.screenshot({ path: shot("04-ex2-result") });
await nextExercise();

// --- Exercise 3: verify `j` (linewise motion) + dd ---------------------------
await typeKeys(["j", "d", "d"]);
modal = await waitClearModal("ex3 (j + dd)");
log("ex3 cleared → j WORKS:", modal.split("\n")[0]);
await page.screenshot({ path: shot("05-session-complete") });

// --- Persistence: reload and confirm streak/XP survived ----------------------
await page.reload();
await page.waitForSelector(".editor-host .cm-content", { timeout: 10_000 });
const hudAfter = await page.locator("header").innerText();
log("HUD after reload:", hudAfter.replace(/\n/g, " | "));
if (!/🔥\s*1/.test(hudAfter)) {
  throw new Error("streak did not persist across reload: " + hudAfter);
}
await page.screenshot({ path: shot("06-after-reload") });
log("persistence confirmed (streak/XP survive reload)");

await browser.close();
log("ALL M5 CHECKS PASSED");
