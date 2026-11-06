// Kulman Ziman — the 3D world behind every page.
// A royal-blue night with a gold-and-silver centrepiece, orbiting website panels,
// and a scroll-driven camera dive through floating coins, rings, gems and gold dust.
// Needs THREE (r128 UMD). If WebGL is unavailable the CSS gradient on #world remains.
(() => {
  const canvas = document.getElementById('world');
  if (!canvas || !window.THREE) return;
  const T = window.THREE;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const small = () => innerWidth < 900;
  const isHome = !!document.querySelector('.hero');

  let renderer;
  try {
    renderer = new T.WebGLRenderer({ canvas, antialias: !coarse, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, coarse ? 1.25 : 1.75));
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new T.Scene();
  scene.fog = new T.FogExp2(0x040b30, 0.022);
  const camera = new T.PerspectiveCamera(40, 1, 0.1, 200);
  camera.position.set(0, 0, 16);

  /* ---------- studio environment for real metal reflections ---------- */
  const env = new T.Scene();
  const skyGeo = new T.SphereGeometry(50, 32, 16);
  const cols = [];
  const pos = skyGeo.attributes.position;
  const top = new T.Color(0x9fb6ff), mid = new T.Color(0x1d3fae), bot = new T.Color(0x02061c), c = new T.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 50;
    if (y > 0) c.copy(mid).lerp(top, Math.pow(y, 1.5)); else c.copy(mid).lerp(bot, Math.min(1, -y * 1.6));
    cols.push(c.r, c.g, c.b);
  }
  skyGeo.setAttribute('color', new T.Float32BufferAttribute(cols, 3));
  env.add(new T.Mesh(skyGeo, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide })));
  const panelLight = (color, intensity, x, y, z, w, h) => {
    const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(color).multiplyScalar(intensity), side: T.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
  };
  panelLight(0xffffff, 6, 0, 30, 10, 30, 12);    // big soft key from above
  panelLight(0xfff0c8, 4, -30, 6, 12, 10, 24);   // warm strip left
  panelLight(0xcfe0ff, 4, 30, 2, 8, 10, 24);     // cool strip right
  panelLight(0xffffff, 2.5, 0, -6, 35, 40, 4);   // horizon glint
  const pmrem = new T.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(env, 0.03).texture;

  scene.add(new T.AmbientLight(0x3050c0, 0.4));
  const key = new T.DirectionalLight(0xfff2d6, 1.4); key.position.set(5, 8, 10); scene.add(key);
  const rim = new T.PointLight(0x5b82ff, 3, 40); rim.position.set(-8, 2, 4); scene.add(rim);
  const glow = new T.PointLight(0xffd36b, 2.2, 30); glow.position.set(6, -2, 6); scene.add(glow);

  /* ---------- materials ---------- */
  const gold = new T.MeshStandardMaterial({ color: 0xe0b94a, metalness: 1, roughness: 0.2 });
  const goldBrushed = new T.MeshStandardMaterial({ color: 0xd4af37, metalness: 1, roughness: 0.38 });
  const silver = new T.MeshStandardMaterial({ color: 0xe6e9f0, metalness: 1, roughness: 0.14 });
  const royal = new T.MeshPhysicalMaterial({ color: 0x1d3fae, metalness: 0.35, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, flatShading: true });

  /* ---------- centerpiece ---------- */
  const hero = new T.Group();
  scene.add(hero);
  const gem = new T.Mesh(new T.IcosahedronGeometry(1.25, 0), royal);
  const gemEdges = new T.LineSegments(new T.EdgesGeometry(gem.geometry), new T.LineBasicMaterial({ color: 0xf6e3a1, transparent: true, opacity: 0.9 }));
  gem.add(gemEdges);
  hero.add(gem);
  const ring1 = new T.Mesh(new T.TorusGeometry(2.25, 0.16, 48, 200), gold);
  const ring2 = new T.Mesh(new T.TorusGeometry(2.85, 0.05, 24, 220), silver);
  const ring3 = new T.Mesh(new T.TorusGeometry(3.35, 0.025, 16, 240), goldBrushed);
  ring1.rotation.x = 1.2; ring2.rotation.set(0.4, 0.9, 0); ring3.rotation.set(-0.5, -0.4, 0.2);
  hero.add(ring1, ring2, ring3);
  // studs on the gold ring, like a crown
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const s = new T.Mesh(new T.SphereGeometry(i % 3 === 0 ? 0.2 : 0.12, 24, 16), i % 3 === 0 ? silver : gold);
    s.position.set(Math.cos(a) * 2.25, Math.sin(a) * 2.25, 0);
    ring1.add(s);
  }

  /* ---------- orbiting website panels (canvas-drawn screens) ---------- */
  const sites = [
    { bg: '#06103a', fg: '#f4f6fa', acc: '#d4af37', kick: 'FITNESS', h: ['Stronger', 'every week.'], cta: 'Start free week' },
    { bg: '#fbf7ef', fg: '#141826', acc: '#1d3fae', kick: 'LOCAL SERVICES', h: ['Fresh bread', 'every morning.'], cta: 'Get a quote' },
    { bg: '#ffffff', fg: '#0b1440', acc: '#4169e1', kick: 'TECHNOLOGY', h: ['Software that', 'just works.'], cta: 'Start free trial' },
    { bg: '#0d1f6e', fg: '#f4f6fa', acc: '#c9ced8', kick: 'CREATORS', h: ['Learn it.', 'Share it.'], cta: 'Join the course' },
    { bg: '#1a1204', fg: '#f6e3a1', acc: '#d4af37', kick: 'KULMAN ZIMAN', h: ['$300.', 'Three rounds.'], cta: 'Get your website' }
  ];
  const drawSite = (cv, s) => {
    const g = cv.getContext('2d'), W = cv.width, H = cv.height;
    g.fillStyle = s.bg; g.fillRect(0, 0, W, H);
    const grd = g.createRadialGradient(W * .8, H * .35, 10, W * .8, H * .35, W * .5);
    grd.addColorStop(0, s.acc + '55'); grd.addColorStop(1, s.acc + '00'); g.fillStyle = grd; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(128,128,140,.18)'; g.fillRect(0, 0, W, 34);
    ['#ff5f57', '#febc2e', '#28c840'].forEach((col, i) => { g.fillStyle = col; g.beginPath(); g.arc(20 + i * 18, 17, 5.5, 0, 7); g.fill(); });
    g.fillStyle = 'rgba(128,128,140,.25)'; g.beginPath(); g.roundRect ? g.roundRect(W / 2 - 110, 9, 220, 16, 6) : g.rect(W / 2 - 110, 9, 220, 16); g.fill();
    g.fillStyle = s.fg; g.font = '600 18px "Bodoni Moda", Georgia, serif'; g.fillText(s.kick === 'KULMAN ZIMAN' ? 'Kulman Ziman' : 'Your Business', 28, 72);
    g.fillStyle = s.acc; g.font = '600 12px "IBM Plex Mono", monospace'; g.fillText(s.kick, 28, 128);
    g.fillStyle = s.fg; g.font = '600 46px "Bodoni Moda", Georgia, serif'; g.fillText(s.h[0], 26, 180); g.fillText(s.h[1], 26, 228);
    g.fillStyle = s.acc; g.beginPath(); g.roundRect ? g.roundRect(28, 256, 170, 40, 20) : g.rect(28, 256, 170, 40); g.fill();
    g.fillStyle = s.bg === '#ffffff' || s.bg === '#fbf7ef' ? '#ffffff' : '#10142a'; g.font = '700 15px "Manrope", sans-serif'; g.fillText(s.cta, 46, 281);
    g.fillStyle = s.acc + '33'; g.beginPath(); g.roundRect ? g.roundRect(W - 190, 100, 160, 200, 18) : g.rect(W - 190, 100, 160, 200); g.fill();
    g.fillStyle = s.acc; for (let i = 0; i < 5; i++) { const h = 40 + ((i * 37) % 5) * 22; g.fillRect(W - 172 + i * 28, 280 - h, 18, h); }
  };
  const panels = [];
  const panelGroup = new T.Group();
  hero.add(panelGroup);
  const textures = [];
  sites.forEach((s, i) => {
    const cv = document.createElement('canvas'); cv.width = 640; cv.height = 400; drawSite(cv, s);
    const tex = new T.CanvasTexture(cv); tex.encoding = T.sRGBEncoding; tex.anisotropy = 4; textures.push([tex, cv, s]);
    const p = new T.Group();
    const frame = new T.Mesh(new T.BoxGeometry(2.3, 1.5, 0.09), i % 2 ? silver : gold);
    const screen = new T.Mesh(new T.PlaneGeometry(2.14, 1.34), new T.MeshBasicMaterial({ map: tex, toneMapped: false }));
    screen.position.z = 0.047;
    p.add(frame, screen);
    p.userData = { a: (i / sites.length) * Math.PI * 2, s: 1, target: 1, frame };
    panelGroup.add(p); panels.push(p);
  });
  // redraw screens once web fonts arrive
  document.fonts && document.fonts.ready.then(() => textures.forEach(([tex, cv, s]) => { drawSite(cv, s); tex.needsUpdate = true; }));

  /* ---------- the dive: floating objects down the page ---------- */
  const DEPTH = isHome ? 70 : 45;
  const field = new T.Group(); scene.add(field);
  const coinGeo = new T.CylinderGeometry(0.6, 0.6, 0.09, 48);
  const ringGeo = new T.TorusGeometry(0.62, 0.07, 16, 64);
  const gemGeo = new T.OctahedronGeometry(0.5, 0);
  const ballGeo = new T.SphereGeometry(0.38, 32, 16);
  const kinds = [[coinGeo, gold], [ringGeo, silver], [gemGeo, royal], [ballGeo, silver], [coinGeo, goldBrushed], [ringGeo, gold]];
  const count = coarse ? 34 : 80;
  const rand = (a, b) => a + Math.random() * (b - a);
  const floaters = [];
  for (let i = 0; i < count; i++) {
    const [geo, mat] = kinds[i % kinds.length];
    const m = new T.Mesh(geo, mat);
    const front = Math.random() < 0.3;
    const side = Math.random() < 0.5 ? -1 : 1;
    m.position.set(front ? side * rand(9.5, 13) : rand(-26, 26), rand(-DEPTH - 6, 4), front ? rand(1, 5) : rand(-30, -10));
    const sc = front ? rand(0.6, 1.1) : rand(0.9, 2.2);
    m.scale.setScalar(sc);
    m.rotation.set(rand(0, 6), rand(0, 6), rand(0, 6));
    m.userData = { rx: rand(-.6, .6), ry: rand(-.8, .8), bob: rand(0, 6), y0: m.position.y };
    field.add(m); floaters.push(m);
  }
  // the finale: a slow-turning gold ring constellation near the bottom of the page
  const finale = new T.Group();
  finale.position.set(isHome ? -4 : 4, -DEPTH + 2, -6);
  for (let i = 0; i < 3; i++) {
    const r = new T.Mesh(new T.TorusGeometry(3 + i * 0.9, 0.08 + (2 - i) * 0.04, 24, 200), i === 1 ? silver : gold);
    r.rotation.set(i * 0.7, i * 0.5, 0); finale.add(r);
  }
  scene.add(finale);

  /* ---------- gold dust + silver stars ---------- */
  const dot = (() => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d');
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.25, 'rgba(255,255,255,.6)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new T.CanvasTexture(cv);
  })();
  const dust = (n, color, size) => {
    const geo = new T.BufferGeometry(), arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = rand(-22, 22); arr[i * 3 + 1] = rand(-DEPTH - 10, 12); arr[i * 3 + 2] = rand(-28, 9); }
    geo.setAttribute('position', new T.BufferAttribute(arr, 3));
    const pts = new T.Points(geo, new T.PointsMaterial({ color, size, map: dot, transparent: true, depthWrite: false, blending: T.AdditiveBlending, sizeAttenuation: true }));
    scene.add(pts); return pts;
  };
  const goldDust = dust(coarse ? 900 : 2600, 0xffd36b, 0.13);
  const silverDust = dust(coarse ? 500 : 1400, 0xcfd8ff, 0.08);

  /* ---------- layout, input, scroll ---------- */
  const layout = () => {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    if (isHome) {
      if (small()) { hero.position.set(0, -1.2, -3); hero.scale.setScalar(0.62); }
      else { hero.position.set(4.6, 0.2, 0); hero.scale.setScalar(1); }
    } else { hero.position.set(small() ? 2.5 : 6.5, 1, -6); hero.scale.setScalar(small() ? 0.4 : 0.6); }
  };
  layout(); addEventListener('resize', layout);

  let mx = 0, my = 0, cx = 0, cy = 0, px = -1, py = -1;
  addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; px = e.clientX; py = e.clientY; }, { passive: true });

  let scrollT = 0, lastScroll = scrollY, vel = 0;
  const readScroll = () => { const max = document.documentElement.scrollHeight - innerHeight; scrollT = max > 0 ? scrollY / max : 0; };
  addEventListener('scroll', readScroll, { passive: true }); readScroll();

  // hover + click on 3D objects (only where nothing interactive is under the pointer)
  const ray = new T.Raycaster(), ndc = new T.Vector2();
  const interactive = el => !el || (el.closest && el.closest('a,button,input,select,textarea,label,summary,p,h1,h2,h3,h4,li,blockquote,.chip,.product,.panel,.sheet,.founder,.stat,.box,.calc,.monitor,.browser,.controls,.brief,.faq,.aff,.prose,.cell,.marquee,nav'));
  let hovered = null, burst = 0;
  const pick = () => {
    if (px < 0) return null;
    ndc.set(px / innerWidth * 2 - 1, -(py / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects([gem, ...panels.map(p => p.children[0])], false);
    return hits[0] ? hits[0].object : null;
  };
  addEventListener('click', e => {
    if (interactive(e.target)) return;
    const o = pick(); if (!o) return;
    if (o === gem) { burst = 1; }
    else { const pg = document.getElementById('playground'); pg ? pg.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }) : (location.href = document.querySelector('.brand').getAttribute('href') + '#playground'); }
  });

  /* ---------- loop ---------- */
  const clock = new T.Clock();
  let running = true;
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) { clock.getDelta(); requestAnimationFrame(frame); } });

  function frame() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    // scroll velocity → warp
    const ds = scrollY - lastScroll; lastScroll = scrollY;
    vel += (ds - vel) * 0.12;
    const warp = Math.min(Math.abs(vel) / 40, 1);
    camera.fov += ((40 + warp * 14) - camera.fov) * 0.1; camera.updateProjectionMatrix();

    cx += (mx - cx) * 0.05; cy += (my - cy) * 0.05;
    const camY = -scrollT * DEPTH;
    camera.position.x = cx * 2.2;
    camera.position.y += ((camY - cy * 1.4) - camera.position.y) * 0.08;
    camera.position.z = 16 - warp * 2;
    camera.lookAt(cx * 0.6, camera.position.y + cy * 0.6, 0);

    // centerpiece
    const spin = 1 + warp * 4 + burst * 12;
    burst *= 0.96;
    gem.rotation.x += dt * 0.35 * spin; gem.rotation.y += dt * 0.5 * spin;
    gem.scale.setScalar(1 + burst * 0.35 + Math.sin(t * 2) * 0.02);
    ring1.rotation.z += dt * 0.25 * spin; ring2.rotation.z -= dt * 0.18 * spin; ring3.rotation.z += dt * 0.1 * spin;
    hero.rotation.y = cx * 0.5; hero.rotation.x = cy * 0.3;
    hero.position.y += Math.sin(t * 0.8) * 0.002;
    gemEdges.material.opacity = 0.6 + Math.sin(t * 3) * 0.3;

    // panels: hover detection
    const hit = interactive(document.elementFromPoint(px, py)) ? null : pick();
    const hp = hit && hit !== gem ? hit.parent : null;
    if (hp !== hovered) { hovered = hp; }
    document.documentElement.style.cursor = hit && !coarse ? 'pointer' : '';
    const orbitSpeed = hovered ? 0.04 : 0.16 + warp * 0.6;
    panels.forEach((p, i) => {
      const u = p.userData; u.a += dt * orbitSpeed;
      const R = small() ? 4.4 : 5.2;
      p.position.set(Math.cos(u.a) * R, Math.sin(u.a * 2 + i) * 0.5 + Math.sin(u.a) * 1.2, Math.sin(u.a) * R * 0.55);
      p.lookAt(camera.position);
      u.target = p === hovered ? 1.35 : 1; u.s += (u.target - u.s) * 0.12; p.scale.setScalar(u.s * (small() ? 0.85 : 1));
    });

    // floaters
    floaters.forEach(m => {
      const u = m.userData;
      m.rotation.x += dt * u.rx * (1 + warp * 6); m.rotation.y += dt * u.ry * (1 + warp * 6);
      m.position.y = u.y0 + Math.sin(t * 0.6 + u.bob) * 0.35;
    });
    finale.rotation.y += dt * 0.15; finale.rotation.x = Math.sin(t * 0.3) * 0.3;
    finale.children.forEach((r, i) => { r.rotation.z += dt * (0.2 + i * 0.1) * (i % 2 ? -1 : 1); });
    goldDust.rotation.y = t * 0.01 + cx * 0.05; silverDust.rotation.y = -t * 0.006;
    goldDust.position.y = Math.sin(t * 0.2) * 0.5;
    rim.position.x = -8 + Math.sin(t * 0.5) * 3; glow.position.y = camera.position.y - 2 + Math.cos(t * 0.4) * 2;
    key.position.y = camera.position.y + 8;

    renderer.render(scene, camera);
    if (!reduce) requestAnimationFrame(frame);
  }
  if (reduce) {
    // one still frame, re-rendered on scroll/resize so the camera still follows the page
    const still = () => { running = true; frame(); };
    addEventListener('scroll', still, { passive: true }); addEventListener('resize', still);
  }
  requestAnimationFrame(frame);
})();
