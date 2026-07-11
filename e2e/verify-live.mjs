import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("https://kensusai.github.io/vim-dojo/", {
  waitUntil: "networkidle",
});
await page.waitForSelector("text=WORLD MAP", { timeout: 15000 });
console.log("[live] home rendered");
// play lesson 1 exercise 1 on production
await page.getByRole("button", { name: /稽古をはじめる/ }).click();
await page.waitForSelector(".editor-host .cm-content", { timeout: 15000 });
await page.locator(".editor-host .cm-content").click();
for (const k of ["Escape", "g", "g", "0", "x"]) {
  await page.keyboard.press(k);
  await page.waitForTimeout(60);
}
await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
console.log(
  "[live] exercise cleared on production:",
  (await page.locator("[role=dialog]").innerText()).split("\n")[0],
);
const sw = await page.evaluate(
  () =>
    navigator.serviceWorker?.controller !== undefined ||
    navigator.serviceWorker?.getRegistrations !== undefined,
);
console.log("[live] service worker API present:", sw);
await page.screenshot({
  path: process.env.SHOTS_DIR + "/live-home.png",
  fullPage: false,
});
await browser.close();
console.log("[live] LIVE SITE OK");
