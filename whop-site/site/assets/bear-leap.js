// Home page: a powerful bronze bear (high-tech lime eyes and light) leaps out of dark, lime-lit water and over the viewer as you scroll.
// Everything is built here from primitives (no model files). Scroll drives the leap; splashes run in real time.
(() => {
  const sec = document.querySelector('.leap');
  const canvas = sec && sec.querySelector('canvas');
  const T = window.THREE;
  if (!sec || !canvas || !T) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const phone = matchMedia('(max-width: 720px)').matches;

  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
  catch (e) { sec.classList.add('no-gl'); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, phone ? 1.5 : 2));
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.setClearColor(0x030403, 1);

  const scene = new T.Scene();
  scene.fog = new T.Fog(0x030403, 18, 48);
  const cam = new T.PerspectiveCamera(40, 1, .1, 80);
  const LIME = new T.Color('#c6ff3d');

  // chrome reflections: a small studio environment painted on a canvas (dark room, white softboxes, a lime strip)
  {
    const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
    const sky = g.createLinearGradient(0, 0, 0, 256); sky.addColorStop(0, '#2a2d2b'); sky.addColorStop(.5, '#0c0d0c'); sky.addColorStop(1, '#030303');
    g.fillStyle = sky; g.fillRect(0, 0, 512, 256);
    g.fillStyle = '#ffffff'; g.fillRect(60, 40, 90, 34); g.fillRect(330, 30, 130, 26);
    g.fillStyle = '#c6ff3d'; g.fillRect(0, 120, 512, 6); g.fillRect(200, 60, 40, 60);
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, 96, 512, 3);
    const tex = new T.CanvasTexture(c); tex.mapping = T.EquirectangularReflectionMapping; tex.encoding = T.sRGBEncoding;
    const pm = new T.PMREMGenerator(renderer); scene.environment = pm.fromEquirectangular(tex).texture; pm.dispose(); tex.dispose();
  }
  scene.add(new T.HemisphereLight(0x9aa39c, 0x050505, .35));
  const key = new T.DirectionalLight(0xfff1dc, 2.6); key.position.set(-4, 8, 6); scene.add(key);
  const rim = new T.DirectionalLight(0xc6ff3d, 1.5); rim.position.set(3, 2, -8); scene.add(rim);
  const under = new T.PointLight(0xc6ff3d, 0, 9, 2); scene.add(under);

  // ---------- the bear: a powerful grizzly cast in dark bronze. One sculpted body (deep chest, shoulder hump,
  // thick neck dropping to a low head), heavy front legs with claws. Built by bending spheres, no model files.
  const bronze = new T.MeshStandardMaterial({ color: 0x9a6534, metalness: 1, roughness: .33, envMapIntensity: 1.8 });
  const dark = new T.MeshStandardMaterial({ color: 0x5e3c1e, metalness: 1, roughness: .38, envMapIntensity: 1.5 });
  const ivory = new T.MeshStandardMaterial({ color: 0xeadfc6, metalness: .3, roughness: .35 });
  const glow = new T.MeshBasicMaterial({ color: LIME });
  const bear = new T.Group();
  const lerpK = (keys, u) => { for (let i = 1; i < keys.length; i++) if (u <= keys[i][0]) { const [u0, a0] = keys[i - 1], [u1, a1] = keys[i], k = (u - u0) / (u1 - u0), e = k * k * (3 - 2 * k); return a0 + (a1 - a0) * e; } return keys[keys.length - 1][1]; };
  // shape(u, y, z) bends a unit sphere: u runs tail (-1) to front (+1)
  const sculpt = (len, keysY, keysZ, keysC, bump, segs = 64) => {
    const g = new T.SphereGeometry(1, segs, Math.round(segs * .66)); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const u = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const ny = y * lerpK(keysY, u), nz = z * lerpK(keysZ, u);
      p.setXYZ(i, u * len, ny + lerpK(keysC, u) + (bump ? bump(u, y) : 0), nz); }
    g.computeVertexNormals(); return g;
  };
  const add = (geo, mat, x, y, z, parent = bear, rz = 0) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.z = rz; parent.add(m); return m; };
  // torso + neck: deep forequarters, rounded shoulder hump, neck dropping to a low head
  add(sculpt(1.75,
    [[-1, 1.1], [-.75, .9], [-.25, .84], [.25, 1.08], [.62, .86], [1, .62]],      // height
    [[-1, 1.1], [-.75, .95], [-.25, .9], [.25, 1.0], [.62, .8], [1, .66]],        // width
    [[-1, .1], [-.4, .08], [.25, .17], [.65, -.04], [1, -.3]],                    // spine line
    null, 72), bronze, 0, 0, 0);
  add(new T.SphereGeometry(.15, 16, 12), dark, -1.72, .3, 0);                  // tail
  // head: broad skull, strong brow, tapering muzzle
  const head = new T.Group(); head.position.set(1.9, -.36, 0); head.scale.setScalar(1.16); bear.add(head);
  add(sculpt(.72,
    [[-1, .8], [-.4, 1.0], [.15, .86], [.55, .58], [1, .46]],
    [[-1, .9], [-.4, 1.08], [.15, .86], [.55, .52], [1, .42]],
    [[-1, .03], [0, .06], [.55, -.08], [1, -.12]],
    (u, y) => y > 0 ? .1 * Math.exp(-Math.pow((u + .1) / .22, 2)) * y : 0, 56), bronze, 0, 0, 0, head);
  head.children[0].scale.set(1, .6, .64);
  add(new T.SphereGeometry(.1, 16, 12), new T.MeshStandardMaterial({ color: 0x0b0806, metalness: .4, roughness: .25 }), .72, -.08, 0, head);   // nose
  [1, -1].forEach(z => { const e = add(new T.SphereGeometry(.14, 16, 12), dark, -.32, .34, z * .3, head); e.scale.set(.55, 1, .5); });            // ears
  [1, -1].forEach(z => { const e = add(new T.SphereGeometry(.038, 10, 8), glow, .24, .1, z * .25, head); e.scale.set(1.6, 1, 1); });            // eyes
  // legs: one tapered column each, growing out of the body (u runs paw -1 to shoulder +1)
  const column = (len, base, keysR, keysX, zr) => {
    const g = new T.SphereGeometry(1, 40, 40); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), v = p.getY(i), z = p.getZ(i), r = lerpK(keysR, v) * base;
      p.setXYZ(i, x * r + lerpK(keysX, v), (v - 1) * len / 2, z * r * zr); }
    g.computeVertexNormals(); return g;
  };
  const frontGeo = column(1.95, .3, [[-1, 1.25], [-.9, 1.05], [-.72, .8], [-.3, .92], [.35, 1.3], [1, 1.2]], [[-1, .12], [-.8, .06], [-.6, 0], [1, 0]], .95);
  const hindGeo = column(1.85, .3, [[-1, 1.25], [-.9, 1.0], [-.68, .74], [-.15, .88], [.45, 1.55], [1, 1.35]], [[-1, .08], [-.75, -.04], [-.2, -.12], [.4, .04], [1, 0]], .9);
  const claw = new T.ConeGeometry(.04, .22, 6); claw.rotateZ(-Math.PI / 2 - .55);
  const legs = [];
  const leg = (x, y, z, front) => {
    const hip = new T.Group(); hip.position.set(x, y, z); bear.add(hip);
    add(front ? frontGeo : hindGeo, bronze, 0, 0, 0, hip);
    add(new T.SphereGeometry(.27, 28, 18), dark, front ? .16 : .1, front ? -1.86 : -1.76, 0, hip).scale.set(1.25, .52, 1.0);   // paw pad
    if (front) for (let k = 0; k < 4; k++) add(claw, ivory, .46, -1.92, -.17 + k * .113, hip);
    legs.push({ hip, front: front ? 1 : -1 });
  };
  leg(.82, .32, .45, true); leg(.82, .32, -.45, true); leg(-.95, .32, .44, false); leg(-.95, .32, -.44, false);
  bear.scale.setScalar(1.02);
  scene.add(bear);

  // ---------- water ----------
  const SEG = phone ? 140 : 220;
  const waterGeo = new T.PlaneGeometry(60, 60, SEG, SEG); waterGeo.rotateX(-Math.PI / 2);
  const waterMat = new T.ShaderMaterial({
    extensions: { derivatives: true },
    uniforms: {
      uTime: { value: 0 }, uLime: { value: LIME },
      uS1: { value: new T.Vector4(0, 0, -1, 0) }, uS2: { value: new T.Vector4(0, 0, -1, 0) },   // splash x, z, start time, strength
      uBear: { value: new T.Vector3(0, -5, 0) }, uFogNear: { value: 18 }, uFogFar: { value: 48 }
    },
    vertexShader: `
      uniform float uTime; uniform vec4 uS1, uS2;
      varying vec3 vW; varying float vH; varying vec3 vN;
      float ring(vec4 s, vec2 p){ if (s.z < 0.0) return 0.0; float t = uTime - s.z; if (t > 4.0) return 0.0;
        float d = length(p - s.xy); float r = t * 3.2; return s.w * sin((d - r) * 4.0) * exp(-pow(d - r, 2.0) * .8) * exp(-t * .9) * .22; }
      float H(vec2 q){ return sin(q.x * .45 + uTime * .7) * .05 + sin(q.y * .6 - uTime * .9) * .04 + sin((q.x + q.y) * 1.3 + uTime * 1.4) * .018 + ring(uS1, q) + ring(uS2, q); }
      void main(){ vec3 p = position; float h = H(p.xz);
        float e = .08; vN = normalize(vec3(H(p.xz - vec2(e, 0.0)) - H(p.xz + vec2(e, 0.0)), 2.0 * e, H(p.xz - vec2(0.0, e)) - H(p.xz + vec2(0.0, e))));
        p.y += h; vH = h; vec4 w = modelMatrix * vec4(p, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `
      uniform vec3 uLime, uBear; uniform float uFogNear, uFogFar; varying vec3 vW; varying float vH; varying vec3 vN;
      void main(){
        vec3 n = normalize(vN);
        vec3 v = normalize(cameraPosition - vW);
        float fres = pow(1.0 - max(dot(n, v), 0.0), 4.0);
        vec3 col = mix(vec3(.004, .005, .0045), vec3(.035, .04, .037), fres);
        vec3 l1 = normalize(vec3(.3, .55, -1.0));            // lime light low on the horizon behind
        col += uLime * pow(max(dot(reflect(-v, n), l1), 0.0), 140.0) * 1.4;
        vec3 l2 = normalize(vec3(-.5, .9, .6));
        col += vec3(1.0) * pow(max(dot(reflect(-v, n), l2), 0.0), 220.0) * .9;
        // the bear's glow on the water just under it
        float d = length(vW.xz - uBear.xz); float hgt = clamp(1.0 - uBear.y / 5.0, 0.0, 1.0);
        col += uLime * exp(-d * d * .35) * hgt * hgt * .35 * step(-0.6, uBear.y);
        col += uLime * smoothstep(.06, .2, vH) * .25;           // crests catch light
        float f = smoothstep(uFogNear, uFogFar, length(cameraPosition - vW));
        col = mix(col, vec3(.006, .008, .006), f);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <encodings_fragment>
      }`
  });
  const water = new T.Mesh(waterGeo, waterMat); scene.add(water);

  // horizon glow
  {
    const g = new T.PlaneGeometry(80, 10);
    const m = new T.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uLime: { value: LIME } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 uLime; varying vec2 vUv; void main(){ float a = exp(-pow((vUv.y - .5) * 9.0, 2.0)) * (1.0 - pow(abs(vUv.x - .5) * 2.0, 2.0)); gl_FragColor = vec4(uLime * .55, a * .55); }' });
    const h = new T.Mesh(g, m); h.position.set(0, 0, -30); scene.add(h);
  }

  // ---------- splash droplets ----------
  const N = phone ? 500 : 900;
  const dPos = new Float32Array(N * 3), dVel = new Float32Array(N * 3), dLife = new Float32Array(N);
  const dropGeo = new T.BufferGeometry(); dropGeo.setAttribute('position', new T.BufferAttribute(dPos, 3)); dropGeo.setAttribute('life', new T.BufferAttribute(dLife, 1));
  const dropMat = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending,
    uniforms: { uLime: { value: LIME }, uPx: { value: renderer.getPixelRatio() } },
    vertexShader: 'attribute float life; varying float vL; uniform float uPx; void main(){ vL = life; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = (life > 0.0 ? 14.0 * uPx / -mv.z * (0.4 + life) : 0.0); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 uLime; varying float vL; void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, .1, d) * clamp(vL, 0.0, 1.0); gl_FragColor = vec4(mix(vec3(1.0), uLime, .55), a); }' });
  scene.add(new T.Points(dropGeo, dropMat));
  let di = 0;
  const emit = (x, y, z, vx, vy, vz, life) => { const i = di = (di + 1) % N; dPos.set([x, y, z], i * 3); dVel.set([vx, vy, vz], i * 3); dLife[i] = life; };
  let clock = 0, splashSlot = 0;
  const splash = (x, z, power) => {
    const u = splashSlot++ % 2 ? waterMat.uniforms.uS2 : waterMat.uniforms.uS1; u.value.set(x, z, clock, power);
    if (reduce) return;
    for (let k = 0; k < (phone ? 160 : 280) * power; k++) {
      const a = Math.random() * Math.PI * 2, s = .6 + Math.random() * 2.6;
      emit(x + Math.cos(a) * .5, .05, z + Math.sin(a) * .5, Math.cos(a) * s, 3 + Math.random() * 5 * power, Math.sin(a) * s, 1 + Math.random() * .6);
    }
  };

  // ---------- the leap path (scroll 0..1) ----------
  const P0 = new T.Vector3(-6.5, -2.5, -5), P1 = new T.Vector3(-.5, 8.5, 0), P2 = new T.Vector3(5.5, -2.5, 4);
  let squeeze = 1;   // narrow screens pull the arc in so it stays in frame
  const bez = (t, out) => { const u = 1 - t; out.set(0, 0, 0).addScaledVector(P0, u * u).addScaledVector(P1, 2 * u * t).addScaledVector(P2, t * t); out.x *= squeeze; return out; };
  const pos = new T.Vector3(), ahead = new T.Vector3();
  let target = 0, prog = 0, lastY = -9;

  const size = () => { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); cam.aspect = w / h;
    cam.fov = w / h < .8 ? 52 : 40; squeeze = Math.min(1, Math.max(.45, w / h / 1.5)); cam.updateProjectionMatrix(); };
  addEventListener('resize', size); size();
  const readScroll = () => { const r = sec.getBoundingClientRect(), span = r.height - innerHeight;
    target = Math.min(1, Math.max(0, -r.top / Math.max(1, span))); sec.style.setProperty('--lp', target.toFixed(3)); };
  addEventListener('scroll', readScroll, { passive: true }); readScroll();

  let visible = false;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { rootMargin: '100px' }).observe(sec);

  let t0 = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible) { t0 = now; return; }
    const dt = Math.min(.05, (now - t0) / 1000); t0 = now; clock += reduce ? 0 : dt;
    prog += ((reduce ? .42 : target) - prog) * (reduce ? 1 : Math.min(1, dt * 7));
    // leap: from 12% to 92% of the pinned scroll
    const t = Math.min(1, Math.max(0, (prog - .1) / .8));
    bez(t, pos); bez(Math.min(1, t + .01), ahead);
    bear.position.copy(pos);
    const dir = ahead.sub(pos);
    const yaw = Math.atan2(-dir.z, dir.x), pitch = Math.atan2(dir.y, Math.hypot(dir.x, dir.z));
    bear.rotation.set(0, yaw, 0); bear.rotateZ(pitch * .9);
    bear.rotateX(Math.sin(t * Math.PI) * .25);                      // a slight roll mid-air
    // legs: tucked on take-off, stretched in flight, reaching on the way out
    const stretch = Math.sin(Math.min(1, t * 1.6) * Math.PI * .5);
    legs.forEach(({ hip, front }, i) => { const sway = Math.sin(clock * 3 + i) * .05 * (reduce ? 0 : 1);
      hip.rotation.z = front > 0 ? (.2 + stretch * .65 + sway) : (-.25 - stretch * .6 + sway); });
    head.rotation.z = -.22 - pitch * .25;
    // splash when the bear breaks the surface (either direction)
    if ((lastY < 0) !== (pos.y < 0) && lastY > -8) splash(pos.x, pos.z, 1);
    lastY = pos.y;
    // water streaming off it while it is low
    if (!reduce && pos.y > -.5 && pos.y < 1.6) for (let k = 0; k < 4; k++) emit(pos.x + (Math.random() - .5) * 1.6, pos.y - .4, pos.z + (Math.random() - .5) * .8, (Math.random() - .5) * .6, -1 - Math.random(), (Math.random() - .5) * .6, .8);
    under.position.set(pos.x, .6, pos.z); under.intensity = pos.y > -1 && pos.y < 3 ? 3 * (1 - Math.abs(pos.y - .6) / 2.5) : 0;
    waterMat.uniforms.uTime.value = clock; waterMat.uniforms.uBear.value.copy(pos);
    for (let i = 0; i < N; i++) { if (dLife[i] <= 0) continue; const j = i * 3;
      dVel[j + 1] -= 9.8 * dt; dPos[j] += dVel[j] * dt; dPos[j + 1] += dVel[j + 1] * dt; dPos[j + 2] += dVel[j + 2] * dt;
      dLife[i] -= dt * .8; if (dPos[j + 1] < -.1) dLife[i] = 0; }
    dropGeo.attributes.position.needsUpdate = true; dropGeo.attributes.life.needsUpdate = true;
    // camera: a slow drift, pulled slightly by the pointer
    cam.position.set(Math.sin(clock * .2) * .25 + px * .5, 1.7 + py * .3, 11);
    cam.lookAt(0, 1.1, 0);
    renderer.render(scene, cam);
  }
  let px = 0, py = 0;
  addEventListener('pointermove', e => { px = e.clientX / innerWidth - .5; py = e.clientY / innerHeight - .5; }, { passive: true });
  requestAnimationFrame(frame);
})();
