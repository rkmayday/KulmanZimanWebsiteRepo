// Ironpath sample: a real-looking barbell. It turns into view, rubber plates slide onto each sleeve with a puff
// of chalk, then it settles under the headline with the plates beside it.
window.S3D && S3D(({ T, scene, cl, sm, easeOut, mix, rnd, C, canvasTex, soft }) => {
  const LIME = '#c7f36b';
  // lights: white key, cool fill, lime rim from behind
  const key = new T.DirectionalLight('#ffffff', 3); key.position.set(-3, 5, 6); scene.add(key);
  const fill = new T.DirectionalLight('#dfe8ff', .8); fill.position.set(4, -2, 4); scene.add(fill);
  const rim = new T.DirectionalLight(LIME, 5); rim.position.set(1, 3, -6); scene.add(rim);
  scene.add(new T.HemisphereLight('#f4fff0', '#0a0b0a', .5));

  // ---------- materials ----------
  const knurl = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); g.strokeStyle = '#ffffff'; g.lineWidth = 3;
    for (let k = -h; k < w + h; k += 16) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + h, h); g.stroke(); g.beginPath(); g.moveTo(k, h); g.lineTo(k + h, 0); g.stroke(); } });
  knurl.wrapS = knurl.wrapT = T.RepeatWrapping; knurl.repeat.set(4, 30);
  const steel = new T.MeshPhysicalMaterial({ color: C('#d8dbd6'), metalness: 1, roughness: .3, clearcoat: .3, envMapIntensity: 1.3 });
  const steelK = steel.clone(); steelK.bumpMap = knurl; steelK.bumpScale = .02; steelK.roughness = .42;
  const rubber = new T.MeshPhysicalMaterial({ color: C('#151715'), roughness: .72, metalness: 0, clearcoat: .15, clearcoatRoughness: .6 });

  const face = (kg, accent) => {                          // the printed face of a bumper plate
    const t = canvasTex(1024, 1024, (g, w) => { const c = w / 2;
      g.fillStyle = '#141614'; g.fillRect(0, 0, w, w);
      for (let k = 0; k < 9000; k++) { g.fillStyle = `rgba(255,255,255,${rnd() * .035})`; g.fillRect(rnd() * w, rnd() * w, 2, 2); }
      const ring = (r0, r1, col) => { g.beginPath(); g.arc(c, c, r1 * c, 0, 7); g.arc(c, c, r0 * c, 0, 7, true); g.fillStyle = col; g.fill(); };
      ring(.9, 1, accent ? LIME : '#1e211e'); ring(.86, .9, '#0c0d0c');
      ring(.3, .33, '#262a26');
      const hub = g.createRadialGradient(c - 30, c - 30, 10, c, c, .26 * c); hub.addColorStop(0, '#f2f4f0'); hub.addColorStop(1, '#7b807a');
      g.beginPath(); g.arc(c, c, .26 * c, 0, 7); g.fillStyle = hub; g.fill();
      g.beginPath(); g.arc(c, c, .1 * c, 0, 7); g.fillStyle = '#050605'; g.fill();
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = LIME; g.font = '800 150px Archivo, Arial, sans-serif'; g.fillText(kg, c, c - .56 * c);
      g.fillStyle = '#c9cfc9'; g.font = '700 44px Archivo, Arial, sans-serif'; g.fillText('KG', c, c - .34 * c);
      g.fillStyle = '#9aa29a'; g.font = '600 46px Archivo, Arial, sans-serif'; g.fillText('I R O N P A T H', c, c + .58 * c); });
    t.anisotropy = 8; return new T.MeshPhysicalMaterial({ map: t, roughness: .62, metalness: 0, clearcoat: .25, clearcoatRoughness: .5, bumpMap: t, bumpScale: .006 });
  };

  // ---------- the barbell ----------
  const R = .9, SLEEVE = 1.05, PLATES = [['20', .17, 0], ['15', .14, 0], ['10', .1, 1]];
  const rig = new T.Group(), bar = new T.Group(); rig.add(bar); scene.add(rig);
  const cylX = (r, len, mats, seg = 64) => { const g = new T.CylinderGeometry(r, r, len, seg, 1); g.rotateZ(Math.PI / 2); return new T.Mesh(g, mats); };
  const shaft = cylX(.045, 1, steelK); bar.add(shaft);
  const sides = [-1, 1].map(s => {
    const g = new T.Group(); bar.add(g);
    const sleeve = cylX(.072, SLEEVE, steel); sleeve.position.x = s * (SLEEVE / 2 + .04); g.add(sleeve);
    const collar = cylX(.13, .07, steel); g.add(collar);
    const cap = cylX(.08, .03, steel); cap.position.x = s * (SLEEVE + .05); g.add(cap);
    let seat = .05;
    const plates = PLATES.map(([kg, t, acc]) => {
      const m = cylX(R, t, [rubber, face(kg, acc), face(kg, acc)], 96);
      m.userData = { seat: s * (seat + t / 2) }; seat += t + .004; g.add(m);
      // chalk that puffs out when this plate lands
      const N = 90, pos = new Float32Array(N * 3), dir = [];
      for (let k = 0; k < N; k++) { const th = rnd() * Math.PI * 2, r = R * (.55 + rnd() * .5); dir.push([s * (.15 + rnd() * .5), Math.cos(th) * r, Math.sin(th) * r, .5 + rnd() * .9]); }
      const pg = new T.BufferGeometry(); pg.setAttribute('position', new T.BufferAttribute(pos, 3));
      const puff = new T.Points(pg, new T.PointsMaterial({ size: .07, map: soft('rgba(255,255,255,.9)', 'rgba(255,255,255,0)'), transparent: true, depthWrite: false, opacity: 0 }));
      g.add(puff); m.userData.puff = { puff, pos, dir, N };
      return m; });
    return { s, g, plates, stack: seat };
  });
  const glow = new T.Sprite(new T.SpriteMaterial({ map: soft('rgba(199,243,107,.55)', 'rgba(199,243,107,0)'), blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  glow.scale.set(7, 3.2, 1); glow.position.z = -1.5; scene.add(glow);

  return ({ i, a, b, out, mx, my, halfW, halfH, tw, th }) => {
    // keep the whole bar on screen while it loads up (narrow phones get a smaller bar)
    const endOut = SLEEVE + .1, fitS = Math.min(1, halfW * .94 / (1.0 + endOut + .2));
    // where it ends up: plates beside the headline with the bar just under the buttons when there is room,
    // otherwise a smaller bar in the space under the headline
    const sxBeside = tw + .32, roomy = (sxBeside + endOut) < halfW * .97;
    let sxT, sT, yT;
    if (roomy) { sxT = sxBeside; sT = .82; yT = -th + .02; const bottom = halfH - .12; if (-yT + R * sT > bottom) sT = Math.max(.45, (bottom + yT) / R); }
    else { sxT = 1.0; const space = halfH - th - .14; sT = Math.min(fitS, Math.max(.22, space / (2 * R + .1))); yT = -th - .06 - R * sT; }
    // the bar arrives, turns from end-on to a three-quarter view while it spins
    const e = easeOut(i), sx = mix(1.0, sxT, out), sc = mix(fitS, sT, out);
    rig.scale.setScalar((.8 + .2 * e) * sc);
    rig.position.set(0, mix((1 - e) * -.3, yT, out), 0);
    rig.rotation.set(mix(.5 - .35 * a, .1, out) + my * .12, mix(-1.25 + 1.0 * a, -.06, out) + mx * .25, mix(.25 - .2 * a, 0, out));
    bar.rotation.x = a * Math.PI * 1.5 + b * .6;                   // the bar spins on its own axis
    shaft.scale.x = 2 * sx; knurl.repeat.set(4, 30 * sx);
    sides.forEach(({ s, g, plates }) => { g.position.x = s * sx;
      plates.forEach((m, k) => {
        const t0 = k * .26, land = cl((b - t0) / .3), ee = easeOut(land), far = halfW / Math.max(.3, sc) + 2.5;
        const back = land >= 1 ? 0 : (1 - ee);
        m.position.x = m.userData.seat + s * far * back;
        m.visible = b > t0;
        m.rotation.x = (1 - ee) * s * 2.2;                         // plates roll in, spinning
        const P = m.userData.puff, q = cl((b - t0 - .27) / .3);
        P.puff.material.opacity = q > 0 && q < 1 ? .8 * Math.sin(Math.PI * q) * (1 - out) : 0;
        for (let n = 0; n < P.N; n++) { const d = P.dir[n], r = q * d[3];
          P.pos[n * 3] = m.userData.seat + d[0] * q * 1.4; P.pos[n * 3 + 1] = d[1] * (1 + r * .7) - q * q * .6; P.pos[n * 3 + 2] = d[2] * (1 + r * .7); }
        P.puff.geometry.attributes.position.needsUpdate = true;
      }); });
    // a small clack as each pair lands
    let jolt = 0; for (let k = 0; k < 3; k++) { const q = cl((b - k * .26 - .3) / .08); jolt += Math.sin(Math.PI * q) * .025; }
    bar.position.y = -jolt * (1 - out);
    glow.material.opacity = .35 * e * (1 - .6 * out); glow.position.y = rig.position.y;
  };
}, { z: 9, exposure: 1.1, env: { low: '#060706', high: '#d9e2dc' } });
