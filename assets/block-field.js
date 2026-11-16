// Ryder's profile page (computers only): an isometric field of small blocks that ripples like water under the
// cursor. Every block is a spring tied to its four neighbours, so a swell spreads, overshoots and settles; blocks
// darken as they rise (the black-and-white version of a glow). Gentle swells roll through on their own now and
// then, and a click drops a stone. The field stays out from behind the page's text and cards.
(() => {
  const page = document.querySelector('.founder-page[data-field="blocks"]');
  if (!page || !document.querySelector('link[href*="mono.css"]')) return;
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;          // phones and tablets: no field
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.documentElement.classList.add('founder-field');
  const cv = document.createElement('canvas'); cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:1;pointer-events:none';
  document.body.prepend(cv);
  const g = cv.getContext('2d');

  // ---------- keep out from behind the content (same idea as the dot field) ----------
  const CONTENT = '.nav, .back, .profile-card > *, .profile-copy > *, .founder, .box, footer, .dock, .cur-ctl';
  const docRect = el => { let x = 0, y = 0, e = el; while (e) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; } return { l: x, t: y, r: x + el.offsetWidth, b: y + el.offsetHeight }; };
  let rects = [];
  const measureContent = () => { rects = [...document.querySelectorAll(CONTENT)].filter(e => e.offsetParent || getComputedStyle(e).position === 'fixed')
    .map(e => { const p = getComputedStyle(e).position; return p === 'fixed' || p === 'sticky' ? { fixed: true, r: e.getBoundingClientRect() } : { fixed: false, r: docRect(e) }; }); };
  const clearAt = (x, y) => {
    let m = 1;
    for (const b of rects) {
      const r = b.r, py = b.fixed ? y : y + scrollY;
      const L = b.fixed ? r.left : r.l, T = b.fixed ? r.top : r.t, R = b.fixed ? r.right : r.r, Bm = b.fixed ? r.bottom : r.b;
      const d = Math.hypot(Math.max(L - 14 - x, x - R - 14, 0), Math.max(T - 14 - py, py - Bm - 14, 0));
      if (d < 30) m = Math.min(m, d / 30);
      if (!m) return 0;
    }
    return m;
  };

  // ---------- the field: staggered rows of diamonds (an isometric grid) ----------
  const TW = 46, TH = TW / 2;                // diamond width and height
  let W = 0, H = 0, dpr = 1, rows = 0, cols = 0, h, v, cl;
  const build = () => {
    dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(W / TW) + 2; rows = Math.ceil(H / (TH / 2)) + 4;
    h = new Float32Array(rows * cols); v = new Float32Array(rows * cols); cl = new Float32Array(rows * cols);
    measureContent(); clearMap();
  };
  const cx = (r, c) => c * TW + (r & 1 ? TW / 2 : 0) - TW / 2, cy = (r) => r * TH / 2 - TH;
  const clearMap = () => { for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cl[r * cols + c] = clearAt(cx(r, c), cy(r)); };
  // the four diagonal neighbours of a block in a staggered grid
  const nb = (r, c, k) => { const odd = r & 1; switch (k) {
    case 0: return [r - 1, odd ? c : c - 1]; case 1: return [r - 1, odd ? c + 1 : c];
    case 2: return [r + 1, odd ? c : c - 1]; default: return [r + 1, odd ? c + 1 : c]; } };

  // ---------- input ----------
  const mouse = { x: -1e4, y: -1e4, px: -1e4, py: -1e4, speed: 0 };
  addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; mouse.x = e.clientX; mouse.y = e.clientY; wake(); }, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => { mouse.x = mouse.y = -1e4; });
  const drops = [];
  addEventListener('pointerdown', e => { if (e.target.closest && e.target.closest('a,button,input,textarea,select,summary')) return; drops.push({ x: e.clientX, y: e.clientY, s: 1.6 }); wake(); }, { passive: true });
  let lastAuto = performance.now();

  // ---------- simulation + drawing ----------
  const K = .045, BACK = .012, DAMP = .955, LIFT = 26, R = 120;
  let raf = 0, quiet = 0;
  const wake = () => { quiet = 0; if (!raf) raf = requestAnimationFrame(tick); };
  function tick(now) {
    raf = 0;
    // ambient swells so the field is alive without a cursor
    if (now - lastAuto > 4200) { lastAuto = now; drops.push({ x: W * (.15 + Math.random() * .7), y: H * (.2 + Math.random() * .6), s: .7 }); }
    mouse.speed = Math.min(40, Math.hypot(mouse.x - mouse.px, mouse.y - mouse.py)); mouse.px = mouse.x; mouse.py = mouse.y;
    // forces: the cursor raises the blocks under it (more when it moves), drops push a ring outward
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c, x = cx(r, c), y = cy(r);
      const d = Math.hypot((x - mouse.x) * .9, (y - mouse.y) * 1.6);
      if (d < R) { const k = 1 - d / R; v[i] += k * k * (.9 + mouse.speed * .05); }
      for (const dr of drops) { const dd = Math.hypot((x - dr.x) * .9, (y - dr.y) * 1.6); if (dd < 60) v[i] += (1 - dd / 60) * 6 * dr.s; }
    }
    drops.length = 0;
    // springs: tied to the neighbours and to rest
    let energy = 0;
    const acc = new Float32Array(h.length);
    for (let r = 1; r < rows - 1; r++) for (let c = 1; c < cols - 1; c++) {
      const i = r * cols + c; let s = 0;
      for (let k = 0; k < 4; k++) { const [rr, cc] = nb(r, c, k); s += h[rr * cols + cc]; }
      acc[i] = K * (s - 4 * h[i]) - BACK * h[i];
    }
    for (let i = 0; i < h.length; i++) { v[i] = (v[i] + acc[i]) * DAMP; h[i] += v[i]; if (h[i] < -6) { h[i] = -6; v[i] *= -.3; } if (h[i] > 60) h[i] = 60; energy += Math.abs(v[i]) + Math.abs(h[i]) * .02; }
    draw();
    if (energy > .5 || mouse.x > -1e3) { quiet = 0; raf = requestAnimationFrame(tick); }
    else if (++quiet < 30) raf = requestAnimationFrame(tick);
  }
  const lerp = (a, b, t) => Math.round(a + (b - a) * t);
  function draw() {
    g.clearRect(0, 0, W, H);
    const hw = TW / 2 - 2, hh = TH / 2 - 1;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c, a = cl[i]; if (a < .02) continue;
      const lift = Math.max(0, h[i]) * LIFT / 26, x = cx(r, c), y = cy(r), base = 3, top = y - base - lift;
      const t = Math.min(1, lift / 22);                          // 0 at rest, 1 when fully raised: darker
      const topC = lerp(240, 60, t), leftC = lerp(222, 34, t), rightC = lerp(232, 80, t);
      const alpha = a * (.32 + .6 * t);
      // two sides, then the top (a diamond with softened corners)
      g.globalAlpha = alpha;
      g.fillStyle = `rgb(${leftC},${leftC},${leftC - 2})`;
      g.beginPath(); g.moveTo(x - hw, top); g.lineTo(x, top + hh); g.lineTo(x, y + hh); g.lineTo(x - hw, y); g.closePath(); g.fill();
      g.fillStyle = `rgb(${rightC},${rightC},${rightC - 2})`;
      g.beginPath(); g.moveTo(x + hw, top); g.lineTo(x, top + hh); g.lineTo(x, y + hh); g.lineTo(x + hw, y); g.closePath(); g.fill();
      g.fillStyle = `rgb(${topC},${topC},${topC - 3})`;
      g.beginPath(); g.moveTo(x, top - hh + 1.5); g.quadraticCurveTo(x, top - hh, x + 2, top - hh + 1); g.lineTo(x + hw - 2, top - 1); g.quadraticCurveTo(x + hw, top, x + hw - 2, top + 1);
      g.lineTo(x + 2, top + hh - 1); g.quadraticCurveTo(x, top + hh, x - 2, top + hh - 1); g.lineTo(x - hw + 2, top + 1); g.quadraticCurveTo(x - hw, top, x - hw + 2, top - 1);
      g.lineTo(x - 2, top - hh + 1); g.quadraticCurveTo(x, top - hh, x, top - hh + 1.5); g.fill();
    }
    g.globalAlpha = 1;
  }

  build(); draw();
  let lw = innerWidth, lh = innerHeight;
  addEventListener('resize', () => { if (innerWidth !== lw || innerHeight !== lh) { lw = innerWidth; lh = innerHeight; build(); draw(); } });
  let sr = 0; addEventListener('scroll', () => { if (!sr) sr = requestAnimationFrame(() => { sr = 0; clearMap(); if (!raf) draw(); }); }, { passive: true });
  document.fonts && document.fonts.ready.then(() => { measureContent(); clearMap(); draw(); });
  setTimeout(() => { measureContent(); clearMap(); draw(); }, 1500);
  wake();
})();
