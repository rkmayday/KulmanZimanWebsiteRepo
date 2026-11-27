// LinkedIn company page cover: same design as the single LinkedIn banner, at the company page size (1128x191), rendered at 3x.
// The left ~300px stays clear: LinkedIn puts the company logo over it (about 265px wide, from a third of the way down).
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const D = __dirname, R = path.join(D, '../assets/');
const b64 = f => fs.readFileSync(f).toString('base64');
const W = 1128, H = 191;
const base = fs.readFileSync(path.join(D, 'make.js'), 'utf8').match(/const base = `([\s\S]*?)`;/)[1]
  .replace('html,body{width:1584px;height:396px;overflow:hidden}', `html,body{width:${W}px;height:${H}px;overflow:hidden}`);
const html = base + `<style>
.win{position:absolute;border-radius:7px;overflow:hidden;background:#111;box-shadow:0 0 0 1px rgba(255,255,255,.16),0 16px 34px -12px rgba(0,0,0,.9)}
.win .bar{height:11px;background:#1b1b1b;display:flex;align-items:center;gap:3px;padding-left:6px}.win .bar i{width:4px;height:4px;border-radius:50%;background:#3a3a3a}
.win img{display:block;width:100%;height:calc(100% - 11px);object-fit:cover;object-position:top}
.phone{position:absolute;border-radius:15px;background:#0d0d0d;padding:4px;box-shadow:0 0 0 1px rgba(255,255,255,.22),0 16px 34px -12px rgba(0,0,0,.9)}
.phone img{display:block;width:100%;height:100%;border-radius:11px;object-fit:cover;object-position:center top}
.grid{-webkit-mask-image:radial-gradient(75% 120% at 68% 50%,#000 30%,transparent);mask-image:radial-gradient(75% 120% at 68% 50%,#000 30%,transparent)}
.url{font-size:13px!important}.mono{font-size:9.5px!important}
</style>
<body class="dark"><div class="grid"></div>
  <div style="position:absolute;left:330px;top:0;height:${H}px;display:grid;align-content:center;gap:11px;width:400px">
    <img src="data:image/png;base64,${b64(R + 'wordmark.png')}" style="height:15px;width:auto;justify-self:start;filter:brightness(0) invert(1)">
    <h1 style="font-size:31px;margin:0">Custom websites,<br><em>built to order.</em></h1>
    <div style="display:flex;gap:14px;align-items:center"><span class="url">zimansites.com</span><span class="mono" style="opacity:.5">No templates · From $284</span></div>
  </div>
  <div class="win" style="left:780px;top:24px;width:250px;height:156px"><div class="bar"><i></i><i></i><i></i></div><img src="data:image/jpeg;base64,${b64(R + 'shots/aurel.jpg')}"></div>
  <div class="phone" style="left:1002px;top:34px;width:76px;height:140px"><img src="data:image/jpeg;base64,${b64(path.join(D, 'synthra-phone.jpg'))}"></div>
</body>`;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 3 });
  await p.setContent(html, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(D, 'ziman-sites-linkedin-company-banner.png') }); await b.close();
})();
