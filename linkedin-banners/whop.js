// Whop profile banner: same design as the single LinkedIn banner, 3:1 (1500x500), rendered at 2x.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const D = __dirname, R = '/home/user/kulmanzimanwebsiterepo/assets/';
const b64 = f => fs.readFileSync(f).toString('base64');
const base = fs.readFileSync(path.join(D, 'make.js'), 'utf8').match(/const base = `([\s\S]*?)`;/)[1]
  .replace('html,body{width:1584px;height:396px;overflow:hidden}', 'html,body{width:1500px;height:500px;overflow:hidden}');
const html = base + `<style>
.win{position:absolute;border-radius:14px;overflow:hidden;background:#111;box-shadow:0 0 0 1px rgba(255,255,255,.16),0 30px 64px -20px rgba(0,0,0,.9)}
.win .bar{height:22px;background:#1b1b1b;display:flex;align-items:center;gap:6px;padding-left:11px}.win .bar i{width:7px;height:7px;border-radius:50%;background:#3a3a3a}
.win img{display:block;width:100%;height:calc(100% - 22px);object-fit:cover;object-position:top}
.phone{position:absolute;border-radius:32px;background:#0d0d0d;padding:8px;box-shadow:0 0 0 1.5px rgba(255,255,255,.22),0 30px 64px -20px rgba(0,0,0,.9)}
.phone img{display:block;width:100%;height:100%;border-radius:25px;object-fit:cover;object-position:center top}
.lbl{position:absolute;font:500 12px "IBM Plex Mono",monospace;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.5)}
.grid{-webkit-mask-image:radial-gradient(75% 120% at 68% 50%,#000 30%,transparent);mask-image:radial-gradient(75% 120% at 68% 50%,#000 30%,transparent)}
</style>
<body class="dark"><div class="grid"></div>
  <div style="position:absolute;left:110px;top:130px;display:grid;gap:26px;width:560px">
    <img src="data:image/png;base64,${b64(R + 'wordmark.png')}" style="height:36px;width:auto;justify-self:start;filter:brightness(0) invert(1)">
    <h1 style="font-size:60px">Custom websites,<br><em>built to order.</em></h1>
    <div style="display:flex;gap:22px;align-items:center"><span class="url">zimansites.com</span><span class="mono" style="opacity:.5">No templates · From $284</span></div>
  </div>
  <div class="win" style="left:760px;top:70px;width:520px;height:325px"><div class="bar"><i></i><i></i><i></i></div><img src="data:image/jpeg;base64,${b64(R + 'shots/aurel.jpg')}"></div>
  <div class="phone" style="left:1240px;top:118px;width:180px;height:346px"><img src="data:image/jpeg;base64,${b64(path.join(D, 'synthra-phone.jpg'))}"></div>
  <span class="lbl" style="left:760px;top:424px">Live samples at zimansites.com/portfolio</span>
</body>`;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1500, height: 500 }, deviceScaleFactor: 2 });
  await p.setContent(html, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(D, 'ziman-sites-whop-banner.png') }); await b.close();
})();
