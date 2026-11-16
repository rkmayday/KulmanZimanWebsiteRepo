// Ryder's profile photo (computers only): a rounded frame drawn as an elastic string around the photo.
// Bring the cursor to an edge and the string plucks outward to follow it into a soft glowing veil; pull away
// (or leave) and it springs back with a wobble. The string is a chain of points along the frame, each tied to
// its neighbours and to its resting place, so the pluck travels round the frame and settles.
(() => {
  const page = document.querySelector('.founder-page[data-field="blocks"]');
  const photo = page && page.querySelector('.portrait.big.photo');
  if (!photo || !matchMedia('(hover: hover) and (pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const host = photo.parentElement; host.classList.add('ef-host');
  const PAD = 90, GAP = 12, RAD = 34;         // canvas margin, frame distance from the photo, corner radius
  const cv = document.createElement('canvas'); cv.className = 'ef-canvas'; cv.setAttribute('aria-hidden', 'true');
  host.prepend(cv);
  const g = cv.getContext('2d');
  let pts = [], w = 0, h = 0, ox = 0, oy = 0, dpr = 1;
  // points every ~5px round a rounded rectangle, each with its outward normal
  const build = () => {
    const pr = photo.getBoundingClientRect(), hr = host.getBoundingClientRect();
    w = pr.width + GAP * 2; h = pr.height + GAP * 2; ox = pr.left - hr.left - GAP; oy = pr.top - hr.top - GAP;
    dpr = Math.min(devicePixelRatio || 1, 2);
    cv.style.left = (ox - PAD) + 'px'; cv.style.top = (oy - PAD) + 'px'; cv.style.width = (w + PAD * 2) + 'px'; cv.style.height = (h + PAD * 2) + 'px';
    cv.width = (w + PAD * 2) * dpr; cv.height = (h + PAD * 2) * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const r = RAD, segs = [];
    const line = (x0, y0, x1, y1, nx, ny) => segs.push(t => [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, nx, ny]);
    const arc = (cx, cy, a0) => segs.push(t => { const a = a0 + t * Math.PI / 2; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r, Math.cos(a), Math.sin(a)]; });
    line(r, 0, w - r, 0, 0, -1); arc(w - r, r, -Math.PI / 2); line(w, r, w, h - r, 1, 0); arc(w - r, h - r, 0);
    line(w - r, h, r, h, 0, 1); arc(r, h - r, Math.PI / 2); line(0, h - r, 0, r, -1, 0); arc(r, r, Math.PI);
    const lens = [w - 2 * r, Math.PI * r / 2, h - 2 * r, Math.PI * r / 2, w - 2 * r, Math.PI * r / 2, h - 2 * r, Math.PI * r / 2];
    const total = lens.reduce((a, b) => a + b, 0), N = Math.round(total / 5);
    const old = pts; pts = [];
    for (let k = 0; k < N; k++) {
      let s = k / N * total, j = 0; while (s > lens[j]) { s -= lens[j]; j++; }
      const [x, y, nx, ny] = segs[j](s / lens[j]);
      pts.push({ x: x + PAD, y: y + PAD, nx, ny, d: old[k] ? old[k].d : 0, v: 0 });
    }
  };
  // the cursor: grab the string where it touches it, follow outward (or a little inward), let go when pulled too far
  let mx = -1e4, my = -1e4, grab = -1;
  addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return; const r = cv.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; wake();
  }, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => { mx = my = -1e4; grab = -1; });
  const nearest = () => { let best = -1, bd = 1e9; for (let i = 0; i < pts.length; i++) { const p = pts[i], d = (mx - p.x) ** 2 + (my - p.y) ** 2; if (d < bd) { bd = d; best = i; } } return [best, Math.sqrt(bd)]; };
  let raf = 0, still = 0;
  const wake = () => { still = 0; if (!raf) raf = requestAnimationFrame(tick); };
  function tick() {
    raf = 0; const N = pts.length; if (!N) return;
    // grabbing
    const [ni, nd] = nearest();
    if (grab < 0 && nd < 16) grab = ni;
    let pull = null;
    if (grab >= 0) {
      const p = pts[ni], s = (mx - p.x) * p.nx + (my - p.y) * p.ny;   // how far out from the frame at rest
      if (s > 95 || s < -26 || nd > 110) grab = -1; else { grab = ni; pull = { i: ni, s }; }
    }
    // springs
    const acc = new Float32Array(N);
    for (let i = 0; i < N; i++) { const a = pts[(i - 1 + N) % N].d, b = pts[(i + 1) % N].d; acc[i] = .14 * (a + b - 2 * pts[i].d) - .012 * pts[i].d; }
    let energy = 0;
    for (let i = 0; i < N; i++) {
      const p = pts[i]; p.v = (p.v + acc[i]) * .94;
      if (pull) { let k = Math.abs(i - pull.i); k = Math.min(k, N - k); const f = Math.exp(-(k * k) / (2 * 11 * 11)); p.v += (pull.s * f - p.d) * .16 * f; p.v *= 1 - .25 * f; }
      p.d += p.v; energy += Math.abs(p.v) + Math.abs(p.d) * .05;
    }
    draw(pull);
    if (pull || energy > .05) raf = requestAnimationFrame(tick);
    else if (++still < 6) raf = requestAnimationFrame(tick);
    else { pts.forEach(p => { p.d = 0; p.v = 0; }); draw(null); }
  }
  const path = (useD) => { g.beginPath(); pts.forEach((p, i) => { const x = p.x + p.nx * (useD ? p.d : 0), y = p.y + p.ny * (useD ? p.d : 0); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); };
  function draw() {
    g.clearRect(0, 0, cv.width, cv.height);
    const maxD = pts.reduce((m, p) => Math.max(m, Math.abs(p.d)), 0), glow = Math.min(1, maxD / 40);
    // the veil: the area between the frame at rest and the plucked string
    if (maxD > .5) { path(true); path(false); g.fillStyle = `rgba(10,10,10,${(.05 + .07 * glow).toFixed(3)})`; g.fill('evenodd'); }
    // the string, with a soft glow while it is stretched
    path(true);
    g.lineWidth = 1.6; g.strokeStyle = '#0a0a0a';
    g.shadowColor = `rgba(0,0,0,${(.35 * glow).toFixed(3)})`; g.shadowBlur = 18 * glow;
    g.stroke(); g.shadowBlur = 0;
  }
  const refresh = () => { build(); draw(); };
  addEventListener('resize', refresh); setTimeout(refresh, 400); setTimeout(refresh, 1600);
  photo.querySelector('img') && photo.querySelector('img').addEventListener('load', refresh);
  refresh();
})();
