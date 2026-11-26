// LinkedIn profile banner slideshow for Ryder / Ziman Sites: 5 slides at 1584x396 (rendered at 2x, then scaled down).
// The profile photo covers the bottom-left on LinkedIn, so nothing important sits in the left ~380 px.
const { chromium } = require('playwright');
const path = require('path');
const R = '/home/user/kulmanzimanwebsiterepo/assets/';
const D = __dirname;
const fs = require('fs');
const img = f => 'data:image/' + (f.endsWith('.png') ? 'png' : 'jpeg') + ';base64,' + fs.readFileSync(f).toString('base64');
const base = `
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&family=Manrope:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0}
html,body{width:1584px;height:396px;overflow:hidden}
body{font-family:Manrope,sans-serif;-webkit-font-smoothing:antialiased;position:relative}
.dark{background:#0b0b0b;color:#fff}
.light{background:#fff;color:#0b0b0b}
.grid{position:absolute;inset:0;background:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px) 0 0/44px 44px,linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px) 0 0/44px 44px;
  -webkit-mask-image:radial-gradient(70% 120% at 70% 50%,#000 30%,transparent);mask-image:radial-gradient(70% 120% at 70% 50%,#000 30%,transparent)}
.light .grid{background:linear-gradient(rgba(0,0,0,.05) 1px,transparent 1px) 0 0/44px 44px,linear-gradient(90deg,rgba(0,0,0,.05) 1px,transparent 1px) 0 0/44px 44px}
.mono{font:500 13px/1 "IBM Plex Mono",monospace;letter-spacing:.22em;text-transform:uppercase;opacity:.6}
h1{font:700 64px/1 "Inter Tight",sans-serif;letter-spacing:-.035em}
h1 em{font-style:normal;opacity:.45}
.wm{height:30px}
.dark .wm{filter:brightness(0) invert(1)}
.url{font:600 18px Manrope,sans-serif;letter-spacing:.01em}
.shot{position:absolute;border-radius:14px;overflow:hidden;box-shadow:0 0 0 1px rgba(255,255,255,.14),0 30px 60px -20px rgba(0,0,0,.8)}
.shot img{display:block;width:100%;height:100%;object-fit:cover;object-position:top}
.bar{height:22px;background:#1b1b1b;display:flex;align-items:center;gap:6px;padding-left:10px}
.bar i{width:8px;height:8px;border-radius:50%;background:#3a3a3a}
</style>`;
const slides = {
  '1-brand': `<body class="dark"><div class="grid"></div>
    <div style="position:absolute;left:420px;top:92px;display:grid;gap:26px">
      <img class="wm" src="${img(R + "wordmark.png")}" style="height:40px;width:auto">
      <h1 style="font-size:58px">Custom websites, <em>built to order.</em></h1>
      <div style="display:flex;gap:26px;align-items:center"><span class="url">zimansites.com</span><span class="mono" style="opacity:.5">Interactive · Animated · From $284</span></div>
    </div></body>`,
  '2-aurel': `<body class="dark"><div class="grid"></div>
    <div style="position:absolute;left:420px;top:104px;display:grid;gap:20px;width:560px">
      <span class="mono">Ziman Sites · Sample</span>
      <h1>Websites that <em>move.</em></h1>
      <span class="url" style="opacity:.75">Scroll-driven animation, built from scratch.</span>
    </div>
    <div class="shot" style="left:1040px;top:34px;width:500px;height:334px"><div class="bar"><i></i><i></i><i></i></div><img src="${img(R + "shots/aurel.jpg")}" style="height:312px"></div></body>`,
  '3-client': `<body class="dark"><div class="grid"></div>
    <div style="position:absolute;left:420px;top:104px;display:grid;gap:20px;width:560px">
      <span class="mono">Client work</span>
      <h1>Built for <em>Sports Culture.</em></h1>
      <span class="url" style="opacity:.75">sportsculturehq.com</span>
    </div>
    <div class="shot" style="left:1040px;top:34px;width:500px;height:334px"><div class="bar"><i></i><i></i><i></i></div><img src="${img(D + "/sc.png")}" style="height:312px"></div></body>`,
  '4-offer': `<body class="light"><div class="grid"></div>
    <div style="position:absolute;left:420px;top:86px;display:grid;gap:28px">
      <span class="mono" style="opacity:.55">How it works</span>
      <div style="display:flex;gap:54px;align-items:flex-end">
        <div><h1 style="font-size:72px">$284</h1><span class="mono" style="display:block;margin-top:12px">Starting price, paid once</span></div>
        <div><h1 style="font-size:72px">3</h1><span class="mono" style="display:block;margin-top:12px">Rounds of refinement</span></div>
        <div><h1 style="font-size:72px">0</h1><span class="mono" style="display:block;margin-top:12px">Templates</span></div>
        <div><h1 style="font-size:72px">100%</h1><span class="mono" style="display:block;margin-top:12px">Refund if we miss it</span></div>
      </div>
      <span class="url">zimansites.com</span>
    </div></body>`,
  '5-founder': `<body class="dark"><div class="grid"></div>
    <div style="position:absolute;left:420px;top:112px;display:grid;gap:20px;width:640px">
      <span class="mono">Founder</span>
      <h1>Ryder Ziman</h1>
      <span class="url" style="opacity:.75">Founder of Ziman Sites · zimansites.com</span>
    </div>
    <div class="shot" style="left:1250px;top:34px;width:270px;height:328px;border-radius:18px"><img src="${img(R + "ryder-ziman.jpg")}"></div></body>`,
};
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1584, height: 396 }, deviceScaleFactor: 2 });
  for (const [name, html] of Object.entries(slides)) {
    await p.setContent(base + html, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(D, name + '@2x.png') });
    console.log(name);
  }
  await b.close();
})();
