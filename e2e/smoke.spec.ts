/**
 * CI smoke test: the shortest path that proves the whole stack works in a
 * real browser — boot → home → play lesson 1 → clear → unlock → persist.
 * Unit tests cannot cover this path end-to-end (real DOM key delivery has
 * bitten us before: see docs/vim-coverage.md and the M5 keystroke bug).
 * Deeper flows stay in the manual drive scripts (e2e/drive-*.mjs).
 */
import { expect, test } from "@playwright/test";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore plain ESM helper shared with the drive scripts
import { pressKeys, resetDatabase } from "./lib.mjs";

test("boot → lesson 1 → clear → unlock → streak persists", async ({ page }) => {
  await page.goto("/");
  await resetDatabase(page);

  // Home renders with the sensei and the world map.
  await expect(page.getByText("WORLD MAP")).toBeVisible();
  await expect(page.getByText("SHIHAN")).toBeVisible();

  // Start the first lesson (x — delete a character).
  await page.getByRole("button", { name: /稽古をはじめる/ }).click();
  await expect(page.locator(".editor-host .cm-content")).toBeVisible();

  // Lesson 1 exercises are all solved with x presses. The session auto-
  // focuses the editor with the cursor at 0,0 — real keydowns must clear
  // each at exactly par (this exact assertion is the R2 regression net).
  const solutions = [["x"], ["x"], ["x", "x"], ["x", "x", "x"], ["x"]];
  for (const [index, solution] of solutions.entries()) {
    await page.waitForTimeout(300);
    await pressKeys(page, solution);
    await expect(page.getByRole("dialog")).toContainText("一本"); // gold at par
    if (index === 0) {
      // Regression: stray keys while the result dialog is open must not
      // reach the judged buffer behind it (playtest bug).
      const judged = await page.locator(".editor-host .cm-content").innerText();
      await pressKeys(page, ["x", "j", "i"]);
      expect(await page.locator(".editor-host .cm-content").innerText()).toBe(
        judged,
      );
      await expect(page.getByRole("dialog")).toBeVisible();
    }
    if (index < solutions.length - 1) {
      await page.getByRole("button", { name: /次のお題/ }).click();
    }
  }
  await expect(page.getByRole("dialog")).toContainText("レッスン皆伝");
  await expect(page.getByRole("dialog")).toContainText("+30 XP"); // gold 10 + lesson 20
  await page.getByRole("button", { name: /ホームへ/ }).click();

  // Back home: lesson 1 cleared, lesson 2 is current, streak recorded.
  await expect(page.getByText("WORLD MAP")).toBeVisible();
  await expect(page.getByLabel("x (cleared)")).toBeVisible();
  await expect(page.getByLabel("h l (current)")).toBeVisible();

  // Persistence: everything survives a reload (IndexedDB).
  await page.reload();
  await expect(page.getByText("WORLD MAP")).toBeVisible();
  await expect(page.getByLabel("x (cleared)")).toBeVisible();
  await expect(page.locator("header")).toContainText("STREAK");
});
