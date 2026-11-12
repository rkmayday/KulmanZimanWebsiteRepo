// Ziman Sites — the 3D world behind every page.
// Home: one gold crown floating over mirror water under a vivid royal sky, with glass bubbles.
//   - the crown turns toward the cursor, can be dragged to spin (with momentum), and a click crowns it
//   - bubbles drift away from the cursor and pop when clicked, then rise again
//   - scrolling dives the camera through the water into a deep royal sea (light rays, gold specks, sinking coins)
// Inner pages start just under the surface and dive as you scroll.
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
  renderer.toneMappingExposure = 1.05;
  renderer.autoClear = false;

  const WY = -1.4;                                  // water level
  const COL = {
    skyTop: new T.Color(0x0b27d4), skyMid: new T.Color(0x3d63ff), horizon: new T.Color(0xffcf73), sun: new T.Color(0xffd36b),
    haze: new T.Color(0xaab8ff), deep: new T.Color(0x0b1f9a), abyss: new T.Color(0x020624), water: new T.Color(0x0a1a8c)
  };
  const scene = new T.Scene();
  scene.fog = new T.Fog(COL.haze.clone(), 20, 95);
  const camera = new T.PerspectiveCamera(36, 1, 0.1, 400);

  /* ---------- reflections: a painted studio environment in the brand colours ---------- */
  // Drawn on a 2D canvas (equirectangular) and pre-filtered with PMREM: robust on every GPU.
  const envCanvas = document.createElement('canvas'); envCanvas.width = 1024; envCanvas.height = 512;
  (() => {
    const g = envCanvas.getContext('2d'), W = 1024, H = 512;
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#fff6e6'); sky.addColorStop(0.3, '#ffe2a6'); sky.addColorStop(0.44, '#f2c76a');
    sky.addColorStop(0.5, '#2f54ff'); sky.addColorStop(0.56, '#0b1f8a'); sky.addColorStop(0.75, '#5a4520'); sky.addColorStop(1, '#1a1206');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    const soft = (x, y, w, h, color, blur) => { g.save(); g.filter = `blur(${blur}px)`; g.fillStyle = color; g.fillRect(x, y, w, h); g.restore(); };
    soft(360, 10, 340, 90, '#ffffff', 14);          // big key light overhead
    soft(150, 110, 70, 240, '#ffffff', 10);          // strip left
    soft(790, 100, 70, 250, '#fff4d8', 10);          // strip right
    soft(0, 252, W, 10, '#9fb4ff', 4);               // royal-blue horizon line
    soft(0, 330, W, 40, '#ffd36b', 16);              // warm floor bounce
  })();
  const envTex = new T.CanvasTexture(envCanvas);
  envTex.mapping = T.EquirectangularReflectionMapping; envTex.encoding = T.sRGBEncoding;
  const pmrem = new T.PMREMGenerator(renderer);
  scene.environment = pmrem.fromEquirectangular(envTex).texture;
  envTex.dispose(); pmrem.dispose();

  scene.add(new T.HemisphereLight(0x9fb4ff, 0x0a1a6a, 0.6));
  const key = new T.DirectionalLight(0xfff1d0, 1.6); key.position.set(4, 10, 6); scene.add(key);
  const fill = new T.PointLight(0x5b82ff, 2.2, 30); fill.position.set(-6, 2, 5); scene.add(fill);

  /* ---------- everything above the water lives in `top` so it can be mirrored for reflections ---------- */
  const top = new T.Group(); scene.add(top);
  const under = new T.Group(); scene.add(under);

  // sky dome
  const sky = new T.Mesh(new T.SphereGeometry(180, 48, 24), new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false, fog: false,
    uniforms: { a: { value: COL.skyTop }, b: { value: COL.skyMid }, c: { value: COL.horizon }, g: { value: COL.sun }, sd: { value: new T.Vector3(0.18, 0.05, -1).normalize() } },
    vertexShader: 'varying vec3 d; void main(){ d = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform vec3 a,b,c,g,sd; varying vec3 d;
      void main(){ float h=d.y;
        vec3 col=mix(c,b,smoothstep(0.,.16,h)); col=mix(col,a,smoothstep(.16,.62,h));
        col=mix(col,b*.55,(1.-smoothstep(-.25,0.,h)));
        float s=max(dot(normalize(d),sd),0.);
        col+=g*(pow(s,40.)*1.4+pow(s,6.)*.35);
        gl_FragColor=vec4(col,1.); }`
  }));
  top.add(sky);

  // silver dunes on the horizon
  const duneMat = new T.MeshStandardMaterial({ color: 0x9aa8ff, roughness: 0.75, metalness: 0.15 });
  [[-34, -48, 34, 5.5, 12], [6, -62, 46, 7.5, 14], [42, -52, 30, 5, 12], [-60, -70, 40, 8, 14], [70, -78, 44, 9, 14]].forEach(([x, z, sx, sy, sz]) => {
    const d = new T.Mesh(new T.SphereGeometry(1, 48, 24), duneMat); d.scale.set(sx, sy, sz); d.position.set(x, WY - 0.6, z); top.add(d);
  });

  /* ---------- the crown ---------- */
  const gold = new T.MeshStandardMaterial({ color: 0xffc23d, metalness: 1, roughness: 0.18, envMapIntensity: 1.5 });
  const goldSoft = new T.MeshStandardMaterial({ color: 0xf0b030, metalness: 1, roughness: 0.3, envMapIntensity: 1.4 });
  const silver = new T.MeshStandardMaterial({ color: 0xe8ecf8, metalness: 1, roughness: 0.08, envMapIntensity: 1.3 });
  const velvet = new T.MeshStandardMaterial({ color: 0x0c1c9a, roughness: 1, metalness: 0, side: T.BackSide, envMapIntensity: 0.35 });
  const sapphire = new T.MeshPhysicalMaterial({ color: 0x1f46ff, metalness: 0.25, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.04, flatShading: true, emissive: 0x0a1680, emissiveIntensity: 0.4 });

  const pivot = new T.Group();       // position + follow-the-cursor tilt
  const crown = new T.Group();       // spin
  pivot.add(crown);
  const crownHits = [];
  const gems = [];
  const tips = [];
  if (isHome) {
    top.add(pivot);
    const POINTS = 8, R0 = 1.34, R1 = 1.18;
    const band = new T.CylinderGeometry(R0, R1, 1, 192, 14, true);
    const p = band.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i), k = y + 0.5, a = Math.atan2(p.getZ(i), p.getX(i));
      const peak = Math.pow(Math.abs(Math.cos(a * POINTS / 2)), 5);
      p.setY(i, -0.5 + k * (0.62 + peak * 0.78));
    }
    band.computeVertexNormals();
    const outer = new T.Mesh(band, gold), inner = new T.Mesh(band, velvet);
    crown.add(outer, inner); crownHits.push(outer);
    const rimLow = new T.Mesh(new T.TorusGeometry(R1 + 0.01, 0.075, 20, 160), gold); rimLow.rotation.x = Math.PI / 2; rimLow.position.y = -0.5;
    const rimMid = new T.Mesh(new T.TorusGeometry(1.27, 0.035, 12, 160), silver); rimMid.rotation.x = Math.PI / 2; rimMid.position.y = -0.2;
    crown.add(rimLow, rimMid); crownHits.push(rimLow);
    for (let i = 0; i < POINTS; i++) {
      const a = (i / POINTS) * Math.PI * 2;
      const tipY = -0.5 + 1.4;
      const pearl = new T.Mesh(new T.SphereGeometry(0.1, 24, 16), silver);
      pearl.position.set(Math.cos(a) * R0, tipY + 0.07, Math.sin(a) * R0); crown.add(pearl); tips.push(pearl);
      // a sapphire set in a gold bezel under each point
      const g = new T.Group();
      const stone = new T.Mesh(new T.OctahedronGeometry(0.17, 0), sapphire.clone()); stone.scale.set(1, 1.25, 0.55);
      const bezel = new T.Mesh(new T.TorusGeometry(0.19, 0.03, 12, 40), goldSoft);
      g.add(stone, bezel);
      const r = 1.3;
      g.position.set(Math.cos(a) * r, 0.05, Math.sin(a) * r);
      g.lookAt(Math.cos(a) * 5, 0.05, Math.sin(a) * 5);
      crown.add(g); gems.push(stone);
      // small silver studs between the gems
      const b = a + Math.PI / POINTS;
      const stud = new T.Mesh(new T.SphereGeometry(0.055, 16, 12), silver);
      stud.position.set(Math.cos(b) * 1.27, -0.2 + 0.0, Math.sin(b) * 1.27); crown.add(stud);
    }
  }
  // the floating sapphire above the crown
  const orb = new T.Mesh(new T.IcosahedronGeometry(0.34, 0), sapphire);
  orb.add(new T.LineSegments(new T.EdgesGeometry(orb.geometry), new T.LineBasicMaterial({ color: 0xffe7a3 })));
  if (isHome) { pivot.add(orb); crownHits.push(orb); }

  /* ---------- glass bubbles ---------- */
  const glass = new T.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0.05, roughness: 0.02, clearcoat: 1, clearcoatRoughness: 0, transparent: true, opacity: 0.2, envMapIntensity: 3.2, depthWrite: false });
  const rimMat = new T.ShaderMaterial({
    transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: { t: { value: 0 } },
    vertexShader: 'varying vec3 n; varying vec3 v; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); n=normalize(normalMatrix*normal); v=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
    fragmentShader: `uniform float t; varying vec3 n; varying vec3 v;
      void main(){ float f=pow(1.-abs(dot(n,v)),2.4);
        vec3 c=mix(vec3(.25,.45,1.),vec3(1.,.8,.35),.5+.5*sin(f*7.+t+n.y*3.));
        c=mix(c,vec3(.92,.95,1.),.3);
        gl_FragColor=vec4(c*f*1.5,f); }`
  });
  const bubbles = [];
  if (isHome) {
    [[-3.6, 1.6, -2, 0.62], [5.6, 0.1, 1.2, 0.44], [-1.4, -0.55, 3, 0.3], [6.6, 2.9, -5, 0.8], [-6.2, 0.4, -7, 0.95], [1.2, 3.3, -3, 0.36]].forEach(([x, y, z, r]) => {
      const g = new T.Group();
      g.add(new T.Mesh(new T.SphereGeometry(1, 48, 32), glass));
      const rim = new T.Mesh(new T.SphereGeometry(1.005, 48, 32), rimMat); g.add(rim);
      g.scale.setScalar(r); g.position.set(x, y, z);
      g.userData = { home: new T.Vector3(x, y, z), base: new T.Vector3(x, y, z), r, push: new T.Vector3(), phase: Math.random() * 6, popped: 0, s: 1 };
      top.add(g); bubbles.push(g);
    });
  }

  /* ---------- water with real (rippled) reflections ---------- */
  const rt = new T.WebGLRenderTarget(2, 2, { minFilter: T.LinearFilter, magFilter: T.LinearFilter });
  rt.texture.encoding = T.sRGBEncoding;
  const waterMat = new T.ShaderMaterial({
    side: T.DoubleSide,
    uniforms: { tR: { value: rt.texture }, t: { value: 0 }, res: { value: new T.Vector2(1, 1) }, cam: { value: new T.Vector3() },
      deep: { value: COL.water }, haze: { value: COL.haze }, gold: { value: COL.sun }, fogN: { value: 20 }, fogF: { value: 95 } },
    vertexShader: 'varying vec3 w; void main(){ vec4 p=modelMatrix*vec4(position,1.); w=p.xyz; gl_Position=projectionMatrix*viewMatrix*p; }',
    fragmentShader: `uniform sampler2D tR; uniform float t,fogN,fogF; uniform vec2 res; uniform vec3 cam,deep,haze,gold; varying vec3 w;
      void main(){
        vec2 p=w.xz;
        vec2 n=vec2(sin(p.x*.8+t*1.2)+.6*sin(p.y*1.6-t*.9)+.25*sin((p.x+p.y)*3.3+t*2.1),
                    cos(p.y*1.0+t*1.0)+.6*cos(p.x*1.4+t*.7)+.25*cos((p.x-p.y)*2.9-t*1.8));
        float dist=length(w-cam);
        if(gl_FrontFacing){
          vec2 uv=gl_FragCoord.xy/res + n*.010*(1.-smoothstep(8.,55.,dist));
          vec3 refl=texture2D(tR,uv).rgb;
          vec3 vd=normalize(cam-w);
          float fr=.35+.65*pow(1.-max(vd.y,0.),2.5);
          vec3 col=mix(deep,refl,clamp(fr,0.,.94));
          float sp=pow(max(0.,n.x*n.y*.5),5.); col+=gold*sp*.35;
          col=mix(col,haze,smoothstep(fogN,fogF,dist));
          gl_FragColor=vec4(col,1.);
        } else {
          // the surface seen from below: shimmering light
          float c=.5+.5*sin(n.x*2.2+n.y*1.7+t);
          vec3 col=mix(vec3(.12,.25,.95),vec3(.75,.85,1.),pow(c,3.)*.8);
          col=mix(col,vec3(.03,.08,.4),smoothstep(6.,40.,dist));
          gl_FragColor=vec4(col,1.);
        }
      }`
  });
  const water = new T.Mesh(new T.PlaneGeometry(500, 500, 1, 1), waterMat);
  water.rotation.x = -Math.PI / 2; water.position.y = WY; scene.add(water);

  /* ---------- the deep: light rays, gold specks, sinking coins ---------- */
  const rayMat = new T.ShaderMaterial({
    transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false, side: T.DoubleSide, uniforms: { t: { value: 0 } },
    vertexShader: 'varying vec2 u; void main(){ u=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform float t; varying vec2 u; void main(){ float a=pow(u.y,2.2)*(1.-abs(u.x-.5)*2.); a*=.55+.45*sin(t*.7+u.y*4.); gl_FragColor=vec4(vec3(.55,.68,1.)*a*.22,a*.22); }'
  });
  const rays = [];
  for (let i = 0; i < 9; i++) {
    const r = new T.Mesh(new T.PlaneGeometry(2.4 + Math.random() * 3, 34), rayMat);
    r.position.set(-16 + i * 4 + Math.random() * 2, WY - 17, -6 - Math.random() * 14);
    r.rotation.z = -0.25 + Math.random() * 0.1;
    r.userData.p = Math.random() * 6; under.add(r); rays.push(r);
  }
  const DEPTH = 58;
  const dot = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d'); const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, '#fff'); r.addColorStop(.3, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new T.CanvasTexture(cv); })();
  const specks = (n, color, size) => {
    const geo = new T.BufferGeometry(), a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = (Math.random() - .5) * 50; a[i * 3 + 1] = WY - 1 - Math.random() * (DEPTH + 10); a[i * 3 + 2] = -32 + Math.random() * 38; }
    geo.setAttribute('position', new T.BufferAttribute(a, 3));
    const pts = new T.Points(geo, new T.PointsMaterial({ color, size, map: dot, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
    under.add(pts); return pts;
  };
  const goldSpecks = specks(coarse ? 700 : 1800, 0xffd36b, 0.14);
  const silverSpecks = specks(coarse ? 400 : 1000, 0xcdd8ff, 0.09);
  const coinGeo = new T.CylinderGeometry(0.55, 0.55, 0.08, 56);
  const coins = [];
  for (let i = 0; i < 10; i++) {
    const c = new T.Mesh(coinGeo, i % 3 ? gold : silver);
    const side = i % 2 ? 1 : -1;
    c.position.set(side * (6 + Math.random() * 7), WY - 4 - (i / 10) * DEPTH, -4 - Math.random() * 10);
    c.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    c.userData = { v: 0.15 + Math.random() * 0.2, rx: Math.random() * .8, rz: .3 + Math.random() * .6 };
    under.add(c); coins.push(c);
  }

  /* ---------- all the way down: rising glass bubbles, gold rings and sapphires that dodge the cursor and pop ---------- */
  const deep = [];
  const deepHitGeo = new T.SphereGeometry(1.15, 12, 8), deepHitMat = new T.MeshBasicMaterial({ visible: false });
  for (let i = 0, n = coarse ? 16 : 28; i < n; i++) {
    const kind = i % 7 === 3 ? 'ring' : i % 7 === 6 ? 'gem' : 'bubble';
    let m;
    if (kind === 'bubble') { m = new T.Group(); m.add(new T.Mesh(new T.SphereGeometry(1, 32, 24), glass), new T.Mesh(new T.SphereGeometry(1.005, 32, 24), rimMat)); }
    else if (kind === 'ring') m = new T.Mesh(new T.TorusGeometry(.8, .16, 20, 64), gold);
    else m = new T.Mesh(new T.OctahedronGeometry(.8, 0), sapphire);
    m.userData = { kind, side: i % 2 ? 1 : -1, frac: .88 + Math.random() * .15, z: -2.5 - Math.random() * 6, x: 0,
      r0: kind === 'bubble' ? .14 + Math.random() * .3 : .2 + Math.random() * .16, r: .3,
      v: kind === 'bubble' ? .16 + Math.random() * .22 : .03 + Math.random() * .05, phase: Math.random() * 6, push: new T.Vector3(), popped: 0, s: 1 };
    m.position.set(0, WY - 3 - Math.random() * (DEPTH + 4), m.userData.z);
    m.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    if (kind !== 'bubble') m.add(new T.Mesh(deepHitGeo, deepHitMat));   // easier to click than the thin ring itself
    under.add(m); deep.push(m);
  }
  const placeDeep = () => deep.forEach(m => {
    const u = m.userData, D = 10 - u.z, halfW = Math.tan(T.MathUtils.degToRad(18)) * D * camera.aspect;
    u.x = u.side * halfW * u.frac; u.r = u.r0 * (small() ? .7 : 1); m.position.x = u.x;
  });

  /* ---------- sparkle bursts (pooled) ---------- */
  const MAXP = 360;
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
      pLife[j] = 1; const v = 0.75 + Math.random() * 0.25; pCol[j * 3] = c.r * v; pCol[j * 3 + 1] = c.g * v; pCol[j * 3 + 2] = c.b * v;
    }
  };


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

  /* ---------- layout ---------- */
  const layout = () => {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    const bw = Math.max(2, Math.floor(w * DPR * 0.5)), bh = Math.max(2, Math.floor(h * DPR * 0.5));
    rt.setSize(bw, bh);
    waterMat.uniforms.res.value.set(w * DPR, h * DPR);
    if (small()) { pivot.position.set(0.3, 2.35, -1.5); pivot.scale.setScalar(0.7); }
    else { pivot.position.set(2.7, 0.55, 0); pivot.scale.setScalar(1); }
    placeDeep();
    placeHeroShapes(bubbles, WY);
  };
  layout(); addEventListener('resize', layout);
  // re-place the hero bubbles once web fonts have settled the headline's real size
  const replace = () => placeHeroShapes(bubbles, WY);
  document.fonts && document.fonts.ready.then(replace); setTimeout(replace, 1500); setTimeout(replace, 3200);

  /* ---------- input ---------- */
  let mx = 0, my = 0, cx = 0, cy = 0, px = -1, py = -1;
  const ray = new T.Raycaster(), ndc = new T.Vector2();
  const interactive = el => !el || (el.closest && el.closest('a,button,input,select,textarea,label,summary,p,h1,h2,h3,h4,li,blockquote,.chip,.product,.panel,.sheet,.founder,.stat,.box,.calc,.monitor,.browser,.controls,.brief,.faq,.aff,.prose,.cell,.marquee,nav,.dock,.hero-tags'));
  let overUI = false;
  addEventListener('pointermove', e => { overUI = !!interactive(e.target); }, { passive: true });
  const setRay = () => { ndc.set(px / innerWidth * 2 - 1, -(py / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); };
  const hitCrown = () => { if (!isHome || px < 0) return null; setRay(); return ray.intersectObjects(crownHits, true)[0] || null; };
  const hitDeep = () => {
    if (px < 0 || camera.position.y > WY) return null; setRay();
    const h = ray.intersectObjects(deep.filter(m => m.visible && !m.userData.popped), true)[0]; if (!h) return null;
    let o = h.object; while (o && !deep.includes(o)) o = o.parent; return o;
  };
  const popDeep = m => {
    const u = m.userData; if (u.popped) return;
    u.popped = 1; burst(m.position.clone(), 40, u.kind === 'bubble' ? 0xcfdcff : 0xffd36b, .05); burst(m.position.clone(), 14, 0xffd36b, .04);
    setTimeout(() => { u.popped = 0; u.s = 0; m.position.y -= 7; }, 2000);
  };
  const hitBubble = () => { if (!isHome || px < 0) return null; setRay(); const h = ray.intersectObjects(bubbles.filter(b => !b.userData.popped && !b.userData.hidden).map(b => b.children[0]), false)[0]; return h ? h.object.parent : null; };

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
    tips.forEach(t => burst(t.getWorldPosition(new T.Vector3()), 10, 0xffd36b, 0.05));
    burst(orb.getWorldPosition(new T.Vector3()), 40, 0xe8eeff, 0.06);
  };
  const pop = b => {
    const u = b.userData; if (u.popped) return;
    u.popped = 1; burst(b.position.clone(), 46, 0xcfdcff, 0.05 + u.r * 0.04); burst(b.position.clone(), 18, 0xffd36b, 0.04);
    setTimeout(() => { u.popped = 0; u.s = 0; b.position.set(u.home.x, WY - 0.8, u.home.z); }, 2200);
  };
  addEventListener('click', e => {
    if (interactive(e.target)) return;
    px = e.clientX; py = e.clientY;
    if (dragMoved > 6) { dragMoved = 0; return; }
    const d = hitDeep(); if (d) return popDeep(d);
    if (!isHome) return;
    const b = hitBubble(); if (b) return pop(b);
    if (hitCrown()) coronation();
  });

  let scrollY0 = scrollY;
  const camTarget = new T.Vector3();
  const camPath = () => {
    const s = scrollY, vh = innerHeight;
    const max = Math.max(1, document.documentElement.scrollHeight - vh);
    if (isHome) {
      const diveEnd = vh * 0.9;
      if (s < diveEnd) {
        const k = s / diveEnd, e = k * k * (3 - 2 * k);
        return { y: 1.0 + (WY - 0.9 - 1.0) * e, look: 0.25 + (WY - 1.6 - 0.25) * e, z: 12 - e * 2 };
      }
      const k = (s - diveEnd) / Math.max(1, max - diveEnd);
      const y = WY - 0.9 - k * DEPTH;
      return { y, look: y - 0.6, z: 10 };
    }
    const k = s / max, y = WY - 1.2 - k * DEPTH;
    return { y, look: y + 0.9 - k * 1.5, z: 10 };
  };
  let cam = camPath();
  camera.position.set(0, cam.y, cam.z);

  /* ---------- loop ---------- */
  const clock = new T.Clock();
  let running = true;
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running && !reduce) { clock.getDelta(); requestAnimationFrame(frame); } });
  const v3 = new T.Vector3(), tmp = new T.Vector3();

  function frame() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    cx += (mx - cx) * 0.06; cy += (my - cy) * 0.06;

    // camera follows the scroll path, with gentle cursor parallax
    const want = camPath();
    cam.y += (want.y - cam.y) * (reduce ? 1 : 0.09); cam.look += (want.look - cam.look) * (reduce ? 1 : 0.09); cam.z += (want.z - cam.z) * 0.09;
    camera.position.set(cx * 0.9, cam.y - cy * 0.35, cam.z);
    camTarget.set(cx * 0.3, cam.look, 0); camera.lookAt(camTarget);
    const below = camera.position.y < WY;
    const depthK = below ? Math.min(1, (WY - camera.position.y) / DEPTH) : 0;

    // atmosphere: sky haze above water, deep royal → abyss below
    if (below) { scene.fog.color.copy(COL.deep).lerp(COL.abyss, depthK); scene.fog.near = 1; scene.fog.far = 34; }
    else { scene.fog.color.copy(COL.haze); scene.fog.near = 20; scene.fog.far = 95; }
    renderer.setClearColor(below ? scene.fog.color : COL.haze, 1);
    sky.visible = !below;

    let overB = false;
    if (isHome) {
      // crown: follows the cursor, spins with momentum, jumps when crowned
      if (!dragging) { spinVel *= 0.965; spinVel += (0.006 - spinVel) * 0.02; spin += spinVel * (reduce ? 0 : 1); }
      crown.rotation.y = spin + scrollY * .0045;   // spins as you scroll
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
      gems.forEach((g, i) => { g.material.emissiveIntensity = 0.4 + glow * 2.5 + Math.max(0, Math.sin(t * 2 + i)) * 0.25; });
      document.documentElement.classList.toggle('over-crown', !!hov);

      // bubbles: bob, drift away from the cursor, pop on click, rise again
      const hb = coarse || overUI ? null : hitBubble();
      overB = !!hb && !hov;
      if (px >= 0) setRay();
      bubbles.forEach(b => {
        const u = b.userData;
        u.s += ((u.popped || u.hidden ? 0 : 1) - u.s) * (u.popped ? 0.5 : 0.04);
        b.scale.setScalar(Math.max(0.0001, u.r * u.s));
        b.visible = u.s > 0.01;
        const target = tmp.copy(u.home); target.y += Math.sin(t * 0.8 + u.phase) * 0.25;
        if (px >= 0 && !coarse) {
          // distance from the bubble to the pointer ray
          ray.ray.closestPointToPoint(b.position, v3);
          const d = v3.distanceTo(b.position), reach = u.r * 2.6;
          if (d < reach) { const f = (1 - d / reach) * 0.08; u.push.add(b.position.clone().sub(v3).normalize().multiplyScalar(f)); }
        }
        u.push.multiplyScalar(0.92);
        target.add(u.push.clone().multiplyScalar(6));
        b.position.lerp(target, u.popped ? 0 : 0.05);
        b.children[1].rotation.y = t * 0.3;
      });
    }
    rimMat.uniforms.t.value = t;

    // the deep
    rays.forEach(r => { r.material.uniforms.t.value = t; r.position.x += Math.sin(t * 0.3 + r.userData.p) * 0.004; r.lookAt(camera.position.x, r.position.y, camera.position.z); r.rotation.z = Math.sin(t * .25 + r.userData.p) * .08; });
    goldSpecks.position.y = Math.sin(t * 0.2) * 0.4; goldSpecks.rotation.y = t * 0.01; silverSpecks.rotation.y = -t * 0.008;
    coins.forEach(c => {
      const u = c.userData; c.position.y -= dt * u.v * (reduce ? 0 : 1); c.rotation.x += dt * u.rx; c.rotation.z += dt * u.rz;
      if (c.position.y < WY - DEPTH - 8) c.position.y = WY - 2;
    });
    under.visible = below || camera.position.y < WY + 2;
    const dh = below && !coarse && !overUI ? hitDeep() : null;
    document.documentElement.classList.toggle('over-bubble', overB || !!dh);
    if (below && px >= 0) setRay();
    deep.forEach(m => {
      const u = m.userData;
      u.s += ((u.popped ? 0 : 1) - u.s) * (u.popped ? .5 : .04);
      m.scale.setScalar(Math.max(.0001, u.r * u.s)); m.visible = u.s > .01;
      if (!reduce) m.position.y += dt * u.v;
      if (m.position.y > WY - 1.6) { m.position.y = WY - DEPTH - 8; u.s = 0; }   // reaches the surface, rises again from the depths
      if (below && px >= 0 && !coarse) {
        ray.ray.closestPointToPoint(m.position, v3);
        const d = v3.distanceTo(m.position), reach = u.r * 3;
        if (d < reach && d > u.r * .9)   // leans away as the cursor approaches, holds still once it is on it
          u.push.add(m.position.clone().sub(v3).normalize().multiplyScalar((1 - d / reach) * u.r * .013));
      }
      u.push.multiplyScalar(.92);
      m.position.x += ((u.x + Math.sin(t * .5 + u.phase) * .25 + u.push.x * 6) - m.position.x) * .05;
      m.position.z += ((u.z + u.push.z * 6) - m.position.z) * .05;
      m.position.y += u.push.y * .25;
      if (u.kind === 'bubble') m.children[1].rotation.y = t * .3; else { m.rotation.y += dt * .5; m.rotation.x += dt * .2; }
    });

    // sparks
    for (let j = 0; j < MAXP; j++) {
      if (pLife[j] <= 0) continue;
      pLife[j] -= dt * 0.9; if (pLife[j] < 0) pLife[j] = 0;
      pVel[j * 3 + 1] -= dt * 0.06;
      pPos[j * 3] += pVel[j * 3]; pPos[j * 3 + 1] += pVel[j * 3 + 1]; pPos[j * 3 + 2] += pVel[j * 3 + 2];
      pVel[j * 3] *= 0.96; pVel[j * 3 + 2] *= 0.96;
    }
    pGeo.attributes.position.needsUpdate = true; pGeo.attributes.life.needsUpdate = true; pGeo.attributes.col.needsUpdate = true;

    key.position.set(4, camera.position.y + 10, 6);
    fill.position.set(-6 + Math.sin(t * .4) * 2, camera.position.y + 1, 5);
    waterMat.uniforms.t.value = t; waterMat.uniforms.cam.value.copy(camera.position);

    // pass 1: the mirrored world, for the water's reflection
    if (!below) {
      water.visible = false; under.visible = false; sparks.visible = false;
      top.scale.y = -1; top.position.y = 2 * WY; top.updateMatrixWorld(true);
      renderer.setRenderTarget(rt); renderer.setClearColor(COL.haze, 1); renderer.clear(); renderer.render(scene, camera);
      top.scale.y = 1; top.position.y = 0; top.updateMatrixWorld(true);
      water.visible = true; sparks.visible = true; under.visible = camera.position.y < WY + 2;
      renderer.setClearColor(COL.haze, 1);
    }
    // pass 2: the real world
    renderer.setRenderTarget(null); renderer.clear(); renderer.render(scene, camera);
    if (!reduce) requestAnimationFrame(frame);
  }
  if (reduce) {
    const still = () => { running = true; frame(); };
    addEventListener('scroll', still, { passive: true }); addEventListener('resize', still);
  }
  requestAnimationFrame(frame);
})();
