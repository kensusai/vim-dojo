/**
 * Result-dialog keyboard contract (owner bug report 2026-07-23): after a
 * clear, the dialog must OWN the keyboard — Enter fires the primary button
 * and no key may reach the judged buffer behind the overlay. The smoke test
 * advances by mouse click; this spec pins the keyboard-only flow, where the
 * focus race with CodeMirror actually bites.
 */
import { expect, test } from "@playwright/test";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore plain ESM helper shared with the drive scripts
import { pressKeys, resetDatabase } from "./lib.mjs";

test("Enter advances the result dialog; stray keys never edit the buffer", async ({
  page,
}) => {
  await page.goto("/");
  await resetDatabase(page);
  await page.getByRole("button", { name: /稽古をはじめる/ }).click();
  await expect(page.locator(".editor-host .cm-content")).toBeVisible();
  await page.waitForTimeout(300);

  // Clear exercise 1 (Xhello → x at 0,0) — typed FAST, with trailing keys
  // still in flight when the clear lands (real typing rhythm; the focus race
  // with CodeMirror only shows up without artificial delays).
  await pressKeys(page, ["x", "x", "x"], 0);
  await expect(page.getByRole("dialog")).toContainText("一本");
  // The two extra x's were in flight when the clear landed — they must have
  // been swallowed, not applied to the judged buffer.
  expect(await page.locator(".editor-host .cm-content").innerText()).toBe(
    "hello",
  );

  // Hammer the keyboard while the dialog is up: nothing may edit the buffer.
  const judged = await page.locator(".editor-host .cm-content").innerText();
  await pressKeys(page, ["x", "d", "d", "i", "z"]);
  expect(await page.locator(".editor-host .cm-content").innerText()).toBe(
    judged,
  );
  await expect(page.getByRole("dialog")).toBeVisible();

  // Reading pause: a neutral click on the dark backdrop drops focus from the
  // primary button — Enter must STILL advance, and stray keys must still
  // stay out of the buffer.
  await page.mouse.click(30, 450);
  await pressKeys(page, ["x", "j", "i"]);
  expect(await page.locator(".editor-host .cm-content").innerText()).toBe(
    "hello",
  );

  // Enter = the dialog's primary action (次のお題), no mouse involved.
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByText("2/5")).toBeVisible();

  // The next exercise must be immediately playable from the keyboard.
  await page.waitForTimeout(300);
  await pressKeys(page, ["x"]);
  await expect(page.getByRole("dialog")).toContainText("一本");
});
