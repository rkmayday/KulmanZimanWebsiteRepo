// Kulman Ziman "Mono" theme. The one big interactive moment: the KZ logo stage on the home page.
// A solid 3D KZ turns as you scroll, then the K and the Z slide apart to reveal the headline.
// The logo is a real 3D model drawn with WebGL at the screen's full resolution (crisp and smooth on phones);
// if WebGL is unavailable it falls back to stacked CSS layers. Everything else on the site stays calm.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = v => { v = clamp(v); return v * v * (3 - 2 * v); };

  // thin reading-progress line
  const bar = $('.progress');
  let barRaf = 0;
  const onBar = () => { barRaf = 0; const max = document.documentElement.scrollHeight - innerHeight; bar && (bar.style.transform = `scaleX(${max > 0 ? (scrollY / max).toFixed(4) : 0})`); };
  addEventListener('scroll', () => { if (!barRaf) barRaf = requestAnimationFrame(onBar); }, { passive: true }); onBar();

  const stage = $('.kz-stage');
  if (!stage) return;
  const scene = $('.kz-scene', stage), logo = $('.kz-logo', stage), copy = $('.kz-copy', stage), word = $('.kz-word', stage),
        grid = $('.kz-grid', stage), cue = $('.kz-cue', stage), pin = $('.kz-pin', stage);

  // the headline, text and buttons live in the page's hero; move them into the stage (one copy of the content)
  const heroCopy = $('.hero .hero-copy'), heroTags = $('.hero .hero-tags');
  if (heroCopy) [...heroCopy.children].forEach(n => copy.append(n));
  if (heroTags) copy.append(heroTags);

  const phone = matchMedia('(max-width: 720px)').matches;
  const logoWidth = () => phone ? innerWidth * .86 : Math.min(innerWidth * .66, 820);

  // ---------- the logo: WebGL model (preferred) or CSS layers (fallback) ----------
  // K and Z outlines, traced from the logo (600 x 335 units), split where the two letters meet
  const K = [[0,0],[76,0],[76,137.42],[191.48,0],[283.45,0],[148.67,158.72],[303.05,333.19],[303.3,332.79],[303.3,335],[200.04,335],[76,192.2],[76,335],[0,335]];
  const Z = [[303.3,332.79],[467.61,67.03],[325.06,66.99],[324.97,.02],[488,0],[600.65,.03],[434.59,268],[590.03,268],[589.94,335],[303.3,335]];
  let gl = null;
  const T = window.THREE;
  if (T && !reduce) {
    try {
      const canvas = document.createElement('canvas'); canvas.className = 'kz-canvas'; canvas.setAttribute('aria-hidden', 'true');
      const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
      renderer.setClearColor(0xffffff, 0);
      renderer.outputEncoding = T.sRGBEncoding;
      let dpr = Math.min(devicePixelRatio || 1, 3);
      renderer.setPixelRatio(dpr);
      scene.append(canvas); logo.style.display = 'none';
      const s3 = new T.Scene();
      s3.add(new T.AmbientLight(0xffffff, .55));
      const key = new T.DirectionalLight(0xffffff, .9); key.position.set(-.6, .8, 1); s3.add(key);
      const fill = new T.DirectionalLight(0xffffff, .35); fill.position.set(.8, -.3, .4); s3.add(fill);
      const cam = new T.PerspectiveCamera(30, 1, 10, 6000);
      const root = new T.Group(); s3.add(root);
      const face = new T.MeshBasicMaterial({ color: 0x0a0a0a });                           // the black front, like the logo
      const side = new T.MeshLambertMaterial({ color: 0x3c3c3c, transparent: true });       // lit grey depth
      const halves = [new T.Group(), new T.Group()]; halves.forEach(h => root.add(h));
      let builtW = 0;
      const build = () => {
        const L = logoWidth(); if (Math.abs(L - builtW) < 1) return; builtW = L;
        const u = L / 600, D = L * (phone ? .06 : .075), bev = Math.max(.8, L * .0016);
        [K, Z].forEach((pts, i) => {
          const sh = new T.Shape(pts.map(([x, y]) => new T.Vector2((x - 300) * u, -(y - 167.5) * u)));
          const g = new T.ExtrudeGeometry(sh, { depth: D, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 1 });
          g.translate(0, 0, -D - bev);                                                           // front face sits at z = 0
          const h = halves[i]; h.children.forEach(m => m.geometry.dispose()); h.clear();
          h.add(new T.Mesh(g, [face, side]));
        });
      };
      const size = () => {
        const w = pin.clientWidth, h = pin.clientHeight;
        renderer.setSize(w, h, false);
        cam.aspect = w / h; cam.fov = 2 * Math.atan(h / 2 / 1500) * 180 / Math.PI;           // 1 unit = 1 CSS px at z = 0, like CSS perspective 1500px
        cam.position.set(0, 0, 1500); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix();
        build();
      };
      size();
      let lastW = innerWidth;
      addEventListener('resize', () => { if (innerWidth !== lastW) { lastW = innerWidth; size(); gl.dirty = true; kick(); } });
      const cFace = new T.Color(), cSide = new T.Color(0x6e6e6e);
      let slow = 0;
      gl = {
        dirty: true,
        draw(st, dt) {
          root.position.y = -st.ly; root.scale.setScalar(st.ls);
          root.rotation.set(-st.rx * Math.PI / 180, st.ry * Math.PI / 180, 0);
          halves[0].position.x = st.kx; halves[1].position.x = st.zx;
          const v = st.fv / 255; face.color.setRGB(v, v, v).convertSRGBToLinear();
          side.opacity = st.ho; side.visible = st.ho > .01;
          renderer.render(s3, cam);
          // keep it smooth on slower phones: after a run of slow frames, render at 2x instead of 3x
          if (dt > 0) { slow = slow * .9 + (dt > 22 ? 1 : 0) * .1; if (slow > .6 && dpr > 2) { dpr = 2; renderer.setPixelRatio(dpr); size(); slow = 0; } }
        }
      };
      stage.classList.add('gl');
    } catch (e) { gl = null; logo.style.display = ''; }
  }

  // CSS fallback: a stack of logo-shaped layers
  const fronts = [];
  if (!gl) {
    const N = reduce ? 1 : (phone ? 18 : 30);
    const buildLayers = half => {
      for (let i = N - 1; i >= 0; i--) {
        const l = document.createElement('div'); l.className = 'kz-layer' + (i === 0 ? ' front' : '');
        const c = Math.round(26 + i / Math.max(1, N - 1) * 120);
        l.style.setProperty('--c', i === 0 ? '#0a0a0a' : `rgb(${c},${c},${c})`);
        l.dataset.i = i; half.append(l); if (!i) fronts.push(l);
      }
    };
    buildLayers($('.kz-k', stage)); buildLayers($('.kz-z', stage));
    const setDepth = () => { const d = logo.offsetWidth * (phone ? .06 : .075); stage.querySelectorAll('.kz-layer').forEach(l => l.style.setProperty('--z', (-(+l.dataset.i) * d / Math.max(1, N - 1)).toFixed(2) + 'px')); };
    setDepth();
    let lw = innerWidth; addEventListener('resize', () => { if (innerWidth !== lw) { lw = innerWidth; setDepth(); } });
  }

  if (reduce) { document.documentElement.classList.add('no-kz'); return; }

  // ---------- scroll + pointer drive the scene ----------
  let target = 0, prog = 0, px = 0, py = 0, tpx = 0, tpy = 0, running = false, last = 0;
  const pinTop = () => parseFloat(getComputedStyle(pin).top) || 0;
  // after the animation, the pinned scene starts moving with the page gradually (its speed ramps from 0 to normal),
  // so the hand-off to normal scrolling has no jolt. Driven straight from the scroll position, so it never lags.
  const HOLD = .85;   // the headline is fully in at 85% of the range
  let pt = pinTop();
  addEventListener('resize', () => { pt = pinTop(); });
  const readScroll = () => {
    const r = stage.getBoundingClientRect(), range = Math.max(1, r.height - (innerHeight - pt));
    target = clamp((pt - r.top) / range);
    const H = (1 - HOLD) * range, h = clamp(target - HOLD, 0, 1 - HOLD) * range;
    pin.style.transform = h > 0 ? `translate3d(0,${(-(h * h) / (2 * H)).toFixed(1)}px,0)` : '';
    kick();
  };
  addEventListener('scroll', readScroll, { passive: true });
  addEventListener('pointermove', e => { if (e.pointerType === 'touch') return; tpx = e.clientX / innerWidth - .5; tpy = e.clientY / innerHeight - .5; kick(); }, { passive: true });

  // only draw while the stage can be seen
  let onScreen = true;
  new IntersectionObserver(es => { onScreen = es[0].isIntersecting; if (onScreen) kick(); }).observe(stage);

  const kick = () => { if (!running && onScreen) { running = true; last = 0; requestAnimationFrame(frame); } };
  function frame(now) {
    const dt = last ? now - last : 0; last = now;
    // frame-rate independent easing, so 120 Hz phones and 60 Hz screens feel the same
    const k1 = 1 - Math.pow(1 - .14, Math.max(1, dt / 16.67)), k2 = 1 - Math.pow(1 - .08, Math.max(1, dt / 16.67));
    prog += (target - prog) * k1; px += (tpx - px) * k2; py += (tpy - py) * k2;
    const p = prog * .87;            // the stage is 13% shorter than the timeline: same animation, half the hold after it
    const a = smooth(p / .42);                    // turn: shows the depth
    const b = smooth((p - .36) / .38);            // split: K and Z slide apart
    const spread = innerWidth * (phone ? .62 : .45);
    const st = {
      ry: -24 + a * 44 - b * 20 + px * 14, rx: 12 - a * 16 + b * 4 - py * 10,
      ls: 1 - b * .3, ly: -b * 24, kx: -b * spread, zx: b * spread,
      ho: 1 - smooth(b * 1.6), fv: 10 + b * 218
    };
    if (gl) gl.draw(st, dt);
    else {
      logo.style.setProperty('--ry', st.ry.toFixed(2) + 'deg'); logo.style.setProperty('--rx', st.rx.toFixed(2) + 'deg');
      logo.style.setProperty('--ls', st.ls.toFixed(4)); logo.style.setProperty('--ly', st.ly.toFixed(1) + 'px');
      logo.style.setProperty('--kx', st.kx.toFixed(1) + 'px'); logo.style.setProperty('--zx', st.zx.toFixed(1) + 'px');
      logo.style.setProperty('--ho', st.ho.toFixed(3)); logo.style.setProperty('--fv', Math.round(st.fv));
      fronts.forEach(f => f.style.setProperty('--sx', (25 + a * 45 + px * 25).toFixed(1) + '%'));
    }
    // the name settles under the logo, then makes room (transform/opacity only: cheap for the browser)
    word.style.opacity = (1 - smooth((p - .28) / .14)).toFixed(3);
    word.style.transform = `translateX(-50%) scale(${(1.06 - a * .06).toFixed(4)})`;
    cue.style.opacity = (1 - smooth(p / .06)).toFixed(3);
    grid.style.transform = `translate3d(0,${(-p * 140).toFixed(1)}px,0)`;
    // the headline rises into the gap
    const o = smooth((p - .5) / .24);
    copy.style.opacity = o.toFixed(3);
    copy.style.transform = `translate3d(0,${((1 - o) * 40).toFixed(1)}px,0)`;
    copy.classList.toggle('live', o > .6);
    if (Math.abs(target - prog) > .0004 || Math.abs(tpx - px) > .001 || Math.abs(tpy - py) > .001) requestAnimationFrame(frame); else running = false;
  }
  readScroll(); prog = target; frame(performance.now());
})();
