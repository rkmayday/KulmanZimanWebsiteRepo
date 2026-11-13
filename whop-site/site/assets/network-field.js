// Maxim's page (Head of Affiliates): an interactive referral network instead of the founder dot grid.
// Points drift and link up with fine lines, the cursor is a hub that nearby points connect to,
// "referrals" travel point to point along the links and light up each point they reach,
// and a click on an empty spot adds a new point that joins the network. Nothing is drawn behind the content.
(() => {
  const page = document.querySelector('.founder-page[data-field="network"]');
  if (!page) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('founder-field');      // same layering as the founder pages
  const cv = document.createElement('canvas');
  cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:1;pointer-events:none';
  document.body.prepend(cv);
  const g = cv.getContext('2d');
  const INK = '10,10,10';
  let W = 0, H = 0, dpr = 1, blocks = [];
  const mouse = { x: -1e4, y: -1e4, tx: -1e4, ty: -1e4 };

  // content the network stays out of (page coordinates)
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

  // the points live in screen space and drift slowly
  let nodes = [];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const addNode = (x, y, fresh) => nodes.push({ x, y, vx: rnd(-.12, .12), vy: rnd(-.12, .12), glow: fresh ? 1 : 0, born: fresh ? 1 : 0 });
  const seed = () => {
    const want = Math.round(Math.min(190, Math.max(55, W * H / 6500)));
    while (nodes.length < want) addNode(rnd(0, W), rnd(0, H));
    if (nodes.length > want + 30) nodes.length = want + 30;
  };
  const measure = () => {
    dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    blocks = [...document.querySelectorAll(CONTENT)].filter(e => e.offsetParent || getComputedStyle(e).position === 'fixed')
      .map(e => ['fixed', 'sticky'].includes(getComputedStyle(e).position) ? { fixed: true, r: e.getBoundingClientRect() } : { fixed: false, r: docRect(e) });
    seed();
  };
  addEventListener('resize', () => requestAnimationFrame(measure));
  if ('ResizeObserver' in window) new ResizeObserver(() => requestAnimationFrame(measure)).observe(document.body);
  document.fonts && document.fonts.ready.then(measure);
  setTimeout(measure, 1500); setTimeout(measure, 3200);
  measure();

  addEventListener('pointermove', e => { mouse.tx = e.clientX; mouse.ty = e.clientY; }, { passive: true });
  addEventListener('pointerleave', () => { mouse.tx = mouse.ty = -1e4; });
  // a click on an empty spot: a new affiliate joins the network
  addEventListener('pointerdown', e => {
    if (e.target.closest && e.target.closest('a,button,input,textarea,select,summary')) return;
    if (!clearAt(e.clientX, e.clientY)) return;
    addNode(e.clientX, e.clientY, true);
    const near = nodes.slice(0, -1).map((n, i) => [i, Math.hypot(n.x - e.clientX, n.y - e.clientY)]).sort((a, b) => a[1] - b[1]).slice(0, 2);
    for (const [i] of near) pulses.push({ a: nodes.length - 1, b: i, t: 0, hops: 3 });
  }, { passive: true });

  // referrals: a pulse runs along a link, lights up the point it reaches, and often passes on
  const LINK = 150;
  let pulses = [], nextPulse = 0;
  const neighbours = (k) => { const out = []; const a = nodes[k];
    for (let i = 0; i < nodes.length; i++) if (i !== k && Math.hypot(nodes[i].x - a.x, nodes[i].y - a.y) < LINK) out.push(i); return out; };

  let t0 = performance.now();
  function frame(now) {
    const dt = Math.min(.05, (now - t0) / 1000); t0 = now;
    mouse.x += (mouse.tx - mouse.x) * .2; mouse.y += (mouse.ty - mouse.y) * .2;
    g.clearRect(0, 0, W, H);
    // move
    for (const n of nodes) {
      if (!reduce) {
        const dx = mouse.x - n.x, dy = mouse.y - n.y, d = Math.hypot(dx, dy);
        if (d < 220 && d > 30) { n.vx += dx / d * .012; n.vy += dy / d * .012; }      // drawn gently to the hub
        n.vx *= .985; n.vy *= .985;
        const sp = Math.hypot(n.vx, n.vy); if (sp < .06) { n.vx += rnd(-.02, .02); n.vy += rnd(-.02, .02); }
        n.x += n.vx * dt * 60; n.y += n.vy * dt * 60;
        if (n.x < -20) n.x = W + 20; if (n.x > W + 20) n.x = -20; if (n.y < -20) n.y = H + 20; if (n.y > H + 20) n.y = -20;
      }
      n.glow = Math.max(0, n.glow - dt * .8); n.born = Math.max(0, n.born - dt * .6);
      n.c = clearAt(n.x, n.y);
    }
    // links between points
    g.lineWidth = 1;
    for (let i = 0; i < nodes.length; i++) { const a = nodes[i]; if (!a.c) continue;
      for (let j = i + 1; j < nodes.length; j++) { const b = nodes[j]; if (!b.c) continue;
        const d = Math.hypot(a.x - b.x, a.y - b.y); if (d > LINK) continue;
        const al = (1 - d / LINK) * .34 * Math.min(a.c, b.c) + Math.max(a.glow, b.glow) * .25 * (1 - d / LINK);
        g.strokeStyle = `rgba(${INK},${al})`; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); } }
    // the cursor hub
    if (mouse.x > -1e3) {
      for (const n of nodes) { if (!n.c) continue; const d = Math.hypot(n.x - mouse.x, n.y - mouse.y); if (d > 220) continue;
        g.strokeStyle = `rgba(${INK},${(1 - d / 220) * .5 * n.c})`; g.beginPath(); g.moveTo(mouse.x, mouse.y); g.lineTo(n.x, n.y); g.stroke(); }
      if (clearAt(mouse.x, mouse.y)) { g.fillStyle = `rgba(${INK},.85)`; g.beginPath(); g.arc(mouse.x, mouse.y, 3.2, 0, 7); g.fill();
        g.strokeStyle = `rgba(${INK},.25)`; g.beginPath(); g.arc(mouse.x, mouse.y, 9 + 2 * Math.sin(now / 300), 0, 7); g.stroke(); }
    }
    // referrals travelling the links
    if (!reduce && now > nextPulse && nodes.length > 2) {
      nextPulse = now + 700 + Math.random() * 900;
      const k = Math.floor(Math.random() * nodes.length), nb = neighbours(k);
      if (nodes[k].c && nb.length) pulses.push({ a: k, b: nb[Math.floor(Math.random() * nb.length)], t: 0, hops: 2 + Math.floor(Math.random() * 3) });
    }
    for (let p = pulses.length - 1; p >= 0; p--) {
      const P = pulses[p], A = nodes[P.a], B = nodes[P.b];
      if (!A || !B) { pulses.splice(p, 1); continue; }
      P.t += dt * 1.6;
      const x = A.x + (B.x - A.x) * Math.min(1, P.t), y = A.y + (B.y - A.y) * Math.min(1, P.t), c = clearAt(x, y);
      if (c) { g.fillStyle = `rgba(${INK},${.9 * c})`; g.beginPath(); g.arc(x, y, 2.6, 0, 7); g.fill(); }
      if (P.t >= 1) {
        B.glow = 1; pulses.splice(p, 1);
        if (P.hops > 1) { const nb = neighbours(P.b).filter(i => i !== P.a); if (nb.length) pulses.push({ a: P.b, b: nb[Math.floor(Math.random() * nb.length)], t: 0, hops: P.hops - 1 }); }
      }
    }
    // the points themselves
    for (const n of nodes) { if (!n.c) continue;
      g.fillStyle = `rgba(${INK},${(.45 + .5 * n.glow) * n.c})`; g.beginPath(); g.arc(n.x, n.y, 1.8 + 1.6 * n.glow + 2 * n.born, 0, 7); g.fill();
      if (n.glow > .02) { g.strokeStyle = `rgba(${INK},${n.glow * .45 * n.c})`; g.beginPath(); g.arc(n.x, n.y, 4 + (1 - n.glow) * 16, 0, 7); g.stroke(); }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
