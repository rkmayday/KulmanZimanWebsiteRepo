// Ember Roast sample: a real-looking 3D cup that fills with coffee from a gooseneck kettle. It plays when the page
// adds .pour to .er-pour (once the opening animation has finished) and steams once it is full. The flat SVG cup stays
// as the fallback when WebGL is unavailable.
(() => {
  const box = document.querySelector('.er-pour'), T = window.THREE;
  if (!box || !T) return;
  const canvas = document.createElement('canvas'); canvas.className = 'er-cup3d';
  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch (e) { return; }
  if (!renderer.getContext()) return;
  box.classList.add('has3d'); box.prepend(canvas);
  renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.physicallyCorrectLights = true;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cl = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), sm = v => { v = cl(v); return v * v * (3 - 2 * v); }, mix = (a, b, t) => a + (b - a) * t;
  const C = h => new T.Color(h).convertSRGBToLinear();
  const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t; };
  const soft = (a, b) => tex(128, 128, (g, w) => { const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, a); r.addColorStop(1, b); g.fillStyle = r; g.fillRect(0, 0, w, w); });

  // warm studio for the glaze reflections
  const pm = new T.PMREMGenerator(renderer), env = new T.Scene();
  const sky = new T.Mesh(new T.SphereGeometry(10, 32, 16), new T.MeshBasicMaterial({ side: T.BackSide, vertexColors: true }));
  { const P = sky.geometry.attributes.position, col = []; for (let i = 0; i < P.count; i++) { const c = C('#3a2416').lerp(C('#fbeedd'), sm((P.getY(i) / 10 + .3) / 1.2)); col.push(c.r, c.g, c.b); } sky.geometry.setAttribute('color', new T.Float32BufferAttribute(col, 3)); }
  env.add(sky);
  [[5, 2.5, -3, 5, 3, 5], [2, 5, 6, 1, 1, 2.5], [6, 1, 0, 6, -2, 3]].forEach(([w, h, x, y, z, k]) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(k, k * .95, k * .88), side: T.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m); });
  const scene = new T.Scene(); scene.environment = pm.fromScene(env, .02).texture;
  const camera = new T.PerspectiveCamera(30, 400 / 470, .1, 50);
  const key = new T.DirectionalLight('#fff3e2', 3); key.position.set(-3, 5, 4); scene.add(key);
  const rim = new T.DirectionalLight('#ffd9b0', 3); rim.position.set(3, 3, -4); scene.add(rim);
  scene.add(new T.HemisphereLight('#fff6ea', '#6b4a36', .6));

  // ---------- the cup, saucer and handle (lathed like real thrown ceramic) ----------
  const glaze = new T.MeshPhysicalMaterial({ color: C('#f8f2e9'), roughness: .3, clearcoat: 1, clearcoatRoughness: .06, envMapIntensity: 1, side: T.DoubleSide });
  const V = (x, y) => new T.Vector2(x, y);
  const cupPts = [V(0, 0), V(.5, 0), V(.56, .02), V(.6, .07), V(.62, .12), V(.7, .3), V(.8, .6), V(.88, .9), V(.93, 1.12), V(.955, 1.24), V(.96, 1.28), V(.945, 1.3), V(.925, 1.28), V(.9, 1.2), V(.85, .95), V(.76, .62), V(.66, .32), V(.58, .17), V(0, .16)];
  const inner = y => { const a = [[1.28, .925], [1.2, .9], [.95, .85], [.62, .76], [.32, .66], [.17, .58]]; for (let k = 0; k < a.length - 1; k++) if (y <= a[k][0] && y >= a[k + 1][0]) return mix(a[k + 1][1], a[k][1], (y - a[k + 1][0]) / (a[k][0] - a[k + 1][0])); return .58; };
  const cup = new T.Mesh(new T.LatheGeometry(cupPts, 128), glaze);
  const handle = new T.Mesh(new T.TorusGeometry(.3, .065, 24, 64, Math.PI * 1.15), glaze);
  handle.rotation.z = -Math.PI * .575; handle.position.set(.84, .72, 0); handle.scale.set(1, 1.15, 1);
  const saucer = new T.Mesh(new T.LatheGeometry([V(0, 0), V(.9, 0), V(1.45, .03), V(1.62, .1), V(1.66, .15), V(1.6, .16), V(1.4, .1), V(.95, .06), V(.62, .07), V(0, .07)], 128), glaze);
  saucer.position.y = -.07;
  const ware = new T.Group(); ware.add(cup, handle, saucer); scene.add(ware);

  // ---------- coffee: surface with crema, the stream and the kettle ----------
  const crema = tex(512, 512, (g, w) => { const c = w / 2, r = g.createRadialGradient(c * .9, c * .85, 10, c, c, c);
    r.addColorStop(0, '#c48450'); r.addColorStop(.4, '#9a5426'); r.addColorStop(.8, '#5a2c12'); r.addColorStop(1, '#2e1607'); g.fillStyle = r; g.fillRect(0, 0, w, w);
    for (let k = 0; k < 1400; k++) { const a = Math.random() * 6.28, d = Math.random() * c * .9; g.fillStyle = `rgba(${Math.random() < .5 ? '255,226,190' : '90,46,20'},${Math.random() * .12})`; g.beginPath(); g.arc(c + Math.cos(a) * d, c + Math.sin(a) * d, 1 + Math.random() * 5, 0, 7); g.fill(); } });
  const surf = new T.Mesh(new T.CircleGeometry(1, 96), new T.MeshPhysicalMaterial({ map: crema, roughness: .2, clearcoat: .9, clearcoatRoughness: .08, envMapIntensity: .45 }));
  surf.rotation.x = -Math.PI / 2; scene.add(surf);
  const flowTex = tex(64, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#2a1307'); gr.addColorStop(.4, '#6f3a18'); gr.addColorStop(.6, '#8a4c22'); gr.addColorStop(1, '#2a1307'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 6) { g.fillStyle = `rgba(255,210,160,${Math.random() * .18})`; g.fillRect(w * .35, y, w * .12, 3); } });
  flowTex.wrapS = flowTex.wrapT = T.RepeatWrapping;
  const stream = new T.Mesh(new T.CylinderGeometry(.045, .038, 1, 24, 1, true), new T.MeshPhysicalMaterial({ map: flowTex, roughness: .15, clearcoat: 1, transparent: true }));
  scene.add(stream);
  const SPOUT = new T.Vector3(.02, 3.05, 0);
  const neck = new T.CatmullRomCurve3([new T.Vector3(2.6, 4.6, -.2), new T.Vector3(1.6, 3.6, -.1), new T.Vector3(.7, 3.25, 0), new T.Vector3(.2, 3.12, 0), SPOUT]);
  const kettle = new T.Mesh(new T.TubeGeometry(neck, 80, .085, 20, false), new T.MeshPhysicalMaterial({ color: C('#1d1612'), metalness: .6, roughness: .35, clearcoat: .6 }));
  const lip = new T.Mesh(new T.SphereGeometry(.085, 20, 12), kettle.material); lip.position.copy(SPOUT); kettle.add(lip);
  scene.add(kettle);
  const rings = [0, 1].map(() => { const m = new T.Mesh(new T.RingGeometry(.12, .16, 48), new T.MeshBasicMaterial({ color: '#f3cfa4', transparent: true, depthWrite: false })); m.rotation.x = -Math.PI / 2; scene.add(m); return m; });
  const steamTex = soft('rgba(255,250,244,.5)', 'rgba(255,250,244,0)');
  const steam = [...Array(9)].map((_, k) => { const s = new T.Sprite(new T.SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false })); s.userData = { k, x: (Math.random() - .5) * .6, sp: .5 + Math.random() * .4 }; scene.add(s); return s; });
  const shade = new T.Mesh(new T.PlaneGeometry(3.7, 3.7), new T.MeshBasicMaterial({ map: soft('rgba(60,36,22,.45)', 'rgba(60,36,22,0)'), transparent: true, depthWrite: false }));
  shade.rotation.x = -Math.PI / 2; shade.position.y = -.075; shade.renderOrder = -1; scene.add(shade);

  // ---------- timeline ----------
  let start = -1, mx = 0, my = 0, tmx = 0, tmy = 0;
  new MutationObserver(() => { const on = box.classList.contains('pour'); if (on && start < 0) start = performance.now(); if (!on) start = -1; kick(); }).observe(box, { attributes: true, attributeFilter: ['class'] });
  box.addEventListener('pointermove', e => { const r = box.getBoundingClientRect(); tmx = (e.clientX - r.left) / r.width - .5; tmy = (e.clientY - r.top) / r.height - .5; kick(); });
  box.addEventListener('pointerleave', () => { tmx = tmy = 0; kick(); });

  const size = () => { const r = canvas.getBoundingClientRect(); renderer.setPixelRatio(Math.min(1.5, devicePixelRatio || 1)); renderer.setSize(Math.max(1, r.width), Math.max(1, r.height), false); };
  const frame = now => {
    const t = reduce ? 9 : start < 0 ? 0 : (now - start) / 1000, D = 4.4;
    mx += (tmx - mx) * .08; my += (tmy - my) * .08;
    camera.position.set(Math.sin(-.25 + mx * .5) * 8.6, 3.1 - my * .6, Math.cos(-.25 + mx * .5) * 8.6); camera.lookAt(0, 1.45, 0);
    // kettle comes in, pours, leaves
    const kin = sm(t / .45) * (1 - sm((t - D * .78) / .5));
    kettle.position.set((1 - kin) * 1.6, (1 - kin) * 1.4, 0); kettle.visible = kin > .01;
    const fill = sm((t - .6) / (D * .7)), level = mix(.2, 1.14, fill);
    const r = inner(level); surf.scale.setScalar(r); surf.position.y = level; surf.visible = t > .55 || reduce;
    const flowing = t > .45 && t < D * .76, grow = sm((t - .45) / .3), thin = 1 - sm((t - D * .7) / .3);
    stream.visible = flowing && !reduce; const top = SPOUT.y + kettle.position.y, len = Math.max(.01, (top - level) * grow);
    stream.scale.set(thin, len, thin); stream.position.set(SPOUT.x + kettle.position.x, top - len / 2, 0); flowTex.offset.y = -now / 260;
    rings.forEach((m, k) => { const q = ((t * 1.4 + k * .5) % 1); m.visible = flowing && grow > .9; m.position.set(.03, level + .005, 0); m.scale.setScalar(.6 + q * 3.2); m.material.opacity = .5 * (1 - q); });
    const hot = sm((t - D * .8) / 1);
    steam.forEach(s => { const u = s.userData, q = ((now / 1000) * u.sp * .35 + u.k / 9) % 1; s.position.set(u.x * .6 + Math.sin(q * 5 + u.k) * .12, level + .15 + q * 1.5, (u.k % 3 - 1) * .15); s.scale.set(.22 + q * .35, .5 + q * .7, 1); s.material.opacity = hot * .28 * Math.sin(Math.PI * q); });
    renderer.render(scene, camera);
    return t < D + 1 || hot > 0 || Math.abs(tmx - mx) > .002 || Math.abs(tmy - my) > .002;
  };
  let raf = 0, onScreen = true;
  new IntersectionObserver(es => { onScreen = es[0].isIntersecting; kick(); }).observe(box);
  const loop = now => { raf = 0; if (!onScreen) return; if (frame(now)) raf = requestAnimationFrame(loop); };
  const kick = () => { if (!raf && onScreen) raf = requestAnimationFrame(loop); };
  addEventListener('resize', () => { size(); kick(); }); size(); kick();
})();
