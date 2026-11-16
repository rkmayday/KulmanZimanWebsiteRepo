// Home opening: the ZS breaks into the website it builds.
// The logo (drawn by mono.js) is rebuilt here out of small 3D blocks in exactly the same place and angle. As you
// scroll it cracks apart, the blocks burst outward spinning in depth, then fly back together into a 3D browser
// window (frame, top bar, headline lines, a button, cards). The camera then pushes into the window: the
// placeholder content scatters, the frame grows past the edges of the screen, and the real headline sits in
// its screen. Driven entirely by the scroll (mono.js calls draw), so it plays forwards and backwards.
// Phones get fewer, larger blocks. Without WebGL (or with "reduce motion") mono.js keeps its own animation.
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const start = () => {
    const L = window.__kzLogo, T = window.THREE;
    if (!L || !T) return void setTimeout(start, 60);
    const scene3 = L.scene;
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
      B.push({ ux, uy, layer: k, dir, dist: .22 + rnd() * .62, spin: new T.Vector3(rnd() - .5, rnd() - .5, rnd() - .5).normalize(), turns: 2 + rnd() * 5, d: rnd(), t: null }); } });

    // ---------- the browser window the blocks build (in screen pixels, centred) ----------
    let layoutKey = '';
    const layout = (cw, ch) => {
      const key2 = cw + 'x' + ch; if (key2 === layoutKey) return; layoutKey = key2;
      const BW = phone ? cw * .9 : Math.min(cw * .8, 1040), BH = phone ? Math.min(ch * .74, BW * 1.55) : Math.min(ch * .74, BW * .6);
      // a solid web page made of blocks: as many places as there are blocks, so none go to waste
      const nC = Math.max(16, Math.round(Math.sqrt(N * BW / BH))), cs = BW / nC, nR = Math.max(10, Math.round(BH / cs));
      const FRAME = '#121212', BAR = '#1c1c1c', DOT = '#ececec', PAGE = '#f4f4f1', LINE = '#1e1e1e', BTN = '#0e0e0e', CARD = '#d6d6d1';
      const grid = Array.from({ length: nR }, () => Array(nC).fill(null));
      const put = (c, r, col, kind) => { if (r >= 0 && r < nR && c >= 0 && c < nC) grid[r][c] = { col, kind }; };
      for (let r = 0; r < nR; r++) for (let c = 0; c < nC; c++) put(c, r, PAGE, 'page');
      const bar = Math.max(2, Math.round(nR * .08));
      for (let c = 0; c < nC; c++) { put(c, 0, FRAME, 'frame'); put(c, nR - 1, FRAME, 'frame'); for (let r = 1; r <= bar; r++) put(c, r, BAR, 'frame'); }
      for (let r = 0; r < nR; r++) { put(0, r, FRAME, 'frame'); put(nC - 1, r, FRAME, 'frame'); }
      const dotR = Math.round(bar / 2 + .5), ds = Math.max(1, Math.round(nC * .012));
      [0, 1, 2].forEach(k => { const c0 = 2 + k * (ds + 1) * 2; for (let r = dotR - Math.floor(ds / 2); r < dotR - Math.floor(ds / 2) + ds; r++) for (let c = c0; c < c0 + ds; c++) put(c, r, DOT, 'frame'); });
      const inner = nC - 2, rowH = Math.max(1, Math.round(nR * .045));
      const line = (r0, w, h, col) => { const n = Math.round(inner * w), s0 = 1 + Math.round((inner - n) / 2); for (let r = r0; r < r0 + h; r++) for (let c = s0; c < s0 + n; c++) put(c, r, col, 'content'); };
      const r0 = bar + Math.round(nR * .14);
      line(r0, .64, rowH, LINE); line(r0 + rowH * 2, .5, rowH, LINE); line(r0 + rowH * 4, .32, Math.max(1, Math.round(rowH * .6)), LINE);
      line(r0 + rowH * 6, .18, rowH + 1, BTN);
      const cardsTop = r0 + rowH * 9, cw3 = Math.round(inner * .26), gap = Math.round((inner - cw3 * 3) / 4), cardH = Math.max(2, nR - 2 - cardsTop - 1);
      for (let k = 0; k < 3; k++) { const c0 = 1 + gap + k * (cw3 + gap); for (let r = cardsTop; r < cardsTop + cardH; r++) for (let c = c0; c < c0 + cw3; c++) put(c, r, CARD, 'content'); }
      const slots = [];
      for (let r = 0; r < nR; r++) for (let c = 0; c < nC; c++) { const o = grid[r][c]; slots.push({ x: (c + .5) * cs - BW / 2, y: BH / 2 - (r + .5) * cs, col: o.col, kind: o.kind, cs, r, c }); }
      // more places than blocks: leave gaps in the plain page first (never in the frame or the content)
      let use = slots;
      if (slots.length > N) { const keepAll = slots.filter(s => s.kind !== 'page'), page = slots.filter(s => s.kind === 'page'), room = Math.max(0, N - keepAll.length), step = page.length / Math.max(1, room);
        use = keepAll.concat(Array.from({ length: room }, (_, i) => page[Math.floor(i * step)])); }
      const order = B.map((b, i) => i).sort((i, j) => (B[i].ux - B[j].ux) || (B[j].uy - B[i].uy));
      const sorted = use.slice().sort((a, b) => (a.x - b.x) || (b.y - a.y));
      // each place gets one block, spread evenly; any blocks left over become dust that drifts away
      B.forEach(b => b.t = null);
      for (let k = 0; k < sorted.length; k++) B[order[Math.floor(k * order.length / sorted.length)]].t = sorted[k];
      B.forEach(b => b.tc = b.t ? C(b.t.col) : null);
    };

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
      layout(cw, ch);
    };
    size(); addEventListener('resize', () => { size(); window.__kzKick && window.__kzKick(); });
    // prepare the 3D graphics now (an invisible first frame), so the first scroll never hitches
    mat.opacity = 0; renderer.compile(scene, camera); renderer.render(scene, camera);

    window.__kzVox = {
      ready: true,
      draw(p, mx, my) {
        if (scene3.clientWidth !== cw || scene3.clientHeight !== ch) size();
        const S = L.S, W = L.W, H = L.H, depth = W * (phone ? .06 : .075);
        const show = sm((p - .062) / .02);                       // blocks take over from the drawn logo
        const fade = 1 - sm((p - .56) / .07);                      // the window melts away as the headline settles
        mat.opacity = show * fade; mesh.visible = mat.opacity > .003;
        canvas.style.visibility = mesh.visible ? 'visible' : 'hidden';
        if (!mesh.visible) { renderer.clear(); return; }
        e3.set(-S.rx * Math.PI / 180, S.ry * Math.PI / 180, 0, 'XYZ'); qLogo.setFromEuler(e3);
        const push = sm((p - .46) / .15), grow = 1 + push * push * 2.4;
        const tilt = new T.Euler(my * .12, mx * .2, 0, 'XYZ');
        const lcs = W / cols * .94;
        for (let i = 0; i < B.length; i++) {
          const b = B[i];
          const e = sm((p - .07 - b.d * .05) / .11), gT = sm((p - .17 - b.d * .1) / .15);
          // in the logo
          vL.set(b.ux * W * S.ls, b.uy * H * S.ls, -b.layer * depth * S.ls).applyQuaternion(qLogo); vL.y -= S.ly;
          // burst
          vE.copy(b.dir).multiplyScalar(W * b.dist).add(vL);
          v.copy(vL).lerp(vE, e);
          let s = lcs * S.ls, cTarget = null;
          if (b.t) {
            vT.set(b.t.x * grow, b.t.y * grow, 0).applyEuler(tilt);
            if (b.t.kind !== 'frame') vT.add(new T.Vector3(b.dir.x * .7, b.dir.y * .7, 1.2 + Math.abs(b.dir.z)).multiplyScalar(W * 1.1 * push * (.6 + b.d * .8)));
            v.lerp(vT, gT);
            s = s + (b.t.cs * .9 * grow - s) * gT;
            cTarget = b.tc;
          } else {
            v.lerp(vE.multiplyScalar(2.2), gT); s *= 1 - gT;               // dust: drifts off and vanishes
          }
          // rotation: the logo's angle, a tumble while flying, square to the camera once in place
          qSpin.setFromAxisAngle(b.spin, b.turns * e * (1 - gT));
          q.copy(qLogo).slerp(new T.Quaternion().setFromEuler(tilt), gT).multiply(qSpin);
          sc.set(s, s, s);
          m4.compose(v, q, sc); mesh.setMatrixAt(i, m4);
          col.copy(b.layer ? BACK : FRONT); if (cTarget) col.lerp(cTarget, gT);
          mesh.setColorAt(i, col);
        }
        mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
        renderer.render(scene, camera);
      }
    };
    window.__kzKick && window.__kzKick();
  };
  if (document.readyState === 'complete') start(); else addEventListener('load', start);
})();
