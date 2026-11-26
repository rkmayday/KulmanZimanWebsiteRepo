// Five layout options for the portfolio banner (same headline and background as the set), at 2x.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const R = '/home/user/kulmanzimanwebsiterepo/assets/shots/', D = __dirname;
const src = fs.readFileSync(path.join(D, 'make.js'), 'utf8');
const base = src.match(/const base = `([\s\S]*?)`;/)[1];
const img = n => 'data:image/jpeg;base64,' + fs.readFileSync(R + n + '.jpg').toString('base64');
const head = `<div class="grid"></div>
  <div style="position:absolute;left:420px;top:108px;display:grid;gap:20px;width:560px">
    <span class="mono">Ziman Sites · Portfolio</span>
    <h1 style="font-size:54px">See the work<br><em>before you pay for it.</em></h1>
    <span class="url" style="opacity:.75">zimansites.com/portfolio</span>
  </div>`;
const extra = `<style>
.win{position:absolute;border-radius:12px;overflow:hidden;background:#111;box-shadow:0 0 0 1px rgba(255,255,255,.16),0 26px 56px -18px rgba(0,0,0,.9)}
.win .bar{height:18px;background:#1b1b1b;display:flex;align-items:center;gap:5px;padding-left:9px}.win .bar i{width:6px;height:6px;border-radius:50%;background:#3a3a3a}
.win img{display:block;width:100%;height:calc(100% - 18px);object-fit:cover;object-position:top}
.tile{position:absolute;border-radius:8px;overflow:hidden;box-shadow:0 0 0 1px rgba(255,255,255,.14),0 14px 30px -12px rgba(0,0,0,.9)}
.tile img{display:block;width:100%;height:100%;object-fit:cover;object-position:top}
.phone{position:absolute;border-radius:26px;background:#0d0d0d;padding:7px;box-shadow:0 0 0 1.5px rgba(255,255,255,.22),0 26px 56px -18px rgba(0,0,0,.9)}
.phone img{display:block;width:100%;height:100%;border-radius:20px;object-fit:cover;object-position:28% top}
.lbl{position:absolute;font:500 10px "IBM Plex Mono",monospace;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.5)}
</style>`;
const win = (n, l, t, w, h, extraStyle = '') => `<div class="win" style="left:${l}px;top:${t}px;width:${w}px;height:${h}px;${extraStyle}"><div class="bar"><i></i><i></i><i></i></div><img src="${img(n)}"></div>`;
const tile = (n, l, t, w, h, s = '') => `<div class="tile" style="left:${l}px;top:${t}px;width:${w}px;height:${h}px;${s}"><img src="${img(n)}"></div>`;
const OTHERS = ['afterglow', 'ember-roast', 'deduction', 'ironpath'];
const opts = {
  // A: one big Aurel window with Synthra overlapping it, the other four as a neat strip underneath
  'A-hero-strip': win('aurel', 1010, 34, 380, 238) + win('synthra', 1290, 96, 260, 163) +
    OTHERS.map((n, i) => tile(n, 1010 + i * 136, 290, 124, 78)).join(''),
  // B: a 3x2 wall of all six, turned in 3D so it recedes into the page
  'B-3d-wall': `<div style="position:absolute;left:1010px;top:58px;width:540px;height:280px;perspective:1000px"><div style="position:absolute;inset:0;transform:rotateY(-20deg) rotateX(5deg);transform-origin:left center">` +
    ['aurel', 'synthra', 'afterglow', 'ember-roast', 'deduction', 'ironpath'].map((n, i) => tile(n, (i % 3) * 172, Math.floor(i / 3) * 134, 160, 120)).join('') + `</div></div>`,
  // C: fanned like a hand of cards from one point below, Aurel and Synthra in the middle on top
  'C-fan': ['afterglow', 'ember-roast', 'synthra', 'aurel', 'deduction', 'ironpath'].map((n, i) => {
    const a = (i - 2.5) * 13, front = n === 'aurel' || n === 'synthra';
    return tile(n, 1160, 96, 210, 131, `transform-origin:50% 260%;transform:rotate(${a}deg);z-index:${n === 'aurel' ? 11 : front ? 10 : 5 - Math.abs(i - 2.5)};${front ? '' : 'filter:brightness(.7)'}`);
  }).join(''),
  // D: a laptop-style window for Aurel and a phone for Synthra, the other four named underneath
  'D-desktop-phone': win('aurel', 1000, 44, 420, 262) + `<div class="phone" style="left:1388px;top:92px;width:146px;height:280px"><img src="data:image/jpeg;base64,${fs.readFileSync(path.join(D, 'synthra-phone.jpg')).toString('base64')}" style="object-position:center top"></div>` +
    `<span class="lbl" style="left:1000px;top:334px">+ Afterglow · Ember Roast · Facet · Ironpath</span>`,
  // E: a diagonal cascade, back to front, ending with Synthra then Aurel in front
  'E-cascade': ['ironpath', 'deduction', 'ember-roast', 'afterglow', 'synthra', 'aurel'].map((n, i) => {
    const front = i >= 4;
    return tile(n, 990 + i * 52, 26 + i * 26, front ? 250 : 210, front ? 156 : 131, `z-index:${i};${front ? '' : 'filter:brightness(.62)'}`);
  }).join(''),
};
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1584, height: 396 }, deviceScaleFactor: 2 });
  for (const [name, body] of Object.entries(opts)) {
    await p.setContent(base + extra + `<body class="dark">${head}${body}</body>`, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(250);
    await p.screenshot({ path: path.join(D, `option-${name}.png`) }); console.log(name);
  }
  await b.close();
})();
