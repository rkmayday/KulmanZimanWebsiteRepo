// Ryder's profile page (computers only): a mesh of fine lines and dots that sits almost invisible until the cursor
// draws it into a point, the lines bending in like a rubber sheet under a weight. One soft (Gaussian) pull around
// the cursor; the mesh only shows where it bends. A click presses the weight in deeper for a moment.
(() => {
  const page = document.querySelector('.founder-page[data-field="mesh"]');
  if (!page || !document.querySelector('link[href*="mono.css"]')) return;
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;          // phones and tablets: nothing
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.documentElement.classList.add('founder-field');
  const cv = document.createElement('canvas'); cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:1;pointer-events:none';
  document.body.prepend(cv);
  const g = cv.getContext('2d');
  const GAP = 30, SIGMA = 120, PULL = .62;
  let W = 0, H = 0, dpr = 1, cols = 0, rows = 0;
  const size = () => { dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); cols = Math.ceil(W / GAP) + 2; rows = Math.ceil(H / GAP) + 2; };
  // the weight: follows the cursor smoothly, sinks in while the cursor is on the page, lifts out when it leaves
  const m = { x: -1e4, y: -1e4, tx: -1e4, ty: -1e4, s: 0, ts: 0, kick: 0 };
  addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; if (m.x < -1e3) { m.x = e.clientX; m.y = e.clientY; } m.tx = e.clientX; m.ty = e.clientY; m.ts = 1; wake(); }, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => { m.ts = 0; wake(); });
  addEventListener('blur', () => { m.ts = 0; wake(); });
  addEventListener('pointerdown', e => { if (e.target.closest && e.target.closest('a,button,input,textarea,select,summary')) return; m.kick = 1; wake(); }, { passive: true });
  const P = new Float32Array(2), at = (i, j) => {
    const x = (i - 1) * GAP, y = (j - 1) * GAP, dx = m.x - x, dy = m.y - y, w = Math.exp(-(dx * dx + dy * dy) / (2 * SIGMA * SIGMA));
    const k = w * PULL * m.s * (1 + .5 * m.kick); P[0] = x + dx * k; P[1] = y + dy * k; return w;
  };
  let raf = 0;
  const wake = () => { if (!raf) raf = requestAnimationFrame(tick); };
  function tick() {
    raf = 0;
    m.x += (m.tx - m.x) * .16; m.y += (m.ty - m.y) * .16; m.s += (m.ts - m.s) * .08; m.kick *= .9;
    draw();
    if (Math.abs(m.tx - m.x) + Math.abs(m.ty - m.y) > .3 || Math.abs(m.ts - m.s) > .003 || m.kick > .01) raf = requestAnimationFrame(tick);
  }
  function draw() {
    g.clearRect(0, 0, W, H);
    if (m.s < .004) return;
    const reach = SIGMA * 3.2, i0 = Math.max(0, Math.floor((m.x - reach) / GAP)), i1 = Math.min(cols, Math.ceil((m.x + reach) / GAP) + 2),
      j0 = Math.max(0, Math.floor((m.y - reach) / GAP)), j1 = Math.min(rows, Math.ceil((m.y + reach) / GAP) + 2);
    g.lineWidth = 1;
    // lines: each short segment is as visible as the bend at its end (almost nothing far from the cursor)
    const seg = (i, j, i2, j2) => {
      const w1 = at(i, j), x1 = P[0], y1 = P[1], w2 = at(i2, j2), x2 = P[0], y2 = P[1], a = Math.min(1, (w1 + w2) / 2 * 1.25) * m.s;
      if (a < .015) return; g.strokeStyle = `rgba(10,10,10,${(a * .55).toFixed(3)})`; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
    };
    for (let j = j0; j <= j1; j++) for (let i = i0; i < i1; i++) seg(i, j, i + 1, j);
    for (let i = i0; i <= i1; i++) for (let j = j0; j < j1; j++) seg(i, j, i, j + 1);
    // dots where the lines cross, a touch stronger
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const w = at(i, j), a = Math.min(1, w * 1.4) * m.s; if (a < .02) continue;
      g.fillStyle = `rgba(10,10,10,${(a * .8).toFixed(3)})`; g.beginPath(); g.arc(P[0], P[1], 1.1 + w * 1.3, 0, Math.PI * 2); g.fill();
    }
  }
  size(); addEventListener('resize', () => { size(); draw(); });
})();
