// Burns each photo's agency mark into it, at the photo's own size, from the clean originals in this folder.
//   JL Media (1, 2, 4): corner logo + one big faint name   ·   BP Press (3): "BP" tiled diagonally across the photo, "BP PRESS" in the corner   ·   BG Coverage (5): five slanted faint names
const { chromium } = require('playwright'); const fs = require('fs');
const R = '/home/user/kulmanzimanwebsiterepo';
const P = [['ryder-ziman-1', 'Daniel Marks', 'jl'], ['ryder-ziman-2', 'Sofia Reyes', 'jl'], ['ryder-ziman-3', 'Marcus Hale', 'ss'], ['ryder-ziman-4', 'Jessica Lee', 'jl'], ['ryder-ziman-6', 'Ethan Cole', 'pw']];   // the photos with Maxim and with his dad were taken down   // the Maxim photo was taken down; the instant photo (cropped to Ryder and his dad) is 5
const NUM = {"ryder-ziman-6": "472815", "ryder-ziman-1": "583324", "ryder-ziman-2": "220100", "ryder-ziman-3": "869692", "ryder-ziman-4": "918102", "ryder-ziman-5": "200035"};
const PREFIX = { pw: 'PW-',  jl: 'JL-', ss: 'BP-', bg: 'BG-' };
(async () => { const b = await chromium.launch();
  for (const [n, cred, st] of P) {
    const src = `${R}/clients/photo-originals/${n}.jpg`; const { execSync } = require('child_process');
    const [w, h] = execSync(`python3 -c "from PIL import Image;print(*Image.open('${src}').size)"`).toString().trim().split(' ').map(Number);
    const u = Math.max(w, h * 1.2) / 900;   // scale everything to the photo
    if (st === 'none') { fs.copyFileSync(src, `${R}/static/images/ryder-ziman/${n}.jpg`); console.log(n, 'no mark'); continue; }   // photo 5 has no mark (Nov 28)
    const id = PREFIX[st] + NUM[n];   // random-looking photo IDs (fixed, so re-running gives the same ones)
    const px = v => Math.round(v * u) + 'px';
    const marks = {
      jl: `<div class="big">JL Media</div><div class="lg">JL<span> Media</span></div><div class="id">${id} · Credit: ${cred}</div>`,
      ss: `<div class="bpt">${Array(30).fill('<span>BP</span>').join('')}</div><div class="bpb"><b>BP PRESS</b><span>${id}</span><span>${cred}</span></div>`,
      pw: `<div class="pwb"><div><b>PRESSWALL</b><i>COVERAGE</i></div></div><div class="id">PRESSWALL COVERAGE · ${id} · Credit: ${cred}</div>`,
      bg: `<div class="bgt">${Array(5).fill('<span>BG COVERAGE</span>').join('')}</div><div class="bgc"><b>BG</b>COVERAGE</div><div class="id">${id} · Credit: ${cred}</div>`,
    };
    const html = `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;800;900&family=IBM+Plex+Mono:wght@500&family=Archivo:wdth,wght@125,800&display=swap" rel="stylesheet">
<style>*{margin:0}html,body{width:${w}px;height:${h}px;overflow:hidden}
.ph{position:relative;width:${w}px;height:${h}px;overflow:hidden;background:url(data:image/jpeg;base64,${fs.readFileSync(src).toString('base64')}) 0 0/100% 100%}
.ph>*{position:absolute}
.id{left:${px(23)};bottom:${px(20)};font:500 ${Math.max(9, Math.round(15 * u))}px "IBM Plex Mono";letter-spacing:.1em;color:rgba(255,255,255,.9);text-shadow:0 1px 6px rgba(0,0,0,.6)}
/* JL Press */
.big{inset:0;display:grid;place-items:center;font:800 ${px(110)} Inter;letter-spacing:-.03em;color:rgba(255,255,255,.15);white-space:nowrap}
.lg{left:${px(22)};bottom:${px(46)};font:800 ${px(40)} Inter;color:#fff;letter-spacing:-.02em;text-shadow:0 2px ${px(14)} rgba(0,0,0,.55)}
.lg span{font-weight:400;opacity:.85}
/* SS Coverage: a thin inset frame, the name in a notch at the top, the ID at the bottom right */
.ssf{inset:${px(26)};border:${Math.max(1, Math.round(2 * u))}px solid rgba(255,255,255,.6);box-shadow:0 0 ${px(18)} rgba(0,0,0,.25)}
.ssl{left:50%;top:${px(26)};transform:translate(-50%,-50%);background:#fff;color:#111;padding:${px(7)} ${px(16)};font:900 ${px(22)} Inter;letter-spacing:.22em;white-space:nowrap;box-shadow:0 ${px(4)} ${px(16)} rgba(0,0,0,.35)}
.ssid{right:${px(38)};bottom:${px(38)};font:500 ${Math.max(8, Math.round(13 * u))}px "IBM Plex Mono";letter-spacing:.1em;color:#fff;text-shadow:0 1px 6px rgba(0,0,0,.7)}
/* BP Press: "BP PRESS" tiled diagonally across the whole photo, like a stock-photo preview */
.bpt{inset:-30%;transform:rotate(-30deg);display:grid;grid-template-columns:repeat(3,1fr);gap:${px(80)} ${px(34)};align-content:center;justify-items:center}
.bpb{right:${px(18)};bottom:${px(18)};display:flex;align-items:stretch;border-radius:${px(30)};overflow:hidden;box-shadow:0 ${px(4)} ${px(16)} rgba(0,0,0,.35);font:600 ${Math.max(7, Math.round(13 * u))}px Inter;letter-spacing:.06em}
.bpb b{background:#fff;color:#111;padding:${px(7)} ${px(12)};font-weight:900;letter-spacing:.14em}
.bpb span{background:rgba(15,15,18,.78);color:#fff;padding:${px(7)} ${px(10)};border-left:1px solid rgba(255,255,255,.18)}
.bpt span{font:800 ${px(34)} Inter;letter-spacing:.12em;color:rgba(255,255,255,.28);white-space:nowrap}
/* Presswall Coverage: one big slanted PRESSWALL across the photo, COVERAGE under it smaller and wider */
.pwb{inset:0;display:grid;place-items:center}
.pwb div{position:static;transform:rotate(-22deg);display:grid;justify-items:center;gap:${px(6)}}
.pwb b{font:900 ${px(138)} Inter;letter-spacing:0;line-height:.9;color:rgba(255,255,255,.32);white-space:nowrap;text-shadow:0 ${px(2)} ${px(18)} rgba(0,0,0,.18)}
.pwb i{font:800 ${px(36)} Inter;font-style:normal;letter-spacing:.8em;margin-right:-.8em;color:rgba(255,255,255,.45);white-space:nowrap;text-shadow:0 ${px(2)} ${px(8)} rgba(0,0,0,.3)}
/* BGMEDIA: five slanted faint names across the photo, a small boxed logo in the corner */
.bgt{left:-12%;right:-12%;top:2%;bottom:14%;transform:rotate(-20deg);display:flex;flex-direction:column;justify-content:space-between;align-items:center}
.bgt span{font:800 ${px(42)} Archivo;font-stretch:125%;letter-spacing:.1em;color:rgba(255,255,255,.2);white-space:nowrap;text-shadow:0 0 ${px(6)} rgba(0,0,0,.08)}
.bgc{left:${px(22)};bottom:${px(48)};border:${Math.max(1, Math.round(2 * u))}px solid #fff;color:#fff;padding:${px(4)} ${px(10)};font:800 ${px(22)} Archivo;font-stretch:125%;letter-spacing:.1em;text-shadow:0 1px 6px rgba(0,0,0,.5);box-shadow:0 0 ${px(14)} rgba(0,0,0,.3)}
.bgc b{background:#fff;color:#111;padding:0 ${px(5)};margin-right:${px(6)};text-shadow:none}
</style>
<div class="ph">${marks[st]}</div>`;
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.setContent(html, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(150);
    await p.screenshot({ path: `${R}/static/images/ryder-ziman/${n}.jpg`, type: 'jpeg', quality: 90 }); await p.close();
    console.log(n, w + 'x' + h, id, cred);
  }
  await b.close(); })();
