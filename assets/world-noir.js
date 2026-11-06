// Kulman Ziman — "Noir" 3D world.
// A black studio with a glossy reflective floor and a faint design grid. A chrome crown with lime gems sits in front
// of a corridor of light-gates. Scrolling flies the camera forward through the gates (every third one is lime).
//   - the crown turns toward the cursor, drag to spin it (with momentum), click to crown it
//   - chrome spheres and white cubes dodge the cursor; click one to shatter it into lime sparks, then it re-forms
// Needs THREE r128 (UMD). Without WebGL the CSS gradient on #world remains.
(() => {
  const canvas = document.getElementById('world');
  if (!canvas || !window.THREE) return;
  const T = window.THREE;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const isHome = !!document.querySelector('.hero');
  const small = () => innerWidth < 900;

  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas, antialias: !coarse, powerPreference: 'high-performance' }); }
  catch (e) { return; }
  const DPR = Math.min(devicePixelRatio || 1, coarse ? 1.3 : 1.75);
  renderer.setPixelRatio(DPR);
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.autoClear = false;
  const clipAbove = [new T.Plane(new T.Vector3(0, 1, 0), 0)], clipBelow = [new T.Plane(new T.Vector3(0, -1, 0), 0)];

  const FY = -1.4;                 // floor level
  clipAbove[0].constant = -(FY - 0.005); clipBelow[0].constant = FY + 0.005;
  const BLACK = new T.Color(0x050505);
  const LIME = 0xc6ff3d;
  const scene = new T.Scene();
  scene.fog = new T.Fog(BLACK.clone(), 16, 80);
  const camera = new T.PerspectiveCamera(36, 1, 0.1, 400);

  /* ---------- studio reflections: black room, white softboxes, one lime strip ---------- */
  const envCanvas = document.createElement('canvas'); envCanvas.width = 1024; envCanvas.height = 512;
  (() => {
    const g = envCanvas.getContext('2d'), W = 1024, H = 512;
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#1a1a1a'); bg.addColorStop(0.5, '#0c0c0c'); bg.addColorStop(1, '#020202');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    const soft = (x, y, w, h, color, blur) => { g.save(); g.filter = `blur(${blur}px)`; g.fillStyle = color; g.fillRect(x, y, w, h); g.restore(); };
    soft(380, 14, 300, 80, '#ffffff', 10);     // overhead softbox
    soft(120, 120, 60, 250, '#ffffff', 8);     // left strip
    soft(840, 110, 60, 260, '#f2f2f2', 8);     // right strip
    soft(500, 200, 40, 160, '#c6ff3d', 8);     // lime kicker
    soft(0, 300, W, 30, '#3a3a3a', 14);        // floor bounce
  })();
  const envTex = new T.CanvasTexture(envCanvas);
  envTex.mapping = T.EquirectangularReflectionMapping; envTex.encoding = T.sRGBEncoding;
  const pmrem = new T.PMREMGenerator(renderer);
  scene.environment = pmrem.fromEquirectangular(envTex).texture;
  envTex.dispose(); pmrem.dispose();

  scene.add(new T.HemisphereLight(0xffffff, 0x111111, 0.35));
  const key = new T.DirectionalLight(0xffffff, 1.4); key.position.set(4, 10, 6); scene.add(key);
  const limeLight = new T.PointLight(LIME, 2.4, 22); limeLight.position.set(-5, 1.5, 4); scene.add(limeLight);

  const top = new T.Group(); scene.add(top);      // everything that reflects in the floor

  /* ---------- materials ---------- */
  const chrome = new T.MeshStandardMaterial({ color: 0xf4f4f4, metalness: 1, roughness: 0.08, envMapIntensity: 1.6 });
  const chromeSoft = new T.MeshStandardMaterial({ color: 0xdedede, metalness: 1, roughness: 0.26, envMapIntensity: 1.4 });
  const ceramic = new T.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12 });
  const velvet = new T.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 1, metalness: 0, side: T.BackSide, envMapIntensity: 0.2 });
  const limeGem = new T.MeshPhysicalMaterial({ color: LIME, metalness: 0.1, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.04, flatShading: true, emissive: 0x6a9a00, emissiveIntensity: 0.5 });

  /* ---------- the crown ---------- */
  const pivot = new T.Group(), crown = new T.Group(); pivot.add(crown);
  const crownHits = [], gems = [], tips = [];
  const orb = new T.Mesh(new T.IcosahedronGeometry(0.34, 0), limeGem);
  orb.add(new T.LineSegments(new T.EdgesGeometry(orb.geometry), new T.LineBasicMaterial({ color: 0xffffff })));
  if (isHome) {
    top.add(pivot);
    const POINTS = 8, R0 = 1.34, R1 = 1.18;
    const band = new T.CylinderGeometry(R0, R1, 1, 192, 14, true);
    const p = band.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i), k = y + 0.5, a = Math.atan2(p.getZ(i), p.getX(i));
      p.setY(i, -0.5 + k * (0.62 + Math.pow(Math.abs(Math.cos(a * POINTS / 2)), 5) * 0.78));
    }
    band.computeVertexNormals();
    const outer = new T.Mesh(band, chrome), inner = new T.Mesh(band, velvet);
    crown.add(outer, inner); crownHits.push(outer);
    const rimLow = new T.Mesh(new T.TorusGeometry(R1 + 0.01, 0.075, 20, 160), chrome); rimLow.rotation.x = Math.PI / 2; rimLow.position.y = -0.5;
    const rimMid = new T.Mesh(new T.TorusGeometry(1.27, 0.035, 12, 160), ceramic); rimMid.rotation.x = Math.PI / 2; rimMid.position.y = -0.2;
    crown.add(rimLow, rimMid); crownHits.push(rimLow);
    for (let i = 0; i < POINTS; i++) {
      const a = (i / POINTS) * Math.PI * 2;
      const pearl = new T.Mesh(new T.SphereGeometry(0.1, 24, 16), ceramic);
      pearl.position.set(Math.cos(a) * R0, 0.97, Math.sin(a) * R0); crown.add(pearl); tips.push(pearl);
      const g = new T.Group();
      const stone = new T.Mesh(new T.OctahedronGeometry(0.17, 0), limeGem.clone()); stone.scale.set(1, 1.25, 0.55);
      g.add(stone, new T.Mesh(new T.TorusGeometry(0.19, 0.03, 12, 40), chromeSoft));
      g.position.set(Math.cos(a) * 1.3, 0.05, Math.sin(a) * 1.3); g.lookAt(Math.cos(a) * 5, 0.05, Math.sin(a) * 5);
      crown.add(g); gems.push(stone);
      const b = a + Math.PI / POINTS;
      const stud = new T.Mesh(new T.SphereGeometry(0.055, 16, 12), chrome);
      stud.position.set(Math.cos(b) * 1.27, -0.2, Math.sin(b) * 1.27); crown.add(stud);
    }
    pivot.add(orb); crownHits.push(orb);
  }

  /* ---------- chrome spheres and white cubes ---------- */
  const shapes = [];
  if (isHome) {
    [[-3.6, 1.7, -2, 0.5, 'sphere'], [5.7, 0.2, 1.2, 0.38, 'cube'], [-1.5, -0.5, 3, 0.26, 'sphere'], [6.8, 2.8, -5, 0.62, 'cube'], [-6.4, 0.5, -7, 0.75, 'sphere'], [1.4, 3.3, -3, 0.3, 'cube']].forEach(([x, y, z, r, kind]) => {
      const m = kind === 'sphere' ? new T.Mesh(new T.SphereGeometry(1, 48, 32), chrome) : new T.Mesh(new T.BoxGeometry(1.5, 1.5, 1.5), ceramic);
      m.scale.setScalar(r); m.position.set(x, y, z); m.rotation.set(Math.random(), Math.random(), 0);
      m.userData = { home: new T.Vector3(x, y, z), r, push: new T.Vector3(), phase: Math.random() * 6, gone: 0, s: 1, spin: kind === 'cube' ? 0.3 : 0.05 };
      top.add(m); shapes.push(m);
    });
  }

  /* ---------- the corridor of light-gates ---------- */
  const GATES = isHome ? 11 : 8, GAP = 14, G0 = isHome ? -9 : -4;
  const gates = [];
  const glowMat = color => new T.ShaderMaterial({
    transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false, uniforms: { c: { value: new T.Color(color) }, k: { value: 0.6 } },
    vertexShader: 'varying vec2 u; void main(){ u=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform vec3 c; uniform float k; varying vec2 u; void main(){ float d=abs(u.y-.5)*2.; float a=pow(1.-d,3.)*k; gl_FragColor=vec4(c*a,a); }'
  });
  for (let i = 0; i < GATES; i++) {
    const lime = i % 3 === 2;
    const color = lime ? LIME : 0xffffff;
    const g = new T.Group(); g.position.z = G0 - i * GAP;
    const W = 13, H = 9, t = 0.07;
    const core = new T.MeshBasicMaterial({ color, toneMapped: false, fog: true });
    const glow = glowMat(color);
    const bar = (w, h, x, y) => {
      const m = new T.Mesh(new T.BoxGeometry(w, h, t), core); m.position.set(x, y, 0); g.add(m);
      const horiz = w > h;
      // the glow shader fades across the strip's short side, so vertical strips are horizontal ones turned 90°
      const gl = new T.Mesh(new T.PlaneGeometry(horiz ? w + 1 : h + 1, 1.1), glow);
      if (!horiz) gl.rotation.z = Math.PI / 2;
      gl.position.set(x, y, 0); g.add(gl);
    };
    bar(W, t, 0, FY + H); bar(t, H, -W / 2, FY + H / 2); bar(t, H, W / 2, FY + H / 2);
    g.userData = { glow, base: lime ? 0.75 : 0.45, flash: 0 };
    top.add(g); gates.push(g);
  }
  const END_Z = G0 - (GATES - 1) * GAP - 6;

  /* ---------- floating dust ---------- */
  const dot = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d'); const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, '#fff'); r.addColorStop(.3, 'rgba(255,255,255,.5)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new T.CanvasTexture(cv); })();
  const dust = (n, color, size) => {
    const geo = new T.BufferGeometry(), a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = (Math.random() - .5) * 30; a[i * 3 + 1] = FY + Math.random() * 10; a[i * 3 + 2] = 14 - Math.random() * (14 - END_Z + 10); }
    geo.setAttribute('position', new T.BufferAttribute(a, 3));
    const pts = new T.Points(geo, new T.PointsMaterial({ color, size, map: dot, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
    top.add(pts); return pts;
  };
  const whiteDust = dust(coarse ? 500 : 1300, 0xffffff, 0.06);
  const limeDust = dust(coarse ? 120 : 300, LIME, 0.08);

  /* ---------- glossy black floor with a design grid and real reflections ---------- */
  const rt = new T.WebGLRenderTarget(2, 2, { minFilter: T.LinearFilter, magFilter: T.LinearFilter });
  rt.texture.encoding = T.sRGBEncoding;
  const floorMat = new T.ShaderMaterial({
    extensions: { derivatives: true },
    uniforms: { tR: { value: rt.texture }, res: { value: new T.Vector2(1, 1) }, cam: { value: new T.Vector3() }, t: { value: 0 } },
    vertexShader: 'varying vec3 w; void main(){ vec4 p=modelMatrix*vec4(position,1.); w=p.xyz; gl_Position=projectionMatrix*viewMatrix*p; }',
    fragmentShader: `uniform sampler2D tR; uniform vec2 res; uniform vec3 cam; uniform float t; varying vec3 w;
      float grid(vec2 p, float s){ vec2 g=abs(fract(p/s-.5)-.5)/fwidth(p/s); return 1.-min(min(g.x,g.y),1.); }
      void main(){
        float dist=length(w-cam);
        vec2 uv=gl_FragCoord.xy/res;
        vec3 refl=texture2D(tR,uv).rgb;
        vec3 vd=normalize(cam-w);
        float fr=.18+.6*pow(1.-max(vd.y,0.),3.);
        vec3 col=vec3(.012)+refl*fr;
        float fade=1.-smoothstep(10.,70.,dist);
        col+=vec3(1.)*grid(w.xz,1.)*.035*fade;
        col+=vec3(1.)*grid(w.xz,7.)*.07*fade;
        col=mix(col,vec3(.02),smoothstep(30.,80.,dist));
        gl_FragColor=vec4(col,1.);
      }`
  });
  const floor = new T.Mesh(new T.PlaneGeometry(600, 600), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.y = FY; scene.add(floor);

  /* ---------- sparks (pooled) ---------- */
  const MAXP = 380;
  const pGeo = new T.BufferGeometry();
  const pPos = new Float32Array(MAXP * 3), pLife = new Float32Array(MAXP), pCol = new Float32Array(MAXP * 3), pVel = new Float32Array(MAXP * 3);
  pGeo.setAttribute('position', new T.BufferAttribute(pPos, 3));
  pGeo.setAttribute('life', new T.BufferAttribute(pLife, 1));
  pGeo.setAttribute('col', new T.BufferAttribute(pCol, 3));
  const sparks = new T.Points(pGeo, new T.ShaderMaterial({
    transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: { px: { value: DPR } },
    vertexShader: 'attribute float life; attribute vec3 col; varying float l; varying vec3 c; uniform float px; void main(){ l=life; c=col; vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=px*life*90./-mv.z; gl_Position=projectionMatrix*mv; }',
    fragmentShader: 'varying float l; varying vec3 c; void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,0.,d)*l; gl_FragColor=vec4(c*a*1.6,a); }'
  }));
  sparks.frustumCulled = false; scene.add(sparks);
  let pNext = 0;
  const burst = (at, n, color, speed) => {
    const c = new T.Color(color);
    for (let i = 0; i < n; i++) {
      const j = pNext; pNext = (pNext + 1) % MAXP;
      pPos[j * 3] = at.x; pPos[j * 3 + 1] = at.y; pPos[j * 3 + 2] = at.z;
      const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1), s = speed * (0.4 + Math.random() * 0.8);
      pVel[j * 3] = Math.sin(ph) * Math.cos(th) * s; pVel[j * 3 + 1] = Math.cos(ph) * s + speed * 0.5; pVel[j * 3 + 2] = Math.sin(ph) * Math.sin(th) * s;
      pLife[j] = 1; pCol[j * 3] = c.r; pCol[j * 3 + 1] = c.g; pCol[j * 3 + 2] = c.b;
    }
  };

  /* ---------- layout ---------- */
  const layout = () => {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    rt.setSize(Math.max(2, Math.floor(w * DPR * 0.5)), Math.max(2, Math.floor(h * DPR * 0.5)));
    floorMat.uniforms.res.value.set(w * DPR, h * DPR);
    if (small()) { pivot.position.set(0.3, 2.35, -1.5); pivot.scale.setScalar(0.7); }
    else { pivot.position.set(2.7, 0.55, 0); pivot.scale.setScalar(1); }
    pivot.userData.baseY = pivot.position.y;
  };
  layout(); addEventListener('resize', layout);

  /* ---------- input ---------- */
  let mx = 0, my = 0, cx = 0, cy = 0, px = -1, py = -1;
  const ray = new T.Raycaster(), ndc = new T.Vector2();
  const interactive = el => !el || (el.closest && el.closest('a,button,input,select,textarea,label,summary,p,h1,h2,h3,h4,li,blockquote,.chip,.product,.panel,.sheet,.founder,.stat,.box,.calc,.monitor,.browser,.controls,.brief,.faq,.aff,.prose,.cell,.marquee,nav,.dock,.hero-tags'));
  const setRay = () => { ndc.set(px / innerWidth * 2 - 1, -(py / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); };
  const hitCrown = () => { if (!isHome || px < 0 || !pivot.visible) return null; setRay(); return ray.intersectObjects(crownHits, true)[0] || null; };
  const hitShape = () => { if (!isHome || px < 0) return null; setRay(); const h = ray.intersectObjects(shapes.filter(s => !s.userData.gone), false)[0]; return h ? h.object : null; };

  let spin = 0, spinVel = 0.25, jump = 0, jumpVel = 0, glow = 0, hoverScale = 1;
  let dragging = false, dragMoved = 0, lastX = 0;
  addEventListener('pointermove', e => {
    mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; px = e.clientX; py = e.clientY;
    if (dragging) { const dx = e.clientX - lastX; lastX = e.clientX; dragMoved += Math.abs(dx); spinVel = dx * 0.012; spin += dx * 0.012; }
  }, { passive: true });
  addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || interactive(e.target)) return;
    px = e.clientX; py = e.clientY;
    if (hitCrown()) { dragging = true; dragMoved = 0; lastX = e.clientX; document.documentElement.classList.add('grabbing'); }
  });
  addEventListener('pointerup', () => { if (dragging) { dragging = false; document.documentElement.classList.remove('grabbing'); } });
  const coronation = () => {
    spinVel += 0.32; jumpVel = 0.11; glow = 1;
    tips.forEach(t => burst(t.getWorldPosition(new T.Vector3()), 10, LIME, 0.05));
    burst(orb.getWorldPosition(new T.Vector3()), 40, 0xffffff, 0.06);
  };
  const shatter = s => {
    const u = s.userData; if (u.gone) return;
    u.gone = 1; burst(s.position.clone(), 50, LIME, 0.05 + u.r * 0.05); burst(s.position.clone(), 24, 0xffffff, 0.04);
    setTimeout(() => { u.gone = 0; u.s = 0; s.position.copy(u.home); }, 2000);
  };
  addEventListener('click', e => {
    if (!isHome || interactive(e.target)) return;
    px = e.clientX; py = e.clientY;
    if (dragMoved > 6) { dragMoved = 0; return; }
    const s = hitShape(); if (s) return shatter(s);
    if (hitCrown()) coronation();
  });

  // camera path: home starts on the crown, then flies forward through the gates as you scroll
  const camPath = () => {
    const vh = innerHeight, max = Math.max(1, document.documentElement.scrollHeight - vh);
    const k = Math.min(1, scrollY / max);
    if (isHome) {
      const intro = Math.min(1, scrollY / (vh * 0.9)), e = intro * intro * (3 - 2 * intro);
      const z = 12 + (END_Z - 12) * k;
      return { z, y: 1.0 + e * 0.6, lookY: 0.25 + e * 0.75, lookZ: z - 12 };
    }
    const z = 6 + (END_Z - 6) * k;
    return { z, y: 1.4, lookY: 1.1, lookZ: z - 12 };
  };
  const cam = camPath();
  camera.position.set(0, cam.y, cam.z);

  /* ---------- loop ---------- */
  const clock = new T.Clock();
  let running = true, lastScroll = scrollY, vel = 0;
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running && !reduce) { clock.getDelta(); requestAnimationFrame(frame); } });
  const v3 = new T.Vector3(), tmp = new T.Vector3(), look = new T.Vector3();

  function frame() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    cx += (mx - cx) * 0.06; cy += (my - cy) * 0.06;

    // scroll speed widens the lens a little: a sense of flying
    const ds = scrollY - lastScroll; lastScroll = scrollY; vel += (ds - vel) * 0.12;
    const warp = reduce ? 0 : Math.min(Math.abs(vel) / 40, 1);
    camera.fov += ((36 + warp * 16) - camera.fov) * 0.1; camera.updateProjectionMatrix();

    const want = camPath(), f = reduce ? 1 : 0.09;
    cam.z += (want.z - cam.z) * f; cam.y += (want.y - cam.y) * f; cam.lookY += (want.lookY - cam.lookY) * f; cam.lookZ += (want.lookZ - cam.lookZ) * f;
    camera.position.set(cx * 0.9, cam.y - cy * 0.35, cam.z);
    look.set(cx * 0.4, cam.lookY, isHome && scrollY < innerHeight * 0.9 ? Math.min(cam.lookZ, 0) : cam.lookZ);
    camera.lookAt(look);

    // as you start flying, the crown and shapes sink smoothly into the glossy floor
    const sinkK = isHome ? Math.min(1, scrollY / (innerHeight * 0.85)) : 0, sink = sinkK * sinkK * (3 - 2 * sinkK);
    if (isHome) {
      pivot.position.y += ((pivot.userData.baseY - sink * 6) - pivot.position.y) * (reduce ? 1 : 0.12);
      pivot.visible = sink < 0.999;
      if (!dragging) { spinVel *= 0.965; spinVel += (0.006 - spinVel) * 0.02; spin += spinVel * (reduce ? 0 : 1); }
      crown.rotation.y = spin;
      const hov = !dragging && !coarse && hitCrown();
      hoverScale += ((hov || dragging ? 1.06 : 1) - hoverScale) * 0.12;
      pivot.rotation.y += ((cx * 0.9) - pivot.rotation.y) * 0.07;
      pivot.rotation.x += ((0.28 + cy * 0.4) - pivot.rotation.x) * 0.07;
      pivot.rotation.z = Math.sin(t * 0.6) * 0.04;
      jumpVel -= 0.006; jump += jumpVel; if (jump < 0) { jump = 0; jumpVel = Math.abs(jumpVel) > 0.02 ? -jumpVel * 0.35 : 0; }
      crown.position.y = Math.sin(t * 1.1) * 0.08 + jump;
      crown.scale.setScalar(hoverScale);
      orb.position.y = 1.55 + Math.sin(t * 1.6) * 0.1 + jump * 1.4; orb.rotation.y += dt * (0.8 + spinVel * 8); orb.rotation.x += dt * 0.3;
      glow *= 0.96;
      gems.forEach((g, i) => { g.material.emissiveIntensity = 0.5 + glow * 3 + Math.max(0, Math.sin(t * 2 + i)) * 0.3; });
      document.documentElement.classList.toggle('over-crown', !!hov);

      const hs = coarse ? null : hitShape();
      document.documentElement.classList.toggle('over-bubble', !!hs && !hov);
      if (px >= 0) setRay();
      shapes.forEach(s => {
        const u = s.userData;
        u.s += ((u.gone ? 0 : 1) - u.s) * (u.gone ? 0.5 : 0.05);
        s.scale.setScalar(Math.max(0.0001, u.r * u.s)); s.visible = u.s > 0.01;
        const target = tmp.copy(u.home); target.y += Math.sin(t * 0.8 + u.phase) * 0.25 - sink * 7;
        if (px >= 0 && !coarse) {
          ray.ray.closestPointToPoint(s.position, v3);
          const d = v3.distanceTo(s.position), reach = u.r * 2.8;
          if (d < reach) u.push.add(tmp.clone().copy(s.position).sub(v3).normalize().multiplyScalar((1 - d / reach) * 0.08));
        }
        u.push.multiplyScalar(0.92);
        target.add(u.push.clone().multiplyScalar(6));
        s.position.lerp(target, 0.05);
        s.rotation.x += dt * u.spin; s.rotation.y += dt * u.spin * 1.3;
      });
    }

    // gates breathe, and flash as the camera passes through them
    gates.forEach((g, i) => {
      const u = g.userData, d = Math.abs(camera.position.z - g.position.z);
      if (d < 1.2) u.flash = 1;
      u.flash *= 0.94;
      u.glow.uniforms.k.value = u.base * (0.8 + 0.2 * Math.sin(t * 1.4 + i)) + u.flash * 1.4;
    });
    whiteDust.rotation.y = Math.sin(t * 0.05) * 0.05; limeDust.position.y = Math.sin(t * 0.3) * 0.3;

    // sparks
    for (let j = 0; j < MAXP; j++) {
      if (pLife[j] <= 0) continue;
      pLife[j] = Math.max(0, pLife[j] - dt * 0.9);
      pVel[j * 3 + 1] -= dt * 0.06;
      pPos[j * 3] += pVel[j * 3]; pPos[j * 3 + 1] += pVel[j * 3 + 1]; pPos[j * 3 + 2] += pVel[j * 3 + 2];
      pVel[j * 3] *= 0.96; pVel[j * 3 + 2] *= 0.96;
      if (pPos[j * 3 + 1] < FY) { pPos[j * 3 + 1] = FY; pVel[j * 3 + 1] *= -0.4; }
    }
    pGeo.attributes.position.needsUpdate = true; pGeo.attributes.life.needsUpdate = true; pGeo.attributes.col.needsUpdate = true;

    key.position.set(4, 10, camera.position.z - 6);
    limeLight.position.set(-5 + Math.sin(t * .4) * 2, 1.5, camera.position.z - 8);
    floorMat.uniforms.cam.value.copy(camera.position); floorMat.uniforms.t.value = t;

    // pass 1: mirrored world into the floor's reflection target
    floor.visible = false; sparks.visible = false;
    top.scale.y = -1; top.position.y = 2 * FY; top.updateMatrixWorld(true);
    renderer.clippingPlanes = clipBelow;
    renderer.setRenderTarget(rt); renderer.setClearColor(BLACK, 1); renderer.clear(); renderer.render(scene, camera);
    top.scale.y = 1; top.position.y = 0; top.updateMatrixWorld(true);
    floor.visible = true; sparks.visible = true;
    // pass 2: the real world
    renderer.clippingPlanes = clipAbove;
    renderer.setRenderTarget(null); renderer.setClearColor(BLACK, 1); renderer.clear(); renderer.render(scene, camera);
    if (!reduce) requestAnimationFrame(frame);
  }
  if (reduce) {
    const still = () => { running = true; frame(); };
    addEventListener('scroll', still, { passive: true }); addEventListener('resize', still);
  }
  requestAnimationFrame(frame);
})();
