// Kulman Ziman "Mono" theme. The one big interactive moment: the KZ logo stage on the home page.
// A solid 3D KZ (stacked layers) turns as you scroll, then the K and the Z slide apart to reveal the headline.
// Everything else on the site stays calm. Respects reduced motion.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = v => { v = clamp(v); return v * v * (3 - 2 * v); };

  // thin reading-progress line
  const bar = $('.progress');
  let barRaf = 0;
  const onBar = () => { barRaf = 0; const max = document.documentElement.scrollHeight - innerHeight; bar && bar.style.setProperty('--p', max > 0 ? (scrollY / max).toFixed(4) : 0); };
  addEventListener('scroll', () => { if (!barRaf) barRaf = requestAnimationFrame(onBar); }, { passive: true }); onBar();

  const stage = $('.kz-stage');
  if (!stage) return;
  const logo = $('.kz-logo', stage), copy = $('.kz-copy', stage), word = $('.kz-word', stage), grid = $('.kz-grid', stage), cue = $('.kz-cue', stage);

  // the headline, text and buttons live in the page's hero; move them into the stage (one copy of the content)
  const heroCopy = $('.hero .hero-copy'), heroTags = $('.hero .hero-tags');
  if (heroCopy) [...heroCopy.children].forEach(n => copy.append(n));
  if (heroTags) copy.append(heroTags);

  // the solid logo is drawn on one canvas: a stack of logo-shaped slices, black on the front and lighter toward the back.
  // (It used to be 60 masked 3D layers in the DOM, which the browser had to repaint on every frame: very laggy.)
  const phone = matchMedia('(max-width: 720px)').matches;
  const N = reduce ? 1 : (phone ? 18 : 30);
  const scene = $('.kz-scene', stage);
  const cv = document.createElement('canvas'); cv.className = 'kz-canvas'; scene.prepend(cv);
  const g = cv.getContext('2d');
  // KZ outline (from kz-logo.svg, 600x335), cut into the K and the Z the same way the old clip-paths did
  const KZ = [[0,0],[76,0],[76,137.42],[191.48,0],[283.45,0],[148.67,158.72],[303.05,333.19],[467.61,67.03],[325.06,66.99],[324.97,.02],[488,0],[600.65,.03],[434.59,268],[590.03,268],[589.94,335],[200.04,335],[76,192.2],[76,335],[0,335]];
  const cut = (pts, keep) => {           // keep the part of the outline on one side of a vertical line
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length], ia = keep(a[0]), ib = keep(b[0]);
      if (ia) out.push(a);
      if (ia !== ib) { const X = keep.x, t = (X - a[0]) / (b[0] - a[0]); out.push([X, a[1] + t * (b[1] - a[1])]); }
    }
    return out;
  };
  const left = x => x <= 303.6; left.x = 303.6;
  const right = x => x >= 302.4; right.x = 302.4;
  const SHAPES = [{ pts: cut(KZ, left), k: true }, { pts: cut(KZ, right), k: false }];
  const S = { rx: 0, ry: 0, ls: 1, ly: 0, kx: 0, zx: 0, ho: 1, fv: 10, sx: 40 };
  let W = 0, H = 0, cw = 0, ch = 0, dpr = 1;
  const size = () => {
    dpr = Math.min(2, devicePixelRatio || 1);
    cw = scene.clientWidth; ch = scene.clientHeight;
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    W = logo.offsetWidth; H = W * 335 / 600;
  };
  const draw = () => {
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const D = 1500, cx0 = cw / 2, cy0 = ch / 2, depth = W * (phone ? .06 : .075);
    const ay = S.ry * Math.PI / 180, ax = S.rx * Math.PI / 180, cY = Math.cos(ay), sY = Math.sin(ay), cX = Math.cos(ax), sX = Math.sin(ax);
    // same maths as the CSS it replaces: translateY(ly) scale(ls) rotateX(rx) rotateY(ry), perspective 1500px
    const P = (x, y, z) => {
      const x1 = x * cY + z * sY, z1 = -x * sY + z * cY;
      const y1 = y * cX - z1 * sX, z2 = y * sX + z1 * cX;
      const f = D / (D - z2);
      return [cx0 + x1 * S.ls * f, cy0 + (y1 * S.ls + S.ly) * f];
    };
    const fc = S.fv, hi = Math.round(fc + (255 - fc) * .22);
    for (let i = N - 1; i >= 0; i--) {
      const front = i === 0;
      if (!front && S.ho <= .002) continue;
      const z = -i * depth / Math.max(1, N - 1);
      const c = Math.round(26 + i / Math.max(1, N - 1) * 120);
      for (const sh of SHAPES) {
        const hx = sh.k ? S.kx : S.zx;
        g.beginPath();
        sh.pts.forEach(([u, v], j) => { const q = P((u / 600 - .5) * W + hx, (v / 335 - .5) * H, z); j ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); });
        g.closePath();
        if (front) {
          // the soft light sweep across the face (a 115deg gradient on the face, projected)
          const dx = Math.sin(115 * Math.PI / 180), dy = -Math.cos(115 * Math.PI / 180), len = Math.abs(W * dx) + Math.abs(H * dy);
          const a = P(-dx * len / 2 + hx, -dy * len / 2, 0), b = P(dx * len / 2 + hx, dy * len / 2, 0);
          const gr = g.createLinearGradient(a[0], a[1], b[0], b[1]), m = clamp(S.sx / 100), col = `rgb(${fc},${fc},${fc})`;
          gr.addColorStop(0, col); gr.addColorStop(clamp(m - .14), col); gr.addColorStop(m, `rgb(${hi},${hi},${hi})`); gr.addColorStop(clamp(m + .14), col); gr.addColorStop(1, col);
          g.globalAlpha = 1; g.fillStyle = gr;
        } else { g.globalAlpha = S.ho; g.fillStyle = `rgb(${c},${c},${c})`; }
        g.fill();
      }
    }
    g.globalAlpha = 1;
  };
  const pinTop = () => parseFloat(getComputedStyle($('.kz-pin', stage)).top) || 0;
  let pinT = pinTop();
  size(); draw();
  let lastW = innerWidth, lastH = innerHeight;
  addEventListener('resize', () => {
    if (innerWidth === lastW && Math.abs(innerHeight - lastH) < 120) return;   // ignore the phone address bar
    lastW = innerWidth; lastH = innerHeight; size(); draw(); pinT = pinTop();
  });

  if (reduce) { document.documentElement.classList.add('no-kz'); return; }

  // scroll + pointer drive the scene
  let target = 0, prog = 0, px = 0, py = 0, tpx = 0, tpy = 0, running = false;
  // after the animation, the pinned scene starts moving with the page gradually (its speed ramps from 0 to normal),
  // so the hand-off to normal scrolling has no jolt. Driven straight from the scroll position, so it never lags.
  const pin = $('.kz-pin', stage), HOLD = .72;   // the scene starts moving with the page while the headline finishes fading in
  // No dead scroll after the reveal: the logo turns at a steady pace, then once the K and Z start to separate
  // each bit of scrolling moves them a little less (the pace eases down smoothly), and the page starts carrying
  // the scene away while the split is still finishing, so something is always moving.
  // EXTRA matches the extra height given to .kz-stage in mono.css for this eased part.
  let lastMb = null;
  const EXTRA = .36, SPLIT = .36 / .87;          // SPLIT: where the K and Z start to separate, on the timeline
  const readScroll = () => {
    const r = stage.getBoundingClientRect(), t = pinT, y = t - r.top;
    const Rt = Math.max(1, r.height - (innerHeight - t));          // whole pinned scroll
    const Ra = Math.max(1, Rt - innerHeight * EXTRA);               // pace of the turn (unchanged)
    const y0 = SPLIT * Ra, Ls = Math.max(1, Rt - y0);               // eased part: from the split to the end
    // end pace as a share of the start pace, chosen so the timeline ends exactly at the end of the stage
    const sEnd = clamp(2 * (1 - SPLIT) * Ra / Ls - 1, .15, 1);
    const ease = u => u - (1 - sEnd) * u * u / 2;                     // pace falls in a straight line from 1 to sEnd
    target = y <= y0 ? clamp(y / Ra) : clamp(SPLIT + (Ls / Ra) * ease(clamp((y - y0) / Ls)));
    // hand-off: from the moment the headline is fully in, the scene starts moving with the page (speed 0 -> normal)
    const c = (HOLD - SPLIT) * Ra / Ls, k = 1 - sEnd;
    const uH = k < 1e-4 ? c : (1 - Math.sqrt(Math.max(0, 1 - 2 * k * c))) / k;
    const yHold = y0 + uH * Ls, H = Math.max(1, Rt - yHold), h = clamp(y - yHold, 0, H);
    pin.style.transform = h > 0 ? `translate3d(0,${(-(h * h) / (2 * H)).toFixed(1)}px,0)` : '';
    // easing in only covers half the ramp, so pull the next section up by that half: it arrives right behind the headline (no gap)
    const mb = Math.round(-H / 2); if (mb !== lastMb) { lastMb = mb; stage.style.marginBottom = mb + 'px'; }
    // one scroll gesture stops here, when the logo animation has finished (smooth.js)
    stage.dataset.stopY = Math.round(scrollY + r.top - t + yHold);
    kick();
  };
  addEventListener('scroll', readScroll, { passive: true });
  addEventListener('pointermove', e => { if (e.pointerType === 'touch') return; tpx = e.clientX / innerWidth - .5; tpy = e.clientY / innerHeight - .5; kick(); }, { passive: true });

  const kick = () => { if (!running) { running = true; requestAnimationFrame(frame); } };
  function frame() {
    prog += (target - prog) * .32; px += (tpx - px) * .08; py += (tpy - py) * .08;
    const p = prog * .87;            // the stage is 13% shorter than the timeline: same animation, half the hold after it
    const a = smooth(p / .42);                    // turn: shows the depth
    const b = smooth((p - .36) / .38);            // split: K and Z slide apart
    const ry = -24 + a * 44 - b * 20 + px * 14;
    const rx = 12 - a * 16 + b * 4 - py * 10;
    const spread = innerWidth * (phone ? .62 : .45);
    S.ry = ry; S.rx = rx; S.ls = 1 - b * .3; S.ly = -b * 24; S.kx = -b * spread; S.zx = b * spread;
    S.ho = 1 - smooth(b * 1.6);                       // the sides fade away first
    S.fv = Math.round(10 + b * 218);                  // the face turns light grey, staying crisp
    S.sx = 25 + a * 45 + px * 25;
    draw();
    // the name spells out under the logo, then makes room
    word.style.setProperty('--ws', (1.06 - a * .06).toFixed(4));
    word.style.setProperty('--wo', (1 - smooth((p - .28) / .14)).toFixed(3));
    cue.style.setProperty('--co', (1 - smooth(p / .06)).toFixed(3));
    grid.style.setProperty('--gy', (-p * 140).toFixed(1) + 'px');
    // the headline rises into the gap
    const o = smooth((p - .5) / .24);
    copy.style.setProperty('--o2', o.toFixed(3));
    copy.style.setProperty('--y2', ((1 - o) * 40).toFixed(1) + 'px');
    copy.classList.toggle('live', o > .6);
    if (Math.abs(target - prog) > .0005 || Math.abs(tpx - px) > .001 || Math.abs(tpy - py) > .001) requestAnimationFrame(frame); else running = false;
  }
  readScroll(); prog = target; frame();
})();
