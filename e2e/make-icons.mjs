import { chromium } from "playwright";
const browser = await chromium.launch();
const html = (
  size,
) => `<!doctype html><body style="margin:0"><div style="width:${size}px;height:${size}px;background:#12100b;display:flex;align-items:center;justify-content:center;font-family:-apple-system,'Hiragino Sans',sans-serif">
<div style="width:${size * 0.62}px;height:${size * 0.62}px;background:#ff5a3c;display:flex;align-items:center;justify-content:center;box-shadow:${size * 0.03}px ${size * 0.03}px 0 rgba(0,0,0,0.6)">
<span style="color:#f3e9cd;font-size:${size * 0.42}px;font-weight:900">道</span></div>
<div style="position:absolute;right:${size * 0.08}px;bottom:${size * 0.1}px;width:${size * 0.06}px;height:${size * 0.14}px;background:#9ee34f"></div></div></body>`;
for (const size of [192, 512]) {
  const page = await browser.newPage({
    viewport: { width: size, height: size },
  });
  await page.setContent(html(size));
  await page.screenshot({ path: `public/icon-${size}.png` });
  await page.close();
}
await browser.close();
console.log("icons written");
