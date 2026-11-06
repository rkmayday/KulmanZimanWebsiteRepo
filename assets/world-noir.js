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

  const LIME = 0xc6ff3d;   // the accent (lime)

  /* =====================================================================
     1. The ribbon (orthographic, in page pixels; the camera scrolls with the page)
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
  // shared vertex logic: centerline + normal → twisted, breathing, cursor-repelled strand position
  const strandVS = MASK + `
    uniform float uTime, uFlow, uSpread, uKnot, uLen, uPush;
    uniform vec2 uMouse;
    attribute vec2 nrm; attribute float s; attribute float r; attribute float ph;
    varying float vS, vDepth, vR, vPh, vM;
    vec2 strandPos(vec2 base){
      float pinch = smoothstep(0., 520., abs(s - uKnot));
      float ends = smoothstep(0., 400., s) * smoothstep(0., 400., uLen - s);
      float breathe = .65 + .35 * sin(s * .0011 - uTime * .1 + ph * .3);
      float spread = mix(5., uSpread, pinch) * breathe * (.35 + .65 * ends);
      float tw = s * .0042 - uTime * .16 + ph;
      float c = cos(tw), w = sin(s * .0023 - uTime * .15 + ph * 2.) * .18;
      vDepth = sin(tw);
      vec2 p = base + nrm * spread * (r * c + w);
      vec2 d = p - uMouse; float dd = dot(d, d);
      p += normalize(d + 1e-4) * 55. * exp(-dd / 26000.) * uPush;
      return p;
    }`;
  const lineMat = new T.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, depthTest: false, blending: T.AdditiveBlending,
    vertexShader: strandVS + `
      attribute float side; varying float vSide;
      void main(){ vec2 p = strandPos(position.xy); vS = s; vR = r; vPh = ph; vM = textMask(p); vSide = side;
        float clear = smoothstep(.28, 1., vM);                       // 0 behind text, 1 in the open
        float w = (2.4 + 2.2 * fract(ph * 3.7)) * mix(4.2, 1., clear);  // bold strands, much wider (blurred) behind text
        p += nrm * side * w;
        p.y = -p.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 0., 1.); }`,
    fragmentShader: `
      uniform float uTime, uFlow, uLen;
      varying float vS, vDepth, vR, vPh, vM, vSide;
      void main(){
        float clear = smoothstep(.28, 1., vM);
        float soft = mix(.0, .7, clear);                              // crisp core in the open, all soft edge behind text
        float prof = 1. - smoothstep(soft, 1., abs(vSide));
        float front = .35 + .65 * (vDepth * .5 + .5);
        float pulse = smoothstep(.82, 1., fract(vS * .00042 - uTime * .028 + vPh * 3.17)) * .6;
        float ends = smoothstep(0., 300., vS) * smoothstep(0., 300., uLen - vS);
        vec3 col = vec3(.78, 1., .24);                                 // lime only
        float dim = mix(.22, 1., clear);                              // darker behind text so the words stand out
        float a = (.3 + .3 * pulse) * front * ends * prof * dim;
        gl_FragColor = vec4(col * a + vec3(.9, 1., .7) * pulse * .25 * front * ends * prof * dim, a);
      }`
  });
  const glowMat = new T.ShaderMaterial({
    uniforms: Object.assign({ uW: { value: 30 }, uA: { value: .2 } }, U), transparent: true, depthWrite: false, depthTest: false, blending: T.AdditiveBlending,
    vertexShader: MASK + `
      uniform float uTime, uSpread, uKnot, uLen, uW;
      attribute vec2 nrm; attribute float s; attribute float side;
      varying float vSide, vS, vM;
      void main(){
        float pinch = smoothstep(0., 520., abs(s - uKnot));
        float w = mix(uW * .45, uW, pinch) * (.8 + .2 * sin(s * .002 - uTime * .35));
        vec2 p = position.xy + nrm * (side * w + sin(s * .0023 - uTime * .15) * uSpread * .12);
        vSide = side; vS = s; vM = textMask(position.xy); p.y = -p.y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 0., 1.);
      }`,
    fragmentShader: `
      uniform float uA, uTime, uLen, uKnot;
      varying float vSide, vS, vM;
      void main(){
        float ends = smoothstep(0., 300., vS) * smoothstep(0., 300., uLen - vS);
        float knot = 1. + 2.6 * exp(-pow((vS - uKnot) / 300., 2.));
        float a = exp(-vSide * vSide * 3.2) * uA * ends * knot * (.85 + .15 * sin(vS * .01 - uTime * 1.));
        vec3 col = mix(vec3(.78, 1., .24), vec3(.95, 1., .8), exp(-vSide * vSide * 18.) * .6);
        a *= vM;
        gl_FragColor = vec4(col * a, a);
      }`
  });
  const ribbon = new T.Group(); rScene.add(ribbon);
  const glowBands = [[8, .9], [26, .4], [70, .16], [190, .06]].map(([w, a]) => { const m = glowMat.clone(); m.uniforms = Object.assign({}, U, { uW: { value: w }, uA: { value: a } }); return m; });

  // sparkles drifting along the ribbon
  const SP = coarse ? 120 : 320;
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
  for (let i = 0; i < SP; i++) { spS[i] = Math.random(); spV[i] = 18 + Math.random() * 40; spO[i] = (Math.random() - .5) * 2; spA[i] = .2 + Math.random() * .8; }

  // path samples (page px) for sparkles
  let path = { pts: null, nrm: null, len: 1, step: 10, knot: 0 };

  /* ---------- build the path from where the boxes actually are ---------- */
  const SELECT = '#industries > .wrap, .hero-copy, .strip .wrap, .section-head, .product, .flip, .steps, .condition, .panel-stage, .play, .proof-grid, .aff, .cta-grid, .founders, .page-head .wrap, .profile, .two-col, .stats4, .calc, .faq, .prose, .narrow, .timeline';
  // layout position, unaffected by the reveal transforms
  const docRect = el => { let x = 0, y = 0, e = el; while (e) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; } return { l: x, t: y, r: x + el.offsetWidth, b: y + el.offsetHeight }; };
  function anchorsFor() {
    const W = innerWidth, VH = innerHeight;
    const els = [...document.querySelectorAll(SELECT)].filter(el => el.offsetParent !== null && !el.closest('[hidden]'));
    const top = els.filter(el => !els.some(o => o !== el && o.contains(el)));
    const boxes = top.map(docRect).filter(b => b.b - b.t > 40).sort((a, b) => a.t - b.t);
    // merge boxes that share a row
    const rows = [];
    boxes.forEach(b => { const last = rows[rows.length - 1]; if (last && b.t < last.b + 70) { last.l = Math.min(last.l, b.l); last.r = Math.max(last.r, b.r); last.b = Math.max(last.b, b.b); } else rows.push({ ...b }); });
    const pts = [];
    let knotIdx = 0;
    if (isHome) {
      // hero: enter from the left, pinch into a knot beside the headline, loop around the crown
      if (small()) {
        // phones: swirl around the crown at the top, then run down the right edge, clear of the text
        pts.push([-160, VH * .16], [W * .22, VH * .13]);
        knotIdx = pts.length; pts.push([W * .55, VH * .115]);
        pts.push([W * .9, VH * .16], [W * 1.02, VH * .3], [W * .98, VH * .6], [W * .96, heroBottom() * .97]);
      } else {
        pts.push([-160, VH * 1.02], [W * .3, VH * .97]);
        knotIdx = pts.length; pts.push([W * .63, VH * .8]);
        pts.push([W * .67, VH * .26], [W * .93, VH * .3], [W * .99, VH * .62], [W * .92, heroBottom() * .97]);
      }
    } else {
      pts.push([-160, 160]); knotIdx = pts.length; pts.push([W * .38, 250]); pts.push([W * .85, 120], [W * 1.02, 420]);
    }
    let side = 0; // 0 = left edge, 1 = right edge
    rows.forEach((row, k) => {
      if (isHome && row.b < heroBottom() * .95) return;           // hero rows are covered by the swoop
      if (!isHome && k === 0 && row.b < 520) return;
      const h = row.b - row.t, gutter = Math.max(18, Math.min(110, row.l * .55));
      const outX = side ? Math.min(W - 10, row.r + gutter) : Math.max(10, row.l - gutter);
      pts.push([outX, row.t + h * .12]);
      if (h > 320) pts.push([outX, row.t + h * .5]);    // run alongside the card, grazing its edge
      pts.push([outX, row.b - h * .1]);
      side ^= 1;
    });
    const last = pts[pts.length - 1];
    pts.push([side ? W + 160 : -160, last[1] + 260]);
    return { pts, knotIdx };
  }

  const TEXT = 'h1, h2, .lede, blockquote, .hero-tags, .play-hint, .dive, .eyebrow, .email-big, .disclaim, .facts, .proof-links, .back, .toc, .faq-filter, .contact-row';
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
      .map(tightRect).filter(r => r && r.r - r.l > 8 && r.b - r.t > 8).slice(0, 40)
      .map(r => ({ l: r.l - 12, t: r.t - 10, r: r.r + 12, b: r.b + 10 }));
    textRects.forEach((r, i) => U.uRects.value[i].set(r.l, r.t, r.r, r.b));
    U.uRectN.value = textRects.length;
  }
  const inText = (x, y) => textRects.some(r => x > r.l && x < r.r && y > r.t && y < r.b);

  function rebuild() {
    const { pts, knotIdx } = anchorsFor();
    const curve = new T.CatmullRomCurve3(pts.map(([x, y]) => new T.Vector3(x, y, 0)), false, 'centripetal', .5);
    const len = curve.getLength();
    const N = Math.max(60, Math.floor(len / 9));
    const P = curve.getSpacedPoints(N);
    // arc length of the knot point
    let knotS = 0, best = 1e9;
    P.forEach((p, i) => { const d = (p.x - pts[knotIdx][0]) ** 2 + (p.y - pts[knotIdx][1]) ** 2; if (d < best) { best = d; knotS = i / N * len; } });
    const base = new Float32Array((N + 1) * 2), nrm = new Float32Array((N + 1) * 2), sArr = new Float32Array(N + 1);
    for (let i = 0; i <= N; i++) {
      const a = P[Math.max(0, i - 1)], b = P[Math.min(N, i + 1)];
      let tx = b.x - a.x, ty = b.y - a.y; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
      base[i * 2] = P[i].x; base[i * 2 + 1] = P[i].y; nrm[i * 2] = -ty; nrm[i * 2 + 1] = tx; sArr[i] = i / N * len;
    }
    path = { pts: base, nrm, len, N, knot: knotS };
    collectText();
    U.uKnot.value = knotS; U.uLen.value = len;

    ribbon.children.slice().forEach(c => { c.geometry.dispose(); ribbon.remove(c); });
    // filaments: one LineSegments geometry holding every strand
    const STR = coarse || small() ? 22 : 46, V = (N + 1) * 2 * STR;
    const pos = new Float32Array(V * 3), n2 = new Float32Array(V * 2), s1 = new Float32Array(V), rr = new Float32Array(V), pp = new Float32Array(V), sd = new Float32Array(V);
    const idx = new Uint32Array(N * 6 * STR);
    let k = 0;
    for (let j = 0; j < STR; j++) {
      const r = (Math.random() * 2 - 1) * (Math.random() < .3 ? 1 : .6), ph = Math.random() * 6.283;
      for (let i = 0; i <= N; i++) for (let e = 0; e < 2; e++) {
        const v = (j * (N + 1) + i) * 2 + e;
        pos[v * 3] = base[i * 2]; pos[v * 3 + 1] = base[i * 2 + 1]; sd[v] = e ? 1 : -1;
        n2[v * 2] = nrm[i * 2]; n2[v * 2 + 1] = nrm[i * 2 + 1]; s1[v] = sArr[i]; rr[v] = r; pp[v] = ph;
        if (i < N && e === 0) { idx[k++] = v; idx[k++] = v + 1; idx[k++] = v + 2; idx[k++] = v + 1; idx[k++] = v + 3; idx[k++] = v + 2; }
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('nrm', new T.BufferAttribute(n2, 2));
    g.setAttribute('s', new T.BufferAttribute(s1, 1)); g.setAttribute('r', new T.BufferAttribute(rr, 1)); g.setAttribute('ph', new T.BufferAttribute(pp, 1)); g.setAttribute('side', new T.BufferAttribute(sd, 1));
    g.setIndex(new T.BufferAttribute(idx, 1));
    const lines = new T.Mesh(g, lineMat); lines.frustumCulled = false;

    // soft glow bands along the centreline
    const gp = new Float32Array((N + 1) * 2 * 3), gn = new Float32Array((N + 1) * 2 * 2), gs = new Float32Array((N + 1) * 2), gside = new Float32Array((N + 1) * 2);
    const gi = [];
    for (let i = 0; i <= N; i++) for (let e = 0; e < 2; e++) {
      const v = i * 2 + e;
      gp[v * 3] = base[i * 2]; gp[v * 3 + 1] = base[i * 2 + 1]; gn[v * 2] = nrm[i * 2]; gn[v * 2 + 1] = nrm[i * 2 + 1]; gs[v] = sArr[i]; gside[v] = e ? 1 : -1;
      if (i < N && e === 0) gi.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
    }
    const gg = new T.BufferGeometry();
    gg.setAttribute('position', new T.BufferAttribute(gp, 3)); gg.setAttribute('nrm', new T.BufferAttribute(gn, 2));
    gg.setAttribute('s', new T.BufferAttribute(gs, 1)); gg.setAttribute('side', new T.BufferAttribute(gside, 1));
    gg.setIndex(gi);
    glowBands.forEach(m => { const mesh = new T.Mesh(gg, m); mesh.frustumCulled = false; ribbon.add(mesh); });
    ribbon.add(lines);
  }
  const sampleAt = (s, out) => {
    const { pts, nrm, len, N } = path; if (!pts) return out.set(-9999, -9999);
    const f = Math.max(0, Math.min(N - 0.001, s / len * N)), i = Math.floor(f), t = f - i;
    out.x = pts[i * 2] + (pts[i * 2 + 2] - pts[i * 2]) * t; out.y = pts[i * 2 + 1] + (pts[i * 2 + 3] - pts[i * 2 + 1]) * t;
    out.nx = nrm[i * 2]; out.ny = nrm[i * 2 + 1]; return out;
  };

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
    U.uSpread.value = small() ? 70 : 140;
    if (small()) { pivot.position.set(.3, 2.35, -1.5); pivot.scale.setScalar(.7); } else { pivot.position.set(2.7, .55, 0); pivot.scale.setScalar(1); }
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
    if (path.pts) for (let i = 0; i < SP; i++) {
      spS[i] += dt * spV[i] * flowSpeed / path.len; if (spS[i] > 1) spS[i] -= 1;   // always forward, down the line
      sampleAt(spS[i] * path.len, smp);
      const w = Math.sin(flowT * .4 + i) * U.uSpread.value * .8 * spO[i];
      spPos[i * 3] = smp.x + smp.nx * w; spPos[i * 3 + 1] = smp.y + smp.ny * w;
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
    renderer.render(rScene, rCam);
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
