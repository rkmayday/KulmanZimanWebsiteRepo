// Maxim's page (Head of Affiliates): a field of small needles instead of the founder dot grid.
// Every needle turns to point at the cursor and grows longer and darker near it; without a cursor
// they sway in a slow wave; a click on an empty spot sends a spin wave outward.
// Nothing is drawn behind the page's content.
(() => {
  const page = document.querySelector('.founder-page[data-field="needles"]');
  if (!page) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('founder-field');      // same layering as the founder pages
  const cv = document.createElement('canvas');
  cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:1;pointer-events:none';
  document.body.prepend(cv);
  const g = cv.getContext('2d');
  const GAP = 30;
  let W = 0, H = 0, dpr = 1, blocks = [];
  const mouse = { x: -1e4, y: -1e4, tx: -1e4, ty: -1e4, on: 0 };
  const waves = [];

  const CONTENT = '.nav, .back, .profile-card > *, .profile-copy > *, .box, footer';
  const docRect = el => { let x = 0, y = 0, e = el; while (e) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; } return { l: x, t: y, r: x + el.offsetWidth, b: y + el.offsetHeight }; };
  const clearAt = (x, y) => {
    let m = 1;
    for (const b of blocks) {
      const r = b.r, py = b.fixed ? y : y + scrollY;
      const L = b.fixed ? r.left : r.l, T = b.fixed ? r.top : r.t, R = b.fixed ? r.right : r.r, B = b.fixed ? r.bottom : r.b;
      const d = Math.hypot(Math.max(L - 12 - x, x - R - 12, 0), Math.max(T - 12 - py, py - B - 12, 0));
      if (d < 26) m = Math.min(m, d / 26);
      if (!m) return 0;
    }
    return m;
  };
  const measure = () => {
    dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    blocks = [...document.querySelectorAll(CONTENT)].filter(e => e.offsetParent || getComputedStyle(e).position === 'fixed')
      .map(e => ['fixed', 'sticky'].includes(getComputedStyle(e).position) ? { fixed: true, r: e.getBoundingClientRect() } : { fixed: false, r: docRect(e) });
  };
  addEventListener('resize', () => requestAnimationFrame(measure));
  if ('ResizeObserver' in window) new ResizeObserver(() => requestAnimationFrame(measure)).observe(document.body);
  document.fonts && document.fonts.ready.then(measure);
  setTimeout(measure, 1500); setTimeout(measure, 3200);
  measure();

  addEventListener('pointermove', e => { mouse.tx = e.clientX; mouse.ty = e.clientY; mouse.on = 1; }, { passive: true });
  addEventListener('pointerleave', () => { mouse.on = 0; });
  addEventListener('pointerdown', e => {
    if (e.target.closest && e.target.closest('a,button,input,textarea,select,summary')) return;
    waves.push({ x: e.clientX, y: e.clientY, t: 0 });
  }, { passive: true });

  let angles = new Map(), t0 = performance.now(), focus = 0;
  function frame(now) {
    const dt = Math.min(.05, (now - t0) / 1000); t0 = now;
    mouse.x += (mouse.tx - mouse.x) * .2; mouse.y += (mouse.ty - mouse.y) * .2;
    focus += ((mouse.on ? 1 : 0) - focus) * Math.min(1, dt * 3);
    for (let i = waves.length - 1; i >= 0; i--) { waves[i].t += dt; if (waves[i].t > 2.2) waves.splice(i, 1); }
    g.clearRect(0, 0, W, H);
    const off = scrollY % GAP, cols = Math.ceil(W / GAP) + 1, rows = Math.ceil(H / GAP) + 2;
    g.lineCap = 'round';
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const x = i * GAP + GAP / 2, y = j * GAP - off + GAP / 2, c = clearAt(x, y);
      if (!c) continue;
      const dx = mouse.x - x, dy = mouse.y - y, d = Math.hypot(dx, dy);
      // where it wants to point: at the cursor, or along a slow drifting wave
      const sway = reduce ? .6 : .6 + Math.sin(x * .008 + now * .0006) * .9 + Math.cos(y * .007 - now * .0005) * .6;
      let target = focus > .01 ? Math.atan2(dy, dx) : sway;
      if (focus > .01 && focus < .99) { const a = Math.atan2(dy, dx); target = sway + Math.atan2(Math.sin(a - sway), Math.cos(a - sway)) * focus; }
      let spin = 0;
      for (const w of waves) { const front = w.t * 480, k = Math.exp(-((Math.hypot(x - w.x, y - w.y) - front) ** 2) / 2600) * (1 - w.t / 2.2); spin += k * Math.PI * 1.6; }
      const key = j * 10000 + i + ((scrollY / GAP) | 0) * 10000;
      let a = angles.get(key); if (a === undefined) a = target;
      const diff = Math.atan2(Math.sin(target + spin - a), Math.cos(target + spin - a));
      a += diff * (reduce ? 1 : Math.min(1, dt * 9)); angles.set(key, a);
      const near = focus * Math.exp(-(d * d) / 52000);
      const len = 5 + 9 * near + 3 * Math.min(1, Math.abs(spin));
      const alpha = (.18 + .62 * near + .3 * Math.min(1, Math.abs(spin))) * c;
      const cx = Math.cos(a) * len / 2, cy = Math.sin(a) * len / 2;
      g.strokeStyle = `rgba(10,10,10,${alpha})`; g.lineWidth = 1.2 + .8 * near;
      g.beginPath(); g.moveTo(x - cx, y - cy); g.lineTo(x + cx, y + cy); g.stroke();
      if (near > .25) { g.fillStyle = `rgba(10,10,10,${alpha})`; g.beginPath(); g.arc(x + cx, y + cy, 1.1 + near, 0, 7); g.fill(); }   // the tip that points at you
    }
    if (angles.size > 40000) angles = new Map();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
