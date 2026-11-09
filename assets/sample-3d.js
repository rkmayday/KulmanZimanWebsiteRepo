// Hero scenes for the sample sites, picked by <div class="h3d" data-scene="...">. Built from primitives and canvas
// textures (no model files). Calm motion: slow floats, a little pointer parallax, a gentle scroll dolly.
(() => {
  const host = document.querySelector('.h3d[data-scene]');
  const T = window.THREE;
  if (!host || !T) return;
  const canvas = host.querySelector('canvas') || host.appendChild(document.createElement('canvas'));
  canvas.setAttribute('aria-hidden', 'true');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const phone = matchMedia('(max-width: 720px)').matches;
  const css = getComputedStyle(document.documentElement);
  const tok = n => css.getPropertyValue(n).trim();
  const ACC = new T.Color(tok('--acc') || '#ffffff');

  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch (e) { return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0, 0);
  const scene = new T.Scene();
  const cam = new T.PerspectiveCamera(35, 1, .1, 60);

  // ---------- helpers ----------
  const studio = (top, mid, bottom, strips) => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, top); gr.addColorStop(.5, mid); gr.addColorStop(1, bottom);
    g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
    strips.forEach(([x, y, w, h, col]) => { g.fillStyle = col; g.fillRect(x, y, w, h); });
    const tex = new T.CanvasTexture(c); tex.mapping = T.EquirectangularReflectionMapping; tex.encoding = T.sRGBEncoding;
    const pm = new T.PMREMGenerator(renderer); scene.environment = pm.fromEquirectangular(tex).texture; pm.dispose(); tex.dispose();
  };
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  const redraws = [];
  const canvasTex = (w, h, draw) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    const tex = new T.CanvasTexture(c); tex.encoding = T.sRGBEncoding; tex.anisotropy = 4;
    const redraw = (...a) => { g.clearRect(0, 0, w, h); draw(g, w, h, ...a); tex.needsUpdate = true; };
    redraw(); redraws.push(() => redraw()); return { tex, redraw };
  };
  const slab = (w, h, d, r) => {
    const s = new T.Shape(); const x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    const geo = new T.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: .015, bevelSize: .015, bevelSegments: 3, curveSegments: 10 });
    geo.translate(0, 0, -d / 2); return geo;
  };
  const face = (w, h, tex, z) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false })); m.position.z = z; return m; };
  const font = (f, size, weight = 600) => `${weight} ${size}px ${tok(f) || 'system-ui'}`;

  let update = () => {}, poke = () => {}, camBase = new T.Vector3(0, 0, 8), look = new T.Vector3();
  const kind = host.dataset.scene;

  // ---------- Ironpath: activity rings ----------
  if (kind === 'rings') {
    studio('#2b302d', '#0c0e0d', '#050605', [[40, 50, 120, 30, '#ffffff'], [320, 40, 150, 24, '#ffffff'], [0, 128, 512, 5, '#c7f36b']]);
    scene.add(new T.HemisphereLight(0xffffff, 0x0b0d0c, .5));
    const key = new T.DirectionalLight(0xffffff, 1.6); key.position.set(-3, 4, 5); scene.add(key);
    const rim = new T.DirectionalLight(ACC, 1.6); rim.position.set(3, -2, -4); scene.add(rim);
    const group = new T.Group(); group.scale.x = -1; scene.add(group);
    const rings = [[1.55, .82, ACC.clone()], [1.13, .64, new T.Color('#eef3ef')], [.71, .9, new T.Color('#8fcf3a')]];
    const tube = .17;
    const trackMat = new T.MeshStandardMaterial({ color: 0x1d2320, metalness: .2, roughness: .7 });
    const parts = rings.map(([r, v, col]) => {
      group.add(new T.Mesh(new T.TorusGeometry(r, tube * .72, 20, 160), trackMat));
      const mat = new T.MeshPhysicalMaterial({ color: col, metalness: .15, roughness: .3, clearcoat: 1, clearcoatRoughness: .2, emissive: col, emissiveIntensity: .18 });
      const arc = new T.Mesh(new T.TorusGeometry(r, tube, 24, 4, .001), mat); arc.rotation.z = Math.PI / 2; group.add(arc);
      const capA = new T.Mesh(new T.SphereGeometry(tube, 24, 16), mat), capB = capA.clone(); group.add(capA, capB);
      capA.position.set(0, r, 0);
      return { r, v, arc, capB, shown: 0 };
    });
    const setArc = (p, a) => { p.arc.geometry.dispose(); p.arc.geometry = new T.TorusGeometry(p.r, tube, 24, Math.max(4, Math.round(160 * a)), Math.max(.001, a * Math.PI * 2));
      const ang = Math.PI / 2 + a * Math.PI * 2; p.capB.position.set(Math.cos(ang) * p.r, Math.sin(ang) * p.r, 0); };
    let t = 0;
    poke = () => { t = 0; };   // tap: the rings empty and fill again
    camBase.set(0, 0, 7.2);
    update = (dt, s, px, py, time) => {
      t = reduce ? 1 : Math.min(1, t + dt / 2.2);
      parts.forEach((p, i) => { const k = Math.min(1, Math.max(0, t * 1.25 - i * .12)), e = 1 - Math.pow(1 - k, 3), a = p.v * e;
        if (Math.abs(a - p.shown) > .0005) { setArc(p, a); p.shown = a; } });
      group.rotation.x = -.5 + py * .25 - s * .35; group.rotation.y = Math.PI * 0 + px * .35 + Math.sin(time * .3) * .08;
      group.position.y = Math.sin(time * .8) * .06;
    };
  }

  // ---------- Synthra: floating task cards ----------
  if (kind === 'cards') {
    studio('#1a2236', '#070a14', '#030409', [[60, 40, 120, 26, '#ffffff'], [300, 50, 160, 20, '#9fefff'], [0, 130, 512, 4, '#5ef0ff']]);
    scene.add(new T.HemisphereLight(0xbfe9ff, 0x05070f, .6));
    const key = new T.DirectionalLight(0xffffff, 1.2); key.position.set(-2, 3, 5); scene.add(key);
    const glowL = new T.PointLight(ACC, 3, 12, 2); glowL.position.set(1.5, .5, -2.5); scene.add(glowL);
    const tasks = [
      ['IT', 'Reset VPN access', 'Done in 42s', ['Verified identity', 'Reset token in Okta', 'Replied to requester'], 1],
      ['Finance', 'Reconcile March invoices', '3 mismatches flagged', ['Matched 214 invoices', 'Flagged 3 for review', 'Drafted note to AP'], .66],
      ['People', 'Onboard Priya Shah', '9 accounts created', ['Created accounts', 'Added to 6 channels', 'Booked day-one calls'], 1],
      ['Sales', 'Weekly pipeline summary', 'Drafted for review', ['Pulled CRM data', 'Compared to last week', 'Waiting for approval'], .5],
      ['Ops', 'Incident #482: API latency', 'Logs gathered', ['Opened incident', 'Collected traces', 'Paged on-call'], .8]
    ];
    const W = 2.3, H = 1.44;
    const glass = new T.MeshPhysicalMaterial({ color: 0x0c1324, metalness: .25, roughness: .18, clearcoat: 1, clearcoatRoughness: .1, transparent: true, opacity: .94 });
    const geo = slab(W, H, .05, .14);
    const cards = tasks.map(([team, title, status, steps, prog], i) => {
      const { tex } = canvasTex(920, 576, (g, w, h) => {
        g.fillStyle = 'rgba(94,240,255,.10)'; rr(g, 0, 0, w, h, 50); g.fill();
        g.strokeStyle = 'rgba(160,240,255,.28)'; g.lineWidth = 3; rr(g, 2, 2, w - 4, h - 4, 48); g.stroke();
        g.fillStyle = '#5ef0ff'; g.font = font('--mono', 24, 500); g.fillText(team.toUpperCase(), 50, 74);
        const done = prog >= 1; const pw = g.measureText(status).width + 64;
        g.fillStyle = done ? 'rgba(94,240,255,.18)' : 'rgba(255,255,255,.08)'; rr(g, w - 50 - pw, 40, pw, 50, 25); g.fill();
        g.fillStyle = done ? '#5ef0ff' : '#c9d3ea'; g.font = font('--mono', 22, 500); g.fillText(status, w - 50 - pw + 32, 74);
        g.fillStyle = '#f2f6ff'; g.font = font('--display', 50, 700); g.fillText(title, 50, 160);
        steps.forEach((s, k) => { const y = 250 + k * 78, ok = k < Math.round(steps.length * prog);
          g.fillStyle = ok ? '#5ef0ff' : 'rgba(255,255,255,.15)'; g.beginPath(); g.arc(68, y - 10, 16, 0, 7); g.fill();
          if (ok) { g.strokeStyle = '#05070f'; g.lineWidth = 4; g.beginPath(); g.moveTo(60, y - 10); g.lineTo(66, y - 3); g.lineTo(77, y - 18); g.stroke(); }
          g.fillStyle = ok ? '#dfe8ff' : '#7f8aa6'; g.font = font('--body', 30, 500); g.fillText(s, 104, y); });
        g.fillStyle = 'rgba(255,255,255,.1)'; rr(g, 50, h - 70, w - 100, 12, 6); g.fill();
        g.fillStyle = '#5ef0ff'; rr(g, 50, h - 70, (w - 100) * prog, 12, 6); g.fill();
      });
      const m = new T.Mesh(geo, glass); m.add(face(W - .04, H - .04, tex, .045)); scene.add(m);
      return { m, i };
    });
    let shift = 0, shiftT = 0;
    poke = () => { shiftT += 1; };   // tap: the front card goes to the back
    camBase.set(0, .2, 8.6); look.set(0, 0, -1);
    update = (dt, s, px, py, time) => {
      const spread = 1 + s * .5;
      shift += (shiftT - shift) * Math.min(1, dt * 6);
      cards.forEach(({ m, i }) => { const n = cards.length, j = ((i - shift) % n + n) % n, k = j - 2, lift = Math.sin(Math.PI * Math.min(1, Math.max(0, j - (n - 1)))) * .6;
        m.position.set(k * .62 * spread, -k * .42 * spread + Math.sin(time * .7 + i) * .05 + lift, -j * .75 * spread);
        m.rotation.set(.1 + py * .1, -.42 + px * .2, .02); });
    };
  }

  // ---------- Ember Roast: three coffee bags ----------
  if (kind === 'bags') {
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    studio('#fff7ec', '#f1e4d2', '#d9c6ad', [[60, 30, 140, 40, '#ffffff'], [330, 40, 130, 30, '#fff3e0']]);
    scene.add(new T.HemisphereLight(0xfff4e6, 0xb89a7a, .9));
    const key = new T.DirectionalLight(0xfff0dc, 2.2); key.position.set(-3, 6, 4); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024); key.shadow.camera.left = -4; key.shadow.camera.right = 4; key.shadow.camera.top = 4; key.shadow.camera.bottom = -4; key.shadow.radius = 6; key.shadow.bias = -.0005;
    scene.add(key);
    const ground = new T.Mesh(new T.PlaneGeometry(20, 20), new T.ShadowMaterial({ opacity: .22 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    const bagGeo = (() => {
      const g = new T.BoxGeometry(1.2, 1.75, .5, 18, 30, 8), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i), z = p.getZ(i); const ny = (y + .875) / 1.75;
        const crimp = Math.min(1, Math.max(0, (ny - .84) / .1)); z *= 1 - crimp * .88;
        z *= 1 + .22 * Math.sin(Math.min(1, ny / .86) * Math.PI) * (1 - Math.pow(x / .6, 2) * .5);
        x *= 1 - .035 * Math.sin(ny * Math.PI);
        p.setXYZ(i, x, y + .875, z); }
      g.computeVertexNormals(); return g;
    })();
    const bags = [
      ['#efe6d6', '#c8743a', '#2b1a12', 'Huila', 'Colombia · Washed', 'Red apple · Caramel · Cocoa', 2],
      ['#c8743a', '#fbf3e6', '#fbf3e6', 'Yirgacheffe', 'Ethiopia · Natural', 'Jasmine · Bergamot · Peach', 1],
      ['#2a1d16', '#d99a62', '#f3e6d4', 'Huehuetenango', 'Guatemala · Washed', 'Brown sugar · Orange · Almond', 3]
    ].map(([paper, accent, ink, name, origin, notes, roast]) => {
      const { tex } = canvasTex(600, 876, (g, w, h) => {
        g.fillStyle = paper; g.fillRect(0, 0, w, h);
        g.fillStyle = accent; g.fillRect(0, h * .3, w, h * .44);
        g.fillStyle = ink === '#2b1a12' ? '#fbf3e6' : paper; g.beginPath(); g.arc(w / 2, h * .2, 34, 0, 7); g.fill();
        g.fillStyle = accent; g.beginPath(); g.arc(w / 2, h * .2, 18, 0, 7); g.fill();
        g.textAlign = 'center'; g.fillStyle = ink === '#fbf3e6' ? '#fbf3e6' : (paper === '#2a1d16' ? '#f3e6d4' : '#2b1a12');
        g.font = font('--display', 46, 700); g.fillText('Ember Roast', w / 2, h * .2 + 92);
        const onBand = paper === '#c8743a' ? '#2b1a12' : (paper === '#2a1d16' ? '#2a1d16' : '#fbf3e6');
        g.fillStyle = onBand; g.font = font('--display', 76, 700); g.fillText(name, w / 2, h * .44);
        g.font = font('--body', 28, 500); g.fillText(origin.toUpperCase(), w / 2, h * .44 + 56);
        g.font = font('--body', 26, 500); g.fillText(notes, w / 2, h * .62);
        for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(w / 2 - 54 + k * 36, h * .67, 10, 0, 7); g.globalAlpha = k < roast ? 1 : .3; g.fill(); }
        g.globalAlpha = 1; g.fillStyle = paper === '#2a1d16' ? '#d99a62' : (paper === '#c8743a' ? '#fbf3e6' : '#2b1a12');
        g.font = font('--body', 24, 500); g.fillText('250 G · WHOLE BEAN · ROASTED TUESDAY', w / 2, h * .86);
      });
      const plain = new T.MeshStandardMaterial({ color: paper, roughness: .62, metalness: 0 });
      const label = new T.MeshStandardMaterial({ map: tex, roughness: .55, metalness: 0 });
      const m = new T.Mesh(bagGeo, [plain, plain, plain, plain, label, plain]); m.castShadow = true; scene.add(m);
      return m;
    });
    const hop = [0, 0, 0], hopV = [0, 0, 0];
    poke = () => { [1, 0, 2].forEach((b, n) => setTimeout(() => { hopV[b] = 4.2; }, n * 110)); };   // tap: the bags hop in a wave
    camBase.set(0, 1.5, 7.4); look.set(0, .86, 0);
    update = (dt, s, px, py, time) => {
      for (let b = 0; b < 3; b++) { hopV[b] -= 14 * dt; hop[b] = Math.max(0, hop[b] + hopV[b] * dt); if (hop[b] === 0 && hopV[b] < 0) hopV[b] = 0; }
      const turn = px * .35 + s * .6 + Math.sin(time * .25) * .06;
      const spots = [[0, 0, .35, 0], [-1.35, 0, -.35, .42], [1.35, 0, -.35, -.42]];
      bags.forEach((m, i) => { const [x, y, z, r] = spots[i]; const a = turn; m.position.set(x * Math.cos(a) + z * Math.sin(a), y + hop[i], -x * Math.sin(a) + z * Math.cos(a)); m.rotation.y = r + a; m.rotation.z = Math.sin(hop[i] * 1.6) * .08; });
    };
  }

  // ---------- Deduction: a floating code editor, live preview and terminal ----------
  if (kind === 'editor') {
    studio('#262b45', '#0d0f1a', '#06070d', [[50, 40, 140, 26, '#ffffff'], [320, 40, 150, 22, '#ffe7a3'], [0, 128, 512, 4, '#ffcc4d']]);
    scene.add(new T.HemisphereLight(0xdfe4ff, 0x0d0f1a, .6));
    const key = new T.DirectionalLight(0xffffff, 1.2); key.position.set(-3, 3, 5); scene.add(key);
    const shell = new T.MeshPhysicalMaterial({ color: 0x141729, metalness: .3, roughness: .25, clearcoat: 1, clearcoatRoughness: .12 });
    const code = [
      [['const ', '#c792ea'], ['card ', '#e8ecff'], ['= ', '#89ddff'], ['document', '#ffcc4d'], ['.querySelector(', '#e8ecff'], ["'#card'", '#c3e88d'], [');', '#e8ecff']],
      [],
      [['ship', '#82aaff'], ['.addEventListener(', '#e8ecff'], ["'click'", '#c3e88d'], [', () ', '#e8ecff'], ['=> ', '#c792ea'], ['{', '#e8ecff']],
      [['  card', '#e8ecff'], ['.classList.', '#e8ecff'], ['add', '#82aaff'], ['(', '#e8ecff'], ["'shipped'", '#c3e88d'], [');', '#e8ecff']],
      [['  card', '#e8ecff'], ['.textContent ', '#e8ecff'], ['= ', '#89ddff'], ["'Shipped!'", '#c3e88d'], [';', '#e8ecff']],
      [['});', '#e8ecff']]
    ];
    const total = code.reduce((n, l) => n + l.reduce((m, [s]) => m + s.length, 0) + 1, 0);
    let typed = 0, shipped = false, hold = 0;
    const ed = canvasTex(1100, 740, (g, w, h) => {
      g.fillStyle = '#0f1222'; rr(g, 0, 0, w, h, 40); g.fill();
      g.fillStyle = '#171b31'; rr(g, 0, 0, w, 74, 40); g.fill(); g.fillRect(0, 40, w, 34);
      ['#ff6b6b', '#ffcc4d', '#5bd18b'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(44 + i * 34, 37, 10, 0, 7); g.fill(); });
      g.fillStyle = '#0f1222'; rr(g, 160, 18, 150, 56, 12); g.fill(); g.fillStyle = '#e8ecff'; g.font = font('--mono', 24, 500); g.fillText('app.js', 192, 54);
      g.fillStyle = '#69708f'; g.fillText('index.html', 340, 54);
      let left = typed, y = 150;
      code.forEach((line, li) => { g.fillStyle = '#4b5170'; g.font = font('--mono', 26, 400); g.fillText(String(li + 1).padStart(2, ' '), 40, y);
        let x = 110;
        for (const [s, c] of line) { if (left <= 0) break; const part = s.slice(0, left); left -= part.length; g.fillStyle = c; g.font = font('--mono', 28, 500); g.fillText(part, x, y); x += g.measureText(part).width; }
        if (left > 0) left--; else if (left === 0 && Math.floor(performance.now() / 450) % 2) { g.fillStyle = '#ffcc4d'; g.fillRect(x + 2, y - 26, 3, 34); left = -1; }
        y += 62; });
    });
    const pv = canvasTex(660, 500, (g, w, h) => {
      g.fillStyle = '#f5f6fb'; rr(g, 0, 0, w, h, 34); g.fill();
      g.fillStyle = '#e4e6f0'; rr(g, 0, 0, w, 60, 34); g.fill(); g.fillRect(0, 30, w, 30);
      g.fillStyle = '#ffffff'; rr(g, 120, 14, w - 240, 32, 16); g.fill(); g.fillStyle = '#7a7f99'; g.font = font('--mono', 18, 500); g.textAlign = 'center'; g.fillText('localhost:5173', w / 2, 37);
      g.fillStyle = shipped ? '#ffcc4d' : '#ffffff'; g.shadowColor = 'rgba(20,24,50,.18)'; g.shadowBlur = 30; rr(g, 80, 110, w - 160, 250, 26); g.fill(); g.shadowBlur = 0;
      g.fillStyle = '#12142a'; g.font = font('--display', 40, 800); g.fillText(shipped ? 'Shipped!' : 'My first app', w / 2, 210);
      g.font = font('--body', 22, 500); g.fillStyle = '#5b6080'; g.fillText(shipped ? 'You just made it move.' : 'Click the button to ship it.', w / 2, 252);
      g.fillStyle = '#12142a'; rr(g, w / 2 - 90, 284, 180, 54, 27); g.fill(); g.fillStyle = shipped ? '#ffcc4d' : '#ffffff'; g.font = font('--body', 22, 700); g.fillText(shipped ? 'Done ✓' : 'Ship it', w / 2, 319);
      g.textAlign = 'left';
    });
    const tm = canvasTex(700, 360, (g, w, h) => {
      g.fillStyle = '#080a14'; rr(g, 0, 0, w, h, 30); g.fill();
      g.font = font('--mono', 24, 500);
      [['$ npm run dev', '#e8ecff'], ['  VITE ready in 312 ms', '#5bd18b'], ['  ➜ Local: http://localhost:5173', '#82aaff'], [shipped ? '  ✓ page updated' : '  watching for changes…', shipped ? '#ffcc4d' : '#69708f']]
        .forEach(([s, c], i) => { g.fillStyle = c; g.fillText(s, 34, 70 + i * 66); });
    });
    const mk = (w, h, tex, x, y, z, ry) => { const m = new T.Mesh(slab(w, h, .06, .1), shell); m.add(face(w - .03, h - .03, tex, .05)); m.position.set(x, y, z); m.rotation.y = ry; m.userData.base = [x, y, z]; scene.add(m); return m; };
    const panels = [mk(3, 2.02, ed.tex, -.25, .25, 0, .2), mk(1.75, 1.33, pv.tex, 1.3, -.5, .9, -.25), mk(1.8, .93, tm.tex, -1.25, -1.0, .7, .28)];
    poke = () => { typed = 0; shipped = false; hold = 0; ed.redraw(); pv.redraw(); tm.redraw(); };   // tap: type it again
    camBase.set(0, .05, 8.4);
    let tick = 0;
    update = (dt, s, px, py, time) => {
      tick += dt;
      if (reduce) { if (!shipped) { typed = total; shipped = true; ed.redraw(); pv.redraw(); tm.redraw(); } }
      else if (tick > .045) { tick = 0;
        if (typed < total) typed += 1;
        else if (!shipped) { shipped = true; hold = 0; pv.redraw(); tm.redraw(); }
        else if ((hold += .045) > 3.5) { typed = 0; shipped = false; pv.redraw(); tm.redraw(); }
        ed.redraw(); }
      panels.forEach((m, i) => { const [x, y, z] = m.userData.base; m.position.set(x, y + Math.sin(time * .8 + i * 1.7) * .05 - s * (i === 0 ? .2 : .5), z + s * (i === 0 ? 0 : .6)); });
      scene.rotation.y = px * .18; scene.rotation.x = py * .1;
    };
  }

  // ---------- loop ----------
  const size = () => { const w = host.clientWidth, h = host.clientHeight; renderer.setSize(w, h, false); cam.aspect = w / h;
    // full-bleed hero: push the scene right of the copy on wide screens, up above it on tall ones
    const wide = w / h > 1.15;
    cam.fov = wide ? 38 : 40;
    if (wide) cam.setViewOffset(w, h, -w * .26, 0, w, h); else cam.clearViewOffset();
    cam.updateProjectionMatrix(); };
  const realResize = (() => { let w = innerWidth, h = innerHeight; return () => { const W = innerWidth, H = innerHeight; if (W === w && Math.abs(H - h) < Math.max(160, h * .25)) return false; w = W; h = H; return true; }; })();
  addEventListener('resize', () => { if (realResize()) size(); }); size();
  let visible = true, px = 0, py = 0, tpx = 0, tpy = 0;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(host);
  addEventListener('pointermove', e => { tpx = e.clientX / innerWidth - .5; tpy = e.clientY / innerHeight - .5; }, { passive: true });
  // drag to spin the scene (momentum, then it eases back); a tap without dragging triggers the scene's reaction
  let yaw = 0, pitch = 0, vy = 0, vp = 0, dragging = false, moved = 0, lx = 0, ly = 0;
  host.style.touchAction = 'pan-y';
  host.addEventListener('pointerdown', e => { if (e.target.closest('.chip,.dive-pill,a,button')) return; dragging = true; moved = 0; lx = e.clientX; ly = e.clientY; host.setPointerCapture(e.pointerId); host.classList.add('grab'); });
  host.addEventListener('pointermove', e => { if (!dragging) return; const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
    vy = dx * .006; vp = dy * .004; yaw += vy; pitch = Math.max(-.5, Math.min(.5, pitch + vp)); });
  const up = () => { if (!dragging) return; dragging = false; host.classList.remove('grab'); if (moved < 6) { poke(); vy += .08; } host.dispatchEvent(new CustomEvent('kz-touched')); };
  host.addEventListener('pointerup', up); host.addEventListener('pointercancel', up);
  document.fonts && document.fonts.ready.then(() => redraws.forEach(r => r()));
  let last = performance.now(), time = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!visible) return;
    time += reduce ? 0 : dt;
    px += (tpx - px) * .05; py += (tpy - py) * .05;
    const r = host.getBoundingClientRect(), s = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height)));
    update(dt, reduce ? 0 : s, reduce ? 0 : px, reduce ? 0 : py, time);
    if (!dragging) { yaw += vy; pitch += vp; vy *= .93; vp *= .9; yaw *= .985; pitch *= .95; }
    const off = camBase.clone().sub(look); off.z += s * 1.2;
    off.applyAxisAngle(new T.Vector3(1, 0, 0), -pitch).applyAxisAngle(new T.Vector3(0, 1, 0), -yaw);
    cam.position.copy(look).add(off); cam.lookAt(look);
    renderer.render(scene, cam);
  }
  requestAnimationFrame(frame);
})();
