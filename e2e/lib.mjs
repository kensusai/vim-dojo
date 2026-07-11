/**
 * Shared helpers for e2e drives and the CI smoke spec. Plain ESM so both the
 * standalone drive scripts (node e2e/drive-*.mjs) and @playwright/test specs
 * can import it.
 */
export const BASE = process.env.E2E_BASE_URL ?? "http://localhost:5173";

/** Press keys one by one with a small delay so vim keeps up. */
export async function pressKeys(page, keys, delayMs = 45) {
  for (const key of keys) {
    await page.keyboard.press(key);
    await page.waitForTimeout(delayMs);
  }
}

/**
 * Click into the editor, then normalize: normal mode, first line, column 0
 * (a click positions the cursor wherever it lands — never assume col 0).
 */
export async function focusEditor(page) {
  await page.locator(".editor-host .cm-content").click();
  await pressKeys(page, ["Escape", "g", "g", "0"]);
}

/** Wipe the app's IndexedDB so runs start from a fresh profile. */
export async function resetDatabase(page) {
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        const request = indexedDB.deleteDatabase("vim-dojo");
        request.onsuccess =
          request.onerror =
          request.onblocked =
            () => resolve(undefined);
      }),
  );
  await page.reload();
}
