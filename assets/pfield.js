// Particle backdrops (formations from particles.casberry.in: Helix, Cube, Nebula, Fireflies), one per section, drawn
// black on white sections and white on black ones. Each gathers out of scattered dust as its section comes up the
// screen, turns slowly, and leans a little toward the cursor on computers. Everything moves on the graphics card, and a
// backdrop only draws while its section is on screen. Reduced motion or no WebGL: nothing is drawn.
//   <div class="pfield" data-shape="helix|cube|nebula|fireflies" data-ink="light|dark" [data-side="right|left|center"]></div>
(() => {
  const fields = [...document.querySelectorAll('.pfield')]; if (!fields.length) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const T = window.THREE; if (!T) return;
  const phone = matchMedia('(max-width: 760px)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  let mx = 0, my = 0;
  if (fine) addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }, { passive: true });

  // the formations, as particles.casberry.in writes them (scaled to fit this scene)
  const SHAPES = {
    helix: (N, P) => { const e = 15, step = 66 / N, o = N * step / 2;
      for (let i = 0; i < N; i++) { const l = i * .05, s = i % 2 ? Math.PI : 0;   // Casberry's helix, split into two strands like DNA
        P.push(Math.cos(l + s) * e, i * step - o, Math.sin(l + s) * e); } },
    cube: (N, P) => { const e = Math.ceil(Math.cbrt(N)), t = 44 / e, o = e * t / 2; let i = 0;
      for (let l = 0; l < e; l++) for (let a = 0; a < e; a++) for (let r = 0; r < e && i < N; r++, i++) P.push(l * t - o, a * t - o, r * t - o); },
    nebula: (N, P, rnd) => { const e = 50; for (let t = 0; t < N; t++) { const o = rnd() * Math.PI * 2, i = Math.acos(rnd() * 2 - 1), l = rnd() * rnd() * e;
      P.push(l * Math.sin(i) * Math.cos(o), l * Math.sin(i) * Math.sin(o) * .62, l * Math.cos(i)); } },
    ring: (N, P) => { for (let i = 0; i < N; i++) { const u = (i / N) * Math.PI * 2, v = (i / N) * Math.PI * 2 * 90, Rr = 27, rr = 7.5, tilt = -1.05;
      const x = (Rr + rr * Math.cos(v)) * Math.cos(u), y = (Rr + rr * Math.cos(v)) * Math.sin(u), z = rr * Math.sin(v);
      P.push(x, y * Math.cos(tilt) - z * Math.sin(tilt), y * Math.sin(tilt) + z * Math.cos(tilt)); } },
    fireflies: (N, P, rnd) => { const e = 40; for (let t = 0; t < N; t++) P.push((rnd() - .5) * e * 2.4, (rnd() - .5) * e, (rnd() - .5) * e * 1.6); },
  };
  const COUNT = { helix: phone ? 1600 : 3200, cube: phone ? 1728 : 4096, nebula: phone ? 3500 : 9000, fireflies: phone ? 500 : 1100, ring: phone ? 6000 : 14000 };

  const VS = `
    attribute vec3 aS; attribute float aR;
    uniform float uGather, uTime, uPx, uFly;
    varying float vA;
    void main(){
      float g = smoothstep(0.0, 1.0, clamp(uGather * 1.3 - aR * 0.3, 0.0, 1.0));
      vec3 p = mix(aS, position, g);
      // fireflies keep drifting; the others breathe a little
      float sp = 1.0 - uFly * 0.82;   // fireflies: a slow, calm drift
      p += vec3(sin(uTime * sp * (.4 + aR) + aR * 50.0), cos(uTime * sp * (.35 + aR * .8) + aR * 40.0), sin(uTime * sp * .3 + aR * 20.0)) * (0.25 + uFly * 1.1 + (1.0 - g) * 2.0);
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      float depth = clamp((-mv.z - 60.0) / 80.0, 0.0, 1.0);
      gl_PointSize = uPx * (1.5 + (1.0 - depth) * 2.0) * (uFly > 0.5 ? (0.5 + aR * 2.6) : (0.8 + aR * 0.4));
      vA = (0.3 + (1.0 - depth) * 0.7) * (0.35 + g * 0.65) * (uFly > 0.5 ? (0.3 + aR * 0.7) : 1.0);
    }`;
  const FS = `uniform vec3 uInk; uniform float uAlpha; varying float vA;
    void main(){ vec2 c = gl_PointCoord - .5; float d = dot(c, c); if (d > .25) discard; gl_FragColor = vec4(uInk, vA * uAlpha * smoothstep(.25, .1, d)); }`;

  const setup = (el, k) => {
    // data-mode="abs": the backdrop is a plain box inside its section (sized and positioned by CSS), not fixed to the screen
    const shape = el.dataset.shape, N = COUNT[shape] || 3000, abs = el.dataset.mode === 'abs' || el.dataset.mode === 'sticky', sec = abs ? el : el.parentElement;
    if (el.dataset.mode === 'abs') el.parentElement.classList.add('has-pfield-abs'); else if (!abs) sec.classList.add('has-pfield');
    const rnd = (() => { let s = 11 + k * 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    const P = []; SHAPES[shape](N, P, rnd);
    const A = new Float32Array(P), S = new Float32Array(N * 3), R = new Float32Array(N);
    for (let i = 0; i < N; i++) { const d = 70 + rnd() * 80, a1 = rnd() * Math.PI * 2, a2 = Math.acos(rnd() * 2 - 1);
      S[i * 3] = d * Math.cos(a1) * Math.sin(a2); S[i * 3 + 1] = d * Math.sin(a1) * Math.sin(a2) * .7; S[i * 3 + 2] = d * Math.cos(a2) * .6; R[i] = rnd(); }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(A, 3)); geo.setAttribute('aS', new T.BufferAttribute(S, 3)); geo.setAttribute('aR', new T.BufferAttribute(R, 1));
    const light = el.dataset.ink === 'light';
    const U = { uGather: { value: 0 }, uTime: { value: 0 }, uPx: { value: 1 }, uFly: { value: shape === 'fireflies' ? 1 : 0 },
      uInk: { value: new T.Color(light ? 0xffffff : 0x0a0a0a) }, uAlpha: { value: shape === 'fireflies' ? .5 : shape === 'helix' ? 1 : .95 } };
    const mat = new T.ShaderMaterial({ uniforms: U, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, blending: T.NormalBlending });
    const pts = new T.Points(geo, mat), group = new T.Group(); group.add(pts);
    // the helix also gets its strands' rungs: a hair-thin line through the points in order
    if (shape === 'helix') { const lm = new T.ShaderMaterial({ uniforms: U, vertexShader: VS, transparent: true, depthWrite: false,
      fragmentShader: 'uniform vec3 uInk; uniform float uAlpha; varying float vA; void main(){ gl_FragColor = vec4(uInk, vA * uAlpha * .12); }' }); group.add(new T.Line(geo, lm)); }
    const scene = new T.Scene(); scene.add(group);
    const cam = new T.PerspectiveCamera(36, 1, 1, 1000); cam.position.set(0, 0, 130);
    const canvas = document.createElement('canvas'); el.append(canvas);
    let renderer; try { renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' }); } catch (e) { return; }
    renderer.setClearColor(0x000000, 0);
    let W = 0, H = 0;
    const size = () => { W = el.clientWidth; H = el.clientHeight; const d = Math.min(2, devicePixelRatio || 1); renderer.setPixelRatio(d); renderer.setSize(W, H, false);
      U.uPx.value = d * (shape === 'cube' ? 1.5 : 1); cam.aspect = W / Math.max(1, H); cam.updateProjectionMatrix(); };
    size(); addEventListener('resize', size);
    let vis = false, raf = 0, t0 = performance.now(), smx = 0, smy = 0;
    const side = el.dataset.side || 'right';
    const frame = now => {
      raf = 0; if (!vis) return;
      const r = sec.getBoundingClientRect();
      U.uGather.value = (shape === 'helix' || shape === 'ring') && el.dataset.gather !== 'scroll' ? 1 : clamp((innerHeight - r.top) / (innerHeight * .55));   // the How it works helix is always fully formed
      const t = (now - t0) / 1000; U.uTime.value = t;
      smx += (mx - smx) * .04; smy += (my - smy) * .04;
      const wide = W > 760, x = !wide || side === 'center' ? 0 : side === 'right' ? 34 : -34;
      group.position.set(x, wide ? 0 : 10, 0);
      const spin = shape === 'cube' ? t * .14 : shape === 'helix' ? t * .25 : shape === 'ring' ? t * .12 : t * .06;
      if (shape === 'helix') {   // the DNA strand lies across the band and turns on its own axis
        group.position.set(0, wide ? -4 : 0, 0); group.rotation.set(spin + smx * .5, smy * .2, Math.PI / 2 - .16); group.scale.setScalar(wide ? 1.75 : 1.1);
      } else {
        group.rotation.set((shape === 'cube' ? .55 : shape === 'ring' ? .35 : .25) + smy * .3, spin + smx * .5, shape === 'ring' ? .1 : 0);
        group.scale.setScalar((wide ? 1 : .8) * (shape === 'cube' ? .78 : 1));
        // centre the shape on the part of its section that is on screen, and keep it inside a short section
        if (!abs) {
        const top = Math.max(r.top, 0), bot = Math.min(r.bottom, innerHeight), half = 130 * Math.tan(18 * Math.PI / 180);
        group.position.y = (innerHeight / 2 - (top + bot) / 2) / (innerHeight / 2) * half;
        group.scale.multiplyScalar(Math.min(1, Math.max(.35, (r.bottom - r.top) / innerHeight * 1.25)));
        } else { group.scale.multiplyScalar((shape === 'ring' ? (el.dataset.anchor === 'bottom' ? 2.9 : 1.05) : Math.min(.72, H / 720)) * (+el.dataset.scale || 1)); if (wide && side === 'right') group.position.x = 46;
          // data-anchor="bottom": the shape sits on the bottom edge of its box, so its lower half is cut off
          if (el.dataset.anchor === 'bottom') group.position.y = -130 * Math.tan(18 * Math.PI / 180); }
      }
      renderer.render(scene, cam);
      raf = requestAnimationFrame(frame);
    };
    new IntersectionObserver(es => { vis = es[0].isIntersecting; if (vis && !raf) { size(); raf = requestAnimationFrame(frame); } }, { rootMargin: '100px 0px' }).observe(sec);
  };
  fields.forEach((el, k) => {
    if (!el.dataset.min) return setup(el, k);
    const mq = matchMedia(`(min-width: ${el.dataset.min}px) and (hover: hover) and (pointer: fine)`);
    let done = false; const go = () => { if (!done && mq.matches) { done = true; setup(el, k); } };
    mq.addEventListener ? mq.addEventListener('change', go) : mq.addListener(go); go();
  });
})();