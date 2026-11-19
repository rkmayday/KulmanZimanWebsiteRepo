// Home: the mission and the packages heading play as two chapters on one pinned white stage (like the Synthra sample).
// Behind them, a particle sphere from particles.casberry.in ("Sphere": a spiral-wound sphere, the site's own formula),
// drawn in black on white with its spiral line, gathers out of scattered dust for the mission, then breaks apart and
// re-forms into a ring for the packages. All the motion runs on the graphics card; it only draws while on screen.
// A scroll stop holds on each chapter (smooth.js). Reduced motion or no WebGL: the two chapters simply stack.
(() => {
  const stage = document.getElementById('ps'); if (!stage) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const chs = [...stage.querySelectorAll('.ps-ch')], pin = stage.querySelector('.ps-pin');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), sm = v => v * v * (3 - 2 * v);
  const T = window.THREE;
  let gl = null;
  try { const c = document.createElement('canvas'); gl = !reduce && T && (c.getContext('webgl2') || c.getContext('webgl')); } catch (e) {}
  if (!gl) { stage.classList.add('ps-flat'); chs.forEach(c => c.classList.add('on')); return; }
  stage.classList.add('ps-live');

  // ---------- the particles ----------
  const phone = matchMedia('(max-width: 760px)').matches;
  const N = phone ? 6000 : 14000;
  const A = new Float32Array(N * 3), B = new Float32Array(N * 3), S = new Float32Array(N * 3), R = new Float32Array(N);
  const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  for (let i = 0; i < N; i++) {
    // A: the Casberry sphere (its exported formula, scaled to this scene)
    const r = 30, phi = Math.acos(-1 + (2 * i) / N), theta = Math.sqrt(N * Math.PI) * phi;
    A[i * 3] = r * Math.cos(theta) * Math.sin(phi); A[i * 3 + 1] = r * Math.sin(theta) * Math.sin(phi); A[i * 3 + 2] = r * Math.cos(phi);
    // B: a ring (a torus wound the same way), tipped toward the viewer
    const u = (i / N) * Math.PI * 2 * 1, v = (i / N) * Math.PI * 2 * 90, Rr = 27, rr = 7.5;
    const x = (Rr + rr * Math.cos(v)) * Math.cos(u), y = (Rr + rr * Math.cos(v)) * Math.sin(u), z = rr * Math.sin(v);
    const tilt = -1.05; B[i * 3] = x; B[i * 3 + 1] = y * Math.cos(tilt) - z * Math.sin(tilt); B[i * 3 + 2] = y * Math.sin(tilt) + z * Math.cos(tilt);
    // S: scattered dust the sphere gathers out of
    const d = 60 + rnd() * 90, a1 = rnd() * Math.PI * 2, a2 = Math.acos(rnd() * 2 - 1);
    S[i * 3] = d * Math.cos(a1) * Math.sin(a2); S[i * 3 + 1] = d * Math.sin(a1) * Math.sin(a2) * .7; S[i * 3 + 2] = d * Math.cos(a2) * .6;
    R[i] = rnd();
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.BufferAttribute(A, 3));
  geo.setAttribute('aB', new T.BufferAttribute(B, 3));
  geo.setAttribute('aS', new T.BufferAttribute(S, 3));
  geo.setAttribute('aR', new T.BufferAttribute(R, 1));
  const U = { uGather: { value: 0 }, uMorph: { value: 0 }, uTime: { value: 0 }, uPx: { value: 1 }, uAlpha: { value: 1 } };
  const VS = `
    attribute vec3 aB; attribute vec3 aS; attribute float aR;
    uniform float uGather, uMorph, uTime, uPx;
    varying float vA;
    void main(){
      float m = smoothstep(0.0, 1.0, uMorph);
      vec3 shape = mix(position, aB, m);
      // while it changes shape it bursts outward a little and swirls, then settles
      float burst = sin(3.14159 * m);
      vec3 dir = normalize(shape + vec3(0.001));
      shape += dir * burst * (6.0 + aR * 16.0);
      float g = smoothstep(0.0, 1.0, clamp(uGather * 1.25 - aR * 0.25, 0.0, 1.0));
      vec3 p = mix(aS, shape, g);
      p += vec3(sin(uTime * .6 + aR * 40.0), cos(uTime * .5 + aR * 30.0), 0.0) * (0.25 + (1.0 - g) * 2.0);
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      float depth = clamp((-mv.z - 60.0) / 70.0, 0.0, 1.0);
      gl_PointSize = uPx * (1.6 + (1.0 - depth) * 1.9) * (0.75 + aR * 0.5);
      vA = (0.35 + (1.0 - depth) * 0.65) * (0.45 + g * 0.55);
    }`;
  const FS = `
    uniform float uAlpha; varying float vA;
    void main(){ vec2 c = gl_PointCoord - .5; float d = dot(c, c); if (d > .25) discard; gl_FragColor = vec4(vec3(0.04), vA * uAlpha * smoothstep(.25, .12, d)); }`;
  const mat = new T.ShaderMaterial({ uniforms: U, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false });
  const points = new T.Points(geo, mat);
  // the spiral "laser": the same points joined in order, as a hair-thin line
  const lineMat = new T.ShaderMaterial({ uniforms: U, vertexShader: VS.replace('gl_PointSize', 'float unusedPs'), transparent: true, depthWrite: false,
    fragmentShader: 'uniform float uAlpha; varying float vA; void main(){ gl_FragColor = vec4(vec3(0.04), vA * uAlpha * 0.16); }' });
  const line = new T.Line(geo, lineMat);

  const scene = new T.Scene(), group = new T.Group(); group.add(line, points); scene.add(group);
  const cam = new T.PerspectiveCamera(36, 1, 1, 1000); cam.position.set(0, 0, 120);
  const canvas = document.createElement('canvas'); canvas.className = 'ps-gl'; canvas.setAttribute('aria-hidden', 'true'); pin.prepend(canvas);
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0xffffff, 0);
  let W = 0, H = 0;
  const size = () => { W = pin.clientWidth; H = pin.clientHeight; const d = Math.min(2, devicePixelRatio || 1); renderer.setPixelRatio(d); renderer.setSize(W, H, false);
    U.uPx.value = d * (phone ? 1.05 : 1); cam.aspect = W / H; cam.updateProjectionMatrix(); };
  size(); addEventListener('resize', () => { size(); kick(); });

  // ---------- scroll: chapters, gather, morph ----------
  let cp = 0, last = -1, mx = 0, my = 0, tmx = 0, tmy = 0, vis = false, raf = 0, t0 = performance.now();
  // keep the shape off the words: at rest it is moved (and shrunk if it has to be) until it clears them by a gap
  const D = 120, TF = Math.tan(18 * Math.PI / 180), GAP = phone ? 26 : 48;
  const ppu = () => H / (2 * D * TF);
  const ball = (x, y, R) => { const p = ppu();
    const span = c => { const dist = Math.hypot(c, D), b = Math.asin(Math.min(.98, R / dist)), a = Math.atan(c / D); return [D * Math.tan(Math.max(-1.5, a - b)), D * Math.tan(Math.min(1.5, a + b))]; };
    const [x0, x1] = span(x), [y0, y1] = span(y);
    return { cx: W / 2 + (x0 + x1) / 2 * p, cy: H / 2 - (y0 + y1) / 2 * p, a: (x1 - x0) / 2 * p, b: (y1 - y0) / 2 * p }; };
  // the box the words, icon and signature actually take up
  const inked = ch => { const P = pin.getBoundingClientRect(), r = { l: 1e9, t: 1e9, r: -1e9, b: -1e9 }, add = q => { if (!q.width || !q.height) return;
      r.l = Math.min(r.l, q.left - P.left); r.r = Math.max(r.r, q.right - P.left); r.t = Math.min(r.t, q.top - P.top); r.b = Math.max(r.b, q.bottom - P.top); };
    const w = document.createTreeWalker(ch, NodeFilter.SHOW_TEXT), rg = document.createRange();
    for (let n = w.nextNode(); n; n = w.nextNode()) if (n.nodeValue.trim()) { rg.selectNodeContents(n); add(rg.getBoundingClientRect()); }
    ch.querySelectorAll('img').forEach(i => add(i.getBoundingClientRect()));
    return r; };
  const rest = (i, r, wide, R) => {
    let x = wide ? (i ? -36 : 30) : 0, y = wide ? 0 : 16, s = wide ? 1 : .78; const p = ppu();
    if (r.r < r.l) return [x, y, s];
    for (let n = 0; n < 16; n++) {
      const e = ball(x, y, R * s);
      if (wide) { const over = i ? (e.cx + e.a) - (r.l - GAP) : (r.r + GAP) - (e.cx - e.a); if (over <= .5) break;
        x += (i ? -1 : 1) * over / p; const c = ball(x, y, R * s).cx; if (i ? c < 0 : c > W) { x = (i ? -W / 2 : W / 2) / p; s *= .92; } }
      else { const over = (e.cy + e.b) - (r.t - GAP); if (over <= .5) break;
        y += over / p; const c = ball(x, y, R * s).cy; if (c < H * .3) { y = (H / 2 - H * .3) / p; s *= .92; } }
    }
    return [x, y, s]; };
  const read = () => {
    const r = stage.getBoundingClientRect(); vis = r.bottom > 0 && r.top < innerHeight;
    // progress from the mission stop (stage pinned under the top bar) to the packages stop (end of the pin): no dead scroll at either end
    const pt = parseFloat(getComputedStyle(pin).top) || 0;
    cp = clamp((pt - r.top) / Math.max(1, r.height - innerHeight + pt));
    const enter = clamp((innerHeight - r.top) / innerHeight);                 // 0 → 1 as the stage comes up the screen
    U.uGather.value = sm(clamp(enter * 1.15 - .1)) ;
    U.uMorph.value = clamp(cp);                                              // sphere → ring across the whole scroll between the two stops (no dead scroll)
    const ch = cp < .5 ? 0 : 1;
    if (ch !== last) { last = ch; chs.forEach((c, i) => c.classList.toggle('on', i === ch)); }
    stage.style.setProperty('--cp', cp.toFixed(4));
    kick();
  };
  const frame = now => {
    raf = 0; if (!vis) return;
    const t = (now - t0) / 1000; U.uTime.value = t;
    mx += (tmx - mx) * .05; my += (tmy - my) * .05;
    // where the shape sits: to the right of the words on wide screens, above them on phones; it drifts with the chapter
    const wide = W > 760, k = sm(U.uMorph.value);
    const [x0, y0, s0] = rest(0, inked(chs[0]), wide, 31.5), [x1, y1, s1] = rest(1, inked(chs[1]), wide, 36);
    group.position.set(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, 0);
    group.rotation.set(.35 + my * .25 + k * .25, t * .12 + mx * .4, .1 - k * .2);
    const s = (s0 + (s1 - s0) * k) * (1 - (1 - U.uGather.value) * .15); group.scale.setScalar(s);
    renderer.render(scene, cam);
    raf = requestAnimationFrame(frame);
  };
  const kick = () => { if (!raf && vis) raf = requestAnimationFrame(frame); };
  addEventListener('scroll', read, { passive: true });
  if (matchMedia('(hover: hover) and (pointer: fine)').matches)
    addEventListener('pointermove', e => { tmx = e.clientX / innerWidth - .5; tmy = e.clientY / innerHeight - .5; }, { passive: true });
  // scroll stops on each chapter
  // one stop with the mission fully in view, one at the end of the short run with the packages heading in view
  stage.__refreshStop = () => { const top = stage.getBoundingClientRect().top + scrollY, pinTop = parseFloat(getComputedStyle(pin).top) || 0, run = stage.offsetHeight - innerHeight;
    stage.dataset.stops = [Math.round(top - pinTop), Math.round(top + run)].join(','); };
  stage.__refreshStop();
  read();
})();
