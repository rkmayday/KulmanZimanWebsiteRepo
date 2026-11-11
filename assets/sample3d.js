// Shared 3D base for the sample sites' opening animations (Ironpath, Synthra, Deduction).
// A page calls S3D(build); build(ctx) creates its objects and returns draw(state), which is called whenever the
// scroll position, pointer or size changes. Everything is driven by the stage's scroll variables (set by sample2.js),
// so it is smooth, exact and reversible. If WebGL is unavailable the page keeps its flat SVG version.
window.S3D = (build, opt = {}) => {
  const fail = () => { document.documentElement.classList.remove('x3d-wait'); };
  const stage = document.querySelector('.stage'), mark = stage && stage.querySelector('.mark');
  if (!stage || !mark || !window.THREE) return fail();
  const T = THREE, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.createElement('canvas'); canvas.className = 'x-3d';
  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch (e) { return fail(); }
  if (!renderer.getContext()) return fail();
  fail(); mark.classList.add('has-3d'); stage.classList.add('x3d'); mark.prepend(canvas);
  renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = opt.exposure || 1.05;
  renderer.physicallyCorrectLights = true;

  // ---------- helpers ----------
  const cl = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), sm = v => { v = cl(v); return v * v * (3 - 2 * v); };
  const easeOut = v => 1 - Math.pow(1 - cl(v), 3), mix = (a, b, t) => a + (b - a) * t;
  const hash = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
  const noise = (x, y, z) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf), c = (a, b, d) => hash(xi + a, yi + b, zi + d);
    return mix(mix(mix(c(0, 0, 0), c(1, 0, 0), u), mix(c(0, 1, 0), c(1, 1, 0), u), v), mix(mix(c(0, 0, 1), c(1, 0, 1), u), mix(c(0, 1, 1), c(1, 1, 1), u), v), w) * 2 - 1;
  };
  const fbm = (x, y, z) => noise(x, y, z) * .5 + noise(x * 2.1, y * 2.1, z * 2.1) * .27 + noise(x * 4.3, y * 4.3, z * 4.3) * .15 + noise(x * 8.7, y * 8.7, z * 8.7) * .08;
  const rnd = (() => { let s = 11; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const C = hex => new T.Color(hex).convertSRGBToLinear();
  const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return new T.CanvasTexture(c); };
  const soft = (inner, outer) => canvasTex(256, 256, (g, w) => { const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, inner); r.addColorStop(1, outer); g.fillStyle = r; g.fillRect(0, 0, w, w); });

  // ---------- studio environment for reflections ----------
  const pmrem = new T.PMREMGenerator(renderer), env = new T.Scene(), E = opt.env || {};
  const sky = new T.Mesh(new T.SphereGeometry(10, 32, 16), new T.MeshBasicMaterial({ side: T.BackSide, vertexColors: true }));
  { const g = sky.geometry, P = g.attributes.position, col = [], lo = C(E.low || '#0b0d0c'), hi = C(E.high || '#cfd6d2');
    for (let i = 0; i < P.count; i++) { const c = lo.clone().lerp(hi, sm((P.getY(i) / 10 + .3) / 1.2)); col.push(c.r, c.g, c.b); }
    g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); }
  env.add(sky);
  (E.panels || [[6, 3, -3, 5, 4, '#ffffff', 4], [3, 6, 6, 1, 2, '#ffffff', 2], [4, 2, 0, -4, 5, '#ffffff', .6]]).forEach(([w, h, x, y, z, k, s]) => {
    const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(k).multiplyScalar(s), side: T.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m); });
  const scene = new T.Scene(); scene.environment = pmrem.fromScene(env, .02).texture;
  const FOV = 28, camera = new T.PerspectiveCamera(FOV, 1, .1, 80);

  // ---------- size: the canvas and the headline block (so objects can stay clear of the words) ----------
  let W = 1, H = 1; const copy = { w: 0, h: 0 }, copyEl = stage.querySelector('.copy');
  const size = () => { const r = mark.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
    if (copyEl) {
      const textW = el => { const rg = document.createRange(); rg.selectNodeContents(el); return rg.getBoundingClientRect().width; };
      const acts = copyEl.querySelector('.actions'), aw = acts ? (() => { const bs = [...acts.children].map(e => e.getBoundingClientRect()); return Math.max(...bs.map(b => b.right)) - Math.min(...bs.map(b => b.left)); })() : 0;
      copy.w = Math.max(aw, ...[...copyEl.children].filter(e => e !== acts).map(textW)); copy.h = copyEl.getBoundingClientRect().height; }
    renderer.setPixelRatio(Math.min(1.5, devicePixelRatio || 1)); renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); last = ''; };

  const ctx = { T, scene, camera, renderer, stage, cl, sm, easeOut, mix, noise, fbm, rnd, C, canvasTex, soft, reduce };
  const draw = build(ctx);

  // ---------- one frame ----------
  const v = k => parseFloat(stage.style.getPropertyValue(k)) || 0;
  let last = '';
  const frame = () => {
    let i = v('--i'), p = v('--p'); const mx = v('--mx'), my = v('--my');
    if (reduce) { i = 1; p = 1; }
    // shared timeline: turn 0-22%, main action 22-70%, objects move aside 56-84%, headline 80-92%
    const a = sm(p / .22), b = cl((p - .22) / .48), out = sm((p - .56) / .28), c = sm((p - .8) / .12);
    stage.style.setProperty('--ea', a.toFixed(4)); stage.style.setProperty('--ec', c.toFixed(4));
    const sig = [i, p, mx, my, W, H].map(x => x.toFixed(4)).join();
    if (sig === last) return; last = sig;
    const z = opt.z || 9; camera.position.set(0, 0, z); camera.lookAt(0, 0, 0);
    const halfH = Math.tan(FOV / 2 * Math.PI / 180) * z, halfW = halfH * W / H;
    // the headline block's half-size in scene units (at depth 0)
    const tw = copy.w / W * halfW, th = copy.h / H * halfH;
    draw({ i, p, a, b, out, c, mx, my, W, H, halfW, halfH, tw, th });
    renderer.render(scene, camera);
  };

  // ---------- run only while the stage is on screen ----------
  let on = true, raf = 0;
  new IntersectionObserver(es => { on = es[0].isIntersecting; if (on && !raf) loop(); }).observe(stage);
  const loop = () => { raf = 0; if (!on) return; frame(); raf = requestAnimationFrame(loop); };
  addEventListener('resize', size); size(); loop();
};
