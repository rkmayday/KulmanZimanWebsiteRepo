// Ember Roast sample: a real-looking 3D coffee bean that cracks open as you scroll into the headline.
// Everything is driven by the stage's scroll variables (--i --p --a --b --c --mx --my, set by sample2.js),
// so it is smooth, exact and fully reversible. Falls back to the flat SVG bean if WebGL is unavailable.
(() => {
  const stage = document.querySelector('.stage'), mark = stage && stage.querySelector('.mark');
  if (!stage || !mark || !window.THREE) return;
  const T = THREE, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.createElement('canvas'); canvas.className = 'er-3d';
  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch (e) { return; }
  if (!renderer.getContext()) return;
  mark.classList.add('has-3d'); mark.prepend(canvas);
  renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
  renderer.physicallyCorrectLights = true;

  // ---------- small helpers ----------
  const cl = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), sm = v => { v = cl(v); return v * v * (3 - 2 * v); };
  const easeOut = v => 1 - Math.pow(1 - cl(v), 3), mix = (a, b, t) => a + (b - a) * t;
  const hash = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
  const noise = (x, y, z) => {                      // smooth 3D value noise, -1..1
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
    const c = (a, b, d) => hash(xi + a, yi + b, zi + d);
    const x1 = mix(c(0, 0, 0), c(1, 0, 0), u), x2 = mix(c(0, 1, 0), c(1, 1, 0), u), x3 = mix(c(0, 0, 1), c(1, 0, 1), u), x4 = mix(c(0, 1, 1), c(1, 1, 1), u);
    return mix(mix(x1, x2, v), mix(x3, x4, v), w) * 2 - 1;
  };
  const fbm = (x, y, z) => noise(x, y, z) * .5 + noise(x * 2.1, y * 2.1, z * 2.1) * .27 + noise(x * 4.3, y * 4.3, z * 4.3) * .15 + noise(x * 8.7, y * 8.7, z * 8.7) * .08;
  const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const C = hex => new T.Color(hex).convertSRGBToLinear();   // colours are authored in sRGB; the renderer works in linear

  // ---------- studio environment for realistic reflections ----------
  const pmrem = new T.PMREMGenerator(renderer);
  const env = new T.Scene();
  const envSky = new T.Mesh(new T.SphereGeometry(10, 32, 16), new T.MeshBasicMaterial({ side: T.BackSide, vertexColors: true }));
  { const g = envSky.geometry, P = g.attributes.position, col = [];
    for (let i = 0; i < P.count; i++) { const y = P.getY(i) / 10; const c = C('#2a1a12').lerp(C('#f3dcc2'), sm((y + .3) / 1.2)); col.push(c.r, c.g, c.b); }
    g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); }
  env.add(envSky);
  const box = (w, h, x, y, z, k) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(k, k * .93, k * .85), side: T.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m); };
  box(6, 3, -3, 5, 4, 4.2); box(3, 6, 6, 1, 2, 2.4); box(4, 2, 0, -4, 5, .7);
  const envTex = pmrem.fromScene(env, .02).texture;

  const scene = new T.Scene(); scene.environment = envTex;
  const camera = new T.PerspectiveCamera(28, 1, .1, 60);

  // lights: warm key, cool-ish fill, strong rim for the edges, ember light inside the crack
  const key = new T.DirectionalLight('#fff1dc', 3.2); key.position.set(-3, 4, 5); scene.add(key);
  const fill = new T.DirectionalLight('#ffe7cf', .9); fill.position.set(4, -1, 3); scene.add(fill);
  const rim = new T.DirectionalLight('#ffd2a1', 4.5); rim.position.set(2.5, 3, -5); scene.add(rim);
  scene.add(new T.HemisphereLight('#fff4e6', '#3b2416', .6));
  const ember = new T.PointLight('#ff7a1f', 0, 6, 2); scene.add(ember);

  // ---------- textures ----------
  const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); return t; };
  const bump = canvasTex(512, 512, (g, w, h) => { const d = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const n = fbm(x / 22, y / 22, 3.3) * .6 + fbm(x / 5, y / 5, 9.1) * .4; const v = 128 + n * 110; const i = (y * w + x) * 4; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    g.putImageData(d, 0, 0); });
  bump.wrapS = bump.wrapT = T.RepeatWrapping;
  const soft = (inner, outer) => canvasTex(256, 256, (g, w) => { const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, inner); r.addColorStop(1, outer); g.fillStyle = r; g.fillRect(0, 0, w, w); });

  // ---------- the bean ----------
  const crease = y => .075 * Math.sin(y * 2.3);            // the S-shaped crease down the flat face
  const crackX = (y, z) => crease(y) + .04 * noise(y * 7, z * 7, 1.3) + .022 * noise(y * 17, z * 17, 4.1) + .009 * noise(y * 45, z * 45, 8.7);
  const ROAST_D = C('#160904'), ROAST_L = C('#46230f'), CHAFF = C('#a27748'), INNER_D = C('#5a3218'), INNER_L = C('#a8733f');
  const beanHalf = side => {                                // side -1 = left half, +1 = right half
    const g = new T.SphereGeometry(1, 200, 150), P = g.attributes.position, n = P.count, col = new Float32Array(n * 3), inner = new Uint8Array(n);
    const c = new T.Color();
    for (let i = 0; i < n; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      let X = x * .74 * (1 - .07 * y * y), Y = y * 1.1, Z = z > 0 ? z * .4 : z * .64;
      const d = X - crease(y), tip = 1 - Math.pow(Math.abs(y), 6), front = sm((z + .05) / .4);
      const groove = .17 * Math.exp(-((d / .075) ** 2)) * tip * front, lip = .03 * Math.exp(-((d / .16) ** 2)) * tip * front;
      Z += -groove + lip;
      const b = 1 + .022 * fbm(x * 3.1, y * 3.1, z * 3.1); X *= b; Y *= b; Z *= b;
      const cx = crackX(y, z);
      if ((side < 0 && X > cx) || (side > 0 && X < cx)) { X = cx; inner[i] = 1; }
      P.setXYZ(i, X, Y, Z);
      if (inner[i]) {                                        // inside: lighter, fibrous
        const f = .5 + .5 * fbm(y * 22, z * 5, 2.2), sp = .5 + .5 * noise(y * 60, z * 60, 7), rimDist = Math.hypot(x, z);
        c.copy(INNER_D).lerp(INNER_L, cl((f - .2) * 1.3 + sp * .2)).multiplyScalar(.75 + .25 * cl(1.2 - rimDist));
      } else {                                               // outside: mottled roast, pale chaff in the crease
        const m = .5 + .5 * fbm(x * 4, y * 4, z * 4), spec = .5 + .5 * noise(x * 40, y * 40, z * 40);
        c.copy(ROAST_D).lerp(ROAST_L, cl(m * .85 + spec * .15));
        const ch = Math.exp(-((d / .022) ** 2)) * front * tip * cl((groove - .05) / .1); if (ch > 0) c.lerp(CHAFF, ch * .85);
        if (groove > .02) c.multiplyScalar(1 - groove * 1.4);
      }
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new T.BufferAttribute(col, 3));
    // split triangles: glossy roasted outside vs matte inside
    const idx = g.index.array, outT = [], inT = [];
    for (let t = 0; t < idx.length; t += 3) { const k = inner[idx[t]] + inner[idx[t + 1]] + inner[idx[t + 2]]; (k >= 2 ? inT : outT).push(idx[t], idx[t + 1], idx[t + 2]); }
    g.setIndex([...outT, ...inT]); g.clearGroups(); g.addGroup(0, outT.length, 0); g.addGroup(outT.length, inT.length, 1);
    g.computeVertexNormals();
    return g;
  };
  const outside = new T.MeshPhysicalMaterial({ vertexColors: true, roughness: .38, metalness: 0, clearcoat: .7, clearcoatRoughness: .28, bumpMap: bump, bumpScale: .015, envMapIntensity: 1.1 });
  const inside = new T.MeshStandardMaterial({ vertexColors: true, roughness: .95, metalness: 0, bumpMap: bump, bumpScale: .12, envMapIntensity: .45 });
  const bean = new T.Group(); scene.add(bean);
  const L = new T.Mesh(beanHalf(-1), [outside, inside]), R = new T.Mesh(beanHalf(1), [outside, inside]);
  bean.add(L, R);

  // shards and coffee dust that burst out of the crack
  const shards = [], shardOut = new T.MeshPhysicalMaterial({ color: C('#2a1409'), roughness: .4, clearcoat: .6 }), shardIn = new T.MeshStandardMaterial({ color: C('#8f5d31'), roughness: .95 });
  for (let k = 0; k < 44; k++) {
    const g = new T.IcosahedronGeometry(.045 + rnd() * .055, 0), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * (.6 + rnd() * .8), p.getY(i) * (.6 + rnd() * .8), p.getZ(i) * (.4 + rnd() * .5));
    g.computeVertexNormals();
    const m = new T.Mesh(g, rnd() < .45 ? shardOut : shardIn), y = (rnd() * 2 - 1) * .85, z = rnd() * .5 - .2;
    const dir = rnd() < .5 ? -1 : 1;
    m.userData = { o: new T.Vector3(crease(y), y * 1.1, z), v: new T.Vector3(dir * (.6 + rnd() * 1.6), .4 + rnd() * 1.8, .4 + rnd() * 1.6), s: new T.Vector3(rnd() * 9 - 4.5, rnd() * 9 - 4.5, rnd() * 9 - 4.5) };
    m.visible = false; bean.add(m); shards.push(m);
  }
  const DUST = 700, dg = new T.BufferGeometry(), dpos = new Float32Array(DUST * 3), dcol = new Float32Array(DUST * 3), dO = [], dV = [];
  for (let k = 0; k < DUST; k++) {
    const y = (rnd() * 2 - 1) * .9; dO.push(crease(y) + (rnd() - .5) * .05, y * 1.1, rnd() * .4 - .15);
    const a = rnd() * Math.PI * 2, s = .3 + rnd() * 1.9; dV.push(Math.cos(a) * s, Math.abs(Math.sin(a)) * s * .9 + .2, (rnd() - .2) * 1.4);
    const c = C('#2a170c').lerp(C('#9a6a3e'), rnd()); dcol.set([c.r, c.g, c.b], k * 3);
  }
  dg.setAttribute('position', new T.BufferAttribute(dpos, 3)); dg.setAttribute('color', new T.BufferAttribute(dcol, 3));
  const dust = new T.Points(dg, new T.PointsMaterial({ size: .045, vertexColors: true, map: soft('rgba(255,255,255,1)', 'rgba(255,255,255,0)'), transparent: true, depthWrite: false, opacity: 0 }));
  bean.add(dust);

  // ember glow and a soft contact shadow
  const glow = new T.Sprite(new T.SpriteMaterial({ map: soft('rgba(255,150,60,1)', 'rgba(255,90,20,0)'), blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  glow.scale.set(1.5, 2.1, 1); scene.add(glow);
  const shadow = new T.Sprite(new T.SpriteMaterial({ map: soft('rgba(43,26,18,.55)', 'rgba(43,26,18,0)'), depthWrite: false, transparent: true, opacity: .8 }));
  shadow.scale.set(2.4, .42, 1); shadow.position.set(0, -1.62, -.5); scene.add(shadow);

  // ---------- size ----------
  let W = 0, H = 0;
  const size = () => { const r = mark.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
    renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1)); renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); last = ''; };

  // ---------- one frame, from the scroll variables ----------
  const v = k => parseFloat(stage.style.getPropertyValue(k)) || 0;
  let last = '';
  const draw = () => {
    let i = v('--i'), a = v('--a'), b = v('--b'), c = v('--c'), p = v('--p'); const mx = v('--mx'), my = v('--my');
    if (reduce) { i = 1; a = .55; b = 0; c = 0; p = .3; }
    const sig = [i, a, b, c, p, mx, my, W, H].map(x => x.toFixed(4)).join();
    if (sig === last) return; last = sig;

    // fit: keep the whole bean comfortably inside the frame on any screen shape
    const asp = W / H, fitZ = Math.max(7.2, 2.15 / (Math.tan(14 * Math.PI / 180) * Math.min(1, asp)));
    camera.position.set(0, 0, fitZ * (1.06 - .1 * a + .1 * c)); camera.lookAt(0, 0, 0);
    const halfW = Math.tan(14 * Math.PI / 180) * camera.position.z * asp;

    // the bean arrives, turns to show its crease, trembles, then cracks open
    bean.scale.setScalar(.72 + .28 * easeOut(i));
    bean.position.y = (1 - easeOut(i)) * -.35;
    const t1 = cl(b / .14), shake = Math.sin(b * 260) * .03 * Math.sin(Math.PI * t1);
    bean.rotation.set(.32 - .18 * a + my * .25 + shake, -.75 + 1.0 * a + mx * .45 - .2 * b, .5 - .38 * a + shake * .6);
    const o = easeOut((b - .1) / .55);
    const out = easeOut((p - .44) / .26);                  // halves clear the way for the headline as it rises
    const halfH = Math.tan(14 * Math.PI / 180) * camera.position.z, tall = asp < .85;
    // wide screens: halves move out to either side of the headline; tall screens (phones): to opposite corners
    const tx = tall ? halfW * .64 : Math.max(.5, halfW * .74), ty = tall ? halfH * .64 : 0;
    const spread = o * .5 + out * (tx - .5);
    L.position.set(-spread, -o * .12 + out * ty, o * .15); R.position.set(spread, o * .08 - out * ty, o * .15);
    L.rotation.set(o * .1, -o * .78, o * .3); R.rotation.set(-o * .08, o * .72, -o * .26);   // show the glossy shell and the broken inside together
    const shrink = 1 - (tall ? .42 : .14) * out; L.scale.setScalar(shrink); R.scale.setScalar(shrink);

    // shards and dust fly out and fall, then fade
    const s = cl((b - .08) / .9), fade = 1 - sm((s - .55) / .45);
    shards.forEach(m => { const u = m.userData; m.visible = s > 0 && fade > .01;
      m.position.set(u.o.x + u.v.x * s * 1.3, u.o.y + u.v.y * s * 1.2 - 2.4 * s * s, u.o.z + u.v.z * s);
      m.rotation.set(u.s.x * s, u.s.y * s, u.s.z * s); m.scale.setScalar(fade); });
    for (let k = 0; k < DUST; k++) { dpos[k * 3] = dO[k * 3] + dV[k * 3] * s * 1.2; dpos[k * 3 + 1] = dO[k * 3 + 1] + dV[k * 3 + 1] * s - 1.8 * s * s; dpos[k * 3 + 2] = dO[k * 3 + 2] + dV[k * 3 + 2] * s; }
    dg.attributes.position.needsUpdate = true; dust.material.opacity = s > 0 ? .9 * fade : 0;

    // the ember: a warm flash from inside the crack
    const gl = Math.sin(Math.PI * cl((b - .04) / .55)) * (1 - out);
    ember.intensity = gl * 9; ember.position.set(0, 0, .25);
    glow.material.opacity = gl * .55; glow.position.copy(bean.position).setZ(.2);
    shadow.material.opacity = .8 * (1 - o) * easeOut(i);
    renderer.render(scene, camera);
  };

  // ---------- run only while the stage is on screen ----------
  let on = true, raf = 0;
  new IntersectionObserver(es => { on = es[0].isIntersecting; if (on && !raf) loop(); }).observe(stage);
  const loop = () => { raf = 0; if (!on) return; draw(); raf = requestAnimationFrame(loop); };
  addEventListener('resize', size); size(); loop();
})();
