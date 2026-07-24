/**
 * R7 free roam (owner decision 2026-07-23): lesson order is a
 * recommendation, not a gate. A fresh profile must be able to jump straight
 * into any lesson — here, stage 7's Ctrl-v lesson — and actually play it.
 */
import { expect, test } from "@playwright/test";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore plain ESM helper shared with the drive scripts
import { pressKeys, resetDatabase } from "./lib.mjs";

test("a fresh profile can jump straight into a stage-7 lesson", async ({
  page,
}) => {
  await page.goto("/");
  await resetDatabase(page);
  await expect(page.getByText("WORLD MAP")).toBeVisible();

  // Not the recommended lesson — three stages ahead of it.
  await page.getByLabel("Ctrl-v (upcoming)").click();
  await expect(page.locator(".editor-host .cm-content")).toBeVisible();
  await expect(page.getByText(/STAGE 7/)).toBeVisible();

  // And it actually plays: clear exercise 1 (delete the X column).
  await page.waitForTimeout(300);
  await pressKeys(page, ["Control+v", "j", "j", "d"]);
  await expect(page.getByRole("dialog")).toContainText("一本");
});
