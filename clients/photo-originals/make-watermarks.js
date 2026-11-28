// Burns the "JL Press" mark (style 5) into each photo, at the photo's own size, from the clean originals
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const R = '/home/user/kulmanzimanwebsiterepo';
const P = [['ryder-ziman-1', 'R.J.C.'], ['ryder-ziman-2', 'R.J.C.'], ['ryder-ziman-3', 'Unknown'], ['ryder-ziman-4', 'Jessica Lee'],
           ['ryder-ziman-5', 'Unknown']];   // the Maxim photo was taken down and the instant photo moved up to 5
(async () => { const b = await chromium.launch();
  for (const [i, [n, cred]] of P.entries()) {
    const src = `${R}/clients/photo-originals/${n}.jpg`; const { execSync } = require('child_process');
    const [w, h] = execSync(`python3 -c "from PIL import Image;print(*Image.open('${src}').size)"`).toString().trim().split(' ').map(Number);
    const u = Math.max(w, h * 1.2) / 900;   // scale everything to the photo
    const num = String(n.split('-')[2]).padStart(6, '0');   // the ID follows the photo number
    const bm = n === 'ryder-ziman-3';   // photo 3 is a "BMedia" photo, with its own agency-bar style
    const id = (bm ? 'BM-' : 'JL-') + num;
    const html = `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;800&family=IBM+Plex+Mono:wght@500&family=Playfair+Display:wght@700;900&display=swap" rel="stylesheet">
<style>*{margin:0}html,body{width:${w}px;height:${h}px;overflow:hidden}
.ph{position:relative;width:${w}px;height:${h}px;background:url(data:image/jpeg;base64,${fs.readFileSync(src).toString('base64')}) 0 0/100% 100%}
.big{position:absolute;inset:0;display:grid;place-items:center;font:800 ${Math.round(110 * u)}px Inter;letter-spacing:-.03em;color:rgba(255,255,255,.15);white-space:nowrap}
.lg{position:absolute;left:${Math.round(22 * u)}px;bottom:${Math.round(46 * u)}px;font:800 ${Math.round(40 * u)}px Inter;color:#fff;letter-spacing:-.02em;text-shadow:0 2px ${Math.round(14 * u)}px rgba(0,0,0,.55)}
.lg span{font-weight:400;opacity:.85}
.bmk{position:absolute;inset:0;display:grid;place-items:center;font:900 ${Math.round(80 * u)}px "Playfair Display";letter-spacing:.02em;color:rgba(255,255,255,.16);white-space:nowrap}
.bar{position:absolute;left:0;right:0;bottom:0;height:${Math.round(52 * u)}px;background:rgba(10,10,12,.78);display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 ${Math.round(16 * u)}px}
.bar b{font:900 ${Math.round(24 * u)}px "Playfair Display";color:#fff;letter-spacing:.02em}
.bar b span{font-weight:700;color:#c9c9c9}
.bar i{font:500 ${Math.max(7, Math.round(12 * u))}px "IBM Plex Mono";font-style:normal;letter-spacing:.08em;color:rgba(255,255,255,.85);white-space:nowrap}
.id{position:absolute;left:${Math.round(23 * u)}px;bottom:${Math.round(20 * u)}px;font:500 ${Math.max(9, Math.round(15 * u))}px "IBM Plex Mono";letter-spacing:.1em;color:rgba(255,255,255,.9);text-shadow:0 1px 6px rgba(0,0,0,.6)}</style>
${bm ? `<div class="ph bm"><div class="bmk">BMedia</div><div class="bar"><b>B<span>Media</span></b><i>${id} · Credit: ${cred}</i></div></div>`
  : `<div class="ph"><div class="big">JL Press</div><div class="lg">JL<span> Press</span></div><div class="id">${id} · Credit: ${cred}</div></div>`}`;
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.setContent(html, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(150);
    await p.screenshot({ path: `${R}/static/images/ryder-ziman/${n}.jpg`, type: 'jpeg', quality: 90 }); await p.close();
    console.log(n, w + 'x' + h, id, cred);
  }
  await b.close(); })();
