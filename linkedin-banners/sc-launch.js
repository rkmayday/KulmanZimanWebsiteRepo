// LinkedIn post image for the Sports Culture launch: 1080x1350 (4:5, the tallest the feed shows), rendered at 2x.
// Screenshots of the live site: sc-launch-desktop.png (1440x900 @2x) and sc-launch-phone.png (390x844 @3x).
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const D = __dirname, R = path.join(D, '../assets/');
const b64 = f => fs.readFileSync(f).toString('base64');
const W = 1080, H = 1350, Y = '#ffd21f';
const base = fs.readFileSync(path.join(D, 'make.js'), 'utf8').match(/const base = `([\s\S]*?)`;/)[1]
  .replace('html,body{width:1584px;height:396px;overflow:hidden}', `html,body{width:${W}px;height:${H}px;overflow:hidden}`);
const html = base + `<style>
body{background:radial-gradient(70% 45% at 50% 52%,rgba(255,210,31,.16),transparent 70%),radial-gradient(ellipse 90% 70% at 50% 50%,#1d1d1d 0%,#0e0e0e 60%,#050505 100%);color:#fff}
.grid{-webkit-mask-image:radial-gradient(60% 50% at 50% 52%,#000 20%,transparent);mask-image:radial-gradient(60% 50% at 50% 52%,#000 20%,transparent)}
.top{position:absolute;left:80px;right:80px;top:84px}
.tag{display:inline-flex;align-items:center;gap:12px;font:500 15px/1 "IBM Plex Mono",monospace;letter-spacing:.24em;text-transform:uppercase;color:${Y}}
.tag i{width:9px;height:9px;border-radius:50%;background:${Y};box-shadow:0 0 0 6px rgba(255,210,31,.18)}
h1{font-size:92px;line-height:.95;margin-top:26px}
h1 em{opacity:1;color:rgba(255,255,255,.42)}
.win{position:absolute;left:80px;top:420px;width:820px;height:535px;border-radius:16px;overflow:hidden;background:#111;box-shadow:0 0 0 1px rgba(255,255,255,.16),0 50px 100px -30px rgba(0,0,0,.95),0 0 120px -20px rgba(255,210,31,.25)}
.win .bar{height:34px;background:#1b1b1b;gap:8px;padding-left:16px}.win .bar i{width:11px;height:11px}
.win .addr{margin-left:auto;margin-right:auto;transform:translateX(-30px);font:500 13px Manrope;color:rgba(255,255,255,.55);background:#262626;border-radius:6px;padding:5px 60px}
.win img{display:block;width:100%;height:calc(100% - 34px);object-fit:cover;object-position:top}
.phone{position:absolute;left:770px;top:560px;width:240px;height:500px;border-radius:40px;background:#0d0d0d;padding:10px;box-shadow:0 0 0 2px rgba(255,255,255,.22),0 50px 100px -30px rgba(0,0,0,.95)}
.phone img{display:block;width:100%;height:100%;border-radius:31px;object-fit:cover;object-position:center top}
.foot{position:absolute;left:80px;right:80px;bottom:80px;display:flex;align-items:flex-end;justify-content:space-between;border-top:1px solid rgba(255,255,255,.12);padding-top:34px}
.foot .by{display:grid;gap:14px}
.foot .lbl{font:500 13px/1 "IBM Plex Mono",monospace;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.5)}
.foot .site{font:600 22px Manrope;color:#fff;text-align:right;display:grid;gap:14px}
</style>
<body><div class="grid"></div>
  <div class="top">
    <span class="tag"><i></i>New launch</span>
    <h1>Sports Culture<br><em>is live.</em></h1>
  </div>
  <div class="win"><div class="bar"><i></i><i></i><i></i><span class="addr">sportsculturehq.com</span></div><img src="data:image/png;base64,${b64(path.join(D, 'sc-launch-desktop.png'))}"></div>
  <div class="phone"><img src="data:image/png;base64,${b64(path.join(D, 'sc-launch-phone.png'))}"></div>
  <div class="foot">
    <div class="by"><span class="lbl">Designed &amp; built by</span><img class="wm" src="data:image/png;base64,${b64(R + 'wordmark.png')}" style="height:30px;width:auto;filter:brightness(0) invert(1)"></div>
    <div class="site"><span class="lbl">From scratch · No templates</span>zimansites.com</div>
  </div>
</body>`;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  await p.setContent(html, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(D, 'sports-culture-launch-post.png') }); await b.close();
})();
