// Founder pages (noir theme): an interactive lime dot field in place of the flowing light.
// Dots light up and lean away from the cursor, lit dots link with fine lines, clicks send ripples,
// and gentle ripples roll through on their own. Nothing is drawn behind the page's content.
(() => {
  if (!document.querySelector('.founder-page') || !document.querySelector('link[href*="theme-noir"]')) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('founder-field');
  const cv = document.createElement('canvas');
  cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:1;pointer-events:none';
  document.body.prepend(cv);
  const g = cv.getContext('2d');
  const LIME = getComputedStyle(document.documentElement).getPropertyValue('--gold').trim() || '#c6ff3d';
  const GAP = 26;
  let W = 0, H = 0, dpr = 1, blocks = [];
  const mouse = { x: -1e4, y: -1e4, tx: -1e4, ty: -1e4 };
  const ripples = [];

  // content blocks the field stays out of (page coordinates, unaffected by entrance transforms)
  const CONTENT = '.nav, .back, .profile-card, .profile-copy > *, .founder, .box, footer, .dock';
  const docRect = el => { let x = 0, y = 0, e = el; while (e) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; } return { l: x, t: y, r: x + el.offsetWidth, b: y + el.offsetHeight }; };
  const measure = () => {
    dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    blocks = [...document.querySelectorAll(CONTENT)].filter(e => e.offsetParent || getComputedStyle(e).position === 'fixed')
      .map(e => getComputedStyle(e).position === 'fixed' || getComputedStyle(e).position === 'sticky' ? { fixed: true, r: e.getBoundingClientRect() } : { fixed: false, r: docRect(e) });
  };
  // 0 inside content, rising to 1 over 40px outside it
  const clearAt = (x, y) => {
    let m = 1;
    for (const b of blocks) {
      const r = b.r, py = b.fixed ? y : y + scrollY;
      const L = b.fixed ? r.left : r.l, T = b.fixed ? r.top : r.t, R = b.fixed ? r.right : r.r, B = b.fixed ? r.bottom : r.b;
      const dx = Math.max(L - 10 - x, x - R - 10, 0), dy = Math.max(T - 10 - py, py - B - 10, 0);
      const d = Math.hypot(dx, dy); if (d < 22) m = Math.min(m, d / 22);
      if (!m) return 0;
    }
    return m;
  };
  addEventListener('resize', () => requestAnimationFrame(measure));
  if ('ResizeObserver' in window) new ResizeObserver(() => requestAnimationFrame(measure)).observe(document.body);
  document.fonts && document.fonts.ready.then(measure);
  setTimeout(measure, 1500); setTimeout(measure, 3200);
  measure();

  addEventListener('pointermove', e => { mouse.tx = e.clientX; mouse.ty = e.clientY; }, { passive: true });
  addEventListener('pointerleave', () => { mouse.tx = mouse.ty = -1e4; });
  addEventListener('pointerdown', e => {
    if (e.target.closest && e.target.closest('a,button,input,textarea,select,summary')) return;
    ripples.push({ x: e.clientX, y: e.clientY, t: 0, s: 1 });
  }, { passive: true });
  // ambient ripples, so the field is alive without a cursor too
  let nextAuto = 0;

  let t0 = performance.now();
  function frame(now) {
    const dt = Math.min(.05, (now - t0) / 1000); t0 = now;
    mouse.x += (mouse.tx - mouse.x) * .18; mouse.y += (mouse.ty - mouse.y) * .18;
    if (!reduce && now > nextAuto) { nextAuto = now + 2600 + Math.random() * 1800; ripples.push({ x: Math.random() * W, y: Math.random() * H, t: 0, s: .55 }); }
    for (let i = ripples.length - 1; i >= 0; i--) { ripples[i].t += dt; if (ripples[i].t > 2.6) ripples.splice(i, 1); }
    g.clearRect(0, 0, W, H);
    const off = scrollY % GAP, cols = Math.ceil(W / GAP) + 1, rows = Math.ceil(H / GAP) + 2;
    const lit = new Float32Array(cols * rows), px = new Float32Array(cols * rows), py = new Float32Array(cols * rows);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const k = j * cols + i, x0 = i * GAP + GAP / 2, y0 = j * GAP - off;
      const c = clearAt(x0, y0); if (!c) { lit[k] = -1; continue; }
      const dx = x0 - mouse.x, dy = y0 - mouse.y, d2 = dx * dx + dy * dy;
      let a = Math.exp(-d2 / 42000), push = Math.exp(-d2 / 12000) * 16;
      if (!reduce) a = Math.max(a, .16 + .14 * Math.sin(x0 * .012 + y0 * .009 - now * .0012));   // a soft lime swell drifting across
      for (const r of ripples) {
        const d = Math.hypot(x0 - r.x, y0 - r.y), front = r.t * 520, w = Math.exp(-((d - front) ** 2) / 1800) * (1 - r.t / 2.6) * r.s;
        a = Math.max(a, w); push += w * 6;
      }
      const d = Math.sqrt(d2) || 1;
      px[k] = x0 + dx / d * push; py[k] = y0 + dy / d * push; lit[k] = a * c;
      // base dot
      g.fillStyle = `rgba(255,255,255,${.12 * c})`; g.fillRect(px[k] - .7, py[k] - .7, 1.4, 1.4);
      if (a * c > .04) { g.globalAlpha = Math.min(1, a * c); g.fillStyle = LIME; g.beginPath(); g.arc(px[k], py[k], .8 + 2.6 * a * c, 0, 7); g.fill(); g.globalAlpha = 1; }
    }
    // fine lines between neighbouring lit dots
    g.strokeStyle = LIME; g.lineWidth = 1;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const k = j * cols + i; if (lit[k] < .22) continue;
      for (const n of [k + 1, k + cols, k + cols + 1]) {
        if ((n === k + 1 || n === k + cols + 1) && i === cols - 1) continue;
        if (n >= lit.length || lit[n] < .22) continue;
        g.globalAlpha = Math.min(lit[k], lit[n]) * .55; g.beginPath(); g.moveTo(px[k], py[k]); g.lineTo(px[n], py[n]); g.stroke();
      }
    }
    g.globalAlpha = 1;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
