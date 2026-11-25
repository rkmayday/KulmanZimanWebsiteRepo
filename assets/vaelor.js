// Vaelor (watch demo): the watch is built entirely in code with Three.js, no photos or video.
//  1. The opening: one scroll turns the watch and opens it up, layer by layer (the stage's --i / --p from sample2.js).
//  2. "Make it yours": a second view of the same watch, with dial, case and strap options, drag to turn, and "Open it up".
// The hands keep time, the balance wheel swings and the gears turn while the watch is on screen.
(() => {
  const T = window.THREE; if (!T) return;
  const ASSETS = ((document.currentScript && document.currentScript.src) || '').replace(/[?#].*$/, '').replace(/[^/]*$/, '');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch = !matchMedia('(hover: hover) and (pointer: fine)').matches;
  const cl = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), sm = v => { v = cl(v); return v * v * (3 - 2 * v); }, mix = (a, b, t) => a + (b - a) * t;
  const C = h => new T.Color(h).convertSRGBToLinear();
  const TAU = Math.PI * 2;
  const tex = (w, h, draw, srgb = true) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c); if (srgb) t.encoding = T.sRGBEncoding; t.anisotropy = 4; t.redraw = () => { draw(c.getContext('2d'), w, h); t.needsUpdate = true; }; return t; };

  // ---------- options (the "Make it yours" section uses the same names) ----------
  const DIALS = { charcoal: ['#2d2e31', '#ecebe6'], midnight: ['#11213f', '#edf1f7'], forest: ['#183427', '#ecf0e6'], oxblood: ['#5c1522', '#f2e6d8'] };
  const CASES = { steel: ['#d3d7db', .16], rose: ['#e2ab8f', .2], noir: ['#2b2b2f', .34] };
  const STRAPS = { bracelet: null, leather: ['#4a2819', .72], rubber: ['#17171a', .88] };

  // ---------- textures ----------
  const dialTex = key => tex(1024, 1024, (g, w) => {
    const [base, ink] = DIALS[key], r = w / 2, light = key === 'ivory';
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, w); g.translate(r, r);
    g.fillStyle = base; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
    // sunburst brushing: fine lines from the centre that catch the light in two broad bands
    for (let i = 0; i < 1400; i++) {
      const a = i / 1400 * TAU, band = Math.pow(Math.abs(Math.cos(a - .7)), 6), n = (Math.sin(i * 12.9898) * 43758.5453) % 1;
      g.strokeStyle = light ? `rgba(120,96,60,${.015 + .05 * Math.abs(n)})` : `rgba(255,236,220,${.012 + .11 * band + .025 * Math.abs(n)})`;
      g.lineWidth = 1.6; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); g.stroke();
    }
    const vg = g.createRadialGradient(0, 0, r * .2, 0, 0, r); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, light ? 'rgba(60,40,20,.18)' : 'rgba(0,0,0,.42)');
    g.fillStyle = vg; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
    // minute track
    g.strokeStyle = ink; g.globalAlpha = .85;
    for (let k = 0; k < 60; k++) { const a = k / 60 * TAU, big = k % 5 === 0; g.lineWidth = big ? 5 : 2.2;
      g.beginPath(); g.moveTo(Math.sin(a) * r * (big ? .905 : .925), -Math.cos(a) * r * (big ? .905 : .925)); g.lineTo(Math.sin(a) * r * .965, -Math.cos(a) * r * .965); g.stroke(); }
    g.globalAlpha = 1;
    // name and calibre
    const spaced = (txt, y, font, gap, alpha = 1) => { g.font = font; g.globalAlpha = alpha; g.fillStyle = ink; g.textBaseline = 'middle';
      const ws = [...txt].map(ch => g.measureText(ch).width), tw = ws.reduce((s, x) => s + x, 0) + gap * (txt.length - 1); let x = -tw / 2;
      [...txt].forEach((ch, i) => { g.fillText(ch, x, y); x += ws[i] + gap; }); g.globalAlpha = 1; };
    spaced('VAELOR', -r * .36, `500 ${r * .118}px "Bodoni Moda", "Didot", Georgia, serif`, r * .018);
    spaced('AUTOMATIC', r * .4, `500 ${r * .04}px "IBM Plex Mono", monospace`, r * .02, .85);
    spaced("DIVER'S 200m", r * .48, `600 ${r * .042}px "Hanken Grotesk", Arial, sans-serif`, r * .012, .9);
    // date window at 3 o'clock
    g.fillStyle = light ? '#1d1813' : '#0d0b0a'; g.fillRect(r * .575, -r * .072, r * .17, r * .144);
    g.fillStyle = '#f6f1e8'; g.fillRect(r * .59, -r * .058, r * .14, r * .116);
    g.fillStyle = '#16120f'; g.font = `600 ${r * .085}px "Hanken Grotesk", Arial, sans-serif`; g.textAlign = 'center'; g.fillText('24', r * .66, r * .006); g.textAlign = 'left';
  });
  const insertTex = () => tex(1024, 1024, (g, w) => {
    const r = w / 2, ri = r * .848 / .952, mid = (r + ri) / 2; g.setTransform(1, 0, 0, 1, 0, 0); g.translate(r, r);
    g.fillStyle = '#141416'; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.arc(0, 0, ri - 6, 0, TAU, true); g.fill('evenodd');
    g.fillStyle = g.strokeStyle = '#dcd9d2'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let k = 1; k < 60; k++) { const a = k / 60 * TAU; g.save(); g.rotate(a);
      if (k % 10 === 0) { g.font = `600 ${r * .085}px "Hanken Grotesk", Arial, sans-serif`; g.fillText(String(k), 0, -mid); }
      else if (k % 5 === 0) g.fillRect(-r * .012, -r + r * .035, r * .024, r * .075);
      else if (k < 15) { g.beginPath(); g.arc(0, -mid, r * .012, 0, TAU); g.fill(); }
      g.restore(); }
    g.beginPath(); g.moveTo(0, -r + r * .03); g.lineTo(r * .05, -ri - r * .0); g.lineTo(-r * .05, -ri); g.closePath(); g.fill();
    g.fillStyle = '#141416'; g.beginPath(); g.arc(0, -mid + r * .012, r * .018, 0, TAU); g.fill();
  });
  const perlage = () => tex(512, 512, (g, w) => {
    g.fillStyle = '#b4b9bd'; g.fillRect(0, 0, w, w);
    let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let y = -20; y < w + 20; y += 22) for (let x = -20; x < w + 20; x += 22) {
      const cx = x + (rnd() - .5) * 8 + ((y / 22) % 2) * 11, cy = y + (rnd() - .5) * 8, rg = g.createRadialGradient(cx, cy, 2, cx, cy, 20);
      rg.addColorStop(0, 'rgba(255,255,255,.55)'); rg.addColorStop(.45, 'rgba(150,155,160,.25)'); rg.addColorStop(.7, 'rgba(255,255,255,.4)'); rg.addColorStop(1, 'rgba(120,125,130,.3)');
      g.fillStyle = rg; g.beginPath(); g.arc(cx, cy, 20, 0, TAU); g.fill(); }
  });
  const stripes = () => { const t = tex(512, 512, (g, w) => {
    for (let i = -w; i < w * 2; i += 40) { const lg = g.createLinearGradient(i, 0, i + 40, 0);
      lg.addColorStop(0, '#9da3a8'); lg.addColorStop(.5, '#eef1f3'); lg.addColorStop(1, '#a3a9ae');
      g.fillStyle = lg; g.fillRect(i, 0, 40, w); } }); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(.75, .75); t.rotation = .5; return t; };
  const rotorTex = () => { const t = tex(1024, 1024, (g, w) => {
    const r = w / 2; g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#c99a52'; g.fillRect(0, 0, w, w); g.translate(r, r);
    for (let k = 0; k < 220; k++) { g.strokeStyle = `rgba(${k % 2 ? '255,236,190' : '120,82,30'},${.05 + (k % 7) * .012})`; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, k * 2.3, 0, TAU); g.stroke(); }
    // the shape spans -0.74..0.74, so the engraving sits on an arc in the top half
    g.fillStyle = 'rgba(70,42,12,.85)'; g.font = `600 ${r * .07}px "IBM Plex Mono", monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const txt = 'VAELOR · AUTOMATIC · 24 JEWELS'; const R = r * .62, span = 2.2;
    [...txt].forEach((ch, i) => { const a = -Math.PI / 2 - span / 2 + span * (i + .5) / txt.length; g.save(); g.rotate(a + Math.PI / 2); g.fillText(ch, 0, -R); g.restore(); });
  }); t.repeat.set(1 / 1.48, 1 / 1.48); t.offset.set(.5, .5); return t; };

  // ---------- shapes ----------
  const extrude = (shape, depth, z = 0, bevel = 0) => { const g = new T.ExtrudeGeometry(shape, { depth, curveSegments: 10, bevelEnabled: !!bevel, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1 }); g.translate(0, 0, z); return g; };
  const lathe = (pts, z = 0) => { const g = new T.LatheGeometry(pts.map(([r, y]) => new T.Vector2(r, y)), 128); g.rotateX(Math.PI / 2); g.translate(0, 0, z); g.computeVertexNormals(); return g; };
  const disc = (r, h, z, seg = 96) => { const g = new T.CylinderGeometry(r, r, h, seg); g.rotateX(Math.PI / 2); g.translate(0, 0, z); return g; };
  const gear = (n, r, td, holes = 0, saw = false) => {
    const s = new T.Shape(), ri = r - td, da = TAU / n, P = (rr, a) => [Math.cos(a) * rr, Math.sin(a) * rr];
    const pts = []; for (let i = 0; i < n; i++) { const a = i * da;
      if (saw) pts.push(P(ri, a), P(r, a + da * .18), P(ri * .97, a + da * .55));
      else pts.push(P(ri, a), P(r, a + da * .22), P(r, a + da * .48), P(ri, a + da * .7)); }
    s.moveTo(...pts[0]); pts.slice(1).forEach(p => s.lineTo(...p)); s.closePath();
    for (let k = 0; k < holes; k++) { const a = k / holes * TAU + .3, h = new T.Path(); h.absarc(Math.cos(a) * ri * .56, Math.sin(a) * ri * .56, ri * .27, 0, TAU, true); s.holes.push(h); }
    const c = new T.Path(); c.absarc(0, 0, Math.min(.014, r * .12), 0, TAU, true); s.holes.push(c);
    return s; };
  const capsule = (x1, y1, x2, y2, w) => { const a = Math.atan2(y2 - y1, x2 - x1), s = new T.Shape();
    s.absarc(x2, y2, w, a - Math.PI / 2, a + Math.PI / 2, false); s.absarc(x1, y1, w, a + Math.PI / 2, a + Math.PI * 1.5, false); s.closePath(); return s; };
  const dauphine = (len, w) => { const s = new T.Shape(); s.moveTo(0, -.07); s.lineTo(w * .55, 0); s.lineTo(w, .07); s.lineTo(0, len); s.lineTo(-w, .07); s.lineTo(-w * .55, 0); s.closePath(); return s; };

  // ---------- the watch ----------
  const makeWatch = (opt = {}) => {
    const st = { dial: opt.dial || 'charcoal', case: opt.case || 'steel', strap: opt.strap || 'bracelet' };
    const root = new T.Group(), M = (o) => new T.MeshStandardMaterial(o);
    const caseM = M({ metalness: 1, roughness: .16, side: T.DoubleSide }), brushM = M({ metalness: 1, roughness: .32 });
    const strapM = M({ metalness: 0, roughness: .7 });
    const glassM = new T.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: .02, transparent: true, opacity: .22, clearcoat: 1, clearcoatRoughness: .02, envMapIntensity: 1.6, depthWrite: false });
    const edgeM = new T.MeshPhysicalMaterial({ color: C('#e9f1f4'), metalness: 0, roughness: .05, transparent: true, opacity: .55, clearcoat: 1, side: T.DoubleSide, depthWrite: false });
    const plateM = M({ map: perlage(), metalness: .85, roughness: .38 }), bridgeM = M({ map: stripes(), metalness: .9, roughness: .3 });
    const goldM = M({ color: C('#d6a656'), metalness: 1, roughness: .26 }), ratchetM = M({ color: C('#dfe3e6'), metalness: 1, roughness: .14 });
    const rubyM = new T.MeshPhysicalMaterial({ color: C('#a3102a'), metalness: 0, roughness: .08, clearcoat: 1, emissive: C('#3a0008') });
    const blueM = M({ color: C('#1f3f9e'), metalness: 1, roughness: .28 }), rotorM = M({ map: rotorTex(), metalness: 1, roughness: .3 });
    const accentM = M({ color: C('#c9a45f'), metalness: 1, roughness: .22 }), darkM = M({ color: C('#151312'), metalness: .4, roughness: .5 });
    let dialMap = dialTex(st.dial); const dialM = M({ map: dialMap, metalness: .25, roughness: .42 });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => dialMap.redraw());
    const mesh = (g, m, parent) => { const o = new T.Mesh(g, m); parent.add(o); return o; };
    const layer = (out) => { const g = new T.Group(); g.userData.out = out; root.add(g); return g; };

    // layers, front to back; "out" is how far each one moves along the watch's axis when it opens up
    const crystal = layer(2.5), bezel = layer(1.95), hands = layer(1.45), dial = layer(1.0), move = layer(.45), body = layer(0), rotor = layer(-.8), back = layer(-1.4);

    mesh(disc(.835, .022, .215), glassM, crystal);
    mesh(new T.CylinderGeometry(.836, .836, .024, 96, 1, true).rotateX(Math.PI / 2).translate(0, 0, .215), edgeM, crystal);
    mesh(lathe([[.82, .15], [.985, .15], [1.005, .165], [.995, .19], [.94, .216], [.85, .218], [.82, .205], [.82, .15]]), caseM, bezel);
    mesh(new T.RingGeometry(.848, .952, 160).translate(0, 0, .2195), M({ map: insertTex(), metalness: .35, roughness: .35 }), bezel);
    // case middle, lugs, crown
    mesh(lathe([[.86, -.15], [.975, -.15], [1.012, -.12], [1.03, -.06], [1.03, .06], [1.012, .12], [.985, .15], [.86, .15], [.86, -.15]]), caseM, body);
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) { const l = mesh(new T.BoxGeometry(.15, .4, .19), caseM, body); l.position.set(sx * .41, sy * 1.03, -.03); l.rotation.x = sy * .14; }
    const crown = mesh(extrude(gear(26, .115, .012), .13, -.065), brushM, body); crown.rotation.y = Math.PI / 2; crown.position.set(1.12, 0, 0);
    mesh(new T.CylinderGeometry(.035, .035, .12, 16).rotateZ(Math.PI / 2).translate(1.04, 0, 0), caseM, body);
    // dial: the face, applied hour markers, and a thin ring around it
    mesh(new T.CircleGeometry(.84, 128).translate(0, 0, .075), dialM, dial);
    const lumeM = M({ color: C('#e8e5da'), metalness: 0, roughness: .55 });
    for (let h = 0; h < 12; h++) { if (h === 3) continue; const a = h / 12 * TAU, big = h % 3 === 0;
      for (const dx of (h === 0 ? [-.042, .042] : [0])) { const wv = h === 0 ? .056 : big ? .086 : .07, hv = big ? .17 : .13, rr = .645;
        const px = Math.sin(a) * rr + Math.cos(a) * dx, py = Math.cos(a) * rr - Math.sin(a) * dx;
        const f = mesh(new T.BoxGeometry(wv, hv, .02), caseM, dial); f.position.set(px, py, .086); f.rotation.z = -a;
        const l = mesh(new T.BoxGeometry(wv - .024, hv - .024, .02), lumeM, dial); l.position.set(px, py, .0875); l.rotation.z = -a; } }
    mesh(lathe([[.79, .075], [.845, .075], [.845, .095], [.79, .08]]), darkM, dial);
    // hands
    const hourH = new T.Group(), minH = new T.Group(), secH = new T.Group(); hands.add(hourH, minH, secH);
    mesh(extrude(dauphine(.42, .046), .006, .1, .003), caseM, hourH);
    mesh(extrude(dauphine(.64, .036), .006, .112, .003), caseM, minH);
    mesh(new T.BoxGeometry(.012, .86, .006).translate(0, .26, .126), accentM, secH);
    mesh(new T.CylinderGeometry(.034, .034, .008, 24).rotateX(Math.PI / 2).translate(0, -.12, .126), accentM, secH);
    mesh(new T.CylinderGeometry(.03, .03, .03, 24).rotateX(Math.PI / 2).translate(0, 0, .12), accentM, hands);
    // the movement: plate, bridges, wheels, jewels, blued screws and the balance wheel
    const mv = { plate: new T.Group(), bridges: new T.Group(), wheels: new T.Group(), balance: new T.Group() }; Object.values(mv).forEach(g => move.add(g));
    mesh(disc(.78, .05, -.055), plateM, mv.plate);
    [capsule(-.62, .18, -.05, .5, .2), capsule(.05, .58, .55, .02, .1), capsule(-.62, -.5, -.18, -.32, .075), capsule(.55, -.35, .2, -.55, .06)]
      .forEach(s => mesh(extrude(s, .035, -.03, .004), bridgeM, mv.bridges));
    const wheel = (n, r, td, holes, x, y, z, m, saw) => { const g = new T.Group(); g.position.set(x, y, 0); mesh(extrude(gear(n, r, td, holes, saw), .02, z), m, g); mv.wheels.add(g);
      mesh(new T.CylinderGeometry(.024, .024, .02, 16).rotateX(Math.PI / 2).translate(0, 0, z + .025), rubyM, g); return g; };
    const W = {
      ratchet: wheel(48, .2, .016, 0, -.33, .26, .009, ratchetM),
      center: wheel(64, .19, .014, 5, .14, .02, .009, goldM),
      third: wheel(50, .15, .013, 5, .42, .3, .03, goldM),
      fourth: wheel(44, .12, .012, 4, .5, -.1, .009, goldM),
      escape: wheel(15, .085, .022, 0, .3, -.38, .03, goldM, true) };
    for (const [x, y] of [[-.55, .35], [-.12, .58], [.3, .42], [.5, .14], [-.45, -.47], [.42, -.46]]) mesh(new T.CylinderGeometry(.03, .03, .018, 18).rotateX(Math.PI / 2).translate(x, y, .014), blueM, mv.bridges);
    for (const [x, y] of [[-.05, .44], [.31, .22], [-.35, -.4]]) mesh(new T.CylinderGeometry(.022, .022, .018, 16).rotateX(Math.PI / 2).translate(x, y, .014), rubyM, mv.bridges);
    const bal = new T.Group(); bal.position.set(-.1, -.42, .03); mv.balance.add(bal);
    mesh(new T.TorusGeometry(.19, .014, 10, 72), goldM, bal);
    for (let k = 0; k < 2; k++) { const sp = mesh(new T.BoxGeometry(.37, .018, .01), goldM, bal); sp.rotation.z = k * Math.PI / 2; }
    for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; mesh(new T.SphereGeometry(.014, 10, 8).translate(Math.cos(a) * .205, Math.sin(a) * .205, 0), goldM, bal); }
    { const pts = []; for (let k = 0; k <= 220; k++) { const a = k / 220 * TAU * 5, rr = .03 + .12 * k / 220; pts.push(new T.Vector3(Math.cos(a) * rr, Math.sin(a) * rr, .012)); }
      mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 400, .0035, 4), blueM, mv.balance).position.copy(bal.position); }
    mesh(extrude(capsule(-.48, -.7, -.1, -.42, .055), .022, .046, .003), bridgeM, mv.balance);
    mesh(new T.CylinderGeometry(.02, .02, .012, 16).rotateX(Math.PI / 2).translate(-.1, -.42, .068), rubyM, mv.balance);
    // the rotor that winds it, and the caseback with its sapphire window
    const rot = new T.Group(); rot.position.z = -.115; rotor.add(rot);
    { const s = new T.Shape(); s.absarc(0, 0, .74, 0, Math.PI, false); s.absarc(0, 0, .1, Math.PI, 0, true); s.closePath(); mesh(extrude(s, .028, 0, .004), rotorM, rot);
      mesh(new T.CylinderGeometry(.09, .09, .04, 32).rotateX(Math.PI / 2), goldM, rot); }
    mesh(lathe([[.6, -.2], [.97, -.2], [1.0, -.175], [.995, -.15], [.6, -.15], [.6, -.2]]), brushM, back);
    mesh(disc(.6, .015, -.19), glassM, back);

    // strap: links (or one piece of leather or rubber) running up from the lugs and curling back
    let strap = new T.Group(); body.add(strap);
    const buildStrap = () => {
      body.remove(strap); strap.traverse(o => o.geometry && o.geometry.dispose()); strap = new T.Group(); body.add(strap);
      const N = 13, span = 2.35, R = 1.0, d = span / N, L = R * d;
      for (const sg of [1, -1]) for (let k = 0; k < N; k++) {
        const th = (k + .5) * d, y = sg * (1.2 + R * Math.sin(th)), z = -.04 - R * (1 - Math.cos(th)), taper = 1 - k / N * .16;
        const put = (w, h, t, x, m, dz = 0) => { const b = mesh(new T.BoxGeometry(w * taper, h, t), m, strap); b.position.set(x * taper, y, z + dz); b.rotation.x = -sg * th; };
        if (st.strap === 'bracelet') { put(.3, L - .022, .1, 0, caseM, .006); put(.17, L - .022, .09, .245, brushM); put(.17, L - .022, .09, -.245, brushM); }
        else put(.68, L + .006, st.strap === 'rubber' ? .085 : .07, 0, strapM);
      }
    };
    const apply = () => {
      const [cc, cr] = CASES[st.case]; caseM.color.copy(C(cc)); caseM.roughness = cr; brushM.color.copy(C(cc)); brushM.roughness = cr + .16;
      if (STRAPS[st.strap]) { strapM.color.copy(C(STRAPS[st.strap][0])); strapM.roughness = STRAPS[st.strap][1]; }
      buildStrap();
    };
    apply();

    return {
      group: root,
      set(k, v) { if (st[k] === v) return; st[k] = v;
        if (k === 'dial') { const old = dialMap; dialMap = dialTex(v); dialM.map = dialMap; dialM.needsUpdate = true; old.dispose(); } else apply(); },
      // t: seconds, ex: 0 closed .. 1 opened up
      update(t, ex) {
        for (const g of root.children) g.position.z = g.userData.out * ex;
        mv.bridges.position.z = .1 * ex; mv.wheels.position.z = .2 * ex; mv.balance.position.z = .3 * ex;
        // 10:09, with a sweeping seconds hand (8 beats a second)
        const s = (Math.floor((t + 31) * 8) / 8) % 60;
        secH.rotation.z = -s / 60 * TAU; minH.rotation.z = -(9 + s / 60) / 60 * TAU; hourH.rotation.z = -(10 + (9 + s / 60) / 60) / 12 * TAU;
        bal.rotation.z = Math.sin(t * TAU * 2.5) * 1.7;
        W.escape.rotation.z = -Math.floor(t * 5) / 15 * TAU * .5; W.fourth.rotation.z = t * .5; W.third.rotation.z = -t * .12; W.center.rotation.z = t * .03; W.ratchet.rotation.z = -t * .01;
        rot.rotation.z = Math.sin(t * .35) * 1.3 + t * .05;
      }
    };
  };

  // ---------- studio lighting, as reflections ----------
  const studio = renderer => {
    const pm = new T.PMREMGenerator(renderer), env = new T.Scene();
    const sky = new T.Mesh(new T.SphereGeometry(10, 32, 16), new T.MeshBasicMaterial({ side: T.BackSide, vertexColors: true }));
    { const g = sky.geometry, P = g.attributes.position, col = [], lo = C('#2a2623'), hi = C('#efe9df');
      for (let i = 0; i < P.count; i++) { const c = lo.clone().lerp(hi, sm((P.getY(i) / 10 + .25) / 1.1)); col.push(c.r, c.g, c.b); }
      g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); }
    env.add(sky);
    [[7, 3, -4, 5, 4, '#ffffff', 5], [2, 7, 6, 1, 3, '#fff4e6', 3], [6, 1.2, 0, -2, 6, '#ffffff', 1.4], [3, 3, -6, -1, -2, '#ffe3c4', 1.2]].forEach(([w, h, x, y, z, k, s]) => {
      const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(k).multiplyScalar(s), side: T.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m); });
    const t = pm.fromScene(env, .03).texture; pm.dispose(); return t;
  };
  const renderer = canvas => {
    let r; try { r = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch (e) { return null; }
    if (!r.getContext()) return null;
    r.outputEncoding = T.sRGBEncoding; r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 1.02; r.physicallyCorrectLights = true; return r;
  };
  const dpr = () => Math.min(touch ? 1.75 : 2, devicePixelRatio || 1);
  const clock = performance.now();
  const now = () => (performance.now() - clock) / 1000;

  // ---------- 1. the opening: the real photo of the watch, cut into its layers (assets/vaelor/, made by
  //      src/samples/vaelor-src/make-layers.py), coming apart along the watch's axis as you scroll ----------
  (() => {
    const stage = document.querySelector('.vl-stage'), mark = stage && stage.querySelector('.mark'); if (!mark) return;
    const canvas = document.createElement('canvas'); canvas.className = 'vl-3d';
    const R = renderer(canvas); if (!R) { mark.classList.add('no-3d'); return; }
    mark.prepend(canvas);
    const scene = new T.Scene(); scene.environment = studio(R);
    const cam = new T.PerspectiveCamera(28, 1, .1, 60); cam.position.set(0, 0, 9);
    // where each layer sits in the photo, in pixels; 1 unit = the bezel's radius
    const PX = 398, CX = 1295.8, CY = 959.4, HEAD = [886, 549, 1706, 1369], BODY = [880, 0, 1770, 1848];
    const group = new T.Group(); group.visible = false; scene.add(group);
    const steelM = new T.MeshStandardMaterial({ color: C('#8f9398'), metalness: 1, roughness: .34 });
    const darkM = new T.MeshStandardMaterial({ color: C('#4d5054'), metalness: 1, roughness: .38 });
    const blackM = new T.MeshStandardMaterial({ color: C('#161618'), metalness: .4, roughness: .5 });
    const glassM = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .35, depthWrite: false, side: T.DoubleSide });
    const loader = new T.TextureLoader(), layers = []; let waiting = 0;
    // z: where it sits when the watch is closed; out: how far it travels when it opens up; rim: its edge [radius, depth, material]
    const add = (name, box, z, out, order, rim) => {
      const g = new T.Group(); g.userData = { z, out }; group.add(g); waiting++;
      const map = loader.load(ASSETS + 'vaelor/' + name + '.webp?v=1', () => { if (--waiting === 0) { group.visible = true; mark.classList.add('has-3d'); } });
      map.encoding = T.sRGBEncoding; map.anisotropy = R.capabilities.getMaxAnisotropy();
      const mat = new T.MeshBasicMaterial({ map, transparent: true, depthWrite: false, toneMapped: false });
      const pl = new T.Mesh(new T.PlaneGeometry((box[2] - box[0]) / PX, (box[3] - box[1]) / PX), mat);
      pl.position.set(((box[0] + box[2]) / 2 - CX) / PX, -((box[1] + box[3]) / 2 - CY) / PX, 0); pl.renderOrder = order; g.add(pl);
      if (rim) { const [r, d, m] = rim; const c = new T.Mesh(new T.CylinderGeometry(r, r, d, 160, 1, true).rotateX(Math.PI / 2).translate(0, 0, -d / 2 - .003), m); c.renderOrder = order; g.add(c); }
      layers.push({ g, mat }); return mat;
    };
    add('caseback', HEAD, -.22, -1.15, 1, [.975, .06, steelM]);
    add('case', BODY, 0, 0, 2, [.985, .24, steelM]);
    add('movement', HEAD, -.06, .7, 3, [.724, .07, darkM]);
    add('dial', HEAD, .015, 1.55, 4, [.761, .03, blackM]);
    add('bezel', HEAD, .045, 2.2, 5, [1.0, .075, darkM]);
    const crystal = add('crystal', HEAD, .07, 2.85, 6, [.761, .03, glassM]);
    let W = 1, H = 1;
    const size = () => { const r = mark.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height); R.setPixelRatio(dpr()); R.setSize(W, H, false); cam.aspect = W / H; cam.updateProjectionMatrix(); };
    const v = k => parseFloat(stage.style.getPropertyValue(k)) || 0;
    const frame = () => {
      const t = now(); let i = v('--i'), p = v('--p'); const mx = v('--mx'), my = v('--my');
      if (reduce) { i = 1; p = 1; }
      const halfH = Math.tan(14 * Math.PI / 180) * 9, halfW = halfH * W / H, wide = W / H > 1.05;
      // it starts as the photo, straight on; then it turns, opens up, and makes room for the headline
      const turn = sm(p / .4), ex = sm((p - .1) / .52), mv = sm((p - .22) / .46);
      let s0, s1, x0, y0, x1, y1, ry1, rx1;
      if (wide) { s0 = Math.min(1, halfH * .44, halfW * .4); s1 = Math.min(.86, halfW * .21, halfH * .4); ry1 = .88; rx1 = -.1;
        x0 = 0; y0 = -.05; x1 = halfW * .43 - .6 * s1; y1 = 0; }
      else { s0 = Math.min(.78, halfW * .62); s1 = Math.min(.37, halfW * .31); ry1 = .62; rx1 = -.62;
        x0 = 0; y0 = halfH * .02; x1 = -halfW * .13; y1 = halfH * .535; }
      const sway = reduce ? 0 : Math.sin(t * .5) * .03 * (1 - turn);
      group.position.set(mix(x0, x1, mv), mix(y0, y1, mv) - (1 - i) * .25, 0);
      group.scale.setScalar(mix(s0, s1, mv) * (.94 + .06 * i));
      group.rotation.set(mix(0, rx1, turn) + my * .12, mix(0, ry1, turn) + mx * .18 + sway, 0);
      for (const L of layers) { L.g.position.z = L.g.userData.z + L.g.userData.out * ex; L.mat.opacity = i; }
      crystal.opacity = i * mix(.3, 1, ex);
      R.render(scene, cam);
    };
    let on = true, raf = 0;
    const loop = () => { raf = 0; if (!on) return; frame(); raf = requestAnimationFrame(loop); };
    new IntersectionObserver(es => { on = es[0].isIntersecting && !document.hidden; if (on && !raf) loop(); }).observe(stage.querySelector('.pin') || stage);
    document.addEventListener('visibilitychange', () => { on = !document.hidden; if (on && !raf) loop(); });
    addEventListener('resize', size); size(); loop();
  })();

  // ---------- 2. "Make it yours" ----------
  const view = document.querySelector('.vl-view'); if (!view) return;
  const PRICE = { base: 5400, case: { steel: 0, rose: 7200, noir: 900 }, strap: { bracelet: 0, leather: -350, rubber: -450 } };
  const NAMES = { charcoal: 'Charcoal', oxblood: 'Oxblood', midnight: 'Midnight', forest: 'Forest', steel: 'steel case', rose: 'rose gold case', noir: 'black case', bracelet: 'steel bracelet', leather: 'leather strap', rubber: 'rubber strap' };
  const pick = { dial: 'charcoal', case: 'steel', strap: 'bracelet' };
  const price = document.getElementById('vl-price'), sum = document.getElementById('vl-sum'), dialName = document.getElementById('vl-dial-n');
  const text = () => {
    const n = PRICE.base + PRICE.case[pick.case] + PRICE.strap[pick.strap];
    if (price) price.textContent = '$' + n.toLocaleString('en-US');
    if (sum) sum.textContent = `${NAMES[pick.dial]} dial · ${NAMES[pick.case]} · ${pick.case !== 'steel' && pick.strap === 'bracelet' ? NAMES[pick.case].replace(' case', '') + ' bracelet' : NAMES[pick.strap]}`;
    if (dialName) dialName.textContent = NAMES[pick.dial];
  };
  let watch = null;
  for (const k of ['dial', 'case', 'strap']) {
    const box = document.getElementById('vl-' + k); if (!box) continue;
    box.addEventListener('click', e => { const b = e.target.closest('button[data-v]'); if (!b) return;
      box.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); pick[k] = b.dataset.v; text(); if (watch) watch.set(k, b.dataset.v); });
  }
  text();
  const openBtn = view.querySelector('.vl-open'); let open = 0, openT = 0;
  openBtn && openBtn.addEventListener('click', () => { openT = openT ? 0 : 1; openBtn.setAttribute('aria-pressed', !!openT); openBtn.textContent = openT ? 'Close it' : 'Open it up'; });

  const start = () => {
    const canvas = view.querySelector('canvas'), R = renderer(canvas); if (!R) { view.classList.add('no-3d'); return; }
    const scene = new T.Scene(); scene.environment = studio(R);
    const cam = new T.PerspectiveCamera(28, 1, .1, 60); cam.position.set(0, 0, 8);
    watch = makeWatch(pick); scene.add(watch.group);
    let W = 1, H = 1; const size = () => { W = Math.max(1, view.clientWidth); H = Math.max(1, view.clientHeight); R.setPixelRatio(dpr()); R.setSize(W, H, false); cam.aspect = W / H; cam.updateProjectionMatrix(); };
    // drag to turn (sideways only, so a phone can still scroll the page up and down)
    let yaw = .5, pitch = -.25, vel = 0, drag = null, idle = 0;
    canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, yaw, pitch }; canvas.setPointerCapture(e.pointerId); view.classList.add('dragging'); });
    canvas.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x; vel = dx * .01 - (yaw - drag.yaw); yaw = drag.yaw + dx * .01;
      if (e.pointerType !== 'touch') pitch = cl(drag.pitch + (e.clientY - drag.y) * .006, -1.1, .6); idle = 0; });
    const up = () => { drag = null; view.classList.remove('dragging'); }; canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    let last = now();
    const frame = () => {
      const t = now(), dt = Math.min(.05, t - last); last = t;
      open += (openT - open) * (1 - Math.pow(.02, dt));
      if (!drag) { idle += dt; vel *= Math.pow(.05, dt);
        // opened up: it turns to a three-quarter view so every layer shows; closed: it spins slowly
        if (openT) { const to = Math.round((yaw - .95) / TAU) * TAU + .95; yaw += (to - yaw) * (1 - Math.pow(.08, dt)); pitch += (-.18 - pitch) * (1 - Math.pow(.08, dt)); }
        else yaw += vel + (reduce ? 0 : dt * .18 * sm(idle / 2)); }
      const halfH = Math.tan(14 * Math.PI / 180) * 8, halfW = halfH * W / H, e = sm(open);
      const s = Math.min(halfH * .36, halfW * .62) * mix(1, .72, e);
      const g = watch.group; g.scale.setScalar(s); g.position.set(0, -.05, 0); g.rotation.set(pitch, yaw, 0);
      watch.update(reduce ? 0 : t, e);
      R.render(scene, cam);
    };
    let on = true, raf = 0; const loop = () => { raf = 0; if (!on) return; frame(); raf = requestAnimationFrame(loop); };
    new IntersectionObserver(es => { on = es[0].isIntersecting && !document.hidden; if (on && !raf) { last = now(); loop(); } }).observe(view);
    document.addEventListener('visibilitychange', () => { on = !document.hidden; if (on && !raf) { last = now(); loop(); } });
    addEventListener('resize', size); size(); loop();
  };
  // built only when it is about to come into view (the opening has the phone's attention until then)
  const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { io.disconnect(); start(); } }, { rootMargin: '600px 0px' }); io.observe(view);
})();
