// Kulman Ziman — "Noir" background.
// Black page, faint dot grid (CSS), and a neon-lime light ribbon: a bundle of fine filaments that twist like a cable,
// pinch into a bright knot beside the headline, then flow down the page weaving around the edges of every card.
//   - pulses travel along the strands, sparkles drift along the ribbon, scrolling speeds up the flow
//   - the cursor pushes nearby strands aside
// Home also keeps the chrome crown (follows the cursor, drag to spin, click to crown) and the shapes (click to shatter);
// they scroll away with the hero. Needs THREE r128 (UMD). Without WebGL the dot grid remains.
(() => {
  const canvas = document.getElementById('world');
  if (!canvas || !window.THREE) return;
  const T = window.THREE;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const isHome = !!document.querySelector('.hero');
  const small = () => innerWidth < 900;
  const root = document.documentElement;

  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' }); }
  catch (e) { return; }
  const DPR = Math.min(devicePixelRatio || 1, coarse ? 1.5 : 2);
  renderer.setPixelRatio(DPR);
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.autoClear = false;
  renderer.setClearColor(0x000000, 0);

  const founderPage = !!document.querySelector('.founder-page');
  const LIME = 0xc6ff3d;   // the accent (lime)

  /* =====================================================================
     1. The light (orthographic, in page pixels; its shape is fixed to the screen and morphs with scroll)
     ===================================================================== */
  let mx = 0, my = 0, cx = 0, cy = 0, px = -1, py = -1, overUI = false;
  const ray = new T.Raycaster(), ndc = new T.Vector2();
  const rScene = new T.Scene();
  const rCam = new T.OrthographicCamera(0, 1, 0, -1, -10, 10);
  const U = {
    uTime: { value: 0 }, uFlow: { value: 0 }, uSpread: { value: 130 }, uKnot: { value: 0 }, uLen: { value: 1 },
    uMouse: { value: new T.Vector2(-9999, -9999) }, uPush: { value: coarse ? 0 : 1 }, uDpr: { value: DPR },
    uRects: { value: Array.from({ length: 40 }, () => new T.Vector4(-1e5, -1e5, -1e5, -1e5)) }, uRectN: { value: 0 }
  };
  // text blocks the ribbon fades behind (page px, padded)
  const MASK = `
    uniform vec4 uRects[40]; uniform int uRectN;
    float textMask(vec2 p){ float m = 1.;
      for (int i = 0; i < 40; i++) { if (i >= uRectN) break; vec4 r = uRects[i];
        float dx = max(max(r.x - p.x, p.x - r.z), 0.), dy = max(max(r.y - p.y, p.y - r.w), 0.);
        m = min(m, mix(.28, 1., smoothstep(0., 80., length(vec2(dx, dy))))); }
      return m; }`;
  /* ---------- the light: fixed to the screen, morphing between shapes as you scroll ----------
     Control points live in viewport space and are converted to page coordinates each frame, so the light
     stays behind the content while the page scrolls over it, and its shape changes at exactly scroll speed. */
  U.uP = { value: Array.from({ length: 8 }, () => new T.Vector2()) };
  U.uKnotU = { value: .43 }; U.uKnotAmt = { value: 1 }; U.uDimIn = { value: .22 };
  const SPLINE = `
    uniform vec2 uP[8];
    void spline(float u, out vec2 pos, out vec2 tg){
      float f = clamp(u, 0., .9999) * 7.; int i = int(floor(f)); float t = f - float(i);
      vec2 p0 = uP[i > 0 ? i - 1 : 0], p1 = uP[i], p2 = uP[i < 7 ? i + 1 : 7], p3 = uP[i < 6 ? i + 2 : 7];
      vec2 a = 2. * p0 - 5. * p1 + 4. * p2 - p3, b = -p0 + 3. * p1 - 3. * p2 + p3;
      pos = .5 * (2. * p1 + (p2 - p0) * t + a * t * t + b * t * t * t);
      tg = .5 * ((p2 - p0) + 2. * a * t + 3. * b * t * t);
    }`;
  const ribbonVS = MASK + SPLINE + `
    uniform float uTime, uSpread, uKnotU, uKnotAmt, uPush, uW, uSpreadK;
    uniform vec2 uMouse;
    attribute float u; attribute float side; attribute float r; attribute float ph;
    varying float vU, vDepth, vPh, vM, vSide;
    void main(){
      vec2 c, tg; spline(u, c, tg);
      vec2 n = normalize(vec2(-tg.y, tg.x) + 1e-5);
      float pinch = mix(1., smoothstep(0., .16, abs(u - uKnotU)), uKnotAmt);
      float breathe = .7 + .3 * sin(u * 9. - uTime * .1 + ph * .3);
      float spread = mix(5., uSpread * uSpreadK, pinch) * breathe;
      float tw = u * 6.5 - uTime * .16 + ph * .35;                      // the twist travels down the line
      vDepth = sin(tw);
      vec2 p = c + n * spread * (r * (.75 + .25 * cos(tw)) + sin(u * 5. - uTime * .15 + ph) * .06);   // silky: mostly side by side
      vec2 d = p - uMouse; p += normalize(d + 1e-4) * 55. * exp(-dot(d, d) / 26000.) * uPush;
      vM = textMask(p);
      float clear = smoothstep(.28, 1., vM);
      float w = uW * (.6 + .8 * fract(ph * 3.7)) * mix(4.2, 1., clear);   // wider (blurred) behind text
      p += n * side * w;
      vU = u; vPh = ph; vSide = side;
      p.y = -p.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 0., 1.);
    }`;
  const ribbonFS = `
    uniform float uTime, uA, uSoft, uKnotU, uKnotAmt, uDimIn;
    varying float vU, vDepth, vPh, vM, vSide;
    void main(){
      float clear = smoothstep(.28, 1., vM);
      float prof = 1. - smoothstep(mix(0., uSoft, clear), 1., abs(vSide));
      float front = .35 + .65 * (vDepth * .5 + .5);
      float pulse = smoothstep(.82, 1., fract(vU * 1.2 - uTime * .028 + vPh * 3.17)) * .6;
      float ends = smoothstep(0., .04, vU) * smoothstep(0., .04, 1. - vU);
      vec3 col = mix(vec3(.78, 1., .24), vec3(.93, 1., .46), fract(vPh * 5.3));   // lime to yellow-green
      float dim = mix(uDimIn, 1., clear);                                          // darker behind text
      float knotGlow = 1. + 1.8 * uKnotAmt * exp(-pow((vU - uKnotU) / .05, 2.));   // the bright pinch point
      float a = uA * (1. + .6 * pulse) * front * ends * prof * dim * knotGlow;
      gl_FragColor = vec4(col * a + vec3(.95, 1., .8) * pulse * .25 * uA * front * prof * dim, a);
    }`;
  const layerMat = o => new T.ShaderMaterial({
    uniforms: Object.assign({}, U, { uW: { value: o.w }, uA: { value: o.a }, uSoft: { value: o.soft }, uSpreadK: { value: o.k } }),
    transparent: true, depthWrite: false, depthTest: false, blending: T.AdditiveBlending, vertexShader: ribbonVS, fragmentShader: ribbonFS
  });
  const ribbon = new T.Group(); rScene.add(ribbon);
  function strandGeo(count, N) {
    const V = (N + 1) * 2 * count;
    const pos = new Float32Array(V * 3), uu = new Float32Array(V), sd = new Float32Array(V), rr = new Float32Array(V), pp = new Float32Array(V);
    const idx = new Uint32Array(N * 6 * count); let k = 0;
    for (let j = 0; j < count; j++) {
      const r = (Math.random() * 2 - 1) * (Math.random() < .3 ? 1 : .6), ph = Math.random() * 6.283;
      for (let i = 0; i <= N; i++) for (let e = 0; e < 2; e++) {
        const v = (j * (N + 1) + i) * 2 + e; uu[v] = i / N; sd[v] = e ? 1 : -1; rr[v] = r; pp[v] = ph;
        if (i < N && e === 0) { idx[k++] = v; idx[k++] = v + 1; idx[k++] = v + 2; idx[k++] = v + 1; idx[k++] = v + 3; idx[k++] = v + 2; }
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('u', new T.BufferAttribute(uu, 1)); g.setAttribute('side', new T.BufferAttribute(sd, 1));
    g.setAttribute('r', new T.BufferAttribute(rr, 1)); g.setAttribute('ph', new T.BufferAttribute(pp, 1)); g.setIndex(new T.BufferAttribute(idx, 1));
    return g;
  }
  let built = false;
  function buildRibbon() {
    if (built) return; built = true;
    const lite = coarse || small();
    [{ n: lite ? 10 : 18, w: 34, a: .11, soft: 0, k: 1.8 },       // out-of-focus haze behind everything
     { n: lite ? 30 : 70, w: 3.6, a: .42, soft: .65, k: 1 },        // the body of bold strands
     { n: lite ? 8 : 16, w: 1.6, a: .75, soft: .5, k: .4 }]      // a few bright core highlights
      .forEach(L => { const m = new T.Mesh(strandGeo(L.n, lite ? 160 : 240), layerMat(L)); m.frustumCulled = false; ribbon.add(m); });
  }

  // the shapes it moves through (x, y as fractions of the screen), one per stretch of the page
  const KF = [
    { knot: 1, k: 1, p: [[1.15, 1.06], [.9, .93], [.71, .8], [.61, .67], [.68, .5], [.82, .36], [.98, .22], [1.18, .05]] },   // hero swoosh with a knot
    { knot: 0, k: 1.15, p: [[1.18, -.12], [.92, .08], [.76, .28], [.63, .48], [.55, .68], [.4, .88], [.18, 1.04], [-.15, 1.16]] }, // wide diagonal band
    { knot: 0, k: .95, p: [[.72, -.15], [.86, .12], [.7, .32], [.84, .52], [.66, .72], [.8, .92], [.62, 1.08], [.74, 1.25]] },   // S-curve on the right
    { knot: 0, k: 1.1, p: [[-.18, .82], [.12, .72], [.33, .56], [.5, .5], [.66, .46], [.84, .32], [1.02, .2], [1.22, .1]] },   // sweep across
    { knot: 1, k: 1, p: [[-.15, .3], [.18, .4], [.38, .64], [.5, .8], [.64, .7], [.8, .52], [1.0, .46], [1.22, .52]] }          // closing curl
  ];
  // phones: the text fills the width, so the light keeps to the right edge and curls past the crown at the top
  const KF_PHONE = [
    { knot: 1, k: .8, p: [[1.25, .02], [.92, .06], [.66, .12], [.55, .2], [.68, .3], [.9, .42], [1.0, .7], [1.06, 1.1]] },
    { knot: 0, k: .7, p: [[1.2, -.1], [1.0, .1], [.93, .3], [.97, .5], [.92, .7], [.98, .9], [1.0, 1.05], [1.15, 1.2]] },
    { knot: 0, k: .7, p: [[1.15, -.15], [.95, .05], [1.02, .25], [.93, .45], [1.02, .65], [.94, .85], [1.04, 1.05], [1.2, 1.2]] },
    { knot: 0, k: .75, p: [[1.25, .1], [1.0, .2], [.92, .4], [.96, .6], [.9, .8], [.97, .95], [1.05, 1.08], [1.2, 1.2]] },
    { knot: 1, k: .75, p: [[1.2, .2], [.98, .3], [.86, .5], [.82, .66], [.9, .78], [1.0, .86], [1.1, .95], [1.25, 1.05]] }
  ];
  const cur = { p: KF[0].p.map(q => q.slice()), knot: 1, k: 1 };
  function morph(t) {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const f = Math.min(1, scrollY / max) * (KF.length - 1), i = Math.min(KF.length - 2, Math.floor(f)), k = f - i, e = k * k * (3 - 2 * k);
    const set = small() ? KF_PHONE : KF, A = set[i], B = set[i + 1], W = innerWidth, H = innerHeight;
    cur.knot = A.knot + (B.knot - A.knot) * e; cur.k = A.k + (B.k - A.k) * e;
    for (let j = 0; j < 8; j++) {
      const x = A.p[j][0] + (B.p[j][0] - A.p[j][0]) * e + Math.sin(t * .25 + j * 1.7) * .012;
      const y = A.p[j][1] + (B.p[j][1] - A.p[j][1]) * e + Math.cos(t * .21 + j * 1.3) * .012;
      cur.p[j][0] = x * W; cur.p[j][1] = y * H + scrollY;                // to page coordinates
      U.uP.value[j].set(cur.p[j][0], cur.p[j][1]);
    }
    U.uKnotAmt.value = cur.knot;
  }
  // the same curve on the CPU, for the sparkles
  const spl = (u, out) => {
    const P = cur.p, f = Math.min(.9999, Math.max(0, u)) * 7, i = Math.floor(f), t = f - i;
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[Math.min(7, i + 1)], p3 = P[Math.min(7, i + 2)];
    for (let d = 0; d < 2; d++) {
      const a = 2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d], b = -p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d];
      out[d] = .5 * (2 * p1[d] + (p2[d] - p0[d]) * t + a * t * t + b * t * t * t);
      out[d + 2] = .5 * ((p2[d] - p0[d]) + 2 * a * t + 3 * b * t * t);
    }
    const l = Math.hypot(out[2], out[3]) || 1; out[4] = -out[3] / l; out[5] = out[2] / l; return out;
  };

  // sparkles drifting along the light
  const SP = coarse ? 120 : 300;
  const spGeo = new T.BufferGeometry();
  const spPos = new Float32Array(SP * 3), spA = new Float32Array(SP);
  spGeo.setAttribute('position', new T.BufferAttribute(spPos, 3));
  spGeo.setAttribute('a', new T.BufferAttribute(spA, 1));
  const spMat = new T.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, depthTest: false, blending: T.AdditiveBlending,
    vertexShader: 'uniform float uDpr; attribute float a; varying float vA; void main(){ vA=a; gl_PointSize = (1.5 + a * 3.) * uDpr; gl_Position = projectionMatrix * modelViewMatrix * vec4(position.x, -position.y, 0., 1.); }',
    fragmentShader: 'varying float vA; void main(){ float d = length(gl_PointCoord - .5); float k = smoothstep(.5, 0., d) * vA; gl_FragColor = vec4(vec3(.85, 1., .55) * k, k); }'
  });
  const sparkles = new T.Points(spGeo, spMat); sparkles.frustumCulled = false; rScene.add(sparkles);
  const spS = new Float32Array(SP), spV = new Float32Array(SP), spO = new Float32Array(SP);
  for (let i = 0; i < SP; i++) { spS[i] = Math.random(); spV[i] = .006 + Math.random() * .014; spO[i] = (Math.random() - .5) * 2; spA[i] = .2 + Math.random() * .8; }

  // layout position, unaffected by the reveal transforms
  const docRect = el => { let x = 0, y = 0, e = el; while (e) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; } return { l: x, t: y, r: x + el.offsetWidth, b: y + el.offsetHeight }; };

  const TEXT = '.btn-row > *, .hero-foot, .strip .cell, .sample, h1, h2, .lede, blockquote, .hero-tags, .play-hint, .dive, .eyebrow, .email-big, .disclaim, .facts, .proof-links, .back, .toc, .faq-filter, .contact-row';
  const OPAQUE = '#industries, .product, .sheet, .panel, .controls, .brief, .faq details, .founder, .box, .aff, .calc, .stat, .profile-card, .prose, .condition';
  let textRects = [];
  // the words' real extent (a heading's box is often much wider than its text), undoing any reveal transform
  function tightRect(el) {
    const d = docRect(el);
    if (el.matches('.hero h1')) return d;
    const br = el.getBoundingClientRect(); if (!br.width || !br.height) return null;
    const range = document.createRange(); range.selectNodeContents(el);
    const rs = [...range.getClientRects()].filter(q => q.width > 1 && q.height > 1);
    if (!rs.length) return d;
    const sx = el.offsetWidth / br.width, sy = el.offsetHeight / br.height;
    let l = 1e9, t = 1e9, r = -1e9, b = -1e9;
    rs.forEach(q => { l = Math.min(l, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); b = Math.max(b, q.bottom); });
    return { l: d.l + (l - br.left) * sx, t: d.t + (t - br.top) * sy, r: d.l + (r - br.left) * sx, b: d.t + (b - br.top) * sy };
  }
  function collectText() {
    textRects = [...document.querySelectorAll(TEXT)].filter(el => el.offsetParent !== null && !el.closest(OPAQUE))
      .map(tightRect).filter(r => r && r.r - r.l > 8 && r.b - r.t > 8)
      .map(r => ({ l: r.l - 12, t: r.t - 10, r: r.r + 12, b: r.b + 10 }));
    lastRectY = -1e9; uploadRects();
  }
  // the shader holds 40 blocks: send the ones on (or near) the screen
  let lastRectY = -1e9;
  function uploadRects() {
    if (Math.abs(scrollY - lastRectY) < 60) return; lastRectY = scrollY;
    const top = scrollY - 200, bot = scrollY + innerHeight + 200;
    const near = textRects.filter(r => r.b > top && r.t < bot).slice(0, 40);
    near.forEach((r, i) => U.uRects.value[i].set(r.l, r.t, r.r, r.b));
    U.uRectN.value = near.length;
  }
  const inText = (x, y) => textRects.some(r => x > r.l && x < r.r && y > r.t && y < r.b);

  function rebuild() { buildRibbon(); collectText(); }

  /* =====================================================================
     2. Home: the chrome crown and the shapes (perspective scene, scrolls with the hero)
     ===================================================================== */
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(36, 1, 0.1, 200);
  camera.position.set(0, 1, 12);
  const envCanvas = document.createElement('canvas'); envCanvas.width = 1024; envCanvas.height = 512;
  (() => {
    const g = envCanvas.getContext('2d'), W = 1024, H = 512;
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#1a1a1a'); bg.addColorStop(.5, '#0c0c0c'); bg.addColorStop(1, '#020202');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    const soft = (x, y, w, h, c, b) => { g.save(); g.filter = `blur(${b}px)`; g.fillStyle = c; g.fillRect(x, y, w, h); g.restore(); };
    soft(380, 14, 300, 80, '#ffffff', 10); soft(120, 120, 60, 250, '#ffffff', 8); soft(840, 110, 60, 260, '#f2f2f2', 8);
    soft(470, 190, 90, 170, '#c6ff3d', 10); soft(0, 300, W, 30, '#3a3a3a', 14);
  })();
  const envTex = new T.CanvasTexture(envCanvas); envTex.mapping = T.EquirectangularReflectionMapping; envTex.encoding = T.sRGBEncoding;
  const pmrem = new T.PMREMGenerator(renderer);
  scene.environment = pmrem.fromEquirectangular(envTex).texture; envTex.dispose(); pmrem.dispose();
  scene.add(new T.HemisphereLight(0xffffff, 0x111111, .35));
  const key = new T.DirectionalLight(0xffffff, 1.4); key.position.set(4, 10, 6); scene.add(key);
  const limeLight = new T.PointLight(LIME, 3, 22); limeLight.position.set(-3, .5, 4); scene.add(limeLight);

  const chrome = new T.MeshStandardMaterial({ color: 0xf4f4f4, metalness: 1, roughness: .08, envMapIntensity: 1.6 });
  const chromeSoft = new T.MeshStandardMaterial({ color: 0xdedede, metalness: 1, roughness: .26, envMapIntensity: 1.4 });
  const ceramic = new T.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: .32, clearcoat: 1, clearcoatRoughness: .12 });
  const velvet = new T.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 1, metalness: 0, side: T.BackSide, envMapIntensity: .2 });
  const limeGem = new T.MeshPhysicalMaterial({ color: LIME, metalness: .1, roughness: .06, clearcoat: 1, clearcoatRoughness: .04, flatShading: true, emissive: 0x6a9a00, emissiveIntensity: .5 });

  const stage = new T.Group(); scene.add(stage);          // moves up as the page scrolls
  const pivot = new T.Group(), crown = new T.Group(); pivot.add(crown); stage.add(pivot);
  let dissolving = false, dis = 0, lastSY = scrollY, goingDown = scrollY > 6;   // scroll dissolve state for the crown
  const setSee = on => { crown.userData.see = on; crown.traverse(o => { if (o.isMesh || o.isLineSegments) { o.material.transparent = on; if (!on) o.material.opacity = 1; o.material.needsUpdate = true; } }); };
  const crownHits = [], gems = [], tips = [], shapes = [];
  const orb = new T.Mesh(new T.IcosahedronGeometry(.34, 0), limeGem);
  orb.add(new T.LineSegments(new T.EdgesGeometry(orb.geometry), new T.LineBasicMaterial({ color: 0xffffff })));
  if (isHome) {
    const POINTS = 8, R0 = 1.34, R1 = 1.18;
    const band = new T.CylinderGeometry(R0, R1, 1, 192, 14, true);
    const p = band.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i), k = y + .5, a = Math.atan2(p.getZ(i), p.getX(i)); p.setY(i, -.5 + k * (.62 + Math.pow(Math.abs(Math.cos(a * POINTS / 2)), 5) * .78)); }
    band.computeVertexNormals();
    const outer = new T.Mesh(band, chrome); crown.add(outer, new T.Mesh(band, velvet)); crownHits.push(outer);
    const rimLow = new T.Mesh(new T.TorusGeometry(R1 + .01, .075, 20, 160), chrome); rimLow.rotation.x = Math.PI / 2; rimLow.position.y = -.5;
    const rimMid = new T.Mesh(new T.TorusGeometry(1.27, .035, 12, 160), ceramic); rimMid.rotation.x = Math.PI / 2; rimMid.position.y = -.2;
    crown.add(rimLow, rimMid); crownHits.push(rimLow);
    for (let i = 0; i < POINTS; i++) {
      const a = i / POINTS * Math.PI * 2;
      const pearl = new T.Mesh(new T.SphereGeometry(.1, 24, 16), ceramic); pearl.position.set(Math.cos(a) * R0, .97, Math.sin(a) * R0); crown.add(pearl); tips.push(pearl);
      const g = new T.Group(), stone = new T.Mesh(new T.OctahedronGeometry(.17, 0), limeGem.clone()); stone.scale.set(1, 1.25, .55);
      g.add(stone, new T.Mesh(new T.TorusGeometry(.19, .03, 12, 40), chromeSoft));
      g.position.set(Math.cos(a) * 1.3, .05, Math.sin(a) * 1.3); g.lookAt(Math.cos(a) * 5, .05, Math.sin(a) * 5); crown.add(g); gems.push(stone);
      const b = a + Math.PI / POINTS, stud = new T.Mesh(new T.SphereGeometry(.055, 16, 12), chrome); stud.position.set(Math.cos(b) * 1.27, -.2, Math.sin(b) * 1.27); crown.add(stud);
    }
    [].forEach(   // the crown stands alone now (shapes removed)
    ([x, y, z, r, kind]) => {
      const m = kind === 'sphere' ? new T.Mesh(new T.SphereGeometry(1, 48, 32), chrome) : new T.Mesh(new T.BoxGeometry(1.5, 1.5, 1.5), ceramic);
      m.scale.setScalar(r); m.position.set(x, y, z); m.rotation.set(Math.random(), Math.random(), 0);
      m.userData = { home: new T.Vector3(x, y, z), base: new T.Vector3(x, y, z), r, push: new T.Vector3(), phase: Math.random() * 6, gone: 0, s: 1, spin: kind === 'cube' ? .3 : .05 };
      stage.add(m); shapes.push(m);
    });
  }

  // sparks for crown / shatter bursts
  const MAXP = 380, pGeo = new T.BufferGeometry();
  const pPos = new Float32Array(MAXP * 3), pLife = new Float32Array(MAXP), pCol = new Float32Array(MAXP * 3), pVel = new Float32Array(MAXP * 3);
  pGeo.setAttribute('position', new T.BufferAttribute(pPos, 3)); pGeo.setAttribute('life', new T.BufferAttribute(pLife, 1)); pGeo.setAttribute('col', new T.BufferAttribute(pCol, 3));
  const sparks = new T.Points(pGeo, new T.ShaderMaterial({
    transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: { px: { value: DPR } },
    vertexShader: 'attribute float life; attribute vec3 col; varying float l; varying vec3 c; uniform float px; void main(){ l=life; c=col; vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=px*life*90./-mv.z; gl_Position=projectionMatrix*mv; }',
    fragmentShader: 'varying float l; varying vec3 c; void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,0.,d)*l; gl_FragColor=vec4(c*a*1.6,a); }'
  }));
  sparks.frustumCulled = false; stage.add(sparks);
  let pNext = 0;
  const burst = (at, n, color, speed) => {
    stage.worldToLocal(at); const c = new T.Color(color);
    for (let i = 0; i < n; i++) {
      const j = pNext; pNext = (pNext + 1) % MAXP;
      pPos[j * 3] = at.x; pPos[j * 3 + 1] = at.y; pPos[j * 3 + 2] = at.z;
      const th = Math.random() * 6.283, ph = Math.acos(2 * Math.random() - 1), s = speed * (.4 + Math.random() * .8);
      pVel[j * 3] = Math.sin(ph) * Math.cos(th) * s; pVel[j * 3 + 1] = Math.cos(ph) * s + speed * .5; pVel[j * 3 + 2] = Math.sin(ph) * Math.sin(th) * s;
      pLife[j] = 1; pCol[j * 3] = c.r; pCol[j * 3 + 1] = c.g; pCol[j * 3 + 2] = c.b;
    }
  };


  /* =====================================================================
     2b. Drifters: small chrome spheres, white cubes, lime gems and chrome rings in the margins of every page.
         Placed in page coordinates at different depths, so they drift past at different speeds as you scroll.
     ===================================================================== */
  const dScene = new T.Scene();
  dScene.environment = scene.environment;
  dScene.add(new T.HemisphereLight(0xffffff, 0x111111, .35));
  const dKey = new T.DirectionalLight(0xffffff, 1.2); dKey.position.set(4, 10, 8); dScene.add(dKey);
  const dLime = new T.PointLight(LIME, 2, 30); dScene.add(dLime);
  const dCam = new T.PerspectiveCamera(36, 1, .1, 200);
  const dGeos = [new T.SphereGeometry(1, 40, 28), new T.BoxGeometry(1.45, 1.45, 1.45), new T.IcosahedronGeometry(1.1, 0), new T.TorusGeometry(.85, .3, 20, 64)];
  const dMats = [chrome, ceramic, limeGem, chromeSoft];
  const drifters = [];
  const dRay = new T.Raycaster();
  const hitGeo = new T.SphereGeometry(1.25, 12, 8), hitMat = new T.MeshBasicMaterial({ visible: false });
  // a small spark pool of their own
  const dsGeo = new T.BufferGeometry(), DS = 300;
  const dsP = new Float32Array(DS * 3), dsL = new Float32Array(DS), dsC = new Float32Array(DS * 3), dsV = new Float32Array(DS * 3);
  dsGeo.setAttribute('position', new T.BufferAttribute(dsP, 3)); dsGeo.setAttribute('life', new T.BufferAttribute(dsL, 1)); dsGeo.setAttribute('col', new T.BufferAttribute(dsC, 3));
  const dSparks = new T.Points(dsGeo, sparks.material); dSparks.frustumCulled = false; dScene.add(dSparks);
  let dsN = 0;
  const dBurst = (at, n, color, speed) => {
    const c = new T.Color(color);
    for (let i = 0; i < n; i++) {
      const j = dsN; dsN = (dsN + 1) % DS;
      dsP[j * 3] = at.x; dsP[j * 3 + 1] = at.y; dsP[j * 3 + 2] = at.z;
      const th = Math.random() * 6.283, ph = Math.acos(2 * Math.random() - 1), sp = speed * (.4 + Math.random() * .8);
      dsV[j * 3] = Math.sin(ph) * Math.cos(th) * sp; dsV[j * 3 + 1] = Math.cos(ph) * sp + speed * .4; dsV[j * 3 + 2] = Math.sin(ph) * Math.sin(th) * sp;
      dsL[j] = 1; dsC[j * 3] = c.r; dsC[j * 3 + 1] = c.g; dsC[j * 3 + 2] = c.b;
    }
  };
  const seeded = (i, k) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
  function placeDrifters() {
    const W = innerWidth, VH = innerHeight, H = document.documentElement.scrollHeight, phone = small();
    const u12 = 2 * Math.tan(T.MathUtils.degToRad(18)) * 12 / VH;
    const startY = isHome ? heroBottom() + 40 : VH * .3, span = Math.max(0, H - startY - VH * .25);
    const count = 0;   // side shapes removed
    while (drifters.length < count) {
      const k = drifters.length % 4, m = new T.Mesh(dGeos[k], dMats[k]);
      const hit = new T.Mesh(hitGeo, hitMat); m.add(hit);   // a slightly larger invisible click area
      m.userData = { push: new T.Vector3(), gone: 0, s: 1, hit }; dScene.add(m); drifters.push(m);
    }
    drifters.forEach((m, i) => {
      const u = m.userData; u.off = i >= count; m.visible = !u.off; if (u.off) return;
      const side = i % 2, z = -1 - seeded(i, 1) * 7, D = 12 - z;
      const rpx = phone ? 8 + seeded(i, 2) * 8 : 12 + seeded(i, 2) * 18;
      const ay = startY + (i + .2 + seeded(i, 3) * .6) / count * span;
      let ax;
      if (W >= 1100) { const g = Math.max(46, (W - 1200) / 2 + 12); ax = side ? W - g * (.3 + seeded(i, 4) * .55) : g * (.3 + seeded(i, 4) * .55); }
      else ax = side ? W * (.9 + seeded(i, 4) * .1) : W * (seeded(i, 4) * .1);
      // keep clear of text: slide toward the edge if it would sit behind words
      if (textRects.some(r => ax + rpx > r.l && ax - rpx < r.r && ay + rpx > r.t && ay - rpx < r.b)) ax = side ? W - rpx * .35 : rpx * .35;
      Object.assign(u, { ay, D, z, r: rpx * u12 * D / 12, phase: seeded(i, 5) * 6, spin: .12 + seeded(i, 6) * .3,
        home: new T.Vector3((ax - W / 2) * u12 * D / 12, -(ay - VH / 2) * u12, z) });
      m.position.copy(u.home); m.rotation.set(seeded(i, 7) * 3, seeded(i, 8) * 3, 0);
    });
  }
  const hitDrifter = () => {
    if (px < 0) return null;
    ndc.set(px / innerWidth * 2 - 1, -(py / innerHeight) * 2 + 1); dRay.setFromCamera(ndc, dCam);
    const h = dRay.intersectObjects(drifters.filter(m => m.visible && !m.userData.gone).map(m => m.userData.hit), false)[0]; return h ? h.object.parent : null;
  };
  const shatterDrifter = m => {
    const u = m.userData; if (u.gone) return;
    u.gone = 1; dBurst(m.position.clone(), 40, LIME, .04 + u.r * .06); dBurst(m.position.clone(), 16, 0xffffff, .035);
    setTimeout(() => { u.gone = 0; u.s = 0; m.position.copy(u.home); }, 2000);
  };

  /* =====================================================================
     3. Layout, input, loop
     ===================================================================== */

  /* hero shapes: placed in open space on every layout, never behind the headline, copy, buttons, tags or the crown */
  const HERO_TEXT = '.hero h1, .hero .lede, .hero .btn-row > *, .hero-tags, .play-hint, .dive';
  const offRect = el => { let x = 0, y = 0, e = el; while (e) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; } return { l: x, t: y, r: x + el.offsetWidth, b: y + el.offsetHeight }; };
  const heroBottom = () => { const h = document.querySelector('.hero'); return h ? offRect(h).b : innerHeight; };
  function placeHeroShapes(items, minY = -Infinity) {
    if (!isHome || !items.length) return;
    const W = innerWidth, H = innerHeight, HB = heroBottom();
    camera.position.set(0, 1, 12); camera.lookAt(0, .25, 0); camera.updateMatrixWorld();   // the pose at the top of the page
    const toScreen = v => { const p = v.clone().project(camera); return { x: (p.x + 1) / 2 * W, y: (1 - p.y) / 2 * H }; };
    const toWorld = (sx, sy, z) => {
      const d = new T.Vector3(sx / W * 2 - 1, -(sy / H * 2 - 1), .5).unproject(camera).sub(camera.position).normalize();
      return camera.position.clone().addScaledVector(d, (z - camera.position.z) / d.z);
    };
    const pad = 28;
    const blocks = [...document.querySelectorAll(HERO_TEXT)].filter(e => e.offsetParent).map(offRect)
      .map(r => ({ l: r.l - pad, t: r.t - pad, r: r.r + pad, b: r.b + pad }));
    const dock = document.querySelector('.dock');   // the floating section dock is fixed, so its screen box is its spot at the top of the page
    if (dock) { const r = dock.getBoundingClientRect(); blocks.push({ l: r.left - pad, t: r.top - pad, r: r.right + pad, b: r.bottom + pad }); }
    const k = pivot.scale.x, cc = toScreen(pivot.position.clone().add(new T.Vector3(0, .35 * k, 0)));
    const ce = toScreen(pivot.position.clone().add(new T.Vector3(1.8 * k, .35 * k, 0)));
    const crownR = Math.hypot(ce.x - cc.x, ce.y - cc.y) + 26;
    const placed = [], stepX = Math.max(20, W / 30), stepY = Math.max(20, H / 28);
    items.slice().sort((a, b) => (b.userData.r0 || b.userData.r) - (a.userData.r0 || a.userData.r)).forEach(o => {
      const u = o.userData, pref = toScreen(u.base);
      u.r0 = u.r0 || u.r;
      const bob = toScreen(u.base.clone().add(new T.Vector3(0, .3, 0)));
      let best = null, rpUsed = 0, fitUsed = 1;
      // try full size first; if there is no open spot, try a smaller version before leaving it out
      for (const fit of [1, .75, .55]) {
        const r = u.r0 * fit, edge = toScreen(u.base.clone().add(new T.Vector3(r, 0, 0)));
        const rp = Math.hypot(edge.x - pref.x, edge.y - pref.y) * 1.15 + Math.abs(bob.y - pref.y) + 10;   // its size, how far it bobs, and a margin
        let bestD = Infinity;
        for (let y = 96 + rp; y <= HB - rp - 24; y += stepY) for (let x = rp * .5; x <= W - rp * .5; x += stepX) {
          if (blocks.some(q => x + rp > q.l && x - rp < q.r && y + rp > q.t && y - rp < q.b)) continue;
          if (Math.hypot(x - cc.x, y - cc.y) < crownR + rp) continue;
          if (placed.some(p => Math.hypot(x - p.x, y - p.y) < p.r + rp + 34)) continue;
          const d = (x - pref.x) ** 2 + (y - pref.y) ** 2;
          if (d >= bestD) continue;
          if (minY > -Infinity && toWorld(x, y, u.base.z).y - r * .45 < minY) continue;   // floats on or above the water, never sunk
          bestD = d; best = { x, y };
        }
        if (best) { rpUsed = rp; fitUsed = fit; break; }
      }
      u.hidden = !best;
      if (!best) return;
      u.r = u.r0 * fitUsed;
      placed.push({ x: best.x, y: best.y, r: rpUsed });
      u.home.copy(toWorld(best.x, best.y, u.base.z));
      if (!u.placed) { o.position.copy(u.home); u.cur = u.home.clone(); u.placed = true; }
    });
  }

  let unitsPerPx = 1;
  const layout = () => {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    dCam.aspect = w / h; dCam.updateProjectionMatrix();
    unitsPerPx = 2 * Math.tan(T.MathUtils.degToRad(18)) * 12 / h;   // world units per CSS px at the crown's depth
    rCam.left = 0; rCam.right = w; rCam.updateProjectionMatrix();
    U.uSpread.value = small() ? 70 : 230; U.uDimIn.value = small() ? .06 : .22;
    if (small()) { pivot.position.set(.3, 2.35, -1.5); pivot.userData.base = .7; } else { pivot.position.set(2.7, .55, 0); pivot.userData.base = 1; }
    pivot.scale.setScalar(pivot.userData.base);
    placeHeroShapes(shapes);
    rebuild();
    placeDrifters();
  };
  let pending = 0;
  const relayout = () => { clearTimeout(pending); pending = setTimeout(layout, 120); };
  addEventListener('resize', relayout);
  if ('ResizeObserver' in window) new ResizeObserver(relayout).observe(document.body);
  document.fonts && document.fonts.ready.then(relayout);
  layout();
  setTimeout(relayout, 3200);   // once the entrance animations have settled

  const interactive = el => !el || (el.closest && el.closest('a,button,input,select,textarea,label,summary,p,h1,h2,h3,h4,li,blockquote,.chip,.product,.panel,.sheet,.founder,.stat,.box,.calc,.monitor,.browser,.controls,.brief,.faq,.aff,.prose,.cell,.marquee,nav,.dock,.hero-tags'));
  const setRay = () => { ndc.set(px / innerWidth * 2 - 1, -(py / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); };
  const heroOn = () => isHome && scrollY < Math.max(innerHeight * 1.3, heroBottom());
  const hitCrown = () => { if (!heroOn() || px < 0) return null; setRay(); return ray.intersectObjects(crownHits, true)[0] || null; };
  const hitShape = () => { if (!heroOn() || px < 0) return null; setRay(); const h = ray.intersectObjects(shapes.filter(s => !s.userData.gone && !s.userData.hidden), false)[0]; return h ? h.object : null; };

  let spin = 0, spinVel = .25, jump = 0, jumpVel = 0, glow = 0, hoverScale = 1, dragging = false, dragMoved = 0, lastX = 0;
  addEventListener('pointermove', e => {
    mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; px = e.clientX; py = e.clientY; overUI = !!interactive(e.target);
    if (dragging) { const dx = e.clientX - lastX; lastX = e.clientX; dragMoved += Math.abs(dx); spinVel = dx * .012; spin += dx * .012; }
  }, { passive: true });
  addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || interactive(e.target)) return;
    px = e.clientX; py = e.clientY;
    if (hitCrown()) { dragging = true; dragMoved = 0; lastX = e.clientX; root.classList.add('grabbing'); }
  });
  addEventListener('pointerup', () => { if (dragging) { dragging = false; root.classList.remove('grabbing'); } });
  addEventListener('click', e => {
    if (interactive(e.target)) return;
    px = e.clientX; py = e.clientY;
    if (dragMoved > 6) { dragMoved = 0; return; }
    const dd = hitDrifter(); if (dd) return shatterDrifter(dd);
    if (!isHome) return;
    const s = hitShape();
    if (s) {
      const u = s.userData; if (u.gone) return;
      u.gone = 1; burst(s.getWorldPosition(new T.Vector3()), 50, LIME, .05 + u.r * .05); burst(s.getWorldPosition(new T.Vector3()), 24, 0xffffff, .04);
      setTimeout(() => { u.gone = 0; u.s = 0; s.position.copy(u.home); if (u.cur) u.cur.copy(u.home); }, 2000);
      return;
    }
    if (hitCrown()) {
      spinVel += .32; jumpVel = .11; glow = 1;
      tips.forEach(t => burst(t.getWorldPosition(new T.Vector3()), 10, LIME, .05));
      burst(crown.getWorldPosition(new T.Vector3()).add(new T.Vector3(0, .8, 0)), 40, 0xffffff, .06);
    }
  });

  const clock = new T.Clock();
  let running = true, lastScroll = scrollY;
  // The ribbon runs on its own clock. It only ever counts forward, so every pattern always travels down the line;
  // scrolling (either way) just makes it count 50% faster, easing in and out.
  let flowT = 0, flowSpeed = 1, lastMove = -1e9;
  addEventListener('scroll', () => { lastMove = performance.now(); }, { passive: true });
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running && !reduce) { clock.getDelta(); requestAnimationFrame(frame); } });
  const SV = [0, 0, 0, 0, 0, 0];
  const v3 = new T.Vector3(), tmp = new T.Vector3(), smp = { x: 0, y: 0, nx: 0, ny: 0, set(a, b) { this.x = a; this.y = b; return this; } };

  function frame() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), .05), t = reduce ? 0 : clock.elapsedTime;
    cx += (mx - cx) * .06; cy += (my - cy) * .06;
    lastScroll = scrollY;
    const scrolling = performance.now() - lastMove < 220;                   // any scroll in the last moment, up or down
    flowSpeed += ((scrolling ? 2.25 : 1) - flowSpeed) * (1 - Math.exp(-dt * 5));   // eases in and out (~0.5s), same on any frame rate
    if (!reduce) flowT += dt * flowSpeed;

    // ribbon: camera follows the page; dots drift a little slower for depth
    rCam.top = -scrollY; rCam.bottom = -scrollY - innerHeight; rCam.updateProjectionMatrix();
    U.uTime.value = flowT;
    if (px >= 0) U.uMouse.value.set(px, py + scrollY);
    root.style.setProperty('--dot-y', (-scrollY * .25).toFixed(1) + 'px');
    morph(t); uploadRects();
    for (let i = 0; i < SP; i++) {
      spS[i] += dt * spV[i] * flowSpeed; if (spS[i] > 1) spS[i] -= 1;   // always forward, down the line
      spl(spS[i], SV);
      const w = Math.sin(flowT * .4 + i) * U.uSpread.value * cur.k * .8 * spO[i];
      spPos[i * 3] = SV[0] + SV[4] * w; spPos[i * 3 + 1] = SV[1] + SV[5] * w;
      spA[i] = (.3 + .7 * Math.abs(Math.sin(t * 1.7 + i * 1.3))) * Math.min(1, spS[i] * 20, (1 - spS[i]) * 20) * (inText(spPos[i * 3], spPos[i * 3 + 1]) ? .08 : 1);
    }
    spGeo.attributes.position.needsUpdate = true; spGeo.attributes.a.needsUpdate = true;

    // crown + shapes ride up with the hero
    let overS = false;
    const showStage = heroOn();
    stage.visible = showStage;
    if (showStage) {
      stage.position.y = scrollY * unitsPerPx;
      camera.position.set(cx * .9, 1 - cy * .35, 12); camera.lookAt(cx * .3, .25, 0);
      if (!dragging) { spinVel *= .965; spinVel += (.006 - spinVel) * .02; spin += spinVel * (reduce ? 0 : 1); }
      crown.rotation.y = spin + scrollY * .0045;   // spins as you scroll
      const hov = !dragging && !coarse && hitCrown();
      hoverScale += ((hov || dragging ? 1.06 : 1) - hoverScale) * .12;
      pivot.rotation.y += ((cx * .9) - pivot.rotation.y) * .07; pivot.rotation.x += ((.28 + cy * .4) - pivot.rotation.x) * .07; pivot.rotation.z = Math.sin(t * .6) * .04;
      jumpVel -= .006; jump += jumpVel; if (jump < 0) { jump = 0; jumpVel = Math.abs(jumpVel) > .02 ? -jumpVel * .35 : 0; }
      crown.position.y = Math.sin(t * 1.1) * .08 + jump; crown.scale.setScalar(hoverScale);
      // the moment the page scrolls down, the crown dissolves into lime sparks; scrolling back up re-forms it
      const dY = scrollY - lastSY; lastSY = scrollY;
      if (dY > .5) goingDown = true; else if (dY < -.5) goingDown = false;
      const wantGone = scrollY > 6 && goingDown ? 1 : 0;      // scrolling down: dissolve. scrolling back up: it re-forms
      if (wantGone && !dissolving) {
        dissolving = true;
        if (!crown.userData.own) { crown.userData.own = true; crown.traverse(o => { if (o.isMesh || o.isLineSegments) o.material = o.material.clone(); }); }
        setSee(true);
        if (!reduce) { tips.forEach(tp => burst(tp.getWorldPosition(new T.Vector3()), 14, LIME, .06));
          burst(crown.getWorldPosition(new T.Vector3()), 70, LIME, .07); burst(crown.getWorldPosition(new T.Vector3()).add(new T.Vector3(0, .5, 0)), 30, 0xffffff, .05); }
      } else if (!wantGone && dissolving) dissolving = false;
      dis += ((dissolving ? 1 : 0) - dis) * (reduce ? 1 : Math.min(1, dt * (dissolving ? 7 : 3)));
      const keep = 1 - dis;
      if (crown.userData.own) crown.traverse(o => { if (o.isMesh || o.isLineSegments) o.material.opacity = keep; });
      if (!dissolving && dis < .003 && crown.userData.see) setSee(false);   // fully back: solid again
      pivot.scale.setScalar(Math.max(.0001, (pivot.userData.base || 1) * (1 + dis * .25))); pivot.visible = keep > .01;
      orb.position.y = 1.55 + Math.sin(t * 1.6) * .1 + jump * 1.4; orb.rotation.y += dt * (.8 + spinVel * 8); orb.rotation.x += dt * .3;
      glow *= .96; gems.forEach((g, i) => { g.material.emissiveIntensity = .5 + glow * 3 + Math.max(0, Math.sin(t * 2 + i)) * .3; });
      root.classList.toggle('over-crown', !!hov);
      const hs = coarse || overUI ? null : hitShape(); overS = !!hs && !hov;
      if (px >= 0) setRay();
      shapes.forEach(s => {
        const u = s.userData;
        u.s += ((u.gone || u.hidden ? 0 : 1) - u.s) * (u.gone ? .5 : .05); s.scale.setScalar(Math.max(.0001, u.r * u.s)); s.visible = u.s > .01;
        const target = tmp.copy(u.home); target.y += Math.sin(t * .8 + u.phase) * .25;
        if (px >= 0 && !coarse) {
          const wp = s.getWorldPosition(new T.Vector3());
          ray.ray.closestPointToPoint(wp, v3);
          const d = v3.distanceTo(wp), reach = u.r * 2.8;
          if (d < reach) u.push.add(wp.sub(v3).normalize().multiplyScalar((1 - d / reach) * .08));
        }
        u.push.multiplyScalar(.92); target.add(u.push.clone().multiplyScalar(6));
        // eased toward its spot, then locked to the page: nearer and farther shapes scroll exactly with the text
        u.cur = u.cur || s.position.clone(); u.cur.lerp(target, .05);
        s.position.copy(u.cur); s.position.y += scrollY * unitsPerPx * (-u.home.z / 12);
        s.rotation.x += dt * u.spin; s.rotation.y += dt * u.spin * 1.3;
      });
      limeLight.position.set(-3 + Math.sin(t * .5) * 2, .5 + stage.position.y, 4);
    } else root.classList.remove('over-crown');
    for (let j = 0; j < MAXP; j++) {
      if (pLife[j] <= 0) continue;
      pLife[j] = Math.max(0, pLife[j] - dt * .9); pVel[j * 3 + 1] -= dt * .06;
      pPos[j * 3] += pVel[j * 3]; pPos[j * 3 + 1] += pVel[j * 3 + 1]; pPos[j * 3 + 2] += pVel[j * 3 + 2];
      pVel[j * 3] *= .96; pVel[j * 3 + 2] *= .96;
    }
    pGeo.attributes.position.needsUpdate = true; pGeo.attributes.life.needsUpdate = true;

    // drifters: the camera follows the page; each shape bobs, spins, dodges the cursor and can be shattered
    const VH = innerHeight, u12 = unitsPerPx;
    dCam.position.set(cx * .6, -scrollY * u12, 12); dCam.lookAt(cx * .2, -scrollY * u12, 0);
    dLime.position.set(-4, -scrollY * u12 + 2, 6);
    const dh = coarse || overUI ? null : hitDrifter();
    root.classList.toggle('over-bubble', overS || !!dh);
    if (px >= 0) { ndc.set(px / innerWidth * 2 - 1, -(py / innerHeight) * 2 + 1); dRay.setFromCamera(ndc, dCam); }
    drifters.forEach(m => {
      const u = m.userData; if (u.off) return;
      const sy = VH / 2 + (u.ay - VH / 2 - scrollY) * 12 / u.D;
      if (sy < -160 || sy > VH + 160) { m.visible = false; return; }
      u.s += ((u.gone ? 0 : 1) - u.s) * (u.gone ? .5 : .05); m.scale.setScalar(Math.max(.0001, u.r * u.s)); m.visible = u.s > .01;
      const target = tmp.copy(u.home); target.y += Math.sin(t * .6 + u.phase) * u.r * .7; target.x += Math.cos(t * .4 + u.phase) * u.r * .4;
      if (px >= 0 && !coarse) {
        dRay.ray.closestPointToPoint(m.position, v3);
        const d = v3.distanceTo(m.position), reach = u.r * 3.2;
        if (d < reach && d > u.r * .9)   // leans away as the cursor approaches, holds still once it is on it
          u.push.add(m.position.clone().sub(v3).normalize().multiplyScalar((1 - d / reach) * u.r * .013));
      }
      u.push.multiplyScalar(.92); target.addScaledVector(u.push, 6);
      m.position.lerp(target, .06); m.rotation.x += dt * u.spin; m.rotation.y += dt * u.spin * 1.4;
    });
    for (let j = 0; j < DS; j++) {
      if (dsL[j] <= 0) continue;
      dsL[j] = Math.max(0, dsL[j] - dt * .9); dsV[j * 3 + 1] -= dt * .05;
      dsP[j * 3] += dsV[j * 3]; dsP[j * 3 + 1] += dsV[j * 3 + 1]; dsP[j * 3 + 2] += dsV[j * 3 + 2];
      dsV[j * 3] *= .96; dsV[j * 3 + 2] *= .96;
    }
    dsGeo.attributes.position.needsUpdate = true; dsGeo.attributes.life.needsUpdate = true;

    // draw: ribbon first (behind), then the drifters, then the crown on top
    renderer.setRenderTarget(null); renderer.clear();
    if (!founderPage) renderer.render(rScene, rCam);   // founder pages use the interactive dot field instead
    renderer.clearDepth(); renderer.render(dScene, dCam);
    if (showStage) { renderer.clearDepth(); renderer.render(scene, camera); }
    if (!reduce) requestAnimationFrame(frame);
  }
  if (reduce) {
    const still = () => { running = true; frame(); };
    addEventListener('scroll', still, { passive: true }); addEventListener('resize', () => setTimeout(still, 200));
  }
  requestAnimationFrame(frame);
})();
