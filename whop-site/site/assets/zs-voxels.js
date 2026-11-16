// Home opening: the ZS cracks into blocks that crumble away.
// The logo (drawn by mono.js) is rebuilt here out of small 3D blocks in exactly the same place and angle. As you
// scroll a wave sweeps from left to right: ahead of it the logo stays smooth and whole; where it passes, the logo
// breaks into blocks that drift towards you, tumble and shrink away, then the headline appears. Driven by mono.js's paced progress (it never runs faster
// than a set speed), so it looks the same however fast you scroll, and it plays backwards too.
// Phones get fewer, larger blocks. Without WebGL (or with "reduce motion") mono.js keeps its own animation.
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const start = () => {
    const L = window.__kzLogo, T = window.THREE;
    if (!L || !T) return void setTimeout(start, 60);
    const scene3 = L.scene, logoCv = scene3.querySelector('.kz-canvas');
    let renderer;
    const canvas = document.createElement('canvas'); canvas.className = 'kz-gl';
    try { renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch (e) { return; }
    if (!renderer.getContext()) return;
    scene3.append(canvas);
    renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
    const phone = L.phone, D = 1500;
    const scene = new T.Scene(), camera = new T.PerspectiveCamera(30, 1, 1, 8000);
    scene.add(new T.HemisphereLight(0xffffff, 0x8a8a8a, .9));
    const key = new T.DirectionalLight(0xffffff, 1.4); key.position.set(.5, .8, 1); scene.add(key);
    const rim = new T.DirectionalLight(0xffffff, .5); rim.position.set(-1, -.3, .4); scene.add(rim);
    const C = h => new T.Color(h).convertSRGBToLinear();

    // ---------- the logo as blocks: sample the Z and S outlines on a grid ----------
    const cols = phone ? 62 : 96, rows = Math.round(cols * 335 / 600), layers = 2;
    const grid = document.createElement('canvas'); grid.width = cols; grid.height = rows;
    const g = grid.getContext('2d'); g.fillStyle = '#000';
    [L.ZP, L.SP].forEach(pts => { g.beginPath(); pts.forEach(([u, v], j) => { const x = u / 600 * cols, y = v / 335 * rows; j ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.fill(); });
    const px0 = g.getImageData(0, 0, cols, rows).data, cells = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (px0[(r * cols + c) * 4 + 3] > 120) cells.push([c, r]);
    const N = cells.length * layers;
    const geo = new T.BoxGeometry(1, 1, 1);
    const mat = new T.MeshStandardMaterial({ roughness: .42, metalness: .06, transparent: true, opacity: 1 });
    const mesh = new T.InstancedMesh(geo, mat, N); mesh.instanceMatrix.setUsage(T.DynamicDrawUsage); mesh.frustumCulled = false;
    mesh.instanceColor = new T.InstancedBufferAttribute(new Float32Array(N * 3), 3); mesh.instanceColor.setUsage(T.DynamicDrawUsage);
    scene.add(mesh);

    // per block: its place in the logo (unit square), a random burst, a delay
    const rnd = (() => { let s = 99; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    const B = [];
    cells.forEach(([c, r]) => { for (let k = 0; k < layers; k++) {
      const ux = (c + .5) / cols - .5, uy = .5 - (r + .5) / rows;
      const dir = new T.Vector3(ux + (rnd() - .5) * .25, uy + (rnd() - .5) * .25, (rnd() - .5) * .9).normalize();
      B.push({ ux, uy, layer: k, dir, r: rnd(), dist: .3 + rnd() * .7, spin: new T.Vector3(rnd() - .5, rnd() - .5, rnd() - .5).normalize(), turns: 2 + rnd() * 5, d: rnd(), t: null }); } });

    // ---------- draw: called by mono.js with the scroll progress ----------
    const sm = v => { v = Math.min(1, Math.max(0, v)); return v * v * (3 - 2 * v); };
    const m4 = new T.Matrix4(), q = new T.Quaternion(), qLogo = new T.Quaternion(), qSpin = new T.Quaternion(), e3 = new T.Euler(0, 0, 0, 'XYZ');
    const vL = new T.Vector3(), vE = new T.Vector3(), vT = new T.Vector3(), v = new T.Vector3(), sc = new T.Vector3(), col = new T.Color();
    const FRONT = C('#0e0e0e'), BACK = C('#8e8e8e');
    let cw = 0, ch = 0;
    const size = () => {
      cw = scene3.clientWidth; ch = scene3.clientHeight;
      renderer.setPixelRatio(Math.min(phone ? 1.5 : 2, devicePixelRatio || 1)); renderer.setSize(cw, ch, false);
      camera.aspect = cw / ch; camera.fov = 2 * Math.atan(ch / 2 / D) * 180 / Math.PI; camera.position.set(0, 0, D); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();
    };
    size(); addEventListener('resize', () => { size(); window.__kzKick && window.__kzKick(); });
    // prepare the 3D graphics now (an invisible first frame), so the first scroll never hitches
    mat.opacity = 0; renderer.compile(scene, camera); renderer.render(scene, camera);

    window.__kzVox = {
      ready: true,
      draw(p, mx, my) {
        if (scene3.clientWidth !== cw || scene3.clientHeight !== ch) size();
        const S = L.S, W = L.W, H = L.H, depth = W * (phone ? .06 : .075);
        // the breaking wave sweeps left to right across the logo. Ahead of it the smooth logo stays exactly as it is;
        // where it passes, the smooth logo is wiped away and blocks appear in its place and fly off at once.
        const f = (p - .095) / .3;                                  // wave position across the logo, 0 to 1
        const xL = -.56 * W, xR = .56 * W;                           // the logo's extent on screen
        const front = cw / 2 + xL + (xR - xL) * Math.max(0, f), soft = W * .035;
        if (f <= 0) logoCv.style.webkitMaskImage = logoCv.style.maskImage = '';
        else { const m = `linear-gradient(90deg, transparent ${(front - soft).toFixed(1)}px, #000 ${(front + soft).toFixed(1)}px)`; logoCv.style.webkitMaskImage = logoCv.style.maskImage = m; }
        const gone = 1 - sm((p - .52) / .05);                       // the last few are gone before the headline settles
        mat.opacity = gone; mesh.visible = f > 0 && gone > .003;
        canvas.style.visibility = mesh.visible ? 'visible' : 'hidden';
        if (!mesh.visible) { renderer.clear(); return; }
        e3.set(-S.rx * Math.PI / 180, S.ry * Math.PI / 180, 0, 'XYZ'); qLogo.setFromEuler(e3);
        const lcs = W / cols * 1.02;
        for (let i = 0; i < B.length; i++) {
          const b = B[i];
          vL.set(b.ux * W * S.ls, b.uy * H * S.ls, -b.layer * depth * S.ls).applyQuaternion(qLogo); vL.y -= S.ly;
          // where this block is on screen decides when the wave reaches it (a little ragged, so the edge crumbles)
          const sx = vL.x * D / (D - vL.z), xn = Math.min(1, Math.max(0, (sx - xL) / (xR - xL)));
          const reach = xn - b.r * .05;                             // the wave reaches this block when f passes it
          const e = sm((f - reach) / .55);
          if (f < reach) { sc.set(0, 0, 0); m4.compose(vL, qLogo, sc); mesh.setMatrixAt(i, m4); continue; }   // still smooth logo here
          vE.set(b.dir.x * .55 + .25, b.dir.y * .55 + .12, Math.abs(b.dir.z) * .8 + .35).multiplyScalar(W * b.dist);
          v.copy(vL).addScaledVector(vE, e * e);
          v.x += mx * 40 * e; v.y -= my * 30 * e;
          const s = lcs * S.ls * (1 - sm((e - .25) / .75));
          qSpin.setFromAxisAngle(b.spin, b.turns * e);
          q.copy(qLogo).multiply(qSpin);
          sc.set(s, s, s);
          m4.compose(v, q, sc); mesh.setMatrixAt(i, m4);
          mesh.setColorAt(i, b.layer ? BACK : FRONT);
        }
        mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
        renderer.render(scene, camera);
      }
    };
    window.__kzKick && window.__kzKick();
  };
  if (document.readyState === 'complete') start(); else addEventListener('load', start);
})();
