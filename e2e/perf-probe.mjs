/** Performance probe (パフォーマンス重視: 計測してから判断). Not a test. */
import { chromium } from "playwright";

const URL = "https://kensusai.github.io/vim-dojo/";
const browser = await chromium.launch();

// --- 1. cold load (no cache/SW) ---------------------------------------------
let ctx = await browser.newContext();
let page = await ctx.newPage();
const t0 = Date.now();
await page.goto(URL, { waitUntil: "load" });
await page.waitForSelector("text=WORLD MAP");
const coldInteractive = Date.now() - t0;
const paint = await page.evaluate(() => {
  const fcp = performance.getEntriesByName("first-contentful-paint")[0];
  const nav = performance.getEntriesByType("navigation")[0];
  return {
    ttfb: Math.round(nav.responseStart),
    fcp: Math.round(fcp?.startTime ?? -1),
    domComplete: Math.round(nav.domComplete),
  };
});
// LCP needs an observer buffered flag
const lcp = await page.evaluate(
  () =>
    new Promise((resolve) => {
      let value = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) value = e.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
      setTimeout(() => resolve(Math.round(value)), 300);
    }),
);
console.log(
  `[cold] TTFB ${paint.ttfb}ms | FCP ${paint.fcp}ms | LCP ${lcp}ms | WORLD MAP interactive ${coldInteractive}ms`,
);
// wait for SW to install before warm run
await page.waitForTimeout(2500);
await ctx.close();

// --- 2. warm load (same context → SW cache) ---------------------------------
ctx = await browser.newContext();
page = await ctx.newPage();
await page.goto(URL, { waitUntil: "load" });
await page.waitForSelector("text=WORLD MAP");
await page.waitForTimeout(2500); // SW takes over after first load in this ctx
const t1 = Date.now();
await page.reload({ waitUntil: "load" });
await page.waitForSelector("text=WORLD MAP");
console.log(`[warm] reload → interactive ${Date.now() - t1}ms (SW cache)`);

// --- 3. typing burst: long tasks while playing ------------------------------
await page.evaluate(
  () =>
    new Promise((r) => {
      const q = indexedDB.deleteDatabase("vim-dojo");
      q.onsuccess = q.onerror = q.onblocked = () => r();
    }),
);
await page.reload();
await page.waitForSelector("text=WORLD MAP");
await page.getByRole("button", { name: /稽古をはじめる/ }).click();
await page.waitForSelector(".editor-host .cm-content");
await page.waitForTimeout(400);
await page.evaluate(() => {
  window.__longTasks = [];
  new PerformanceObserver((list) => {
    for (const e of list.getEntries())
      window.__longTasks.push(Math.round(e.duration));
  }).observe({ type: "longtask" });
});
// 60 keys as fast as playwright can deliver (mostly no-op motions + undo churn)
const burst = "jjkkhhlljjkkhhlljjkkhhll".split("");
const b0 = Date.now();
for (const k of [...burst, ...burst, "x", "u", "x", "u"])
  await page.keyboard.press(k);
const burstMs = Date.now() - b0;
const longTasks = await page.evaluate(() => window.__longTasks);
console.log(
  `[typing] ${burst.length * 2 + 4} keys in ${burstMs}ms (${Math.round(burstMs / (burst.length * 2 + 4))}ms/key incl. driver overhead) | long tasks >50ms: ${longTasks.length} ${JSON.stringify(longTasks)}`,
);

await browser.close();
console.log("PERF PROBE DONE");
